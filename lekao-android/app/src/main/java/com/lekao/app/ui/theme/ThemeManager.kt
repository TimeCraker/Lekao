package com.lekao.app.ui.theme

import androidx.appcompat.app.AppCompatDelegate
import com.lekao.app.data.local.TokenStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking

/**
 * ThemeManager · M13
 *
 * 主题切换: 浅色 / 深色 / 跟随系统
 *
 * 切换不重启 Activity (AppCompatDelegate 立即生效)
 */
object ThemeManager {

    fun current(): String {
        return when (AppCompatDelegate.getDefaultNightMode()) {
            AppCompatDelegate.MODE_NIGHT_NO -> TokenStore.THEME_LIGHT
            AppCompatDelegate.MODE_NIGHT_YES -> TokenStore.THEME_DARK
            else -> TokenStore.THEME_SYSTEM
        }
    }

    fun setTheme(theme: String) {
        val mode = when (theme) {
            TokenStore.THEME_LIGHT -> AppCompatDelegate.MODE_NIGHT_NO
            TokenStore.THEME_DARK -> AppCompatDelegate.MODE_NIGHT_YES
            else -> AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
        }
        AppCompatDelegate.setDefaultNightMode(mode)
    }

    /**
     * App 启动时从 TokenStore 恢复用户偏好
     */
    fun restore(tokenStore: TokenStore) {
        runBlocking {
            val saved = tokenStore.themeFlow.first()
            setTheme(saved)
        }
    }
}
