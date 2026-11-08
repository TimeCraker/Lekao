package com.lekao.app.ui.i18n

import android.content.Context
import android.content.res.Configuration
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat
import com.lekao.app.data.local.TokenStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import java.util.Locale

/**
 * LocaleManager · M14
 *
 * 中英文切换 (zh / en / system)
 *
 * 实现：AppCompatDelegate.setApplicationLocales() (Android 13+ 原生, 低版本走 AppCompat 兼容)
 * 持久化：TokenStore.languageFlow
 *
 * 注意：语言切换不需要重启 APP — AppCompatDelegate 立即生效
 */
object LocaleManager {

    /**
     * 解析当前应用语言 (zh / en / system)
     */
    fun current(): String {
        val locales = AppCompatDelegate.getApplicationLocales()
        if (locales.isEmpty) return TokenStore.LANG_SYSTEM
        val tag = locales.toLanguageTags()
        return when {
            tag.startsWith("zh") -> TokenStore.LANG_ZH
            tag.startsWith("en") -> TokenStore.LANG_EN
            else -> TokenStore.LANG_SYSTEM
        }
    }

    /**
     * 切换语言
     * - "zh" / "en" → 立即切换
     * - "system" → 跟随系统
     */
    fun setLanguage(language: String) {
        val localeList = when (language) {
            TokenStore.LANG_ZH -> LocaleListCompat.forLanguageTags("zh-CN")
            TokenStore.LANG_EN -> LocaleListCompat.forLanguageTags("en-US")
            else -> LocaleListCompat.getEmptyLocaleList()  // system
        }
        AppCompatDelegate.setApplicationLocales(localeList)
    }

    /**
     * App 启动时从 TokenStore 恢复用户偏好
     */
    fun restore(tokenStore: TokenStore) {
        runBlocking {
            val saved = tokenStore.languageFlow.first()
            if (saved != TokenStore.LANG_SYSTEM) {
                setLanguage(saved)
            }
        }
    }

    /**
     * 把 Context 包成指定语言的 Context (用于在测试 / 预览场景手动覆盖)
     */
    fun wrapContext(base: Context, language: String): Context {
        if (language == TokenStore.LANG_SYSTEM) return base
        val locale = when (language) {
            TokenStore.LANG_ZH -> Locale("zh", "CN")
            TokenStore.LANG_EN -> Locale("en", "US")
            else -> return base
        }
        Locale.setDefault(locale)
        val config = Configuration(base.resources.configuration)
        config.setLocale(locale)
        return base.createConfigurationContext(config)
    }
}
