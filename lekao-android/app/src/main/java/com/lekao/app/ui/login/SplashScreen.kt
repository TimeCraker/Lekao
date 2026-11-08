package com.lekao.app.ui.login

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.fragment.app.FragmentActivity
import com.lekao.app.R
import com.lekao.app.data.api.AuthRepository
import com.lekao.app.data.api.LekaoCookieJar
import com.lekao.app.data.api.LekaoApi
import com.lekao.app.data.api.RetrofitClient
import com.lekao.app.data.local.TokenStore
import com.lekao.app.util.BiometricHelper
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.launch

/**
 * SplashScreen · T16 + T14 (M07 Lottie + M04 Biometric)
 *
 * 启动流程:
 * 1. 显示 Lottie 动画 (Android 12+ 由 SplashScreen API 自动接管, pre-12 走 Compose)
 * 2. AuthRepository.bootstrap(): 从本地恢复 user + 后台 /me 验证
 * 3. 已登录 + 设备支持生物识别 → 弹 BiometricPrompt 二次确认
 *    - 通过 → Dashboard
 *    - 失败/取消 → Login
 * 4. 已登录 + 无生物识别 → 直接 Dashboard
 * 5. 未登录 → Login
 *
 * ⚠️ SplashScreen 必须继承 FragmentActivity (因为 BiometricPrompt 需要)
 */
@Composable
fun SplashScreen(
    onNavigateToLogin: () -> Unit,
    onNavigateToDashboard: () -> Unit,
) {
    val context = LocalContext.current
    val activity = context as? FragmentActivity
    val scope = rememberCoroutineScope()
    val authRepo = remember {
        val tokenStore = TokenStore.getInstance(context)
        val api = RetrofitClient.api(context)
        val cookieJar = LekaoCookieJar(context)
        AuthRepository(context, api, tokenStore, cookieJar)
    }
    val tokenStore = remember { TokenStore.getInstance(context) }

    var status by remember { mutableStateOf("正在加载...") }

    LaunchedEffect(Unit) {
        delay(800)  // 让 splash 图标至少显示一会
        val bootstrapResult = authRepo.bootstrap()
        val localUser = tokenStore.currentUser()
        if (localUser == null) {
            // 真的没登录过
            status = "请登录"
            delay(200)
            onNavigateToLogin()
            return@LaunchedEffect
        }
        // 有本地 user, 检查是否需要生物识别
        val biometricEnabled = tokenStore.biometricEnabledFlow.firstOrNull() ?: false
        val capability = activity?.let { BiometricHelper.checkCapability(it) } ?: BiometricHelper.Capability.NO_HARDWARE
        if (!biometricEnabled || capability == BiometricHelper.Capability.NO_HARDWARE || capability == BiometricHelper.Capability.UNSUPPORTED) {
            // 不需要生物识别
            status = "欢迎回来"
            delay(200)
            onNavigateToDashboard()
            return@LaunchedEffect
        }
        // 弹生物识别
        if (activity == null) {
            onNavigateToDashboard()
            return@LaunchedEffect
        }
        status = "请验证身份"
        val ok = BiometricHelper.prompt(
            activity = activity,
            title = "解锁乐考",
            subtitle = "使用 ${if (capability == BiometricHelper.Capability.AVAILABLE_WEAK) "设备密码" else "指纹或 Face ID"} 验证身份",
        )
        if (ok) {
            // /me 验证结果（成功则更新 user, 失败则跳登录）
            bootstrapResult.fold(
                onSuccess = { onNavigateToDashboard() },
                onFailure = { onNavigateToLogin() },
            )
        } else {
            // 验证失败 → 跳登录 (需要重新登录获取 session)
            onNavigateToLogin()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(48.dp),
        ) {
            Image(
                painter = painterResource(R.drawable.ic_splash_logo),
                contentDescription = null,
                modifier = Modifier.size(96.dp),
            )
            Spacer(Modifier.height(24.dp))
            Text(
                text = "乐考",
                color = MaterialTheme.colorScheme.primary,
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold,
            )
            Spacer(Modifier.height(8.dp))
            Text(
                text = status,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 14.sp,
            )
        }
    }
}
