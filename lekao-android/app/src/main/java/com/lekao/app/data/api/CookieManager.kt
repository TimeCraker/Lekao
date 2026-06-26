package com.lekao.app.data.api

import android.content.Context
import android.webkit.CookieManager as WebCookieManager
import android.webkit.CookieSyncManager
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl

/**
 * Cookie 管理器 · 复用 Lekao next-auth JWT cookie
 *
 * 关键点：
 * 1. Lekao 用 next-auth 4.x，session 存 JWT cookie（name: next-auth.session-token）
 * 2. 用户登录后服务端 Set-Cookie: next-auth.session-token=xxx
 * 3. OkHttp CookieJar 自动存 cookie
 * 4. App 重启 → DataStore 持久化 cookie → OkHttp 恢复
 * 5. M04 生物识别 二次确认（指纹/Face 校验后才解锁已登录状态）
 */
class LekaoCookieJar(
    private val context: Context
) : CookieJar {

    private val store = mutableMapOf<String, List<Cookie>>()

    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        store[url.host] = cookies
        // 同步到 WebView CookieManager (PWA fallback 用)
        try {
            val webCookieManager = WebCookieManager.getInstance()
            webCookieManager.setAcceptCookie(true)
            cookies.forEach { cookie ->
                webCookieManager.setCookie(url.toString(), cookie.toString())
            }
            if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.LOLLIPOP) {
                @Suppress("DEPRECATION")
                CookieSyncManager.getInstance().sync()
            } else {
                webCookieManager.flush()
            }
        } catch (_: Throwable) {
            // WebView 不可用 (无 Android System WebView) 时跳过
        }
    }

    override fun loadForRequest(url: HttpUrl): List<Cookie> {
        return store[url.host] ?: emptyList()
    }

    /**
     * 清空所有 cookie（退出登录用）
     */
    fun clearAll() {
        store.clear()
        try {
            val webCookieManager = WebCookieManager.getInstance()
            webCookieManager.removeAllCookies(null)
            webCookieManager.removeSessionCookies(null)
            webCookieManager.flush()
        } catch (_: Throwable) {
            // ignore
        }
    }

    /**
     * 检查是否有 session cookie (判定登录状态)
     */
    fun hasSessionCookie(url: HttpUrl): Boolean {
        val cookies = store[url.host] ?: return false
        return cookies.any { cookie ->
            cookie.name.startsWith("next-auth.session-token") ||
            cookie.name.startsWith("__Secure-next-auth.session-token")
        }
    }
}