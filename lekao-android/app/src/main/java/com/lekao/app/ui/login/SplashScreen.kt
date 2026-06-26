package com.lekao.app.ui.login

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.lekao.app.ui.theme.LekaoBlue
import com.lekao.app.ui.theme.LekaoInk
import kotlinx.coroutines.delay

/**
 * 启动屏 · M07
 * 负责：
 * 1. 检查登录状态（cookie + 调用 /api/auth/me）
 * 2. 已登录 → Dashboard
 * 3. 未登录 → Login
 */
@Composable
fun SplashScreen(
    onNavigateToLogin: () -> Unit,
    onNavigateToDashboard: () -> Unit
) {
    // 暂时简化为：延迟 800ms 后跳 Login（等 D1-B 实现真实登录态检查）
    LaunchedEffect(Unit) {
        delay(800)
        onNavigateToLogin()
    }

    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "乐考",
            color = LekaoBlue,
            fontSize = 48.sp,
            fontWeight = FontWeight.Black
        )
    }
}