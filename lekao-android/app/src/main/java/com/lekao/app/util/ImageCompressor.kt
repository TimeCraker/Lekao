package com.lekao.app.util

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import java.io.ByteArrayOutputStream

/**
 * ImageCompressor · D1-C T25
 *
 * 客户端图片压缩工具，把图片压到 maxBytes 以下：
 * - 第一次：scale 到 1920px 长边（保留可读性）
 * - 第二次：JPEG quality 从 85 → 70 → 50 逐级降
 *
 * 不引入 exifinterface 依赖（v1.0.0 简化）；旋转交给服务端/前端处理。
 * 纯工具类，不依赖 Compose。
 */
object ImageCompressor {

    /**
     * 压缩图片到 maxBytes 以下
     */
    fun compress(rawBytes: ByteArray, maxBytes: Int = 2 * 1024 * 1024): ByteArray {
        val original = BitmapFactory.decodeByteArray(rawBytes, 0, rawBytes.size)
            ?: return rawBytes

        // 1) 缩放到长边 1920px（保留可读性，文件大小 ~ 500KB-2MB）
        val scaled = scaleToLongEdge(original, 1920)
        if (scaled != original) original.recycle()

        // 2) 逐级降低 quality 直到 < maxBytes
        var quality = 85
        var result = encodeJpeg(scaled, quality)
        while (result.size > maxBytes && quality > 50) {
            quality -= 15
            result = encodeJpeg(scaled, quality)
        }
        scaled.recycle()
        return result
    }

    private fun scaleToLongEdge(bitmap: Bitmap, longEdge: Int): Bitmap {
        val w = bitmap.width
        val h = bitmap.height
        val longSide = maxOf(w, h)
        if (longSide <= longEdge) return bitmap
        val scale = longEdge.toFloat() / longSide.toFloat()
        val newW = (w * scale).toInt()
        val newH = (h * scale).toInt()
        return Bitmap.createScaledBitmap(bitmap, newW, newH, true)
    }

    private fun encodeJpeg(bitmap: Bitmap, quality: Int): ByteArray {
        val out = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, quality, out)
        return out.toByteArray()
    }
}