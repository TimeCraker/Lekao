package com.lekao.app.ui.mistake

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.lekao.app.data.api.AuthRepository
import com.lekao.app.data.api.LekaoApi
import com.lekao.app.data.api.LekaoCookieJar
import com.lekao.app.data.api.MistakeQuestionDto
import com.lekao.app.data.api.MistakeRepository
import com.lekao.app.data.api.RetrofitClient
import com.lekao.app.data.local.TokenStore
import com.lekao.app.util.ImageCompressor
import com.lekao.app.util.OcrHelper
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.io.File
import java.io.FileOutputStream

/**
 * MistakeViewModel · T33-T37
 *
 * 错题录入流程：
 * 1. 拍照 / 相册多选 (UI 层 ActivityResultContracts)
 * 2. (可选) uCrop 标注 + OCR 提取 + 智能裁切
 * 3. 保存到 Room (本地草稿箱) → WorkManager 上传
 *
 * UI 状态机：
 * - 选图: 多张图片 URI 列表
 * - 标注: 对每张图可选 uCrop
 * - 提交: 压缩 + 保存 + 后台上传
 *
 * ⚠️ 本类只持有 URI + 元数据，**图片二进制不上 ViewModel**（避免内存爆炸）
 */
class MistakeViewModel(
    private val context: Context,
    private val repository: MistakeRepository,
    private val authRepository: AuthRepository,
) : ViewModel() {

    data class UiState(
        val subject: String = "math",           // math/physics/chemistry/english/chinese
        val topic: String = "",                  // 用户填的章节
        val images: List<Uri> = emptyList(),     // 已选图
        val ocrText: String = "",                // OCR 提取的文本 (可选)
        val saving: Boolean = false,
        val savedId: Long? = null,
        val error: String? = null,
    )

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    fun setSubject(subject: String) = _state.update { it.copy(subject = subject, error = null) }
    fun setTopic(topic: String) = _state.update { it.copy(topic = topic, error = null) }
    fun addImage(uri: Uri) = _state.update {
        if (it.images.size >= 20) it
        else it.copy(images = it.images + uri, error = null)
    }
    fun removeImage(uri: Uri) = _state.update {
        it.copy(images = it.images.filterNot { u -> u == uri })
    }
    fun setOcrText(text: String) = _state.update { it.copy(ocrText = text) }

    /**
     * 对某张图跑 OCR → 把文字注入 ocrText
     */
    fun runOcr(uri: Uri) {
        viewModelScope.launch {
            val text = OcrHelper.extractText(context, uri) ?: return@launch
            val combined = if (_state.value.ocrText.isBlank()) text
                else _state.value.ocrText + "\n\n" + text
            _state.update { it.copy(ocrText = combined) }
        }
    }

    /**
     * 保存错题为草稿 → 触发后台同步
     *
     * 步骤：
     * 1) 把图片 URI 复制到 app 内部存储 (避免 content URI 失效)
     * 2) 构建 questions JSON
     * 3) 入 Room
     * 4) enqueue MistakeSyncWorker
     */
    fun save() {
        val s = _state.value
        if (s.saving) return
        if (s.topic.isBlank()) {
            _state.update { it.copy(error = "请填写章节") }
            return
        }
        if (s.images.isEmpty()) {
            _state.update { it.copy(error = "至少 1 张题图") }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(saving = true, error = null) }
            val email = authRepository.authState.value?.email ?: "anonymous"
            try {
                val localPaths = copyImagesToInternal(s.images)
                val questions = s.images.mapIndexed { idx, uri ->
                    MistakeQuestionDto(
                        id = null,
                        content = s.ocrText.takeIf { it.isNotBlank() } ?: "(题图 ${idx + 1})",
                        imagePath = localPaths.getOrNull(idx),
                        annotation = null,
                    )
                }
                val result = repository.saveDraft(
                    email = email,
                    subject = s.subject,
                    topic = s.topic,
                    questions = questions,
                    imagePaths = localPaths,
                )
                result.fold(
                    onSuccess = { id ->
                        _state.update {
                            it.copy(saving = false, savedId = id)
                        }
                    },
                    onFailure = { e ->
                        _state.update { it.copy(saving = false, error = e.message ?: "保存失败") }
                    }
                )
            } catch (t: Throwable) {
                _state.update { it.copy(saving = false, error = t.message ?: "图片保存失败") }
            }
        }
    }

    fun reset() = _state.update {
        UiState(subject = it.subject)
    }

    /**
     * 复制 content URI 图片到内部存储，返回本地路径列表
     *
     * 为什么：content URI 可能在 app 重启后失效，必须持久化
     */
    private suspend fun copyImagesToInternal(uris: List<Uri>): List<String> {
        val dir = File(context.filesDir, "mistake_images").apply { mkdirs() }
        return uris.mapIndexed { idx, uri ->
            val outFile = File(dir, "img_${System.currentTimeMillis()}_${idx}.jpg")
            context.contentResolver.openInputStream(uri)?.use { input ->
                val bytes = input.readBytes()
                val compressed = ImageCompressor.compress(bytes, maxBytes = 1 * 1024 * 1024)
                FileOutputStream(outFile).use { it.write(compressed) }
            } ?: throw IllegalStateException("无法读取图片: $uri")
            outFile.absolutePath
        }
    }

    companion object {
        val SUBJECTS = listOf("math", "physics", "chemistry", "english", "chinese")

        fun factory(): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                val ctx = com.lekao.app.LekaoApp.instance
                val api = RetrofitClient.api(ctx)
                val repo = MistakeRepository(ctx, api)
                val tokenStore = TokenStore.getInstance(ctx)
                val cookieJar = LekaoCookieJar(ctx)
                val authRepo = AuthRepository(ctx, api, tokenStore, cookieJar)
                return MistakeViewModel(ctx, repo, authRepo) as T
            }
        }
    }
}