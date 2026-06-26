package com.lekao.app.data.local

import android.content.Context
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.lekao.app.data.api.UserDto
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

/**
 * TokenStore · T13
 *
 * DataStore Preferences 持久化：
 * - userId / email / name / role
 * - tCoin / lekaoGiftCoin
 * - theme (light/dark/system)
 * - language (zh/en)
 * - biometricEnabled (M04)
 *
 * 注意：JWT cookie 不存这里 — 由 OkHttp CookieJar 通过自己的 DataStore 持久化
 * 这里只存 user info + UI 偏好
 */
private val Context.dataStore by preferencesDataStore(name = "lekao_prefs")

class TokenStore(private val context: Context) {

    private object Keys {
        val USER_ID = stringPreferencesKey("user_id")
        val USER_EMAIL = stringPreferencesKey("user_email")
        val USER_NAME = stringPreferencesKey("user_name")
        val USER_ROLE = stringPreferencesKey("user_role")
        val T_COIN = intPreferencesKey("t_coin")
        val GIFT_COIN = intPreferencesKey("gift_coin")
        val THEME = stringPreferencesKey("theme")
        val LANGUAGE = stringPreferencesKey("language")
        val BIOMETRIC_ENABLED = booleanPreferencesKey("biometric_enabled")
        val CUSTOM_COLOR = stringPreferencesKey("custom_color")
    }

    // 用户信息
    val userFlow: Flow<UserDto?> = context.dataStore.data.map { prefs ->
        val id = prefs[Keys.USER_ID] ?: return@map null
        UserDto(
            id = id,
            email = prefs[Keys.USER_EMAIL] ?: "",
            name = prefs[Keys.USER_NAME],
            role = prefs[Keys.USER_ROLE] ?: "USER",
            tCoin = prefs[Keys.T_COIN] ?: 0,
            lekaoGiftCoin = prefs[Keys.GIFT_COIN] ?: 0,
        )
    }

    suspend fun currentUser(): UserDto? = userFlow.first()

    suspend fun saveUser(user: UserDto) {
        context.dataStore.edit { prefs ->
            prefs[Keys.USER_ID] = user.id
            prefs[Keys.USER_EMAIL] = user.email
            user.name?.let { prefs[Keys.USER_NAME] = it }
            prefs[Keys.USER_ROLE] = user.role
            prefs[Keys.T_COIN] = user.tCoin
            prefs[Keys.GIFT_COIN] = user.lekaoGiftCoin
        }
    }

    suspend fun clearUser() {
        context.dataStore.edit { prefs ->
            prefs.remove(Keys.USER_ID)
            prefs.remove(Keys.USER_EMAIL)
            prefs.remove(Keys.USER_NAME)
            prefs.remove(Keys.USER_ROLE)
            prefs.remove(Keys.T_COIN)
            prefs.remove(Keys.GIFT_COIN)
        }
    }

    suspend fun updateCoins(tCoin: Int, giftCoin: Int) {
        context.dataStore.edit { prefs ->
            prefs[Keys.T_COIN] = tCoin
            prefs[Keys.GIFT_COIN] = giftCoin
        }
    }

    // 主题 (M13)
    val themeFlow: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[Keys.THEME] ?: THEME_SYSTEM
    }

    suspend fun setTheme(theme: String) {
        context.dataStore.edit { it[Keys.THEME] = theme }
    }

    // 语言 (M14)
    val languageFlow: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[Keys.LANGUAGE] ?: LANG_SYSTEM
    }

    suspend fun setLanguage(language: String) {
        context.dataStore.edit { it[Keys.LANGUAGE] = language }
    }

    // 生物识别 (M04)
    val biometricEnabledFlow: Flow<Boolean> = context.dataStore.data.map { prefs ->
        prefs[Keys.BIOMETRIC_ENABLED] ?: false
    }

    suspend fun setBiometricEnabled(enabled: Boolean) {
        context.dataStore.edit { it[Keys.BIOMETRIC_ENABLED] = enabled }
    }

    // 自定义主题色 (M13)
    val customColorFlow: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[Keys.CUSTOM_COLOR] ?: COLOR_BLUE
    }

    suspend fun setCustomColor(color: String) {
        context.dataStore.edit { it[Keys.CUSTOM_COLOR] = color }
    }

    suspend fun clear() {
        context.dataStore.edit { it.clear() }
    }

    companion object {
        const val THEME_LIGHT = "light"
        const val THEME_DARK = "dark"
        const val THEME_SYSTEM = "system"
        const val LANG_ZH = "zh"
        const val LANG_EN = "en"
        const val LANG_SYSTEM = "system"

        // 预设主题色 (M13)
        const val COLOR_BLUE = "blue"       // Lekao 默认蓝 (default)
        const val COLOR_CORAL = "coral"     // 珊瑚红
        const val COLOR_EMERALD = "emerald" // 翡翠绿
        const val COLOR_PURPLE = "purple"   // 紫罗兰
        const val COLOR_AMBER = "amber"     // 琥珀橙

        @Volatile
        private var instance: TokenStore? = null

        fun getInstance(context: Context): TokenStore {
            return instance ?: synchronized(this) {
                instance ?: TokenStore(context.applicationContext).also { instance = it }
            }
        }
    }
}
