package com.lekao.app.ui.ideas

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.lekao.app.data.api.IdeaCommentDto
import com.lekao.app.data.api.IdeaCommentRequest
import com.lekao.app.data.api.IdeaDto
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
 * IdeaDetailViewModel · T48-T49
 *
 * 灵感详情 + 评论
 */
class IdeaDetailViewModel(
    private val ideaId: String,
    private val api: LekaoApi,
) : ViewModel() {

    data class UiState(
        val idea: IdeaDto? = null,
        val comments: List<IdeaCommentDto> = emptyList(),
        val newComment: String = "",
        val loading: Boolean = false,
        val submitting: Boolean = false,
        val error: String? = null,
    )

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            try {
                // 加载灵感详情（用 list 过滤，因为没有 /lekao/ideas/:id 详情接口）
                val listResp = api.listIdeas(sort = "new")
                val found = listResp.body()?.ideas?.firstOrNull { it.id == ideaId }
                val commentsResp = api.getIdeaComments(ideaId)
                val comments = commentsResp.body()?.comments ?: emptyList()
                _state.update {
                    it.copy(
                        loading = false,
                        idea = found,
                        comments = comments,
                    )
                }
            } catch (t: Throwable) {
                _state.update { it.copy(loading = false, error = t.message) }
            }
        }
    }

    fun setNewComment(s: String) = _state.update { it.copy(newComment = s.take(200)) }

    fun submitComment() {
        val s = _state.value
        if (s.newComment.isBlank()) return
        viewModelScope.launch {
            _state.update { it.copy(submitting = true) }
            try {
                val resp = api.postIdeaComment(ideaId, IdeaCommentRequest(s.newComment))
                if (resp.isSuccessful) {
                    _state.update { it.copy(submitting = false, newComment = "") }
                    load()
                } else {
                    _state.update { it.copy(submitting = false, error = "HTTP ${resp.code()}") }
                }
            } catch (t: Throwable) {
                _state.update { it.copy(submitting = false, error = t.message) }
            }
        }
    }

    companion object {
        fun factory(ideaId: String): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                val ctx = com.lekao.app.LekaoApp.instance
                val api = RetrofitClient.api(ctx)
                return IdeaDetailViewModel(ideaId, api) as T
            }
        }
    }
}