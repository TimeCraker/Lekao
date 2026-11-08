package com.lekao.app.ui.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.lekao.app.data.api.AuthRepository
import com.lekao.app.data.api.LekaoApi
import com.lekao.app.data.api.LekaoCookieJar
import com.lekao.app.data.api.RetrofitClient
import com.lekao.app.data.api.UserDto
import com.lekao.app.data.local.TokenStore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * DashboardViewModel · T19
 *
 * 状态：
 * - user: 当前用户 (来自 AuthRepository.authState)
 * - loading: 加载中
 * - refreshTrigger: 触发刷新的计数器 (用于 Vico 图表更新)
 */
class DashboardViewModel(
    private val authRepository: AuthRepository,
    private val api: LekaoApi,
) : ViewModel() {

    data class UiState(
        val user: UserDto? = null,
        val loading: Boolean = false,
        val refreshTrigger: Int = 0,
    )

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    val authState = authRepository.authState

    init {
        viewModelScope.launch {
            authRepository.authState.collect { user ->
                _state.update { it.copy(user = user) }
            }
        }
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _state.update { it.copy(loading = true) }
            authRepository.me().onFailure {
                // /me 失败 (网络问题) 不影响 UI, 用本地 user
            }
            _state.update {
                it.copy(
                    loading = false,
                    refreshTrigger = it.refreshTrigger + 1,
                )
            }
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
                return DashboardViewModel(repo, api) as T
            }
        }
    }
}
