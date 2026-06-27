package com.lekao.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.lekao.app.nav.AppNavigation
import com.lekao.app.ui.theme.LekaoTheme
import com.lekao.app.ui.theme.ThemeManager
import com.lekao.app.data.local.TokenStore

/**
 * MainActivity · 启动入口
 *
 * 流程：
 * 1. installSplashScreen (M07 · Android 12+ SplashScreen API)
 * 2. restore theme from TokenStore (M13)
 * 3. enableEdgeToEdge (沉浸式)
 * 4. setContent { LekaoTheme { AppNavigation } }
 * 5. 路由由 SplashScreen 根据 AuthRepository.authState 决定跳 Login / Dashboard
 *
 * ⚠️ 继承 ComponentActivity（不是 FragmentActivity）：
 *    - BiometricPrompt 1.2+ 同时支持 ComponentActivity / FragmentActivity
 *    - enableEdgeToEdge() 是 ComponentActivity 扩展, 需要换成 ComponentActivity
 */
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        // ============ M07 启动屏 ============
        val splashScreen = installSplashScreen()
        super.onCreate(savedInstanceState)

        // ============ M13 恢复主题 (theme) ============
        val tokenStore = TokenStore.getInstance(applicationContext)
        ThemeManager.restore(tokenStore)

        // ============ 沉浸式 ============
        enableEdgeToEdge()

        setContent {
            LekaoTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    AppNavigation()
                }
            }
        }
    }
}