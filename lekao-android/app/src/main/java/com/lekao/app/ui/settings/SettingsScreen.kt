package com.lekao.app.ui.settings

import androidx.compose.runtime.Composable
import com.lekao.app.ui.components.PlaceholderScreen

/**
 * 个人中心 · F08 + M13/M14 主题/语言切换
 * D1-E T46 + D1-F T53-T54 实现
 */
@Composable
fun SettingsScreen(
    onNavigateBack: () -> Unit,
    onNavigateToLogin: () -> Unit,
    onNavigateToAdmin: () -> Unit
) {
    PlaceholderScreen(
        title = "个人中心",
        specRef = "V1.0.0 §1.2 F08 + §1.3 M13/M14",
        onNavigateBack = onNavigateBack
    )
}