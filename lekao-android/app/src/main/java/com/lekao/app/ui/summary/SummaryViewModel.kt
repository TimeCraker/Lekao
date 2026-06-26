package com.lekao.app.ui.summary

import android.content.Context
import android.net.Uri
import android.util.Base64
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.lekao.app.data.api.AuthRepository
import com.lekao.app.data.api.LekaoApi
import com.lekao.app.data.api.LekaoCookieJar
import com.lekao.app.data.api.RetrofitClient
import com.lekao.app.data.api.SummarizeChunk
import com.lekao.app.data.api.SummarizeRequest
import com.lekao.app.data.api.SummaryTemplate
import com.lekao.app.data.api.UserDto
import com.lekao.app.data.local.TokenStore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.BufferedReader
import java.io.InputStreamReader

/**
 * SummaryViewModel · T21
 *
 * 状态机：
 * - Idle: 用户在拖拽 / 选择图片
 * - Uploading: 图片压缩 + base64 + 提交
 * - Streaming: SSE 流式接收 AI 输出
 * - Done: 生成完成，可复制
 * - Error: 网络/AI/余额不足错误
 *
 * UI 只读 UiState；副作用 (选择图片/拍照) 由 Screen 用 ActivityResultContracts 触发
 * 调用 addImage() / clearImages() 维护 imageUri 列表
 */
