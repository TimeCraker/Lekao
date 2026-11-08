package com.lekao.app.ui.feedback

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
import com.lekao.app.data.local.TokenStore
import com.lekao.app.util.ImageCompressor
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.BufferedReader

/**
 * FeedbackViewModel · T23
 *
 * 课堂反馈：subject + description（可选图片） → AI 生成家长反馈
 *
 * 复用 Summary 同样的 SSE 流式 + 扣币逻辑
 * 区别：
 * - 必填 subject (科目)
 * - 必填 description (用户描述)
 * - 图片可选 (1 张作上下文)
 * - 输出 = streamingFeedback (直接给家长看)
 */
class FeedbackViewModel(
    private val context: Context,
    private val api: LekaoApi,
    private val authRepository: AuthRepository,
    private val tokenStore: TokenStore,
) : ViewModel() {

    data class UiState(
        val subject: String = "",
        val description: String = "",
        val imageUri: Uri? = null,
        val status: Status = Status.IDLE,
        val feedback: String = "",
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

    fun setSubject(subject: String) = _state.update { it.copy(subject = subject, error = null) }
    fun setDescription(description: String) = _state.update { it.copy(description = description, error = null) }
    fun setImage(uri: Uri?) = _state.update { it.copy(imageUri = uri, error = null) }

    fun submit() {
        val s = _state.value
        if (s.status == UiState.Status.UPLOADING || s.status == UiState.Status.STREAMING) return
        if (s.subject.isBlank()) {
            _state.update { it.copy(error = "请填写科目") }
            return
        }
        if (s.description.isBlank()) {
            _state.update { it.copy(error = "请简要描述今天的课堂情况") }
            return
        }
        if (s.coinBalance <= 0) {
            _state.update { it.copy(error = "T-Coin 余额不足") }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(status = UiState.Status.UPLOADING, feedback = "", error = null) }
            val imageBase64 = s.imageUri?.let { encodeImage(it) } ?: emptyList()
            val request = SummarizeRequest(
                images = imageBase64,
                description = s.description,
                template = SummaryTemplate.FEEDBACK.apiValue,
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
                _state.update { it.copy(status = UiState.Status.ERROR, error = "HTTP ${resp.code()}") }
                return@withContext
            }
            val body = resp.body() ?: run {
                _state.update { it.copy(status = UiState.Status.ERROR, error = "空响应") }
                return@withContext
            }
            val reader = BufferedReader(body.byteStream().reader(Charsets.UTF_8))
            var line: String?
            while (reader.readLine().also { line = it } != null) {
                val currentLine = line ?: continue
                if (currentLine.isBlank()) continue
                val data = if (currentLine.startsWith("data:")) currentLine.removePrefix("data:").trim() else currentLine.trim()
                if (data.isEmpty() || data == "[DONE]") continue
                try {
                    val chunk = com.google.gson.Gson().fromJson(data, SummarizeChunk::class.java)
                    handleChunk(chunk)
                } catch (_: Throwable) { }
            }
            _state.update { it.copy(status = UiState.Status.DONE) }
            authRepository.me()
        } catch (t: Throwable) {
            _state.update { it.copy(status = UiState.Status.ERROR, error = t.userMessage()) }
        }
    }

    private fun handleChunk(chunk: SummarizeChunk) {
        when (chunk.type) {
            "feedback" -> _state.update { it.copy(feedback = chunk.feedback ?: it.feedback) }
            "chunk" -> _state.update { it.copy(feedback = it.feedback + (chunk.content ?: "")) }
            "done" -> _state.update { it.copy(feedback = chunk.feedback ?: chunk.summary ?: it.feedback) }
            "error" -> _state.update { it.copy(status = UiState.Status.ERROR, error = chunk.content ?: "生成失败") }
            else -> { /* metadata 等忽略 */ }
        }
    }

    private fun encodeImage(uri: Uri): List<String> {
        return try {
            context.contentResolver.openInputStream(uri)?.use { input ->
                val bytes = input.readBytes()
                val compressed = ImageCompressor.compress(bytes)
                listOf(Base64.encodeToString(compressed, Base64.NO_WRAP))
            } ?: emptyList()
        } catch (t: Throwable) {
            android.util.Log.w("Feedback", "图片读取失败: ${t.message}")
            emptyList()
        }
    }

    private fun Throwable.userMessage(): String {
        if (this is retrofit2.HttpException) {
            return when (code()) {
                401 -> "登录已过期"
                402 -> "T-Coin 余额不足"
                429 -> "请求太频繁"
                in 500..599 -> "服务器错误"
                else -> "HTTP ${code()}"
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
                return FeedbackViewModel(ctx, api, repo, tokenStore) as T
            }
        }
    }
}