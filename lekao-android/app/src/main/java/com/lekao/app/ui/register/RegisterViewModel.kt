package com.lekao.app.ui.register

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.lekao.app.data.api.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * RegisterViewModel · T82b
 *
 * 状态机：
 * - email / name / password / confirmPassword / code: 输入
 * - agreeTerms: 服务条款勾选
 * - sendingCode / submitting: loading
 * - codeSent: 验证码已发送 (倒计时)
 * - error: 中文错误信息（透传服务端 error 字段）
 *
 * 成功 → AuthRepository.authState 自动更新 → Navigation 跳 Dashboard
 */
class RegisterViewModel(
    private val authRepository: AuthRepository,
) : ViewModel() {

    data class UiState(
        val email: String = "",
        val name: String = "",
        val password: String = "",
        val confirmPassword: String = "",
        val code: String = "",
        val inviteCode: String = "",
        val agreeTerms: Boolean = false,
        val sendingCode: Boolean = false,
        val codeSent: Boolean = false,
        val codeCountdown: Int = 0,
        val submitting: Boolean = false,
        val error: String? = null,
        val success: Boolean = false,
    )

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    fun setEmail(email: String) = _state.update { it.copy(email = email.trim(), error = null) }
    fun setName(name: String) = _state.update { it.copy(name = name.trim(), error = null) }
    fun setPassword(password: String) = _state.update { it.copy(password = password, error = null) }
    fun setConfirmPassword(p: String) = _state.update { it.copy(confirmPassword = p, error = null) }
    fun setCode(code: String) = _state.update {
        it.copy(code = code.filter { c -> c.isDigit() }.take(6), error = null)
    }
    fun setInviteCode(code: String) = _state.update {
        it.copy(inviteCode = code.uppercase().filter { c -> c.isLetterOrDigit() }.take(8), error = null)
    }
    fun setAgreeTerms(agree: Boolean) = _state.update { it.copy(agreeTerms = agree, error = null) }

    /**
     * 发送注册验证码 (purpose=register, 服务端区分登录/重置/注册)
     */
    fun sendCode() {
        val email = _state.value.email
        if (!isValidEmail(email)) {
            _state.update { it.copy(error = "请输入正确的邮箱") }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(sendingCode = true, error = null) }
            val result = authRepository.sendCode(email, purpose = "register")
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
     * 提交注册 (注册成功 → AuthRepository.register 内置 signInWithPassword 拿 cookie)
     */
    fun submit() {
        val s = _state.value
        if (!isValidEmail(s.email)) {
            _state.update { it.copy(error = "请输入正确的邮箱") }
            return
        }
        if (s.password.length < 8) {
            _state.update { it.copy(error = "密码至少 8 位") }
            return
        }
        if (s.password != s.confirmPassword) {
            _state.update { it.copy(error = "两次密码不一致") }
            return
        }
        if (s.code.length != 6) {
            _state.update { it.copy(error = "验证码是 6 位数字") }
            return
        }
        if (!s.agreeTerms) {
            _state.update { it.copy(error = "请先同意服务条款和隐私政策") }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(submitting = true, error = null) }
            val result = authRepository.register(
                email = s.email,
                password = s.password,
                name = s.name.ifBlank { null },
                code = s.code,
            )
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

    /**
     * 错误信息透传 (跟 LoginViewModel 同款兜底)
     */
    private fun Throwable.userMessage(): String {
        val msg = this.message
        return when {
            this is java.io.IOException -> "网络错误, 请检查连接后重试"
            !msg.isNullOrBlank() -> msg
            else -> "操作失败, 请重试"
        }
    }

    companion object {
        fun factory(): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                val ctx = com.lekao.app.LekaoApp.instance
                val api = com.lekao.app.data.api.RetrofitClient.api(ctx)
                val tokenStore = com.lekao.app.data.local.TokenStore.getInstance(ctx)
                val cookieJar = com.lekao.app.data.api.LekaoCookieJar(ctx)
                val repo = AuthRepository(ctx, api, tokenStore, cookieJar)
                return RegisterViewModel(repo) as T
            }
        }
    }
}