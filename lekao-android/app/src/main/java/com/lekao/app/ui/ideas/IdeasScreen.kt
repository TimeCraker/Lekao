package com.lekao.app.ui.ideas

import androidx.compose.runtime.Composable
import com.lekao.app.ui.components.PlaceholderScreen

/**
 * 灵感墙 · F07 + M17 SSE 实时
 * D1-E T40-T45 实现
 */
@Composable
fun IdeasScreen(
    onNavigateBack: () -> Unit,
    onNavigateToDetail: (String) -> Unit
) {
    PlaceholderScreen(
        title = "灵感墙",
        specRef = "V1.0.0 §1.2 F07 + §1.3 M17",
        onNavigateBack = onNavigateBack
    )
}