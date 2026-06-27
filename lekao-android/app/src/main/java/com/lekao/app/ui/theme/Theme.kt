package com.lekao.app.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat
import com.lekao.app.data.local.TokenStore

/**
 * Lekao 主题 — M13 主题切换（深色/浅色/跟随系统 + 自定义主色）
 * 跟随系统: dynamicLightColorScheme / dynamicDarkColorScheme (Android 12+ Material You)
 * 强制主题: 走自定义 light/dark ColorScheme
 * 自定义主色: 从预设 (COLOR_BLUE/CORAL/EMERALD/PURPLE/AMBER) 选
 */

private fun LekaoLightColorScheme(customPrimary: Color = LekaoBlue, customPrimaryText: Color = LekaoBlueText) =
    lightColorScheme(
        primary = customPrimary,
        onPrimary = LekaoWhite,
        primaryContainer = customPrimaryText,
        onPrimaryContainer = LekaoWhite,
        secondary = LekaoSignal,
        onSecondary = LekaoWhite,
        tertiary = LekaoSuccess,
        onTertiary = LekaoWhite,
        background = LekaoCanvas,
        onBackground = LekaoInk,
        surface = LekaoWhite,
        onSurface = LekaoInk,
        surfaceVariant = LekaoCanvasAlt,
        onSurfaceVariant = LekaoInkMuted,
        outline = LekaoHairline,
        outlineVariant = LekaoHairline,
        error = LekaoError,
        onError = LekaoWhite
    )

private fun LekaoDarkColorScheme(customPrimary: Color = LekaoBlueDark, customPrimaryText: Color = LekaoBlueTextDark) =
    darkColorScheme(
        primary = customPrimary,
        onPrimary = LekaoInkDark,
        primaryContainer = customPrimaryText,
        onPrimaryContainer = LekaoInkDark,
        secondary = LekaoSignal,
        onSecondary = LekaoInkDark,
        tertiary = LekaoSuccess,
        onTertiary = LekaoInkDark,
        background = LekaoCanvasDark,
        onBackground = LekaoInkDark,
        surface = LekaoCanvasAltDark,
        onSurface = LekaoInkDark,
        surfaceVariant = LekaoCanvasAltDark,
        onSurfaceVariant = LekaoInkMutedDark,
        outline = LekaoHairlineDark,
        outlineVariant = LekaoHairlineDark,
        error = LekaoError,
        onError = LekaoWhite
    )

/**
 * @param darkTheme 用户偏好（true/false/null=跟随系统）
 * @param dynamicColor Material You 动态色（Android 12+）
 */
@Composable
fun LekaoTheme(
    darkTheme: Boolean? = null,                    // null = 跟随系统
    dynamicColor: Boolean = true,                 // Android 12+ Material You
    customColorKey: String = TokenStore.COLOR_BLUE, // M13 自定义主色 preset key
    content: @Composable () -> Unit
) {
    val systemDark = isSystemInDarkTheme()
    val useDark = darkTheme ?: systemDark

    // 解析自定义主色
    val preset = presetByKey(customColorKey)

    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (useDark) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        useDark -> LekaoDarkColorScheme(customPrimary = preset.primaryDark, customPrimaryText = preset.primaryTextDark)
        else -> LekaoLightColorScheme(customPrimary = preset.primary, customPrimaryText = preset.primaryText)
    }

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !useDark
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = LekaoTypography,
        content = content
    )
}