package com.lekao.app.ui.theme

import androidx.compose.ui.graphics.Color
import com.lekao.app.data.local.TokenStore

/**
 * Lekao 主题色 — 复用 Web 端 token
 * 与 src/app/globals.css :root 保持一一对应
 * 引用对应: --accent / --accent-text / --canvas / --parchment / --signal / --ink / ...
 */

// ============ Light 模式 ============
val LekaoBlue = Color(0xFF3B82F6)        // --accent (blue-500)
val LekaoBlueText = Color(0xFF1D4ED8)    // --accent-text (blue-700, 5.21:1 vs white, WCAG AA)
val LekaoBlueInk = Color(0xFF1E40AF)     // --accent-ink (blue-800, hover)
val LekaoCanvas = Color(0xFFFAFBFC)      // --canvas
val LekaoCanvasAlt = Color(0xFFF5F5F4)   // --canvas-alt (hover bg)
val LekaoParchment = Color(0xFFF5F5F4)   // --parchment
val LekaoSignal = Color(0xFFFB7185)      // --signal (signal coral)
val LekaoSignalText = Color(0xFFE11D48)  // --signal-text
val LekaoInk = Color(0xFF1F2937)         // --ink
val LekaoInkMuted = Color(0xFF6B7280)    // --ink-muted
val LekaoInkSubtle = Color(0xFF9CA3AF)   // --ink-subtle
val LekaoHairline = Color(0xFFE5E7EB)    // --hairline
val LekaoSuccess = Color(0xFF10B981)     // --success
val LekaoSuccessText = Color(0xFF047857) // --success-text (5.94:1 vs success-soft, WCAG AA)
val LekaoSuccessSoft = Color(0xFFD1FAE5) // --success-soft
val LekaoError = Color(0xFFEF4444)       // --error
val LekaoWarning = Color(0xFFF59E0B)     // --warning
val LekaoInfo = Color(0xFF3B82F6)        // --info (复用 blue)
val LekaoWhite = Color(0xFFFFFFFF)

// ============ Dark 模式（M13 主题切换）============
val LekaoBlueDark = Color(0xFF60A5FA)
val LekaoBlueTextDark = Color(0xFF93C5FD)
val LekaoCanvasDark = Color(0xFF111827)
val LekaoCanvasAltDark = Color(0xFF1F2937)
val LekaoInkDark = Color(0xFFF9FAFB)
val LekaoInkMutedDark = Color(0xFF9CA3AF)
val LekaoInkSubtleDark = Color(0xFF6B7280)
val LekaoHairlineDark = Color(0xFF374151)

// ============ M13 预设主题色（5 套）============

/** 预设色板：主色 / 文字色 / dark 主色 / dark 文字色 / UI 展示色（给 color picker 用）*/
data class ThemePreset(
    val key: String,
    val displayName: String,
    val primary: Color,
    val primaryText: Color,
    val primaryDark: Color,
    val primaryTextDark: Color,
    val swatchColor: Color,  // color picker 显示的颜色
)

val ThemePresets = listOf(
    ThemePreset(
        key = TokenStore.COLOR_BLUE,
        displayName = "蓝",
        primary = Color(0xFF3B82F6),
        primaryText = Color(0xFF1D4ED8),
        primaryDark = Color(0xFF60A5FA),
        primaryTextDark = Color(0xFF93C5FD),
        swatchColor = Color(0xFF3B82F6),
    ),
    ThemePreset(
        key = TokenStore.COLOR_CORAL,
        displayName = "珊瑚",
        primary = Color(0xFFFB7185),
        primaryText = Color(0xFFE11D48),
        primaryDark = Color(0xFFFDA4AF),
        primaryTextDark = Color(0xFFFECDD3),
        swatchColor = Color(0xFFFB7185),
    ),
    ThemePreset(
        key = TokenStore.COLOR_EMERALD,
        displayName = "翠绿",
        primary = Color(0xFF10B981),
        primaryText = Color(0xFF047857),
        primaryDark = Color(0xFF34D399),
        primaryTextDark = Color(0xFFA7F3D0),
        swatchColor = Color(0xFF10B981),
    ),
    ThemePreset(
        key = TokenStore.COLOR_PURPLE,
        displayName = "紫",
        primary = Color(0xFF8B5CF6),
        primaryText = Color(0xFF6D28D9),
        primaryDark = Color(0xFFA78BFA),
        primaryTextDark = Color(0xFFC4B5FD),
        swatchColor = Color(0xFF8B5CF6),
    ),
    ThemePreset(
        key = TokenStore.COLOR_AMBER,
        displayName = "琥珀",
        primary = Color(0xFFF59E0B),
        primaryText = Color(0xFFD97706),
        primaryDark = Color(0xFFFBBF24),
        primaryTextDark = Color(0xFFFDE68A),
        swatchColor = Color(0xFFF59E0B),
    ),
)

fun presetByKey(key: String): ThemePreset =
    ThemePresets.firstOrNull { it.key == key } ?: ThemePresets.first()