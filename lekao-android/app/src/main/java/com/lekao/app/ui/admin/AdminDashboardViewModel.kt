package com.lekao.app.ui.admin

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.lekao.app.LekaoApp
import com.lekao.app.data.api.RetrofitClient

/**
 * AdminDashboardViewModel · T53
 *
 * Admin 后台首页（导航中心）
 * - 后端没有 /admin/stats，故 Dashboard 本身只做 4 个入口卡片
 * - 真实数据在子页 (CoinLog / AuditLog / UserBan) 加载
 */
class AdminDashboardViewModel : ViewModel() {

    /** 入口列表（前端硬编码，不调 API） */
    val entries = listOf(
        AdminEntry("T-Coin 流水", "用户余额变动 + 调整记录", "coin_log"),
        AdminEntry("审计日志", "管理员操作 + 用户行为追溯", "audit_log"),
        AdminEntry("封禁 / 调币", "封禁用户 / 调整 T-Coin", "user_ban"),
        AdminEntry("错题列表", "查看全平台错题", "mistake_list"),
    )

    data class AdminEntry(val title: String, val subtitle: String, val route: String)

    companion object {
        fun factory(): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                return AdminDashboardViewModel() as T
            }
        }
    }
}