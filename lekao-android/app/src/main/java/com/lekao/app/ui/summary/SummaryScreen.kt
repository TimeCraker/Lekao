package com.lekao.app.ui.summary

import androidx.compose.runtime.Composable
import com.lekao.app.ui.components.PlaceholderScreen

/**
 * 课堂小结 · F04 + M16 OCR
 * D1-C T21-T22 + T25 实现
 */
@Composable
fun SummaryScreen(
    onNavigateBack: () -> Unit
) {
    PlaceholderScreen(
        title = "课堂小结",
        specRef = "V1.0.0 §1.2 F04 + §1.3 M16",
        onNavigateBack = onNavigateBack
    )
}