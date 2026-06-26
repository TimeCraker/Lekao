package com.lekao.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.lekao.app.nav.AppNavigation
import com.lekao.app.nav.Routes
import com.lekao.app.ui.theme.LekaoTheme

/**
 * MainActivity · 启动入口
 *
 * 流程：
 * 1. installSplashScreen（M07 · Android 12+ SplashScreen API）
 * 2. enableEdgeToEdge（沉浸式状态栏/导航栏）
 * 3. setContent { LekaoTheme { AppNavigation } }
 * 4. 路由由 SplashScreen 根据登录态决定跳 Login / Dashboard
 */
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        // ============ M07 启动屏 ============
        val splashScreen = installSplashScreen()
        super.onCreate(savedInstanceState)

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