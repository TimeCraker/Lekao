package com.lekao.app.data.api

import com.lekao.app.BuildConfig

/**
 * Lekao 客户端配置 · 复用 Web 部署地址
 * BASE_URL 从 BuildConfig 读取 (build.gradle.kts buildConfigField)
 * 真值见 app/build.gradle.kts:LEKAO_BASE_URL
 */
object LekaoConfig {
    const val BASE_URL: String = BuildConfig.LEKAO_BASE_URL
    const val API_VERSION: String = "/api"

    // ============ 超时（OkHttp 默认 10s）============
    const val CONNECT_TIMEOUT_SECONDS: Long = 15
    const val READ_TIMEOUT_SECONDS: Long = 30
    const val WRITE_TIMEOUT_SECONDS: Long = 60   // SSE 流式输出要长

    // ============ 重试策略 ============
    const val MAX_RETRY_ATTEMPTS: Int = 3
    const val RETRY_DELAY_MILLIS: Long = 1000L

    // ============ 缓存 ============
    const val CACHE_SIZE_BYTES: Long = 10L * 1024 * 1024  // 10 MB

    // ============ 完整 URL helpers ============
    fun authUrl(path: String) = "$BASE_URL$API_VERSION/auth/$path"
    fun lekaoUrl(path: String) = "$BASE_URL$API_VERSION/lekao/$path"
    fun adminUrl(path: String) = "$BASE_URL$API_VERSION/admin/$path"

    // 灵感墙客户端跳转 URL（桌面快捷方式 M08）
    const val DEEP_LINK_SCHEME: String = "lekao"
    const val DEEP_LINK_HOST_MAIN: String = "main"
}