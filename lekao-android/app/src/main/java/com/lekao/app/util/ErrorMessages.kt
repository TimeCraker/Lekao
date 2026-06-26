package com.lekao.app.util

import retrofit2.HttpException

/**
 * ErrorMessages · 安全 review 修复 (D1-E follow-up)
 *
 * 统一把 Throwable 转成可展示给用户的中文提示，避免：
 * - 网络层原始 message 泄露 (IP / token / DNS 等)
 * - 后端堆栈泄露 (路径 / 列名 / 表名)
 *
 * 调用方：
 * ```kotlin
 * } catch (t: Throwable) {
 *     _state.update { it.copy(error = ErrorMessages.safe(t)) }
 * }
 * ```
 */
object ErrorMessages {

    fun safe(t: Throwable): String = when (t) {
        is HttpException -> when (t.code()) {
            401 -> "登录已过期"
            403 -> "无权限"
            404 -> "资源不存在"
            408, 504 -> "请求超时"
            429 -> "操作太频繁，请稍后再试"
            in 500..599 -> "服务器错误"
            else -> "请求失败 (${t.code()})"
        }
        is java.net.SocketTimeoutException -> "请求超时"
        is java.net.UnknownHostException -> "网络连接失败"
        is java.net.ConnectException -> "无法连接到服务器"
        is java.io.IOException -> "网络错误"
        else -> "操作失败，请稍后再试"
    }
}