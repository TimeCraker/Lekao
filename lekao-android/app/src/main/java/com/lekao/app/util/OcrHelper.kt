package com.lekao.app.util

import android.content.Context
import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.chinese.ChineseTextRecognizerOptions
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/**
 * OcrHelper · D1-C T26 (M16 · ML Kit 中英文 OCR)
 *
 * 客户端本地 OCR：把讲义图片识别为文字，作为补充描述注入 Summary 输入
 * - 默认 Latin 识别器
 * - 中文字符较多时切到 Chinese 识别器（精度更高）
 *
 * V1.0.0 简化版：直接用 Latin + Chinese 兜底（Chinese 已包含中英混合）
 */
object OcrHelper {

    /**
     * 识别图片中的文字（中文优先，含英文）
     *
     * @return 提取的文字，失败时返回 null
     */
    suspend fun extractText(context: Context, imageUri: Uri): String? {
        return suspendCancellableCoroutine { cont ->
            try {
                val image = InputImage.fromFilePath(context, imageUri)
                val recognizer = TextRecognition.getClient(ChineseTextRecognizerOptions.Builder().build())
                recognizer.process(image)
                    .addOnSuccessListener { result ->
                        if (cont.isActive) cont.resume(result.text.takeIf { it.isNotBlank() })
                    }
                    .addOnFailureListener { e ->
                        if (cont.isActive) cont.resume(null)
                        android.util.Log.w("OcrHelper", "中文 OCR 失败: ${e.message}, 兜底用 Latin")
                        // 兜底用 Latin
                        fallbackLatin(context, imageUri, cont)
                    }
            } catch (t: Throwable) {
                if (cont.isActive) cont.resume(null)
            }
        }
    }

    private fun fallbackLatin(context: Context, imageUri: Uri, cont: kotlinx.coroutines.CancellableContinuation<String?>) {
        try {
            val image = InputImage.fromFilePath(context, imageUri)
            val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
            recognizer.process(image)
                .addOnSuccessListener { result ->
                    if (cont.isActive) cont.resume(result.text.takeIf { it.isNotBlank() })
                }
                .addOnFailureListener {
                    if (cont.isActive) cont.resume(null)
                }
        } catch (t: Throwable) {
            if (cont.isActive) cont.resume(null)
        }
    }
}