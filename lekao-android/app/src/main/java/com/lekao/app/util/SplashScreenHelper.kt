package com.lekao.app.util

import android.app.Activity
import android.os.Build
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen

/**
 * SplashScreenHelper · T16 · M07
 *
 * 包装 Android 12+ (API 31+) 的 SplashScreen API
 *
 * 关键点：
 * - Android 12+ 自动用 Theme.Lekao.Splash (windowSplashScreenBackground + windowSplashScreenAnimatedIcon)
 * - Pre-Android 12 我们用 Activity 主题自带 windowBackground
 * - splash 持续时间由 SplashViewModel 控制（splash 期间 setKeepOnScreenCondition 返回 true）
 */
object SplashScreenHelper {

    /**
     * 在 super.onCreate() 之前调用 (Android 12+ 必须)
     *
     * 用法:
     * ```
     * override fun onCreate(savedInstanceState: Bundle?) {
     *     val splashScreen = installSplashScreen()
     *     super.onCreate(savedInstanceState)
     *     ...
     *     splashScreen.setKeepOnScreenCondition { !viewModel.ready.value }
     * }
     * ```
     */
    fun install(activity: Activity, keepOnScreen: () -> Boolean = { false }) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val splashScreen = activity.installSplashScreen()
            splashScreen.setKeepOnScreenCondition(keepOnScreen)
        }
    }
}
