package com.lekao.app.ui.mistake

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.lekao.app.data.api.AuthRepository
import com.lekao.app.data.api.LekaoApi
import com.lekao.app.data.api.LekaoCookieJar
import com.lekao.app.data.api.MistakeDto
import com.lekao.app.data.api.MistakeRepository
import com.lekao.app.data.api.RetrofitClient
import com.lekao.app.data.local.MistakeDraftEntity
import com.lekao.app.data.local.TokenStore
import com.lekao.app.work.MistakeSyncWorker
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * MistakeDraftsViewModel · T42-T44 + M09
 *
 * 草稿箱 + 已同步错题列表
 *
 * 数据源：
 * 1. 本地草稿箱 (Room) — 观察 user email 维度的所有 draft
 * 2. 服务端错题列表 (API) — 拉取后缓存到内存
 *
 * UI：
 * - 顶部 tab: 草稿箱 / 已同步
 * - 草稿: PENDING / SYNCED / FAILED 状态显示
 * - 已同步: 列表显示 + 选中可导出 docx
 * - 失败草稿: 重试按钮
 */
class MistakeDraftsViewModel(
    private val context: Context,
    private val repository: MistakeRepository,
    private val authRepository: AuthRepository,
) : ViewModel() {

    enum class Tab { DRAFTS, SYNCED }

    data class UiState(
        val tab: Tab = Tab.DRAFTS,
        val drafts: List<MistakeDraftEntity> = emptyList(),
        val synced: List<MistakeDto> = emptyList(),
        val loading: Boolean = false,
        val exporting: Boolean = false,
        val exportUrl: String? = null,
        val error: String? = null,
        val selectedForExport: Set<String> = emptySet(),
    )

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            authRepository.authState.collect { user ->
                if (user != null) {
                    repository.observeDrafts(user.email).collect { drafts ->
                        _state.update { it.copy(drafts = drafts) }
                    }
                }
            }
        }
        loadSynced()
    }

    fun setTab(tab: Tab) = _state.update { it.copy(tab = tab) }

    fun loadSynced() {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            val result = repository.fetchList(page = 1, limit = 50)
            result.fold(
                onSuccess = { resp ->
                    _state.update { it.copy(loading = false, synced = resp.mistakes) }
                },
                onFailure = { e ->
                    _state.update { it.copy(loading = false, error = e.message ?: "加载失败") }
                }
            )
        }
    }

    fun deleteDraft(id: Long) {
        viewModelScope.launch {
            repository.deleteDraft(id)
        }
    }

    fun retryDraft(draft: MistakeDraftEntity) {
        viewModelScope.launch {
            // 直接触发一次同步即可
            MistakeSyncWorker.enqueueOneTime(context)
        }
    }

    fun toggleExport(mistakeId: String) {
        _state.update {
            val newSet = if (it.selectedForExport.contains(mistakeId))
                it.selectedForExport - mistakeId
            else
                it.selectedForExport + mistakeId
            it.copy(selectedForExport = newSet)
        }
    }

    fun exportDocx() {
        val ids = _state.value.selectedForExport.toList()
        if (ids.isEmpty()) {
            _state.update { it.copy(error = "请先选择要导出的错题") }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(exporting = true, error = null, exportUrl = null) }
            val result = repository.exportDocx(ids)
            result.fold(
                onSuccess = { resp ->
                    _state.update {
                        it.copy(
                            exporting = false,
                            exportUrl = "${com.lekao.app.data.api.LekaoConfig.BASE_URL}${resp.downloadUrl}",
                        )
                    }
                },
                onFailure = { e ->
                    _state.update { it.copy(exporting = false, error = e.message ?: "导出失败") }
                }
            )
        }
    }

    companion object {
        fun factory(): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                val ctx = com.lekao.app.LekaoApp.instance
                val api = RetrofitClient.api(ctx)
                val repo = MistakeRepository(ctx, api)
                val tokenStore = TokenStore.getInstance(ctx)
                val cookieJar = LekaoCookieJar(ctx)
                val authRepo = AuthRepository(ctx, api, tokenStore, cookieJar)
                return MistakeDraftsViewModel(ctx, repo, authRepo) as T
            }
        }
    }
}