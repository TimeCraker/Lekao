package com.lekao.app.util

import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/**
 * BiometricHelper · M04
 *
 * 包装 androidx.biometric:BiometricPrompt
 *
 * 用途：用户已登录 → App 重启后用指纹/Face 二次确认解锁本地 session
 * （防丢手机后别人打开 APP 看到已登录状态）
 *
 * ⚠️ 必须在 FragmentActivity 里调用（MainActivity 必须继承 FragmentActivity）
 */
object BiometricHelper {

    enum class Capability {
        AVAILABLE,                  // 可用 (指纹/Face/虹膜/Class 3 强生物识别)
        AVAILABLE_WEAK,             // 可用但是弱 (Class 2 设备凭据)
        NO_HARDWARE,                // 设备无生物识别硬件
        UNAVAILABLE,                // 硬件有但用户没设置
        UNSUPPORTED                 // 系统版本不支持
    }

    /**
     * 检查设备能力
     */
    fun checkCapability(activity: FragmentActivity): Capability {
        val manager = BiometricManager.from(activity)
        return when (manager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.DEVICE_CREDENTIAL)) {
            BiometricManager.BIOMETRIC_SUCCESS -> Capability.AVAILABLE
            BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> Capability.UNAVAILABLE
            BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE -> Capability.NO_HARDWARE
            else -> Capability.UNSUPPORTED
        }
    }

    /**
     * 弹出生物识别对话框, 协程等待结果
     *
     * @return true = 验证通过, false = 用户取消/失败
     */
    suspend fun prompt(
        activity: FragmentActivity,
        title: String = "解锁乐考",
        subtitle: String = "使用指纹或 Face ID 验证身份",
        negativeText: String = "取消",
    ): Boolean = suspendCancellableCoroutine { cont ->
        val executor = ContextCompat.getMainExecutor(activity)
        val prompt = BiometricPrompt(
            activity,
            executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    if (cont.isActive) cont.resume(true)
                }
                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    if (cont.isActive) cont.resume(false)
                }
                override fun onAuthenticationFailed() {
                    // 单次失败不结束 dialog, 让用户重试
                    // 用户按 cancel 或太多次失败才会走 onAuthenticationError
                }
            }
        )
        val info = BiometricPrompt.PromptInfo.Builder()
            .setTitle(title)
            .setSubtitle(subtitle)
            .setNegativeButtonText(negativeText)
            .setAllowedAuthenticators(
                BiometricManager.Authenticators.BIOMETRIC_STRONG or
                    BiometricManager.Authenticators.DEVICE_CREDENTIAL
            )
            .build()
        prompt.authenticate(info)
        cont.invokeOnCancellation { prompt.cancelAuthentication() }
    }
}
