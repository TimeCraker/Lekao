package com.lekao.app.ui.admin

import androidx.compose.runtime.Composable
import com.lekao.app.ui.components.PlaceholderScreen

/**
 * Admin T-Coin 流水 · F10 + M15 图表
 * D1-E T51 + D1-F T55 实现
 */
@Composable
fun AdminCoinLogScreen(
    onNavigateBack: () -> Unit
) {
    PlaceholderScreen(
        title = "T-Coin 流水",
        specRef = "V1.0.0 §1.2 F10 + §1.3 M15",
        onNavigateBack = onNavigateBack
    )
}