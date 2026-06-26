package com.lekao.app.ui.admin

import androidx.compose.runtime.Composable
import com.lekao.app.ui.components.PlaceholderScreen

/**
 * Admin 封禁查询 · F10
 * D1-E T51 实现
 */
@Composable
fun AdminUserBanScreen(
    onNavigateBack: () -> Unit
) {
    PlaceholderScreen(
        title = "封禁查询",
        specRef = "V1.0.0 §1.2 F10",
        onNavigateBack = onNavigateBack
    )
}