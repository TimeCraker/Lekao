package com.lekao.app

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import android.util.Log
import androidx.work.Configuration
import androidx.work.WorkManager
import com.lekao.app.util.NotificationHelper

/**
 * Lekao Application · 启动入口
 *
 * 职责：
 * 1. 初始化 NotificationChannel（M12 FCM · 灵感墙/系统/评论 3 个 channel）
 * 2. 初始化 WorkManager（M09 错题集草稿箱后台同步）
 * 3. 全局异常兜底（崩溃日志上传到 Sentry · V2 阶段再加）
 * 4. 三方 SDK 初始化（FCM · FirebaseApp.initializeApp）
 */
class LekaoApp : Application(), Configuration.Provider {

    override fun onCreate() {
        super.onCreate()
        instance = this

        // ============ FCM 推送通道初始化（M12）============
        createNotificationChannels()

        // ============ WorkManager 初始化（M09 草稿箱后台同步）============
        // 用 Configuration.Provider 模式，禁用默认 InitializedProvider（已在 Manifest 移除）
        WorkManager.initialize(this, workManagerConfiguration)

        Log.i(TAG, "LekaoApp 初始化完成")
    }

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setMinimumLoggingLevel(Log.INFO)
            .build()

    /**
     * 创建推送通道（M12 FCM · 3 个 channel）
     */
    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val notificationManager = getSystemService(NotificationManager::class.java) ?: return

        // 灵感墙通知
        val ideaChannel = NotificationChannel(
            NotificationHelper.CHANNEL_IDEA,
            getString(com.lekao.app.R.string.notification_channel_idea),
            NotificationManager.IMPORTANCE_DEFAULT
        ).apply {
            description = "灵感墙点赞/评论/采纳通知"
            enableLights(true)
            enableVibration(true)
        }

        // 系统通知
        val systemChannel = NotificationChannel(
            NotificationHelper.CHANNEL_SYSTEM,
            getString(com.lekao.app.R.string.notification_channel_system),
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "系统通知（余额/封禁/政策）"
            enableLights(true)
            enableVibration(true)
        }

        // 评论回复
        val commentChannel = NotificationChannel(
            NotificationHelper.CHANNEL_COMMENT,
            getString(com.lekao.app.R.string.notification_channel_comment),
            NotificationManager.IMPORTANCE_DEFAULT
        ).apply {
            description = "灵感墙评论回复"
            enableLights(true)
            enableVibration(true)
        }

        notificationManager.createNotificationChannels(
            listOf(ideaChannel, systemChannel, commentChannel)
        )
    }

    companion object {
        private const val TAG = "LekaoApp"

        @Volatile
        var instance: LekaoApp? = null
            private set

        fun get(): LekaoApp = instance ?: throw IllegalStateException("LekaoApp 未初始化")
    }
}