package com.lekao.app.ui.admin

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.lekao.app.LekaoApp
import com.lekao.app.data.api.CoinLogDto
import com.lekao.app.data.api.LekaoApi
import com.lekao.app.data.api.RetrofitClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * AdminCoinLogViewModel · T54
 *
 * T-Coin 流水（分页 + email 过滤）
 */
class AdminCoinLogViewModel(
    private val api: LekaoApi,
) : ViewModel() {

    data class UiState(
        val logs: List<CoinLogDto> = emptyList(),
        val emailFilter: String = "",
        val loading: Boolean = false,
        val refreshing: Boolean = false,
        val loadingMore: Boolean = false,
        val page: Int = 1,
        val hasMore: Boolean = true,
        val error: String? = null,
    )

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    init {
        refresh()
    }

    fun setEmailFilter(s: String) = _state.update { it.copy(emailFilter = s) }

    fun refresh() {
        _state.update { it.copy(refreshing = true, page = 1, hasMore = true) }
        load(page = 1, isRefresh = true)
    }

    fun loadMore() {
        val s = _state.value
        if (s.loadingMore || !s.hasMore) return
        _state.update { it.copy(loadingMore = true) }
        load(page = s.page + 1)
    }

    private fun load(page: Int, isRefresh: Boolean = false) {
        viewModelScope.launch {
            if (!isRefresh) _state.update { it.copy(loading = true) }
            try {
                val email = _state.value.emailFilter.takeIf { it.isNotBlank() }
                val resp = api.getCoinLog(page = page, limit = 30, email = email)
                if (resp.isSuccessful) {
                    val body = resp.body()
                    val logs = body?.logs ?: emptyList()
                    _state.update {
                        if (isRefresh) it.copy(
                            logs = logs,
                            page = 1,
                            hasMore = logs.size >= 30,
                            refreshing = false,
                            loading = false,
                            loadingMore = false,
                            error = null,
                        ) else it.copy(
                            logs = it.logs + logs,
                            page = page,
                            hasMore = logs.size >= 30,
                            loading = false,
                            loadingMore = false,
                        )
                    }
                } else {
                    _state.update { it.copy(refreshing = false, loading = false, loadingMore = false, error = "HTTP ${resp.code()}") }
                }
            } catch (t: Throwable) {
                _state.update { it.copy(refreshing = false, loading = false, loadingMore = false, error = t.message) }
            }
        }
    }

    companion object {
        fun factory(): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                val ctx = LekaoApp.instance
                val api = RetrofitClient.api(ctx)
                return AdminCoinLogViewModel(api) as T
            }
        }
    }
}