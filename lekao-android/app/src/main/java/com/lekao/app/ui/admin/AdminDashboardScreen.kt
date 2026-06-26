package com.lekao.app.ui.admin

import androidx.compose.runtime.Composable
import com.lekao.app.ui.components.PlaceholderScreen

/**
 * Admin 后台首页 · F10
 * D1-E T50 实现
 */
@Composable
fun AdminDashboardScreen(
    onNavigateBack: () -> Unit,
    onNavigateToCoinLog: () -> Unit,
    onNavigateToAuditLog: () -> Unit,
    onNavigateToUserBan: () -> Unit
) {
    PlaceholderScreen(
        title = "后台管理",
        specRef = "V1.0.0 §1.2 F10",
        onNavigateBack = onNavigateBack
    )
}