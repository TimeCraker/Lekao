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
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

/**
 * Lekao 主题 — M13 主题切换（深色/浅色/跟随系统）
 * 跟随系统: dynamicLightColorScheme / dynamicDarkColorScheme (Android 12+ Material You)
 * 强制主题: 走自定义 light/dark ColorScheme
 */

private val LekaoLightColorScheme = lightColorScheme(
    primary = LekaoBlue,
    onPrimary = LekaoWhite,
    primaryContainer = LekaoBlueText,
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

private val LekaoDarkColorScheme = darkColorScheme(
    primary = LekaoBlueDark,
    onPrimary = LekaoInkDark,
    primaryContainer = LekaoBlueTextDark,
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
    content: @Composable () -> Unit
) {
    val systemDark = isSystemInDarkTheme()
    val useDark = darkTheme ?: systemDark

    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (useDark) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        useDark -> LekaoDarkColorScheme
        else -> LekaoLightColorScheme
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