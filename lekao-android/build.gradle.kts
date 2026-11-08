// 顶层 build 文件 — 子模块配置
plugins {
    id("com.android.application") version "8.7.2" apply false
    id("org.jetbrains.kotlin.android") version "1.9.24" apply false
    // Kotlin 1.9.24 不需要 kotlin.plugin.compose (2.0+ 才引入),改用传统 composeOptions 配置
    id("com.google.devtools.ksp") version "1.9.24-1.0.20" apply false
    // M12 FCM 推送：需 google-services.json, 项目启动阶段可能未配置
    id("com.google.gms.google-services") version "4.4.2" apply false
}