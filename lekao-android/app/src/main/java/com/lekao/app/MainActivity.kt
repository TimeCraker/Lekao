package com.lekao.app

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.fragment.app.FragmentActivity
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
 * ⚠️ 继承 FragmentActivity（不是 ComponentActivity），
 *    因为 androidx.biometric.BiometricPrompt 需要 FragmentActivity。
 *    FragmentActivity 兼容 setContent 等 Compose API。
 */
class MainActivity : FragmentActivity() {

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