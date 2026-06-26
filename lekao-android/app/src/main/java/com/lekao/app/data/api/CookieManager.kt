package com.lekao.app.data.api

import android.content.Context
import android.webkit.CookieManager as WebCookieManager
import android.webkit.CookieSyncManager
import android.webkit.WebView
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
     * 安全模型（default-deny for stale auth state）：
     * 1. OkHttp cookie jar 同步清（立刻生效, 主线程零阻塞）
     *    → 下一 OkHttp API 请求不会带旧 session, 攻击面已闭合
     * 2. WebView cookie 异步 fire-and-forget 清理
     *    → 不阻塞主线程（避免 1s+ 阻塞触发 ANR）
     *    → 残留 cookie 只在用户主动打开 WebView 加载 lekao 域时才有意义
     *    → 此时服务端 Set-Cookie 会立即覆盖旧值（无 session = 未登录）
     * 3. 若 caller 持有 WebView 引用（如 WebView 用于 PWA / OAuth），必须传 webView 参数
     *    → 内部完成 8 步完整清理（stopLoading → about:blank → clearHistory
     *       → clearCache → clearFormData → clearMatches → clearSslPreferences → removeAllCookies）
     *
     * ⚠️ 不要在调用方用 latch.await 等 WebView 异步回调 — 主线程阻塞会触发 ANR
     *
     * @param webView 可选 WebView 引用。若 app 没用 WebView 传 null 即可。
     * @return true 表示 WebView cookie 清理已发起; false 表示 WebView 不可用
     */
    fun clearAll(webView: WebView? = null): Boolean {
        store.clear()
        // 1) WebView 完整 in-memory 清理 (如果有引用)
        if (webView != null) {
            webView.stopLoading()
            webView.loadUrl("about:blank")
            webView.clearHistory()
            webView.clearCache(true)
            webView.clearFormData()
            webView.clearMatches()
            webView.clearSslPreferences()
        }
        // 2) WebView cookie store 异步清理 (fire-and-forget, 不阻塞主线程)
        return try {
            val wcm = WebCookieManager.getInstance()
            wcm.removeAllCookies(null)
            wcm.removeSessionCookies(null)
            wcm.flush()
            true
        } catch (t: Throwable) {
            android.util.Log.w("LekaoCookie", "WebView cookie clear failed: ${t.message}")
            false
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
