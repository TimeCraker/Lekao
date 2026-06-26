package com.lekao.app.ui.ideas

import androidx.compose.runtime.Composable
import com.lekao.app.ui.components.PlaceholderScreen

/**
 * 灵感详情 · F09
 * D1-E T44 实现
 */
@Composable
fun IdeaDetailScreen(
    ideaId: String,
    onNavigateBack: () -> Unit
) {
    PlaceholderScreen(
        title = "灵感详情 #$ideaId",
        specRef = "V1.0.0 §1.2 F09",
        onNavigateBack = onNavigateBack
    )
}