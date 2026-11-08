package com.lekao.app.ui.ideas

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.lekao.app.data.api.AuthRepository
import com.lekao.app.data.api.IdeaDto
import com.lekao.app.data.api.IdeaSubmitRequest
import com.lekao.app.data.api.LekaoApi
import com.lekao.app.data.api.LekaoCookieJar
import com.lekao.app.data.api.RetrofitClient
import com.lekao.app.data.local.TokenStore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * IdeasViewModel · T45-T47
 *
 * 灵感墙：
 * - 排序: top / new / comments
 * - Top 3 单独展示
 * - 列表 + 点赞
 * - 提交灵感 (submit)
 */
class IdeasViewModel(
    private val api: LekaoApi,
    private val authRepository: AuthRepository,
) : ViewModel() {

    enum class Sort(val apiValue: String, val label: String) {
        TOP("top", "本周 TOP"),
        NEW("new", "最新"),
        COMMENTS("comments", "热议"),
    }

    data class UiState(
        val sort: Sort = Sort.TOP,
        val ideas: List<IdeaDto> = emptyList(),
        val top3: List<IdeaDto> = emptyList(),
        val loading: Boolean = false,
        val submitting: Boolean = false,
        val submitDialog: Boolean = false,
        val newTitle: String = "",
        val newDescription: String = "",
        val error: String? = null,
    )

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    init {
        refresh()
    }

    fun setSort(sort: Sort) {
        _state.update { it.copy(sort = sort) }
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            try {
                val resp = api.listIdeas(sort = _state.value.sort.apiValue)
                if (resp.isSuccessful) {
                    val body = resp.body()
                    _state.update {
                        it.copy(
                            loading = false,
                            ideas = body?.ideas ?: emptyList(),
                            top3 = body?.top3 ?: emptyList(),
                        )
                    }
                } else {
                    _state.update { it.copy(loading = false, error = "HTTP ${resp.code()}") }
                }
            } catch (t: Throwable) {
                _state.update { it.copy(loading = false, error = t.userMessage()) }
            }
        }
    }

    fun openSubmit() = _state.update { it.copy(submitDialog = true, newTitle = "", newDescription = "", error = null) }
    fun closeSubmit() = _state.update { it.copy(submitDialog = false, error = null) }
    fun setTitle(s: String) = _state.update { it.copy(newTitle = s.take(50), error = null) }
    fun setDescription(s: String) = _state.update { it.copy(newDescription = s.take(500), error = null) }

    fun submitIdea() {
        val s = _state.value
        if (s.newTitle.isBlank()) {
            _state.update { it.copy(error = "请填写标题") }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(submitting = true, error = null) }
            try {
                val resp = api.submitIdea(IdeaSubmitRequest(s.newTitle, s.newDescription))
                if (resp.isSuccessful) {
                    _state.update { it.copy(submitting = false, submitDialog = false) }
                    refresh()
                } else {
                    _state.update { it.copy(submitting = false, error = "HTTP ${resp.code()}") }
                }
            } catch (t: Throwable) {
                _state.update { it.copy(submitting = false, error = t.userMessage()) }
            }
        }
    }

    fun like(ideaId: String) {
        viewModelScope.launch {
            try {
                api.likeIdea(ideaId)
                refresh()
            } catch (_: Throwable) { }
        }
    }

    private fun Throwable.userMessage(): String {
        if (this is retrofit2.HttpException) {
            return when (code()) {
                401 -> "登录已过期"
                429 -> "请求太频繁"
                in 500..599 -> "服务器错误"
                else -> "HTTP ${code()}"
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
                val tokenStore = TokenStore.getInstance(ctx)
                val cookieJar = LekaoCookieJar(ctx)
                val repo = AuthRepository(ctx, api, tokenStore, cookieJar)
                return IdeasViewModel(api, repo) as T
            }
        }
    }
}