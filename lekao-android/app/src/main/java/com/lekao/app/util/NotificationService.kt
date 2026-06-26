package com.lekao.app.util

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.lekao.app.MainActivity
import com.lekao.app.R

/**
 * FCM 推送服务 · M12
 *
 * D1-E T47 真实实现：
 * - 接收 FCM 消息
 * - 按 type 分类（idea/system/comment）走不同 channel
 * - 点击通知 → 跳对应页面（deepLink）
 */
class NotificationService : FirebaseMessagingService() {

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        val data = remoteMessage.data
        val type = data["type"] ?: "system"
        val title = remoteMessage.notification?.title ?: data["title"] ?: "乐考"
        val body = remoteMessage.notification?.body ?: data["body"] ?: ""

        val channelId = when (type) {
            "idea" -> NotificationHelper.CHANNEL_IDEA
            "comment" -> NotificationHelper.CHANNEL_COMMENT
            else -> NotificationHelper.CHANNEL_SYSTEM
        }

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            // deepLink 支持
            data["deepLink"]?.let { data ->
                this.data = android.net.Uri.parse(data)
            }
        }

        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_splash_logo)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(System.currentTimeMillis().toInt(), notification)
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        // D1-E T47 实现：调 /api/lekao/fcm/register 注册到 Lekao
    }
}