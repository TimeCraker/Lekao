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
     *
     * 安全要点：
     * 1. CountDownLatch 等 removeAllCookies 异步回调完成再返回
     *    （fire-and-forget 模式：退出登录后下一请求可能还在用旧 cookie）
     * 2. flush() 强制把内存 cookie 写盘
     * 3. 如果 app 用过 WebView（PWA / OAuth 登录），调用方需要另外调 evictWebViewState()
     */
    fun clearAll() {
        store.clear()
        try {
            val webCookieManager = WebCookieManager.getInstance()
            val latch = java.util.concurrent.CountDownLatch(2)
            webCookieManager.removeAllCookies { latch.countDown() }
            webCookieManager.removeSessionCookies { latch.countDown() }
            // 最多等 1 秒防卡死（WebView 不可用时回调可能永不触发）
            latch.await(1, java.util.concurrent.TimeUnit.SECONDS)
            webCookieManager.flush()
        } catch (_: Throwable) {
            // WebView 不可用时跳过
        }
    }

    /**
     * 退出登录时调用方如果有 WebView 引用, 调一下清掉 in-memory 认证状态
     * (清缓存 + 清历史, 防止 WebView 仍持有已登录页的渲染结果)
     */
    @Suppress("unused")
    fun evictWebViewState(webView: android.webkit.WebView) {
        webView.clearCache(true)
        webView.clearHistory()
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