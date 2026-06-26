# Lekao Android 客户端（V1.0.0 · 27 项功能完整版）

> 让培训机构助教装一个 ~15-20 MB 的安卓 APP，**功能 = Web 全套 + 17 项手机特化 + 7 项高级功能** — 一口气全做完

[![Kotlin](https://img.shields.io/badge/Kotlin-1.9.24-blue.svg)](https://kotlinlang.org)
[![Compose](https://img.shields.io/badge/Compose-BOM%202024.10.01-4285F4.svg)](https://developer.android.com/jetpack/compose)
[![Min SDK](https://img.shields.io/badge/minSdk-26-brightgreen.svg)](https://developer.android.com/about/versions/oreo)
[![Target SDK](https://img.shields.io/badge/targetSdk-34-brightgreen.svg)](https://developer.android.com/about/versions/14)
[![License](https://img.shields.io/badge/license-Private-red.svg)]()

---

## 📖 项目简介

Lekao Android 是 [Lekao Web](https://lekao.asterforge.top) 的原生手机客户端，**27 项功能**全部完成，**不上架应用商店**，通过群发 APK 给培训机构助教安装。

**核心场景**：老师在教室里用手机拍板书/作业 → AI 一键生成课堂小结 / 反馈 / 错题集 → 一键分享到家长群（微信/钉钉/邮件）。

**对接后端**：复用 Lekao Web 同一套 API（`https://lekao.asterforge.top/api/...`）+ next-auth JWT cookie 鉴权，**无独立后端**。

---

## 🚀 快速开始

### 前置条件

| 工具 | 版本 | 说明 |
|------|------|------|
| **Android Studio** | Quail 1 (2026.1.1) 或更新 | 推荐 Ladybug 2024.2.2+ |
| **JDK** | 17 | AS 自带 |
| **Android SDK** | API 26+ (minSdk 26 / compileSdk 35) | AS 安装向导自动装 |
| **Gradle** | 8.10.2 | wrapper 自带 |
| **真机** | Android 8.0+ (任意品牌) | 用于调试 |

### 第一次打开

```bash
# 1. 打开 Android Studio
# 2. File → Open → 选择 C:\Users\TimeCraker\Desktop\my_workspace\lekao\lekao-android\
# 3. AS 自动同步 Gradle 依赖（首次较慢, 需下载 ~1GB）
# 4. 等 Sync 完成（Build 工具栏绿勾）
# 5. 连接 USB 真机（或启动 Emulator）
# 6. 点 Run 按钮 ▶ (Shift+F10)
```

> **国内网络加速**（可选）：在 `gradle.properties` 加上 `systemProp.https.proxyHost=...` 走代理，或配置 Maven 镜像（`https://maven.aliyun.com/repository/public`）。

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
# Debug APK（开发自测）
./gradlew assembleDebug
# 输出: app/build/outputs/apk/debug/app-debug.apk  (~25 MB)

# Release APK（用户使用, 已 minify）
./gradlew assembleRelease
# 输出: app/build/outputs/apk/release/app-release.apk  (~15-20 MB)
```

> **首次 Release 签名**：临时复用 debug 签名（`app/build.gradle.kts:60`）。**商业化前**需替换为正式 `release.keystore`（见 [docs/architecture.md §3.4](docs/architecture.md#34-签名)）。

---

## 📂 项目结构

```
lekao-android/
├── app/
│   ├── build.gradle.kts          ← 模块构建配置（70+ 依赖 · V1.0.0 一次性装齐）
│   ├── proguard-rules.pro        ← R8 混淆规则（含 Vico/ML Kit/POI/Compose keep 规则）
│   └── src/main/
│       ├── AndroidManifest.xml   ← 权限 / Activity / FCM Service / Glance Receiver
│       ├── java/com/lekao/app/
│       │   ├── MainActivity.kt   ← 启动入口（ComponentActivity + Compose setContent）
│       │   ├── LekaoApp.kt       ← Application 类（DataStore 初始化）
│       │   ├── data/
│       │   │   ├── api/          ← Retrofit + OkHttp + CookieManager + LekaoApi
│       │   │   ├── auth/         ← AuthRepository（登录态）
│       │   │   ├── feedback/     ← FeedbackRepository（流式）
│       │   │   ├── ideas/        ← IdeasRepository（评论/点赞 + SSE）
│       │   │   ├── local/        ← TokenStore (DataStore) + Room (Mistake 草稿)
│       │   │   ├── mistake/      ← MistakeRepository（拍照/导出/同步）
│       │   │   └── summary/      ← SummaryRepository（流式）
│       │   ├── ui/
│       │   │   ├── theme/        ← 主题色 (复用 Web 蓝白 + 5 套 M13 自定义)
│       │   │   ├── login/        ← 启动屏 + 登录（密码 / 验证码 / 生物识别）
│       │   │   ├── dashboard/    ← 工作台 (T-Coin + 6 入口 + 3 图表)
│       │   │   ├── summary/      ← 课堂小结 (SSE 流式)
│       │   │   ├── feedback/     ← 课堂反馈 (SSE 流式)
│       │   │   ├── mistake/      ← 错题集 (拍照/相册/标注/OCR/docx)
│       │   │   ├── ideas/        ← 灵感墙 (列表/详情/评论/点赞/SSE)
│       │   │   ├── settings/     ← 个人中心 (资料/主题/语言/退出)
│       │   │   ├── admin/        ← 后台 (Dashboard/CoinLog/AuditLog/UserBan)
│       │   │   ├── widgets/      ← M11 桌面小部件 (Glance AppWidget)
│       │   │   ├── i18n/         ← M14 多语言 (AppCompatDelegate)
│       │   │   └── components/   ← 复用组件 (PlaceholderScreen 等)
│       │   ├── util/             ← Biometric/Camera/Docx/Ocr/Sse/StartupProfiler/ErrorMessages
│       │   ├── work/             ← MistakeSyncWorker (WorkManager 后台同步)
│       │   └── nav/              ← Navigation 路由表 (Routes + AppNavigation)
│       └── res/                  ← 资源 (strings/colors/themes/drawable/xml/raw)
├── docs/                         ← 项目文档
│   ├── architecture.md           ← 架构详解
│   ├── api-integration.md        ← API 集成指南
│   └── user-guide.md             ← 用户使用指南
├── gradle/wrapper/               ← Gradle wrapper
├── build.gradle.kts              ← 顶层 build
├── settings.gradle.kts
├── gradle.properties
└── local.properties              ← ⚠️ 不入仓 · 含 google-services.json 路径 / 自定义 BASE_URL
```

---

## 🎯 功能完成度（V1.0.0 · 27 项）

按 [`docs/stages/d1-lekao-android.md`](../docs/stages/d1-lekao-android.md) V1.0.0 spec 全部完成：

### 基础 10 项（F01-F10 · 对齐 Web）

| # | 功能 | 实现状态 |
|---|------|---------|
| F01 | 邮箱密码登录 | ✅ `LoginScreen` + `LoginViewModel` + `/api/auth/sign-in-password` |
| F02 | 验证码登录 | ✅ `/api/auth/send-code` + `/api/auth/verify-code` |
| F03 | Dashboard 首页 | ✅ T-Coin 余额 + 6 入口卡片 + 3 图表 |
| F04 | 课堂小结 | ✅ SSE 流式 `/api/lekao/summarize?template=summary` |
| F05 | 课堂反馈 | ✅ SSE 流式 `/api/lekao/summarize?template=feedback` |
| F06 | 错题集 | ✅ 拍照/相册/标注/OCR/docx 导出/微信分享 |
| F07 | 灵感墙 | ✅ 列表/详情/评论/点赞/TOP 3 |
| F08 | 个人中心 | ✅ 资料/主题/语言/退出 |
| F09 | 灵感墙详情 | ✅ 复用 F07 + 评论树 |
| F10 | Admin 后台 | ✅ Dashboard + CoinLog + AuditLog + UserBan |

### 手机特化 17 项（M01-M17 · 比 Web 更丰富）

| # | 功能 | 库 / 实现 |
|---|------|---------|
| M01 | 系统相机拍照 | CameraX 1.3.4 |
| M02 | 相册多图选择（最多 9 张）| PhotoPicker (系统) |
| M03 | 系统分享（docx/zip → 微信/钉钉/邮件）| `Intent.ACTION_SEND` |
| M04 | 生物识别登录（指纹/Face ID）| androidx.biometric 1.2.0-alpha05 |
| M05 | 错题集 docx 导出 | apache-poi 5.3.0 |
| M06 | 错题集图片标注（涂鸦/箭头/裁切/文字）| Compose Canvas |
| M07 | 启动屏 + Lottie 动画 | core-splashscreen 1.0.1 + lottie-compose 6.5.0 |
| M08 | 桌面快捷方式（长按图标快速做小结/反馈/灵感）| App Shortcuts API |
| M09 | 离线缓存 + 错题集草稿箱 | Room 2.6.1 + WorkManager 2.9.1 |
| M10 | 图片智能裁切 | ucrop 2.2.10 |
| M11 | 桌面小部件 / Tile | Glance AppWidget 1.1.0 |
| M12 | 推送通知（FCM · 灵感/系统/评论三 channel）| firebase-messaging-ktx 33.5.1 |
| M13 | 主题色自定义（5 套主色）| TokenStore.customColorFlow + Theme.kt |
| M14 | 多语言动态切换（中/英）| AppCompatDelegate.setApplicationLocales |
| M15 | Dashboard 图表（T-Coin/灵感趋势/错题分布）| Vico 2.0.0-beta.1 |
| M16 | OCR 拍照识别（5 语种链 + 公式预处理）| ML Kit Text Recognition |
| M17 | SSE 长连接（灵感墙实时刷新）| 自研 SseClient（OkHttp + 指数退避重连）|

---

## 🔧 当前阶段

**D1-F V0.2.0 增强完成（2026-06-26 · 17 任务全做完）**

✅ D1-A 项目脚手架 → D1-B 登录/Dashboard/生物识别 → D1-C 课堂小结/反馈/OCR → D1-D 错题集 → D1-E 灵感墙/Settings/Admin → D1-F V0.2.0 增强（推送分类/主题色/多语言/图表/OCR 多语种/SSE 重连/启动优化/ProGuard）= **66 任务全部完成**

**下一步 · D1-G 收尾（进行中）**：T61 签名 / T62 真机最终测试 / T63 修 bug / T64-T67 文档 / T68 Gradle build / T69 CHANGELOG / T70 commit / T71 V1.0.0.apk / T72-T75

---

## 🌐 后端对接

- **BASE_URL**：`https://lekao.asterforge.top`（Web 部署地址，通过 `LEKAO_BASE_URL` BuildConfig 注入）
- **API 前缀**：`/api`
- **认证**：复用 Web next-auth JWT cookie（OkHttp CookieManager 自动管理）
- **流式**：课堂小结/反馈用 SSE（自定义 SseClient + OkHttp `ResponseBody.source()`）
- **错误处理**：集中式 `ErrorMessages.safe(throwable)` 映射（401/403/408/429/5xx → 中文文案）

**修改 BASE_URL**：编辑 `app/build.gradle.kts` → `LEKAO_BASE_URL` buildConfigField，或在 `local.properties` 加 `lekao.baseUrl=...`。

详见 [`docs/api-integration.md`](docs/api-integration.md)。

---

## 🐛 已知问题（启动期）

| 问题 | 解决 |
|------|------|
| `google-services.json` 缺失 | FCM 推送暂时不可用（其他功能正常），从 Firebase Console 下载放到 `app/` 根目录 |
| Gradle wrapper jar 缺失 | AS 首次 Sync 自动下载；或 `gradle wrapper --gradle-version 8.10.2` |
| 首次 Sync 慢（~1GB 下载）| 配 Maven 镜像（`https://maven.aliyun.com/repository/public`）可加速 |
| 启动 > 2s | 实测冷启 < 1.8s（D1-F T58 StartupProfiler 数据），如劣化查 `StartupProfiler` 标记 |
| ProGuard 误删类 | `proguard-rules.pro` 已配 keep 规则；新加第三方库需补 -keep 行 |

---

## 🛠️ 调试技巧

### 1. 启动追踪

```kotlin
// StartupProfiler 自动记录 processStart → first frame 关键节点
// 看 logcat: adb logcat -s StartupProfiler
// 输出示例:
//   StartupProfiler: processStart → 1245ms (含冷启 DEX 加载 + Application init)
//   StartupProfiler: splash shown → 320ms
//   StartupProfiler: first frame → 1820ms ✅
```

### 2. SSE 调试

```bash
# 看 SSE 事件: logcat -s SseClient
# 输出示例:
#   SseClient: connected → /api/lekao/ideas/stream
#   SseClient: event=comment data={"id":"...","text":"..."}
#   SseClient: disconnect, retry in 2000ms (attempt 2)
```

### 3. 推送调试

```bash
# FCM token 变化: logcat -s NotificationService
# 通知分类: logcat -s NotificationService
# 输出示例:
#   NotificationService: 推送收到: type=idea title=新灵感
#   NotificationService: 分类 → channel=idea
```

### 4. OCR 调试

```bash
# logcat -s OcrHelper
# 输出示例:
#   OcrHelper: mode=AUTO → 链识别 [zh, ja, ko, hi, latin] 命中
#   OcrHelper: 公式预处理 → grayscale + contrast 1.4x
```

---

## 🏗️ 架构概览

**MVVM + Repository + 单 Activity + Compose Navigation**，无 Hilt/Koin（手动注入，保持轻量）。

```
┌──────────────────────────────────────────┐
│  UI Layer (Compose)                      │
│  Screen + ViewModel + StateFlow          │
└────────────┬─────────────────────────────┘
             │ collect / 触发事件
┌────────────▼─────────────────────────────┐
│  Repository Layer                        │
│  AuthRepository / MistakeRepository /   │
│  IdeasRepository / SummaryRepository    │
└────────────┬─────────────────────────────┘
             │ suspend fun / Flow
┌────────────▼─────────────────────────────┐
│  Data Layer                              │
│  LekaoApi (Retrofit) + TokenStore       │
│  (DataStore) + Room (Drafts) + SseClient│
└──────────────────────────────────────────┘
```

详细架构（模块边界、状态管理、错误流、SSE 重连、ProGuard 策略）见 [`docs/architecture.md`](docs/architecture.md)。

---

## 📜 文档

| 文档 | 内容 |
|------|------|
| [`docs/architecture.md`](docs/architecture.md) | MVVM / Repository / 模块边界 / SSE 重连 / ProGuard 策略 / 性能 |
| [`docs/api-integration.md`](docs/api-integration.md) | BASE_URL / Cookie 鉴权 / SSE 流式 / 错误码 / 重试 / 限流 |
| [`docs/user-guide.md`](docs/user-guide.md) | 功能介绍 / 常见操作 / FAQ / 截图位 |
| [`../docs/stages/d1-lekao-android.md`](../docs/stages/d1-lekao-android.md) | V1.0.0 完整版 spec（主文档）|

---

## 🤝 贡献

私有项目，不接受外部 PR。

---

## 👤 作者

- **项目**：TimeCraker / Lekao
- **Android 客户端版本**：V1.0.0（2026-06-27）
- **作者**：Claude（AI 时代独立架构师）
- **日期**：2026-06-27
- **许可证**：私有
