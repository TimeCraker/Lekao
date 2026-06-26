# Lekao Android 客户端（V1.0.0 完整版）

> 让培训机构助教装一个 15-20MB 的安卓 APP，**功能 = Web 全套 + 17 项手机特化 + 7 项高级功能 = 一口气全做完**

## 🚀 快速开始

### 前置条件

| 工具 | 版本 | 下载 |
|------|------|------|
| **Android Studio** | Ladybug 2024.2.2+ | https://developer.android.com/studio |
| **JDK** | 17 | (AS 自带) |
| **Android SDK** | API 26+ (minSdk 26 / compileSdk 35) | AS 安装向导自动装 |
| **真机** | Android 8.0+ (任意品牌) | — |

### 第一次打开

```bash
# 1. 打开 Android Studio
# 2. File → Open → 选择 C:\Users\TimeCraker\Desktop\my_workspace\lekao\lekao-android\
# 3. AS 自动同步 Gradle 依赖（首次较慢, 需下载 ~1GB）
# 4. 等 Sync 完成（Build 工具栏绿勾）
# 5. 连接 USB 真机（或启动 Emulator）
# 6. 点 Run 按钮 ▶ (Shift+F10)
```

### 调试运行

```bash
# 真机 USB 调试
# 1. 手机设置 → 开发者选项 → USB 调试 开
# 2. USB 连接电脑
# 3. AS 顶栏设备列表选择你的设备
# 4. 点 Run

# WiFi 调试（Android 11+）
adb tcpip 5555
adb connect <手机IP>:5555
```

### 打包 APK

```bash
# Debug APK
./gradlew assembleDebug
# 输出: app/build/outputs/apk/debug/app-debug.apk

# Release APK (需签名)
./gradlew assembleRelease
# 输出: app/build/outputs/apk/release/app-release.apk
```

## 📂 项目结构

```
lekao-android/
├── app/
│   ├── build.gradle.kts          ← 模块构建配置（70+ 依赖）
│   ├── proguard-rules.pro
│   └── src/main/
│       ├── AndroidManifest.xml   ← 权限 / Activity / Receiver / Provider
│       ├── java/com/lekao/app/
│       │   ├── MainActivity.kt   ← 启动入口
│       │   ├── LekaoApp.kt       ← Application 类
│       │   ├── data/
│       │   │   └── api/          ← Retrofit + OkHttp + Cookie + Models
│       │   ├── ui/
│       │   │   ├── theme/        ← 主题色 (复用 Web 蓝白)
│       │   │   ├── login/        ← 启动 + 登录
│       │   │   ├── dashboard/    ← 工作台
│       │   │   ├── summary/      ← 课堂小结
│       │   │   ├── feedback/     ← 课堂反馈
│       │   │   ├── mistake/      ← 错题集
│       │   │   ├── ideas/        ← 灵感墙
│       │   │   ├── settings/     ← 个人中心
│       │   │   ├── admin/        ← 后台管理
│       │   │   ├── widgets/      ← M11 桌面小部件 (Glance)
│       │   │   └── components/   ← 复用组件
│       │   ├── util/             ← 工具类 (Biometric/Camera/Docx/Ocr/...)
│       │   └── nav/              ← Navigation 路由表
│       └── res/                  ← 资源 (strings/colors/themes/drawable/xml)
├── docs/                         ← 项目文档
├── gradle/wrapper/
├── build.gradle.kts              ← 顶层 build
├── settings.gradle.kts
└── gradle.properties
```

## 🎯 功能完成度（V1.0.0 · 27 项）

按 `docs/stages/d1-lekao-android.md` V1.0.0 spec，27 项功能：

| 类别 | 进度 | 备注 |
|------|------|------|
| **基础 10 项** (F01-F10) | 🟡 骨架完成 | 各 Screen 占位 Composable 已通 |
| **手机特化 17 项** (M01-M17) | 🟡 依赖装齐 | 后续 Sprint 逐项填充 |

## 🔧 当前阶段

**D1-A · 项目脚手架**（首个 commit · 已完成）

- ✅ 子目录 `lekao-android/` 建好
- ✅ Android 项目初始化（package `com.lekao.app`）
- ✅ Gradle 配置（70+ 依赖一次性装齐）
- ✅ 主题色 + 字体（复用 Web 蓝白 token）
- ✅ Retrofit + OkHttp + CookieManager
- ✅ Navigation 路由（15 个页面）
- ✅ AndroidManifest 权限/Receiver/Provider
- ✅ SplashScreen + Lottie 占位
- ✅ App Shortcuts 桌面快捷方式
- ✅ Glance AppWidget 占位
- ✅ FCM NotificationService 占位

**下一步 · D1-B**：登录页 + Dashboard + 生物识别（T11-T20）

## 🌐 后端对接

- **BASE_URL**：`https://lekao.asterforge.top`（Web 部署地址）
- **API 版本**：`/api`
- **认证**：复用 Web next-auth JWT cookie（Cookie 自动管理）
- **流式**：课堂小结/反馈用 SSE（OkHttp `ResponseBody.source()`）

**修改 BASE_URL**：编辑 `app/build.gradle.kts` → `LEKAO_BASE_URL` buildConfigField。

## 🐛 已知问题（启动期）

| 问题 | 解决 |
|------|------|
| `google-services.json` 缺失 | FCM 推送暂时不可用（D1-E T47 真实实现前），其他功能正常 |
| Gradle wrapper jar 缺失 | AS 首次 Sync 自动下载；或 `gradle wrapper --gradle-version 8.10.2` |
| 网络图片加载失败 | 检查手机能否访问 `lekao.asterforge.top` |

## 📜 文档

- [`docs/stages/d1-lekao-android.md`](../docs/stages/d1-lekao-android.md) — V1.0.0 完整版 spec（**主文档**）
- [`docs/architecture.md`](docs/architecture.md) — 架构详解（待写）
- [`docs/api-integration.md`](docs/api-integration.md) — API 集成指南（待写）
- [`docs/user-guide.md`](docs/user-guide.md) — 用户使用指南（待写）

## 👤 作者

- **项目**：TimeCraker / Lekao
- **作者**：Claude（AI 时代独立架构师）
- **日期**：2026-06-26
- **许可证**：私有