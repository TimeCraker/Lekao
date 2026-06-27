package com.lekao.app.ui.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.lekao.app.data.api.AuthRepository
import com.lekao.app.data.api.LekaoApi
import com.lekao.app.data.api.RetrofitClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * LoginViewModel · T12
 *
 * 状态机：
 * - mode: PASSWORD / CODE (UI 切换 2 种登录方式)
 * - email / password / code: 输入
 * - codeSent: 验证码已发送 (倒计时)
 * - submitting / sendingCode: loading
 * - error: 中文错误信息
 *
 * 成功 → AuthRepository.authState 自动更新 → Navigation 自动跳 Dashboard
 */
class LoginViewModel(
    private val authRepository: AuthRepository,
) : ViewModel() {

    enum class Mode { PASSWORD, CODE }

    data class UiState(
        val mode: Mode = Mode.PASSWORD,
        val email: String = "",
        val password: String = "",
        val code: String = "",
        val inviteCode: String = "",
        val sendingCode: Boolean = false,
        val codeSent: Boolean = false,
        val codeCountdown: Int = 0,
        val submitting: Boolean = false,
        val error: String? = null,
        val success: Boolean = false,
    )

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    fun setMode(mode: Mode) = _state.update { it.copy(mode = mode, error = null) }
    fun setEmail(email: String) = _state.update { it.copy(email = email.trim(), error = null) }
    fun setPassword(password: String) = _state.update { it.copy(password = password, error = null) }
    fun setCode(code: String) = _state.update {
        // 只允许 6 位数字
        it.copy(code = code.filter { c -> c.isDigit() }.take(6), error = null)
    }
    fun setInviteCode(code: String) = _state.update {
        // 大写字母 + 数字, 最多 8 位
        it.copy(inviteCode = code.uppercase().filter { c -> c.isLetterOrDigit() }.take(8), error = null)
    }

    /**
     * 发送验证码
     */
    fun sendCode() {
        val email = _state.value.email
        if (!isValidEmail(email)) {
            _state.update { it.copy(error = "请输入正确的邮箱") }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(sendingCode = true, error = null) }
            val result = authRepository.sendCode(email, purpose = "login")
            result.fold(
                onSuccess = {
                    _state.update {
                        it.copy(
                            sendingCode = false,
                            codeSent = true,
                            codeCountdown = 60,
                        )
                    }
                    startCountdown()
                },
                onFailure = { e ->
                    _state.update { it.copy(sendingCode = false, error = e.userMessage()) }
                }
            )
        }
    }

    /**
     * 提交登录
     */
    fun submit() {
        val s = _state.value
        if (!isValidEmail(s.email)) {
            _state.update { it.copy(error = "请输入正确的邮箱") }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(submitting = true, error = null) }
            val result = when (s.mode) {
                Mode.PASSWORD -> {
                    if (s.password.length < 6) {
                        _state.update { it.copy(submitting = false, error = "密码至少 6 位") }
                        return@launch
                    }
                    authRepository.signInWithPassword(s.email, s.password)
                }
                Mode.CODE -> {
                    if (s.code.length != 6) {
                        _state.update { it.copy(submitting = false, error = "验证码是 6 位数字") }
                        return@launch
                    }
                    authRepository.signInWithCode(s.email, s.code, s.inviteCode.ifBlank { null })
                }
            }
            result.fold(
                onSuccess = {
                    _state.update { it.copy(submitting = false, success = true) }
                },
                onFailure = { e ->
                    _state.update { it.copy(submitting = false, error = e.userMessage()) }
                }
            )
        }
    }

    private fun startCountdown() {
        viewModelScope.launch {
            while (_state.value.codeCountdown > 0) {
                kotlinx.coroutines.delay(1000)
                _state.update { it.copy(codeCountdown = (it.codeCountdown - 1).coerceAtLeast(0)) }
            }
        }
    }

    private fun isValidEmail(email: String): Boolean {
        return email.isNotBlank() && android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()
    }

    private fun Throwable.userMessage(): String {
        if (this is retrofit2.HttpException) {
            return when (code()) {
                400 -> "请求格式有误"
                401 -> "邮箱或密码错误"
                403 -> "账号已被禁用"
                404 -> "用户不存在"
                429 -> "操作太频繁, 请稍后再试"
                500, 502, 503 -> "服务器错误, 请稍后重试"
                else -> "登录失败 (HTTP ${code()})"
            }
        }
        return message ?: "网络错误"
    }

    companion object {
        fun factory(): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                val ctx = com.lekao.app.LekaoApp.instance
                val api = RetrofitClient.api(ctx)
                val tokenStore = com.lekao.app.data.local.TokenStore.getInstance(ctx)
                val cookieJar = com.lekao.app.data.api.LekaoCookieJar(ctx)
                val repo = AuthRepository(ctx, api, tokenStore, cookieJar)
                return LoginViewModel(repo) as T
            }
        }
    }
}
