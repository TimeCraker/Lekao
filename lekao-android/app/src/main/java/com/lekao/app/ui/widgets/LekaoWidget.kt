package com.lekao.app.ui.widgets

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.Box
import androidx.glance.layout.fillMaxSize
import androidx.glance.text.Text

/**
 * Lekao Glance AppWidget 占位 · M11
 * D1-E T49 真实实现
 *
 * Glance 1.1.0: 必须 override provideGlance(context, id),在 provideContent 里渲染 Content
 */
class LekaoWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            LekaoWidgetContent()
        }
    }

    @Composable
    private fun LekaoWidgetContent() {
        Box(modifier = GlanceModifier.fillMaxSize()) {
            Text(text = "乐考")
        }
    }
}
