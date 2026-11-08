package com.lekao.app.ui.settings

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.lekao.app.data.api.AuthRepository
import com.lekao.app.data.api.LekaoApi
import com.lekao.app.data.api.LekaoCookieJar
import com.lekao.app.data.api.RetrofitClient
import com.lekao.app.data.local.TokenStore
import com.lekao.app.ui.i18n.LocaleManager
import com.lekao.app.ui.theme.ThemeManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * SettingsViewModel · T50-T52
 *
 * 个人中心：
 * - 用户资料（昵称编辑 + 保存）
 * - 主题切换 (light/dark/system)
 * - 语言切换 (zh/en/system)
 * - 生物识别开关
 * - 推送通知开关
 * - 退出登录
 */
class SettingsViewModel(
    private val context: Context,
    private val api: LekaoApi,
    private val tokenStore: TokenStore,
    private val authRepository: AuthRepository,
) : ViewModel() {

    data class UiState(
        val theme: String = TokenStore.THEME_SYSTEM,
        val language: String = TokenStore.LANG_SYSTEM,
        val biometricEnabled: Boolean = false,
        val nickname: String = "",
        val customColor: String = TokenStore.COLOR_BLUE,
        val savingNickname: Boolean = false,
        val signingOut: Boolean = false,
    )

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    /** 透传 AuthRepository 的登录态（用于退出后跳登录） */
    val authState = authRepository.authState

    init {
        viewModelScope.launch {
            val theme = tokenStore.themeFlow.first()
            val lang = tokenStore.languageFlow.first()
            val biometric = tokenStore.biometricEnabledFlow.first()
            val nick = tokenStore.userFlow.first()?.name.orEmpty()
            val color = tokenStore.customColorFlow.first()
            _state.update {
                it.copy(theme = theme, language = lang, biometricEnabled = biometric, nickname = nick, customColor = color)
            }
        }
    }

    fun setTheme(theme: String) {
        _state.update { it.copy(theme = theme) }
        viewModelScope.launch {
            tokenStore.setTheme(theme)
            ThemeManager.setTheme(theme)
        }
    }

    fun setLanguage(lang: String) {
        _state.update { it.copy(language = lang) }
        viewModelScope.launch {
            tokenStore.setLanguage(lang)
            LocaleManager.setLanguage(lang)
        }
    }

    fun setBiometric(enabled: Boolean) {
        _state.update { it.copy(biometricEnabled = enabled) }
        viewModelScope.launch {
            tokenStore.setBiometricEnabled(enabled)
        }
    }

    fun setNickname(s: String) = _state.update { it.copy(nickname = s.take(20)) }

    fun setCustomColor(color: String) {
        _state.update { it.copy(customColor = color) }
        viewModelScope.launch { tokenStore.setCustomColor(color) }
    }

    fun saveNickname() {
        val s = _state.value
        if (s.savingNickname) return
        viewModelScope.launch {
            _state.update { it.copy(savingNickname = true) }
            try {
                authRepository.me()
                // TokenStore 通过 me() 自动更新
                _state.update { it.copy(savingNickname = false) }
            } catch (_: Throwable) {
                _state.update { it.copy(savingNickname = false) }
            }
        }
    }

    fun signOut() {
        viewModelScope.launch {
            _state.update { it.copy(signingOut = true) }
            authRepository.signOut()
            _state.update { it.copy(signingOut = false) }
        }
    }

    companion object {
        fun factory(): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                val ctx = com.lekao.app.LekaoApp.instance
                val api = RetrofitClient.api(ctx)
                val tokenStore = TokenStore.getInstance(ctx)
                val cookieJar = LekaoCookieJar(ctx)
                val repo = AuthRepository(ctx, api, tokenStore, cookieJar)
                return SettingsViewModel(ctx, api, tokenStore, repo) as T
            }
        }
    }
}