class SummaryViewModel(
    private val context: Context,
    private val api: LekaoApi,
    private val authRepository: AuthRepository,
    private val tokenStore: TokenStore,
) : ViewModel() {

    /**
     * UI 状态
     *
     * @param images 已选图片 URI
     * @param template summary / feedback
     * @param subject feedback 模板用 (科目名)
     * @param description 用户补充描述 (可选)
     * @param status 当前阶段
     * @param streamingText 流式累积的文本
     * @param streamingKeyPoints 流式累积的要点列表 (summary 模板)
     * @param streamingFeedback 流式累积的反馈 (feedback 模板)
     * @param topic AI 返回的章节标题
     * @param coinBalance 用户余额快照
     * @param error 错误信息
     */
    data class UiState(
        val images: List<Uri> = emptyList(),
        val template: SummaryTemplate = SummaryTemplate.SUMMARY,
        val subject: String? = null,
        val description: String = "",
        val status: Status = Status.IDLE,
        val streamingText: String = "",
        val streamingKeyPoints: List<String> = emptyList(),
        val streamingFeedback: String = "",
        val topic: String = "",
        val coinBalance: Int = 0,
        val error: String? = null,
    ) {
        enum class Status { IDLE, UPLOADING, STREAMING, DONE, ERROR }
    }

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            authRepository.authState.collect { user ->
                _state.update {
                    it.copy(coinBalance = (user?.lekaoGiftCoin ?: 0) + (user?.tCoin ?: 0))
                }
            }
        }
    }

    fun setTemplate(template: SummaryTemplate) = _state.update { it.copy(template = template, error = null) }
    fun setSubject(subject: String?) = _state.update { it.copy(subject = subject?.takeIf { s -> s.isNotBlank() }) }
    fun setDescription(description: String) = _state.update { it.copy(description = description, error = null) }

    fun addImage(uri: Uri) = _state.update {
        if (it.images.size >= 9) it  // 上限 9 张
        else it.copy(images = it.images + uri, error = null)
    }

    fun removeImage(uri: Uri) = _state.update {
        it.copy(images = it.images.filterNot { u -> u == uri })
    }

    fun clearImages() = _state.update {
        it.copy(images = emptyList(), streamingText = "", streamingKeyPoints = emptyList(),
            streamingFeedback = "", topic = "", error = null, status = UiState.Status.IDLE)
    }

    /**
     * 提交生成小结 / 反馈
     */
    fun submit() {
        val s = _state.value
        if (s.status == UiState.Status.UPLOADING || s.status == UiState.Status.STREAMING) return
        if (s.coinBalance <= 0) {
            _state.update { it.copy(error = "T-Coin 余额不足，请充值") }
            return
        }
        viewModelScope.launch {
            _state.update {
                it.copy(
                    status = UiState.Status.UPLOADING,
                    streamingText = "",
                    streamingKeyPoints = emptyList(),
                    streamingFeedback = "",
                    topic = "",
                    error = null,
                )
            }
            val imagesBase64 = encodeImages(s.images)
            if (imagesBase64 == null) {
                _state.update {
                    it.copy(status = UiState.Status.ERROR, error = "图片读取失败，请重新选择")
                }
                return@launch
            }
            val request = SummarizeRequest(
                images = imagesBase64,
                description = s.description.takeIf { it.isNotBlank() },
                template = s.template.apiValue,
                subject = s.subject,
            )
            stream(request)
        }
    }

    private suspend fun stream(request: SummarizeRequest) = withContext(Dispatchers.IO) {
        _state.update { it.copy(status = UiState.Status.STREAMING) }
        try {
            val resp = api.summarizeStream(request)
            if (!resp.isSuccessful) {
                _state.update {
                    it.copy(status = UiState.Status.ERROR, error = "服务器错误 (HTTP ${resp.code()})")
                }
                return@withContext
            }
            val body = resp.body() ?: run {
                _state.update {
                    it.copy(status = UiState.Status.ERROR, error = "空响应")
                }
                return@withContext
            }
            val reader = BufferedReader(InputStreamReader(body.byteStream(), Charsets.UTF_8))
            var line: String?
            while (reader.readLine().also { line = it } != null) {
                if (line.isNullOrBlank()) continue
                val data = if (line.startsWith("data:")) line.removePrefix("data:").trim() else line.trim()
                if (data.isEmpty()) continue
                if (data == "[DONE]") break
                try {
                    val chunk = com.google.gson.Gson().fromJson(data, SummarizeChunk::class.java)
                    handleChunk(chunk)
                } catch (_: Throwable) {
                    // 非 JSON 行忽略 (SSE ping 等)
                }
            }
            _state.update { it.copy(status = UiState.Status.DONE) }
            // 扣币后刷新用户余额
            authRepository.me()
        } catch (t: Throwable) {
            _state.update {
                it.copy(status = UiState.Status.ERROR, error = t.userMessage())
            }
        }
    }

    private fun handleChunk(chunk: SummarizeChunk) {
        when (chunk.type) {
            "metadata" -> {
                _state.update {
                    it.copy(
                        topic = chunk.topic ?: chunk.subject ?: "",
                        streamingKeyPoints = chunk.keyPoints ?: emptyList(),
                    )
                }
            }
            "chunk" -> {
                _state.update {
                    it.copy(
                        streamingText = it.streamingText + (chunk.content ?: ""),
                    )
                }
            }
            "feedback" -> {
                _state.update {
                    it.copy(
                        streamingFeedback = chunk.feedback ?: it.streamingFeedback,
                        streamingKeyPoints = chunk.keyPoints ?: it.streamingKeyPoints,
                    )
                }
            }
            "done" -> {
                _state.update {
                    it.copy(
                        topic = chunk.topic ?: it.topic,
                        streamingText = chunk.summary ?: it.streamingText,
                        streamingFeedback = chunk.feedback ?: it.streamingFeedback,
                    )
                }
            }
            "error" -> {
                _state.update {
                    it.copy(status = UiState.Status.ERROR, error = chunk.content ?: "AI 生成失败")
                }
            }
        }
    }

    private fun encodeImages(uris: List<Uri>): List<String>? {
        if (uris.isEmpty()) return emptyList()
        return try {
            uris.map { uri ->
                context.contentResolver.openInputStream(uri)?.use { input ->
                    val bytes = input.readBytes()
                    // >2MB 压缩到 <2MB
                    val compressed = ImageCompressor.compress(bytes, maxBytes = 2 * 1024 * 1024)
                    Base64.encodeToString(compressed, Base64.NO_WRAP)
                } ?: throw IllegalStateException("无法读取图片: $uri")
            }
        } catch (t: Throwable) {
            android.util.Log.w("Summary", "图片编码失败: ${t.message}")
            null
        }
    }

    private fun Throwable.userMessage(): String {
        if (this is retrofit2.HttpException) {
            return when (code()) {
                401 -> "登录已过期"
                402 -> "T-Coin 余额不足"
                429 -> "请求太频繁"
                in 500..599 -> "服务器错误, 请稍后重试"
                else -> "请求失败 (HTTP ${code()})"
            }
        }
        return message ?: "网络错误"
    }

    companion object {
        fun factory(): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                val ctx = com.lekao.app.LekaoApp.instance
                val api = RetrofitClient.api(ctx)
                val tokenStore = TokenStore.getInstance(ctx)
                val cookieJar = LekaoCookieJar(ctx)
                val repo = AuthRepository(ctx, api, tokenStore, cookieJar)
                return SummaryViewModel(ctx, api, repo, tokenStore) as T
            }
        }
    }
}