package com.lekao.app.util

import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.BufferedReader
import java.io.InputStreamReader
import java.util.concurrent.TimeUnit

/**
 * SseClient · M17 SSE 增强（T57）
 *
 * 长连接 SSE 客户端，支持：
 * - OkHttp 流式连接
 * - `data:` 行解析
 * - 指数退避断线重连 (1s → 2s → 4s → 8s → max 30s)
 * - 手动断开
 * - 回调模式事件分发
 *
 * 使用场景：
 * - 灵感墙实时刷新 (M17)
 * - 任何需要长连接 SSE 的模块
 *
 * 用法：
 * ```kotlin
 * val client = SseClient(okHttpClient, url, scope)
 * client.onEvent = { event -> handleEvent(event) }
 * client.connect()
 * // ...
 * client.disconnect()
 * ```
 */
class SseClient(
    private val client: OkHttpClient,
    private val url: String,
    private val scope: CoroutineScope,
) {
    companion object {
        private const val TAG = "SseClient"
        private const val INITIAL_RETRY_DELAY_MS = 1000L
        private const val MAX_RETRY_DELAY_MS = 30_000L
        private const val RETRY_MULTIPLIER = 2.0
    }

    // ============ 回调模式 ============
    var onEvent: ((SseEvent) -> Unit)? = null
    var onConnected: (() -> Unit)? = null
    var onDisconnected: ((reason: String) -> Unit)? = null
    var onError: ((Throwable) -> Unit)? = null

    @Volatile
    private var isDisconnected = false
    private var connectionJob: Job? = null

    /**
     * 启动连接（自动重连）
     */
    fun connect() {
        if (connectionJob?.isActive == true) {
            Log.d(TAG, "SSE 已在连接中，跳过")
            return
        }
        isDisconnected = false
        connectionJob = scope.launch {
            var retryDelay = INITIAL_RETRY_DELAY_MS
            while (isActive && !isDisconnected) {
                try {
                    Log.d(TAG, "正在连接 SSE: $url")
                    val request = Request.Builder()
                        .url(url)
                        .header("Accept", "text/event-stream")
                        .header("Cache-Control", "no-cache")
                        .build()

                    val response = client.newCall(request).execute()
                    if (!response.isSuccessful) {
                        val code = response.code()
                        Log.w(TAG, "SSE 连接失败 HTTP $code")
                        onError?.let { it(java.io.IOException("SSE HTTP $code")) }
                        response.close()
                        if (code in 400..499) {
                            onDisconnected?.let { it("HTTP $code (不重连)") }
                            return@launch
                        }
                        delay(retryDelay)
                        retryDelay = (retryDelay * RETRY_MULTIPLIER).toLong().coerceAtMost(MAX_RETRY_DELAY_MS)
                        continue
                    }

                    Log.d(TAG, "SSE 连接成功")
                    onConnected?.let { it() }
                    retryDelay = INITIAL_RETRY_DELAY_MS

                    readEvents(response)
                    Log.d(TAG, "SSE 连接正常关闭")
                    onDisconnected?.let { it("连接正常关闭") }

                } catch (t: Throwable) {
                    if (isDisconnected) return@launch
                    Log.w(TAG, "SSE 连接异常: ${t.message}", t)
                    onError?.let { it(t) }

                    if (!isDisconnected) {
                        Log.d(TAG, "SSE 将在 ${retryDelay}ms 后重连")
                        delay(retryDelay)
                        retryDelay = (retryDelay * RETRY_MULTIPLIER).toLong().coerceAtMost(MAX_RETRY_DELAY_MS)
                    }
                }
            }
        }
    }

    /**
     * 读取 SSE 事件行
     */
    private fun readEvents(response: okhttp3.Response) {
        val body = response.body ?: return
        val reader = BufferedReader(InputStreamReader(body.byteStream(), Charsets.UTF_8))
        var eventType = ""
        var dataBuffer = StringBuilder()

        try {
            var line: String?
            while (reader.readLine().also { line = it } != null) {
                if (isDisconnected) return

                val raw = line ?: continue

                when {
                    raw.startsWith("event:") -> {
                        eventType = raw.removePrefix("event:").trim()
                    }
                    raw.startsWith("data:") -> {
                        val data = raw.removePrefix("data:").trim()
                        if (data == "[DONE]") {
                            emitEvent(SseEvent(eventType.takeIf { it.isNotBlank() } ?: "done", data))
                            return
                        }
                        dataBuffer.append(data)
                    }
                    raw.isBlank() -> {
                        if (dataBuffer.isNotEmpty()) {
                            val finalType = eventType.takeIf { it.isNotBlank() } ?: "message"
                            emitEvent(SseEvent(finalType, dataBuffer.toString()))
                            eventType = ""
                            dataBuffer = StringBuilder()
                        }
                    }
                    raw.startsWith("retry:") -> { /* 服务端建议，忽略 */ }
                    raw.startsWith(":") -> { /* 注释行/ping，忽略 */ }
                }
            }
        } catch (t: Throwable) {
            if (!isDisconnected) throw t
        }
    }

    private fun emitEvent(event: SseEvent) {
        onEvent?.let { it(event) }
    }

    /**
     * 手动断开连接（不再重连）
     */
    fun disconnect() {
        Log.d(TAG, "SSE 手动断开")
        isDisconnected = true
        connectionJob?.cancel()
        connectionJob = null
        onDisconnected?.let { it("手动断开") }
    }

    /**
     * 当前连接状态
     */
    val isActive: Boolean get() = connectionJob?.isActive == true && !isDisconnected

    data class SseEvent(
        val type: String,
        val data: String,
    )
}