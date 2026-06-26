package com.lekao.app.ui.login

import androidx.compose.runtime.Composable
import com.lekao.app.ui.components.PlaceholderScreen

/**
 * 登录页 · F01/F02 邮箱密码 + 验证码 + M04 生物识别
 *
 * D1-B T11-T14 实现：
 * - T11 AuthRepository
 * - T12 LoginScreen + LoginViewModel
 * - T13 TokenStore (DataStore)
 * - T14 M04 BiometricHelper
 */
@Composable
fun LoginScreen(
    onNavigateToDashboard: () -> Unit
) {
    PlaceholderScreen(
        title = "登录",
        specRef = "V1.0.0 §1.2 F01/F02 + §1.3 M04",
        showBackButton = false
    )
}