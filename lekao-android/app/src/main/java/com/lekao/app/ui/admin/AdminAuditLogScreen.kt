package com.lekao.app.ui.admin

import androidx.compose.runtime.Composable
import com.lekao.app.ui.components.PlaceholderScreen

/**
 * Admin 审计日志 · F10
 * D1-E T51 实现
 */
@Composable
fun AdminAuditLogScreen(
    onNavigateBack: () -> Unit
) {
    PlaceholderScreen(
        title = "审计日志",
        specRef = "V1.0.0 §1.2 F10",
        onNavigateBack = onNavigateBack
    )
}