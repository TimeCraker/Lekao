package com.lekao.app.ui.widgets

import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver

/**
 * Glance AppWidget Receiver · M11 桌面小部件
 *
 * 真实实现见 D1-E T49（Glance AppWidget 显示 T-Coin 余额 + 快捷入口）
 * 当前为占位接收器（让 Manifest 引用能编译）
 */
class LekaoWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = LekaoWidget()
}