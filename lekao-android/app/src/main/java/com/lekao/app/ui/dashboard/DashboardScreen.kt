package com.lekao.app.ui.dashboard

import androidx.compose.runtime.Composable
import com.lekao.app.ui.components.PlaceholderScreen

/**
 * Dashboard 工作台 · F03 + M15 图表
 * D1-B T19-T20 实现
 */
@Composable
fun DashboardScreen(
    onNavigateToSummary: () -> Unit,
    onNavigateToFeedback: () -> Unit,
    onNavigateToMistake: () -> Unit,
    onNavigateToIdeas: () -> Unit,
    onNavigateToSettings: () -> Unit
) {
    PlaceholderScreen(
        title = "工作台",
        specRef = "V1.0.0 §1.2 F03 + §1.3 M15",
        showBackButton = false
    )
}