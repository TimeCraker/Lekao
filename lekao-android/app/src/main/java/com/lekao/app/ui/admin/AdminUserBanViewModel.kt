package com.lekao.app.ui.admin

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.lekao.app.LekaoApp
import com.lekao.app.data.api.BanRequest
import com.lekao.app.data.api.CoinAdjustRequest
import com.lekao.app.data.api.LekaoApi
import com.lekao.app.data.api.RetrofitClient
import com.lekao.app.util.ErrorMessages
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * AdminUserBanViewModel · T56
 *
 * 封禁 / 调币（提交对话框）
 */
class AdminUserBanViewModel(
    private val api: LekaoApi,
) : ViewModel() {

    data class UiState(
        val email: String = "",
        val reason: String = "",
        val coinAmount: String = "",
        val coinReason: String = "",
        val banSubmitting: Boolean = false,
        val coinSubmitting: Boolean = false,
        val message: String? = null,
        val error: String? = null,
    )

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    fun setEmail(s: String) = _state.update { it.copy(email = s.trim()) }
    fun setReason(s: String) = _state.update { it.copy(reason = s.take(200)) }
    fun setCoinAmount(s: String) = _state.update { it.copy(coinAmount = s.filter { c -> c.isDigit() || c == '-' }.take(8)) }
    fun setCoinReason(s: String) = _state.update { it.copy(coinReason = s.take(200)) }
    fun clearMessage() = _state.update { it.copy(message = null, error = null) }

    fun submitBan() {
        val s = _state.value
        if (s.banSubmitting || s.email.isBlank()) return
        viewModelScope.launch {
            _state.update { it.copy(banSubmitting = true, error = null, message = null) }
            try {
                val resp = api.banUser(BanRequest(email = s.email, reason = s.reason.takeIf { it.isNotBlank() }))
                if (resp.isSuccessful) {
                    _state.update {
                        it.copy(
                            banSubmitting = false,
                            message = "已封禁 ${s.email}",
                            email = "",
                            reason = "",
                        )
                    }
                } else {
                    _state.update { it.copy(banSubmitting = false, error = "封禁失败 HTTP ${resp.code()}") }
                }
            } catch (t: Throwable) {
                _state.update { it.copy(banSubmitting = false, error = "封禁失败: ${ErrorMessages.safe(t)}") }
            }
        }
    }

    fun submitCoinAdjust() {
        val s = _state.value
        if (s.coinSubmitting || s.email.isBlank() || s.coinAmount.isBlank()) return
        val amount = s.coinAmount.toIntOrNull() ?: 0
        if (amount == 0) {
            _state.update { it.copy(error = "调币数量不能为 0") }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(coinSubmitting = true, error = null, message = null) }
            try {
                val resp = api.coinAdjust(
                    CoinAdjustRequest(
                        email = s.email,
                        amount = amount,
                        reason = s.coinReason.takeIf { it.isNotBlank() },
                    )
                )
                if (resp.isSuccessful) {
                    _state.update {
                        it.copy(
                            coinSubmitting = false,
                            message = "已为 ${s.email} ${if (amount > 0) "增加" else "扣减"} $amount T-Coin",
                            coinAmount = "",
                            coinReason = "",
                        )
                    }
                } else {
                    _state.update { it.copy(coinSubmitting = false, error = "调币失败 HTTP ${resp.code()}") }
                }
            } catch (t: Throwable) {
                _state.update { it.copy(coinSubmitting = false, error = "调币失败: ${ErrorMessages.safe(t)}") }
            }
        }
    }

    companion object {
        fun factory(): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                val ctx = LekaoApp.instance
                val api = RetrofitClient.api(ctx)
                return AdminUserBanViewModel(api) as T
            }
        }
    }
}