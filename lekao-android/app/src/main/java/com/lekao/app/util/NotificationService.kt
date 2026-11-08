package com.lekao.app.util

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.lekao.app.MainActivity
import com.lekao.app.R
import com.lekao.app.data.api.FcmRegisterRequest
import com.lekao.app.data.api.LekaoConfig
import com.lekao.app.data.api.RetrofitClient
import com.lekao.app.data.local.TokenStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

/**
 * FCM 推送服务 · M12（T52 增强）
 *
 * 功能：
 * - 接收 FCM 消息
 * - 按 type 分类（idea/system/comment）走不同 channel + 颜色
 * - 通知分组 + 摘要通知
 * - 点击通知 → deepLink 跳对应页面
 * - onNewToken 自动注册到后端
 */
class NotificationService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "NotificationService"

        // Group keys
        private const val GROUP_IDEA = "group_idea"
        private const val GROUP_SYSTEM = "group_system"
        private const val GROUP_COMMENT = "group_comment"

        // Notification IDs base (avoid collision with system notifications)
        private const val NOTIFICATION_BASE = 1000
        private var notificationCounter = 0
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        val data = remoteMessage.data
        val type = data["type"] ?: "system"
        val title = remoteMessage.notification?.title ?: data["title"] ?: getString(R.string.app_name)
        val body = remoteMessage.notification?.body ?: data["body"] ?: ""
        val deepLink = data["deepLink"]
        val ideaId = data["ideaId"]

        val channelId = when (type) {
            "idea" -> NotificationHelper.CHANNEL_IDEA
            "comment" -> NotificationHelper.CHANNEL_COMMENT
            else -> NotificationHelper.CHANNEL_SYSTEM
        }

        val groupKey = when (type) {
            "idea" -> GROUP_IDEA
            "comment" -> GROUP_COMMENT
            else -> GROUP_SYSTEM
        }

        val accentColor = when (type) {
            "idea" -> Color.parseColor("#3B82F6")     // blue
            "comment" -> Color.parseColor("#10B981")  // green
            else -> Color.parseColor("#EF4444")        // red
        }

        val notificationId = NOTIFICATION_BASE + (notificationCounter++ % 1000)

        // Intent with deepLink support
        val intent = Intent(this, MainActivity::class.java).apply {
            setFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            deepLink?.let { setData(android.net.Uri.parse(it)) }
            ideaId?.let { putExtra("ideaId", it) }
        }

        val pendingIntent = PendingIntent.getActivity(
            this, notificationId, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Build notification
        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_splash_logo)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setColor(accentColor)
            .setGroup(groupKey)
            .setGroupAlertBehavior(NotificationCompat.GROUP_ALERT_SUMMARY)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setCategory(
                when (type) {
                    "idea" -> NotificationCompat.CATEGORY_SOCIAL
                    "comment" -> NotificationCompat.CATEGORY_SOCIAL
                    else -> NotificationCompat.CATEGORY_SYSTEM
                }
            )
            .build()

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Show individual notification
        notificationManager.notify(notificationId, notification)

        // Show summary notification for group (every 5 notifications)
        if (notificationCounter % 5 == 0) {
            val summary = NotificationCompat.Builder(this, channelId)
                .setSmallIcon(R.drawable.ic_splash_logo)
                .setContentTitle(title)
                .setContentText(getString(R.string.notification_group_summary, notificationCounter))
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setColor(accentColor)
                .setGroup(groupKey)
                .setGroupSummary(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build()
            notificationManager.notify(NOTIFICATION_BASE + 999, summary)
        }

        // 安全日志：仅记录 type + title 前缀（不记录 body/deepLink 含 PII 的内容）
        android.util.Log.d(TAG, "推送收到: type=$type title=${title.take(30)}")
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        android.util.Log.d(TAG, "FCM 新 token 已生成 (hash: ${token.hashCode()})")

        // 异步注册到后端
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val context = applicationContext
                val appVersion = try {
                    context.packageManager.getPackageInfo(context.packageName, 0).versionName ?: "unknown"
                } catch (_: Exception) { "unknown" }

                val req = FcmRegisterRequest(token = token, platform = "android", appVersion = appVersion)
                val api = RetrofitClient.api(context)
                val resp = api.registerFcmToken(req)
                if (resp.isSuccessful) {
                    android.util.Log.d(TAG, "FCM token 注册成功")
                } else {
                    android.util.Log.w(TAG, "FCM token 注册失败 HTTP ${resp.code()}")
                }
            } catch (t: Throwable) {
                android.util.Log.e(TAG, "FCM token 注册异常", t)
            }
        }
    }
}