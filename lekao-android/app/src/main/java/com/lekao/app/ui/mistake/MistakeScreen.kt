package com.lekao.app.ui.mistake

import androidx.compose.runtime.Composable
import com.lekao.app.ui.components.PlaceholderScreen

/**
 * 错题集 · F06 + M01/M02/M03/M05/M06/M10
 * D1-D T27-T35 实现
 */
@Composable
fun MistakeScreen(
    onNavigateBack: () -> Unit,
    onNavigateToDrafts: () -> Unit
) {
    PlaceholderScreen(
        title = "错题集",
        specRef = "V1.0.0 §1.2 F06 + §1.3 M01/M02/M03/M05/M06/M10",
        onNavigateBack = onNavigateBack
    )
}