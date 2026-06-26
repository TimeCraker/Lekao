package com.lekao.app.ui.mistake

import androidx.compose.runtime.Composable
import com.lekao.app.ui.components.PlaceholderScreen

/**
 * 错题集草稿箱 · M09
 * D1-D T36-T39 实现
 */
@Composable
fun MistakeDraftsScreen(
    onNavigateBack: () -> Unit
) {
    PlaceholderScreen(
        title = "草稿箱",
        specRef = "V1.0.0 §1.3 M09 (Room + WorkManager)",
        onNavigateBack = onNavigateBack
    )
}