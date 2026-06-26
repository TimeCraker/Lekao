package com.lekao.app.ui.feedback

import androidx.compose.runtime.Composable
import com.lekao.app.ui.components.PlaceholderScreen

/**
 * 课堂反馈 · F05
 * D1-C T23-T24 实现
 */
@Composable
fun FeedbackScreen(
    onNavigateBack: () -> Unit
) {
    PlaceholderScreen(
        title = "家长反馈",
        specRef = "V1.0.0 §1.2 F05",
        onNavigateBack = onNavigateBack
    )
}