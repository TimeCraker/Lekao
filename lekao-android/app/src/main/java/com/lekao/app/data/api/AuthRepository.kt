package com.lekao.app.data.api

import android.content.Context
import com.lekao.app.data.local.TokenStore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext

/**
 * AuthRepository · T11
 *
 * 包装 LekaoApi 的 6 个 auth 接口 + 管理登录状态
 *
 * 关键设计：
 * - 登录成功 → JWT cookie 由 OkHttp CookieJar 自动存
 * - TokenStore 存 user info (id/email/name/role/tCoin) 用于离线显示
 * - AuthState (StateFlow<UserDto?>) 全局可观察, 登录状态变化自动驱动 Navigation 跳转
 */
class AuthRepository(
    private val context: Context,
    private val api: LekaoApi,
    private val tokenStore: TokenStore,
    private val cookieJar: LekaoCookieJar,
) {

    private val _authState = MutableStateFlow<UserDto?>(null)
    val authState: StateFlow<UserDto?> = _authState.asStateFlow()

    /**
     * App 启动时调用: 尝试从本地 TokenStore 恢复 user, 然后后台调 /me 验证
     */
    suspend fun bootstrap(): Result<UserDto?> = withContext(Dispatchers.IO) {
        val localUser = tokenStore.currentUser()
        if (localUser == null) {
            _authState.value = null
            return@withContext Result.success(null)
        }
        // 先用本地数据点亮 UI, 后台异步验证 cookie 是否还有效
        _authState.value = localUser
        val meResult = me()
        meResult.fold(
            onSuccess = { user ->
                _authState.value = user
                Result.success(user)
            },
            onFailure = { error ->
                // 401 → cookie 失效 → 清状态
                if (error is retrofit2.HttpException && error.code() == 401) {
                    clearAuth()
                }
                Result.failure(error)
            }
        )
    }

    /**
     * 邮箱密码登录 (F01)
     */
    suspend fun signInWithPassword(email: String, password: String): Result<UserDto> = withContext(Dispatchers.IO) {
        runCatching {
            val resp = api.signInWithPassword(SignInPasswordRequest(email, password))
            if (!resp.isSuccessful) throw retrofit2.HttpException(resp)
            val body = resp.body() ?: throw IllegalStateException("空响应")
            val user = body.user ?: UserDto(
                id = body.tCoin.toString(),
                email = email,
                name = null,
                role = "USER",
                tCoin = body.tCoin,
                lekaoGiftCoin = body.lekaoGiftCoin
            )
            tokenStore.saveUser(user)
            _authState.value = user
            user
        }
    }

    /**
     * 发送验证码 (F02)
     *
     * 失败时优先返回服务端 error 字段（真实原因）：
     * - "该邮箱未注册" / "请 30 秒后再试" / "邮件发送失败" / "该邮箱已注册" 等
     * HTTP 状态码只有兜底意义（如网络 5xx 用"服务器错误"）
     */
    suspend fun sendCode(email: String, purpose: String = "login"): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val resp = api.sendCode(SendCodeRequest(email, purpose))
            if (resp.isSuccessful) return@withContext Result.success(Unit)
            // 解析服务端 error 字段
            val raw = resp.errorBody()?.string().orEmpty()
            val msg = parseErrorMessage(raw) ?: "发送失败 (HTTP ${resp.code()})"
            Result.failure(RuntimeException(msg))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 注册新账号 (F02 register)
     * 成功后自动 signInWithPassword 走标准登录拿 cookie
     */
    suspend fun register(
        email: String,
        password: String,
        name: String?,
        code: String,
    ): Result<UserDto> = withContext(Dispatchers.IO) {
        try {
            val resp = api.register(RegisterRequest(email, password, name, code))
            if (resp.isSuccessful) {
                // 注册成功, 接着用 password 登录拿 cookie + token
                return@withContext signInWithPassword(email, password)
            }
            val raw = resp.errorBody()?.string().orEmpty()
            val msg = parseErrorMessage(raw) ?: "注册失败 (HTTP ${resp.code()})"
            Result.failure(RuntimeException(msg))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 验证码登录 (F02)
     *
     * 失败时优先返回服务端 error 字段（真实原因）：
     * - "验证码错误或已过期" / "账号已被封禁" / "用户不存在" 等
     */
    suspend fun signInWithCode(email: String, code: String, inviteCode: String? = null): Result<UserDto> = withContext(Dispatchers.IO) {
        try {
            val resp = api.verifyCode(VerifyCodeRequest(email, code, inviteCode))
            if (resp.isSuccessful) {
                val body = resp.body() ?: return@withContext Result.failure(IllegalStateException("空响应"))
                val user = body.user ?: UserDto(
                    id = "",
                    email = email,
                    name = null,
                    role = "USER",
                    tCoin = body.tCoin,
                    lekaoGiftCoin = body.lekaoGiftCoin
                )
                tokenStore.saveUser(user)
                _authState.value = user
                return@withContext Result.success(user)
            }
            val raw = resp.errorBody()?.string().orEmpty()
            val msg = parseErrorMessage(raw) ?: "登录失败 (HTTP ${resp.code()})"
            Result.failure(RuntimeException(msg))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 获取当前用户信息 (F03)
     */
    suspend fun me(): Result<UserDto> = withContext(Dispatchers.IO) {
        runCatching {
            val resp = api.me()
            if (!resp.isSuccessful) throw retrofit2.HttpException(resp)
            val body = resp.body() ?: throw IllegalStateException("空响应")
            tokenStore.saveUser(body.user)
            _authState.value = body.user
            body.user
        }
    }

    /**
     * 退出登录 (F08)
     *
     * 流程：
     * 1) 调 /api/auth/signout 让服务端撤销 session
     * 2) 清本地 user info
     * 3) 异步清 OkHttp cookieJar (返回 future, fire-and-forget for current API)
     * 4) 清 WebView cookie (如果有引用) — caller 在 logout flow 里 await future
     */
    suspend fun signOut(webView: android.webkit.WebView? = null): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            // 尝试调服务端 signout (失败也继续清本地)
            runCatching { api.signOut() }
            clearAuth()
            cookieJar.clearAll(webView).get()  // await WebView cleanup
            Unit
        }
    }

    private suspend fun clearAuth() {
        tokenStore.clearUser()
        _authState.value = null
    }

    /**
     * 解析服务端 { error: "..." } JSON 字段
     * 服务端 Next.js route.ts 全部用 NextResponse.json({ error: "..." }) 返错
     */
    private fun parseErrorMessage(raw: String): String? {
        if (raw.isBlank()) return null
        return try {
            val obj = org.json.JSONObject(raw)
            obj.optString("error").takeIf { it.isNotBlank() }
                ?: obj.optString("message").takeIf { it.isNotBlank() }
                ?: obj.optString("reason").takeIf { it.isNotBlank() }
        } catch (_: Exception) {
            null
        }
    }
}
