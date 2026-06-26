package com.lekao.app.ui.widgets

import androidx.compose.runtime.Composable
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.layout.Box
import androidx.glance.layout.fillMaxSize
import androidx.glance.text.Text

/**
 * Lekao Glance AppWidget 占位 · M11
 * D1-E T49 真实实现
 */
class LekaoWidget : GlanceAppWidget() {
    @Composable
    override fun Content() {
        Box(modifier = GlanceModifier.fillMaxSize()) {
            Text(text = "乐考")
        }
    }
}