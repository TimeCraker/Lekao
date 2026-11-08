package com.lekao.app.data.api

import android.content.Context
import android.webkit.CookieManager as WebCookieManager
import android.webkit.CookieSyncManager
import android.webkit.WebView
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import java.util.concurrent.CompletableFuture
import java.util.concurrent.atomic.AtomicInteger

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
     * 1. OkHttp cookie jar 同步清（立刻生效）
     *    → 下一 OkHttp API 请求不会带旧 session, 攻击面已闭合
     * 2. WebView 8 步清理（如果有引用）同步执行
     * 3. WebView cookie store 异步清理 + **暴露 CompletableFuture 给调用方 await**
     *    → 调用方（未来 logout flow / 下一个 screen）在做 WebView 导航前可 .get() 等清理完成
     *    → 避免 "fire-and-forget 留下 multi-tick race window" 的漏洞
     *    → 1s 超时保护（WebView 不可用时回调永不触发 → 强制 complete(false)）
     *    → 超时守护线程是 daemon（不阻塞 app shutdown）
     *
     * 关键：调用方必须 await 这个 future 再做任何 WebView 导航，否则旧 cookie 可能在 future
     *       complete 之前被 WebView 读到
     *
     * @param webView 可选 WebView 引用。若 app 没用 WebView 传 null 即可。
     * @return CompletableFuture<Boolean>:
     *   - true = WebView cookie 清理回调全部触发
     *   - false = WebView 不可用 或 1s 超时
     */
    fun clearAll(webView: WebView? = null): CompletableFuture<Boolean> {
        // 1) OkHttp 权威 cookie jar 同步清（立即生效）
        store.clear()
        // 2) WebView in-memory 状态同步清（如果有引用）
        if (webView != null) {
            webView.stopLoading()
            webView.loadUrl("about:blank")
            webView.clearHistory()
            webView.clearCache(true)
            webView.clearFormData()
            webView.clearMatches()
            webView.clearSslPreferences()
        }
        // 3) WebView cookie store 异步清理 + future 暴露
        val future = CompletableFuture<Boolean>()
        val remaining = AtomicInteger(2)
        val tryComplete: () -> Unit = {
            if (remaining.decrementAndGet() == 0) future.complete(true)
        }
        try {
            val wcm = WebCookieManager.getInstance()
            wcm.removeAllCookies { tryComplete() }
            wcm.removeSessionCookies { tryComplete() }
        } catch (t: Throwable) {
            android.util.Log.w("LekaoCookie", "WebView cookie clear failed: ${t.message}")
            future.complete(false)
            return future
        }
        // 4) 超时守护线程（daemon, 不阻塞主线程也不阻塞 app shutdown）
        Thread({
            Thread.sleep(1_000)
            if (!future.isDone) {
                remaining.set(0)  // 后续回调不再重复 complete
                future.complete(false)
            }
        }, "LekaoCookie-Clear-Timeout").apply { isDaemon = true }.start()
        return future
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
