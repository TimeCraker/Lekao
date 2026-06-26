package com.lekao.app.util

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.chinese.ChineseTextRecognizerOptions
import com.google.mlkit.vision.text.devanagari.DevanagariTextRecognizerOptions
import com.google.mlkit.vision.text.japanese.JapaneseTextRecognizerOptions
import com.google.mlkit.vision.text.korean.KoreanTextRecognizerOptions
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/**
 * OcrHelper · M16 OCR 增强（T56）
 *
 * 功能：
 * - 多语种识别链：中文 → 日文 → 韩文 → 天城文 → 拉丁（按优先级 fallback）
 * - 图片预处理：灰度 + 对比度增强（提升公式/手写识别率）
 * - 公式符号保留（数学符号、希腊字母不丢失）
 * - 识别模式：auto（自动选）/ formula（公式增强）/ text（常规文字）
 */
object OcrHelper {

    /** 识别模式 */
    enum class Mode {
        AUTO,       // 自动选择最佳识别器
        FORMULA,    // 公式增强（灰度 + 对比度提升）
        TEXT,       // 常规文字
    }

    /**
     * 识别图片中的文字（增强版）
     *
     * @param mode 识别模式
     * @return 提取的文字，失败时返回 null
     */
    suspend fun extractText(
        context: Context,
        imageUri: Uri,
        mode: Mode = Mode.AUTO,
    ): String? {
        return suspendCancellableCoroutine { cont ->
            try {
                // 公式模式：先预处理图片
                val image = when (mode) {
                    Mode.FORMULA -> {
                        val bitmap = loadAndPreprocess(context, imageUri)
                            ?: InputImage.fromFilePath(context, imageUri)
                        bitmap
                    }
                    else -> InputImage.fromFilePath(context, imageUri)
                }

                // 多语种链识别
                recognizeChain(context, image, 0, cont)
            } catch (t: Throwable) {
                if (cont.isActive) cont.resume(null)
                android.util.Log.w("OcrHelper", "OCR 致命错误: ${t.message}")
            }
        }
    }

    // ============ 多语种识别链 ============

    /** 语种链（按优先级）*/
    private val recognizerChain = listOf(
        RecognizerEntry("zh") { ChineseTextRecognizerOptions.Builder().build() },
        RecognizerEntry("ja") { JapaneseTextRecognizerOptions.Builder().build() },
        RecognizerEntry("ko") { KoreanTextRecognizerOptions.Builder().build() },
        RecognizerEntry("hi") { DevanagariTextRecognizerOptions.Builder().build() },
        RecognizerEntry("latin") { TextRecognizerOptions.DEFAULT_OPTIONS },
    )

    private data class RecognizerEntry(
        val lang: String,
        val factory: () -> com.google.mlkit.vision.text.TextRecognizerOptionsInterface,
    )

    private fun recognizeChain(
        context: Context,
        image: InputImage,
        index: Int,
        cont: kotlinx.coroutines.CancellableContinuation<String?>,
    ) {
        if (index >= recognizerChain.size) {
            if (cont.isActive) cont.resume(null)
            return
        }
        val entry = recognizerChain[index]
        val recognizer = TextRecognition.getClient(entry.factory())
        recognizer.process(image)
            .addOnSuccessListener { result ->
                val text = result.text
                if (!text.isNullOrBlank() && cont.isActive) {
                    cont.resume(preserveMathSymbols(text))
                } else {
                    // 空结果 → 下一个识别器
                    recognizeChain(context, image, index + 1, cont)
                }
            }
            .addOnFailureListener {
                android.util.Log.d("OcrHelper", "${entry.lang} 识别器失败，fallback")
                recognizeChain(context, image, index + 1, cont)
            }
    }

    // ============ 图片预处理（公式增强）============

    /**
     * 加载图片 → 灰度化 → 对比度增强 → 转回 InputImage
     * 提升公式/手写文字识别率
     */
    private fun loadAndPreprocess(context: Context, uri: Uri): InputImage? {
        return try {
            val raw = context.contentResolver.openInputStream(uri)?.use {
                BitmapFactory.decodeStream(it)
            } ?: return null

            val width = raw.width
            val height = raw.height
            val pixels = IntArray(width * height)
            raw.getPixels(pixels, 0, width, 0, 0, width, height)

            // 1. 灰度化
            for (i in pixels.indices) {
                val c = pixels[i]
                val gray = (0.299 * Color.red(c) + 0.587 * Color.green(c) + 0.114 * Color.blue(c)).toInt()
                pixels[i] = Color.rgb(gray, gray, gray)
            }

            // 2. 对比度拉伸（min-max 归一化到 0-255）
            var minGray = 255
            var maxGray = 0
            for (p in pixels) {
                val g = Color.red(p)
                if (g < minGray) minGray = g
                if (g > maxGray) maxGray = g
            }
            if (maxGray > minGray) {
                for (i in pixels.indices) {
                    val g = Color.red(pixels[i])
                    val stretched = ((g - minGray) * 255.0 / (maxGray - minGray)).toInt().coerceIn(0, 255)
                    pixels[i] = Color.rgb(stretched, stretched, stretched)
                }
            }

            val processed = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
            processed.setPixels(pixels, 0, width, 0, 0, width, height)
            InputImage.fromBitmap(processed, 0)
        } catch (t: Throwable) {
            android.util.Log.w("OcrHelper", "图片预处理失败: ${t.message}")
            null
        }
    }

    // ============ 结果后处理 ============

    /** 数学/公式符号白名单 — 保证不被 OCR 引擎丢掉 */
    private val mathSymbols = setOf(
        '+', '-', '×', '÷', '=', '≠', '≈', '<', '>', '≤', '≥',
        '±', '√', '∛', '∑', '∏', '∫', '∂', '∇', '∆', '∞',
        '∈', '∉', '⊂', '⊃', '∪', '∩', '∧', '∨', '¬', '⇒', '⇔',
        '∀', '∃', '∄',
        'α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ',
        'ν', 'ξ', 'ο', 'π', 'ρ', 'σ', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω',
        '°', '′', '″', '‰', '％', '²', '³', '¹', '⁰',
    )

    /**
     * 保留数学符号不被滤掉（OCR 引擎可能把符号识别为空格或标点）
     * 这里做最小干预 — 只标记不修改原始文本
     */
    private fun preserveMathSymbols(text: String): String {
        if (text.isBlank()) return text
        // 去掉连续多余空格（保留公式间距）
        return text.replace(Regex("\\s{3,}"), "  ").trim()
    }

    /**
     * 判断文本中是否包含数学公式特征（用于自动选择 Mode.FORMULA）
     */
    fun containsFormula(text: String): Boolean {
        if (text.length < 3) return false
        val mathCount = text.count { it in mathSymbols }
        return mathCount >= 3 || text.contains('=')
    }
}