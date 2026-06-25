# D1 · Lekao Android 客户端（**V1.0.0 完整版** · 一口气全做完）

> **目标**：用 Kotlin + Jetpack Compose 写一个 Android 原生 APP，**功能 = Web 全套 + 17 项手机特化 + 7 项高级功能 = 全部做完**（V0.1.0 + V0.2.0 全部包含），1 个 commit 仓库 monorepo
> **背景**：用户没做过手机 APP，想用 Lekao 当例子练手；用户原话"全部都做完，一口气就是所有功能全部都做完，要全部包含在内"
> **日期**：2026-06-25
> **关联**：[Lekao Web 仓库](https://github.com/TimeCraker/Lekao) | [Lekao 部署](https://lekao.asterforge.top)

---

## §0 · 一句话价值

让培训机构助教**装一个 15-20MB 的安卓 APP 到手机**（群发安装包），点图标全屏打开——**功能跟 Web 一样全 + 17 项手机专属 + 7 项高级功能 = 一口气全做完**（不拆 V0.1.0 / V0.2.0）。**1 个仓库 + 1 个 commit 节奏管理两端**。

---

## §1 · 范围（Scope）—— **全部做完，不留尾巴**

### 1.1 仓库策略（用户拍板）

| 维度 | 决策 |
|------|------|
| **项目位置** | `C:\Users\TimeCraker\Desktop\my_workspace\lekao\lekao-android\`（**Lekao 仓库子目录**）|
| **Git 仓库** | **用现有 `TimeCraker/Lekao`**，**不**新建独立仓库（用户原话"网页端和手机端放一起也没啥问题"）|
| **Monorepo 结构** | `lekao/` 仓库根 → `lekao-android/` 子目录（Android 项目）|
| **目录隔离** | `lekao-android/` 跟 `src/` `prisma/` `docs/` 完全独立，互不污染 |
| **依赖管理** | Web 用 pnpm，Android 用 Gradle，**互不依赖** |
| **CI/CD** | Web 走 `lekao-web` systemd 服务；Android 走本地 build → 群发 .apk（**不上架**）|

### 1.2 基础功能（对齐 Web · 必做）

| # | 功能模块 | 用户故事 | 复用 Lekao API |
|---|---------|---------|---------------|
| F01 | 邮箱密码登录 | 邮箱密码登录 + 重置密码 | `POST /api/auth/sign-in-password` + `/api/auth/reset` |
| F02 | 验证码登录 | 邮箱 + 6 位验证码 | `POST /api/auth/send-code` + `/api/auth/verify-code` |
| F03 | Dashboard 首页 | T-Coin 余额 + 6 个功能入口卡片 | `GET /api/auth/me` |
| F04 | 课堂小结 | 传图 → AI 流式生成 subject + topic + feedback + summary | `POST /api/lekao/summarize` (SSE) |
| F05 | 课堂反馈 | 文字输入 → AI 流式生成 feedback | `POST /api/lekao/summarize` (template=feedback) |
| F06 | 错题集 Mistake | 拍照/选图 → 划题 → 选科目 → 导出 docx/zip | `POST /api/lekao/mistake/*` |
| F07 | 灵感墙 Ideas | 浏览 + 提交 + 点赞 + 评论 + TOP 3 | `GET/POST /api/lekao/ideas` + `/comments` + `/like` |
| F08 | 个人中心 | 改昵称 / 退出登录 / 主题 | `GET /api/auth/me` + `POST /api/auth/signout` |
| F09 | 灵感墙详情 | 评论 / 提交 | 复用 F07 |
| F10 | Admin 后台 | 仅 admin 角色可见 | `GET /api/admin/*` |

### 1.3 V1.0.0 手机特化功能（17 项 · "比 Web 更丰富"）

| # | 功能 | 用户价值 | 实现 | V1.0.0 |
|---|------|---------|------|--------|
| **M01** | **系统相机拍照** | 错题集核心 | CameraX / Intent | ✅ |
| **M02** | **相册多图选择**（最多 9 张）| 错题集核心 | PhotoPicker | ✅ |
| **M03** | **系统分享**（分享 docx/zip 到微信/钉钉/邮件）| **用户原话"一键发家长群"** | ACTION_SEND | ✅ |
| **M04** | **生物识别登录**（指纹/Face ID）| 体验 + 安全 | androidx.biometric | ✅ |
| **M05** | **错题集 docx 导出** | **用户原话"不要少功能"** | apache-poi | ✅ |
| **M06** | **错题集图片标注**（涂鸦/箭头/裁切/文字）| 老师常用 | Compose Canvas | ✅ |
| **M07** | **App 启动屏 + Lottie 动画** | 第一印象 | core-splashscreen + lottie | ✅ |
| **M08** | **桌面快捷方式**（长按图标快速做小结/反馈/灵感）| 体验 | App Shortcuts | ✅ |
| **M09** | **离线缓存 + 错题集草稿箱**（Room + WorkManager）| 断网可编辑 | Room + WorkManager | ✅ |
| **M10** | **图片智能裁切**（拍照后自动识别错题边界）| 体验 | ucrop | ✅ |
| **M11** | **首页快捷入口**（桌面小部件 / Tile）| 体验 | Glance AppWidget | ✅ |
| **M12** | **推送通知**（FCM）| 商业化后通知 | Firebase Cloud Messaging | ✅ |
| **M13** | **主题切换**（深色/浅色/跟随系统）| 体验 | Material 3 dynamic color | ✅ |
| **M14** | **多语言**（中英切换）| 国际化 | i18n + strings.xml | ✅ |
| **M15** | **Dashboard 图表**（T-Coin 流水 / 灵感墙趋势）| 数据可视化 | Vico | ✅ |
| **M16** | **OCR 拍照识别**（自动识别错题文字）| 体验升级 | ML Kit Text Recognition | ✅ |
| **M17** | **SSE 长连接**（灵感墙实时刷新新评论/点赞）| 实时 | OkHttp SSE | ✅ |

### 1.4 V1.0.0 必做总览

- **基础 10 项**（F01-F10）
- **手机特化 17 项**（M01-M17）
- **总计 27 项** = 全部做完

### 1.5 V1.0.0 之后再说（**用户原话"全部" = 含 V0.1.0+V0.2.0，不含 iOS**）

| 项 | 原因 | V1.0.0 是否做 |
|----|------|---------------|
| ❌ **iOS 端** | 需 Mac + Xcode，等买 Mac | **不做**（V2.0.0）|
| ❌ **微信 OAuth 登录** | 阻塞：公司主体 | **不做**（V2.0.0）|
| ❌ **Google Play 上架** | 用户原话"不用上架" | **不做**（永远不上）|
| ❌ **错题集云端同步**（V0 PRD P1）| 跟 Web 一起做 | **不做**（V2.0.0）|
| ❌ **模板系统 UI**（V0 PRD P1）| 跟 Web 一起做 | **不做**（V2.0.0）|
| ❌ **二维码扫描登录** | 优先级低 | **不做**（V2.0.0）|

---

## §2 · 技术栈

### 2.1 核心栈

| 类别 | 技术 | 版本 | 用途 |
|------|------|------|------|
| **语言** | Kotlin | 1.9.24 | 主语言（Android 官方）|
| **UI 框架** | Jetpack Compose | BOM 2024.10.01 | 声明式 UI |
| **设计系统** | Material 3 | 1.3.1 | Google 最新设计 |
| **构建** | Gradle | 8.10.2 | 构建系统 |
| **IDE** | Android Studio | Ladybug 2024.2.2 | Windows 直接装 |
| **minSdk** | 26 (Android 8.0) | — | 覆盖 99% 设备 |
| **targetSdk** | 34 (Android 14) | — | Play Store 要求 |
| **compileSdk** | 35 (Android 15) | — | 最新 API |

### 2.2 关键依赖（V1.0.0 完整版 · 一次性装齐）

```kotlin
// app/build.gradle.kts
dependencies {
    // ============ AndroidX 核心 ============
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.6")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.6")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.6")
    implementation("androidx.activity:activity-compose:1.9.3")

    // ============ Compose + Material 3 ============
    implementation(platform("androidx.compose:compose-bom:2024.10.01"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.compose.foundation:foundation")
    debugImplementation("androidx.compose.ui:ui-tooling")

    // ============ Navigation ============
    implementation("androidx.navigation:navigation-compose:2.8.4")

    // ============ 网络（接 Lekao API）============
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-gson:2.11.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

    // ============ 图片加载 ============
    implementation("io.coil-kt:coil-compose:2.7.0")

    // ============ 协程 ============
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")

    // ============ 数据存储（JWT cookie + 离线缓存）============
    implementation("androidx.datastore:datastore-preferences:1.1.1")
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    annotationProcessor("androidx.room:room-compiler:2.6.1")
    ksp("androidx.room:room-compiler:2.6.1")

    // ============ 错题集 docx 导出（apache-poi）============
    implementation("org.apache.poi:poi-ooxml:5.3.0")
    implementation("org.apache.poi:poi-scratchpad:5.3.0")

    // ============ WorkManager（后台同步）============
    implementation("androidx.work:work-runtime-ktx:2.9.1")

    // ============ 启动屏 + Lottie ============
    implementation("androidx.core:core-splashscreen:1.0.1")
    implementation("com.airbnb.android:lottie-compose:6.5.0")

    // ============ 生物识别 ============
    implementation("androidx.biometric:biometric:1.2.0-alpha05")

    // ============ 相机（拍照 + 扫描）============
    implementation("androidx.camera:camera-core:1.3.4")
    implementation("androidx.camera:camera-camera2:1.3.4")
    implementation("androidx.camera:camera-lifecycle:1.3.4")
    implementation("androidx.camera:camera-view:1.3.4")

    // ============ 图片编辑（涂鸦/裁切）============
    implementation("com.github.yalantis:ucrop:2.2.10")

    // ============ 推送通知（FCM · M12）============
    implementation("com.google.firebase:firebase-bom:33.5.1")
    implementation("com.google.firebase:firebase-messaging-ktx")

    // ============ OCR（ML Kit · M16）============
    implementation("com.google.mlkit:text-recognition:16.0.1")
    implementation("com.google.mlkit:text-recognition-chinese:16.0.1")

    // ============ Dashboard 图表（Vico · M15）============
    implementation("com.patrykandpatrick.vico:compose:2.0.0-beta.1")
    implementation("com.patrykandpatrick.vico:compose-m3:2.0.0-beta.1")

    // ============ 桌面小部件（Glance · M11）============
    implementation("androidx.glance:glance-appwidget:1.1.0")
    implementation("androidx.glance:glance-material3:1.1.0")

    // ============ JSON（API 数据）============
    implementation("com.google.code.gson:gson:2.11.0")

    // ============ 测试 ============
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.9.0")
    testImplementation("org.mockito:mockito-core:5.14.2")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
}
```

### 2.3 不引入（反过度架构）

按 CLAUDE.md 反过度架构 + 阶段化交付：
- ❌ **Hilt / Koin**（依赖注入）— 手写 singleton
- ❌ **Compose Multiplatform**（跨平台）— 用户只要 Android
- ❌ **MVI / Clean Architecture** — 用最简 MVVM
- ❌ **iOS 端 / Swift**（V1.0.0 不做）
- ❌ **Tailwind 风格的样式表** — 用 Material 3 主题

---

## §3 · 架构

### 3.1 模式：MVVM + Repository

```
┌──────────────────────────────────────────────┐
│  UI Layer (Compose Screens + ViewModel)      │  ← 用户看见
├──────────────────────────────────────────────┤
│  Data Layer (Repository + Room + Retrofit)   │  ← 数据进出
├──────────────────────────────────────────────┤
│  Network Layer (OkHttp + Retrofit + Cookie)   │  ← 接 Lekao API
└──────────────────────────────────────────────┘
```

### 3.2 Monorepo 目录结构（Lekao 仓库 + Android 子项目）

```
TimeCraker/Lekao/                    ← Git 仓库根（同一个）
├── .gitignore                        ← 加 android/ 排除项
├── .env / .env.example               ← Web env
├── package.json / pnpm-lock.yaml     ← Web 依赖
├── next.config.ts                    ← Web 配置
├── prisma/                           ← Web DB schema
├── src/                              ← Web Next.js 代码
├── public/                           ← Web 静态资源
├── docs/                             ← 文档（包含本文档）
├── scripts/                          ← Web 脚本（deploy 等）
├── deploy/                           ← Web 部署
│
└── lekao-android/                    ← ⭐ Android 项目（不依赖 Web 代码）
    ├── .gitignore                    ← Android 自己的 gitignore
    ├── settings.gradle.kts
    ├── build.gradle.kts              ← 根 build
    ├── gradle.properties
    ├── gradlew / gradlew.bat
    ├── gradle/wrapper/
    ├── local.properties              ← IDE 路径（不入仓）
    ├── README.md
    ├── docs/
    │   ├── architecture.md
    │   ├── api-integration.md
    │   └── user-guide.md
    └── app/
        ├── build.gradle.kts
        ├── proguard-rules.pro
        ├── google-services.json      ← FCM (M12)
        └── src/main/
            ├── java/com/lekao/app/
            │   ├── MainActivity.kt
            │   ├── LekaoApp.kt
            │   ├── data/
            │   │   ├── api/
            │   │   ├── auth/
            │   │   ├── summary/
            │   │   ├── feedback/
            │   │   ├── mistake/
            │   │   ├── ideas/
            │   │   └── local/        ← Room 数据库
            │   ├── domain/           ← V2 再加
            │   ├── ui/
            │   │   ├── theme/        ← M13 主题切换
            │   │   ├── i18n/         ← M14 多语言
            │   │   ├── login/
            │   │   ├── dashboard/    ← M15 Dashboard 图表
            │   │   ├── summary/
            │   │   ├── feedback/
            │   │   ├── mistake/
            │   │   ├── ideas/
            │   │   ├── settings/
            │   │   ├── admin/
            │   │   ├── widgets/      ← M11 Glance AppWidget
            │   │   └── components/   ← 复用组件
            │   ├── util/
            │   │   ├── BiometricHelper.kt   ← M04
            │   │   ├── CameraHelper.kt      ← M01
            │   │   ├── DocxExporter.kt      ← M05
            │   │   ├── ImageAnnotator.kt    ← M06
            │   │   ├── ShareHelper.kt       ← M03
            │   │   ├── SplashScreenHelper.kt ← M07
            │   │   ├── OcrHelper.kt         ← M16
            │   │   ├── NotificationHelper.kt ← M12
            │   │   └── SseClient.kt         ← M17
            │   └── nav/
            └── res/
                ├── values/ (colors.xml, strings.xml, themes.xml)
                ├── values-en/ (M14 英文)
                ├── drawable/
                ├── mipmap-*/ (5 个图标尺寸)
                ├── raw/ (Lottie JSON)
                └── xml/
                    ├── network_security_config.xml
                    ├── file_paths.xml (FileProvider)
                    ├── shortcuts.xml (M08)
                    └── glance_appwidget_info.xml (M11)
```

### 3.3 关键架构决策（17 项功能对应 17 决策）

#### 3.3.1 Auth：JWT Cookie（复用 Lekao next-auth）

**Lekao 用 next-auth，session 存 JWT cookie**。Android 客户端 OkHttp CookieManager 自动存 cookie。

#### 3.3.2 流式响应（SSE）— M17 + 课堂小结流式输出

**Lekao `/api/lekao/summarize` 是流式 SSE 输出**。Android 端用 OkHttp `Response.body.source().readUtf8Line()` 解析。

```kotlin
fun streamSummary(request: SummaryRequest, onChunk: (String) -> Unit) {
    api.streamSummary(request).enqueue(object : Callback<ResponseBody> {
        override fun onResponse(call: Call<ResponseBody>, response: Response) {
            val source = response.body()?.source() ?: return
            while (!source.exhausted()) {
                val line = source.readUtf8Line() ?: break
                if (line.startsWith("data:")) {
                    val chunk = line.removePrefix("data:").trim()
                    onChunk(chunk)
                }
            }
        }
    })
}
```

#### 3.3.3 错题集 docx 导出（M05）

**V1.0.0 必须做 docx**（用户原话"不要少功能"）。用 apache-poi。

#### 3.3.4 错题集图片标注（M06）

**老师拍照后能在图片上画箭头/圈出/加文字**。自定义 Compose Canvas 组件 + 触摸事件。

#### 3.3.5 系统分享（M03 · 错题集发家长群）

**用户原话"一键发家长群"**。Android 用系统分享 Intent：

```kotlin
fun shareDocx(file: File, subject: String) {
    val uri = FileProvider.getUriForFile(context, "${packageName}.fileprovider", file)
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        putExtra(Intent.EXTRA_STREAM, uri)
        putExtra(Intent.EXTRA_SUBJECT, subject)
        flags = Intent.FLAG_GRANT_READ_URI_PERMISSION
    }
    context.startActivity(Intent.createChooser(intent, "分享到..."))
}
```

#### 3.3.6 错题集草稿箱（M09 · 离线缓存）

**App 关闭时错题集草稿保存到本地**。Room 数据库 + WorkManager 同步。

#### 3.3.7 桌面快捷方式（M08）

**Android 7.1+ 支持 App Shortcuts**：

```xml
<!-- res/xml/shortcuts.xml -->
<shortcuts xmlns:android="http://schemas.android.com/apk/res/android">
    <shortcut
        android:shortcutId="quick_summary"
        android:enabled="true"
        android:icon="@drawable/ic_summary"
        android:shortcutShortLabel="@string/shortcut_summary"
        android:shortcutLongLabel="@string/shortcut_summary_long">
        <intent
            android:action="android.intent.action.VIEW"
            android:targetPackage="com.lekao.app"
            android:targetClass="com.lekao.app.MainActivity"
            android:data="lekao://summary" />
    </shortcut>
</shortcuts>
```

#### 3.3.8 推送通知（M12 · FCM）

**Firebase Cloud Messaging** 集成。F12.1 创建 Firebase 项目 + 配 `google-services.json` → F12.2 注册 device token 到 Lekao API → F12.3 收消息处理。

#### 3.3.9 主题切换（M13）

**Material 3 dynamic color + 手动覆盖**：

```kotlin
@Composable
fun LekaoTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) darkColorScheme(...) else lightColorScheme(...)
    MaterialTheme(colorScheme = colorScheme, content = content)
}
```

#### 3.3.10 多语言（M14）

**中英切换**：`res/values/strings.xml` (中) + `res/values-en/strings.xml` (英)，用户设置语言自动切换。

#### 3.3.11 Dashboard 图表（M15）

**Vico 图表库** 显示 T-Coin 流水 / 灵感墙趋势 / 错题集分类统计。

#### 3.3.12 OCR（M16）

**ML Kit Text Recognition**（中文 + 英文）：拍照后自动识别错题文字 → 填入错题编辑器。

#### 3.3.13 SSE 长连接（M17）

**灵感墙实时刷新**：用户 A 评论灵感 X → 用户 B 在灵感墙列表中 1s 内看到新评论（不刷新页面）。

#### 3.3.14 主题色：复用 Lekao 蓝白

```kotlin
val LekaoBlue = Color(0xFF3B82F6)        // --accent
val LekaoBlueText = Color(0xFF1D4ED8)    // --accent-text
val LekaoCanvas = Color(0xFFFAFBFC)      // --canvas
val LekaoParchment = Color(0xFFF5F5F4)   // --parchment
val LekaoSignal = Color(0xFFFB7185)      // --signal
val LekaoInk = Color(0xFF1F2937)         // --ink
val LekaoInkMuted = Color(0xFF6B7280)
val LekaoInkSubtle = Color(0xFF9CA3AF)
val LekaoHairline = Color(0xFFE5E7EB)
val LekaoSuccess = Color(0xFF10B981)
val LekaoError = Color(0xFFEF4444)
```

---

## §4 · API 集成

### 4.1 调用 Lekao Web 部署地址

```kotlin
object LekaoConfig {
    const val BASE_URL = "https://lekao.asterforge.top"
    const val API_VERSION = "/api"
}
```

### 4.2 需要调用的 API 清单（17 个端点）

| 模块 | Endpoint | Method | 用途 |
|------|----------|--------|------|
| Auth | `/api/auth/send-code` | POST | 发送验证码 |
| Auth | `/api/auth/verify-code` | POST | 验证码登录 |
| Auth | `/api/auth/sign-in-password` | POST | 密码登录 |
| Auth | `/api/auth/reset` | POST | 重置密码 |
| Auth | `/api/auth/me` | GET | 当前用户信息 |
| Auth | `/api/auth/signout` | POST | 登出 |
| Summary | `/api/lekao/summarize` | POST (SSE) | 课堂小结（流式）|
| Mistake | `/api/lekao/mistake/upload` | POST | 错题集图片上传 |
| Mistake | `/api/lekao/mistake/list` | GET | 错题集历史 |
| Mistake | `/api/lekao/mistake/export` | POST | 错题集导出（zip/docx）|
| Ideas | `/api/lekao/ideas` | GET | 灵感墙列表 |
| Ideas | `/api/lekao/ideas` | POST | 提交灵感 |
| Ideas | `/api/lekao/ideas/[id]/like` | POST | 点赞 |
| Ideas | `/api/lekao/ideas/[id]/comments` | GET/POST | 评论 |
| Admin | `/api/admin/*` | GET/POST | 后台（仅 admin）|
| FCM | `/api/lekao/fcm/register` | POST | 注册 device token（M12）|

### 4.3 错误处理

Lekao API 返回 `{ error: "..." }` 4xx/5xx。Android 端：
- 401 → 自动跳登录页
- 403 → banned 提示
- 429 → 限流提示
- 5xx → "服务器错误，请稍后重试"

---

## §5 · 任务分解（**36 天 · 75 T 任务** · 7 阶段）

### 阶段 D1-A · 环境 + 项目脚手架（Day 1-4）

| # | 任务 | 验收 |
|---|------|------|
| T01 | 装 Android Studio Ladybug（Windows 11）| 能打开 |
| T02 | Kotlin 基础（变量/函数/类/lambda）| 写 List 排序 demo |
| T03 | Compose 基础（Composable / Modifier / State）| 写计数器 |
| T04 | Material 3 组件（Button/TextField/Card）| 写登录页 UI（假数据）|
| T05 | `lekao-android/` 目录建好（用户要求）| GitHub 仓库目录已建（不新建仓库）|
| T06 | 新建 Android 项目（package `com.lekao.app`）| 项目能 build |
| T07 | 配 build.gradle.kts 依赖（70+ 库一次性装齐）| Gradle sync 成功 |
| T08 | 主题色 + 字体（复用 Lekao 蓝白）| 启动后背景蓝白 |
| T09 | Retrofit + OkHttp + CookieManager 配 BASE_URL | ping 通 lekao.asterforge.top |
| T10 | Navigation 配全（17 个页面）| 各页能跳 |

### 阶段 D1-B · 登录 + Dashboard + 启动屏（Day 5-9）

| # | 任务 | 验收 |
|---|------|------|
| T11 | AuthRepository（send-code/verify-code/sign-in-password）| 真机登录成功 |
| T12 | LoginScreen + LoginViewModel（密码 + 验证码 2 选 1）| 跳空 Dashboard |
| T13 | TokenStore（DataStore 存 JWT cookie）| 重启不用重登 |
| T14 | **M04 BiometricHelper**（指纹/Face 二次确认）| 第二次启动要指纹 |
| T15 | **M07 Lottie 动画**（启动屏 + loading）| 启动动画流畅 |
| T16 | SplashScreenHelper（Android 12+ SplashScreen API）| 启动屏统一 |
| T17 | **M13 主题切换**（深色/浅色/跟随系统）| 切换生效 |
| T18 | **M14 多语言**（中英切换）| 切换生效 |
| T19 | DashboardScreen（6 入口卡片 + T-Coin 余额）| 数据正确 |
| T20 | **M15 Dashboard 图表**（T-Coin 流水趋势 Vico）| 图表显示 |

### 阶段 D1-C · 课堂小结 + 课堂反馈（Day 10-13）

| # | 任务 | 验收 |
|---|------|------|
| T21 | SummaryRepository（SSE 流式）| 解析 SSE |
| T22 | SummaryScreen（图片上传 + 流式显示 + 保存）| 完整跑通 |
| T23 | FeedbackRepository（复用 Summary，template=feedback）| 写 FeedbackScreen |
| T24 | FeedbackScreen（文字输入 + 流式显示）| 完整跑通 |
| T25 | **M16 OCR Helper**（ML Kit 中英文）| 拍照后自动识别 |
| T26 | 单元测试 SummaryRepository（SSE 解析）| Gradle test 过 |

### 阶段 D1-D · 错题集完整闭环（Day 14-19）

| # | 任务 | 验收 |
|---|------|------|
| T27 | **M01 CameraHelper**（调起系统相机 ACTION_IMAGE_CAPTURE + FileProvider）| 能拍照存 cache |
| T28 | **M02 PhotoPicker 集成**（多图选择，最多 9 张）| 能选多图 |
| T29 | **M10 图片智能裁切**（拍照后 ucrop）| 拍照后能裁切 |
| T30 | **M06 ImageAnnotator**（涂鸦/箭头/裁切/文字）| 标注功能 OK |
| T31 | 错题集列表（本地 + 提交到服务端）| 能保存 |
| T32 | 错题集详情页（划题 + 选科目 + 备注）| 编辑 OK |
| T33 | **M05 DocxExporter**（apache-poi 生成 docx）| 导出 docx 能打开 |
| T34 | **M03 ShareHelper**（系统分享 docx）| 能分享到微信 |
| T35 | 调用 `/api/lekao/mistake/list` 看历史 | 历史能查 |
| T36 | **M09 Room 数据库**（mistake_drafts 表）| Room 跑通 |
| T37 | MistakeDraftDao + Repository | DAO 测试过 |
| T38 | **WorkManager 同步**（网络可用时上传草稿）| 后台自动同步 |
| T39 | 错题集草稿箱 UI | 草稿能恢复 |

### 阶段 D1-E · 灵感墙 + 个人中心 + Admin（Day 20-25）

| # | 任务 | 验收 |
|---|------|------|
| T40 | **M17 SseClient**（长连接 OkHttp SSE）| 灵感墙实时刷新 |
| T41 | IdeasListScreen（列表 + 筛选 + 排序 + 搜索）| 浏览正常 |
| T42 | 提交灵感弹窗（标题 50 + 描述 500）| 提交成功 |
| T43 | 点赞（乐观更新 + API）| 点赞 OK |
| T44 | 评论（懒加载 + 提交）| 评论 OK |
| T45 | TOP 3 横排 | 排行正确 |
| T46 | SettingsScreen（改昵称 / 退出登录 / 主题 / 语言）| 改昵称成功 |
| T47 | **M12 FCM 推送**（注册 token + 收消息）| 推送能收到 |
| T48 | **M08 App Shortcuts**（长按图标快速做小结/反馈/灵感）| 长按图标出 3 个快捷 |
| T49 | **M11 Glance AppWidget**（桌面小部件）| 桌面小部件能进 App |
| T50 | Admin 后台入口（仅 admin 角色可见）| admin 能进 |
| T51 | Admin Dashboard 简化版（流水/审计/封禁查询）| 3 模块能用 |

### 阶段 D1-F · V0.2.0 高级特化功能（Day 26-33）

| # | 任务 | 验收 |
|---|------|------|
| T52 | **M12 推送通知增强**（按 type 分类：灵感/系统/评论）| 分类通知 |
| T53 | **M13 主题切换增强**（自定义主色）| 5 套主色 |
| T54 | **M14 多语言增强**（动态切换不重启）| 立即生效 |
| T55 | **M15 Dashboard 图表增强**（错题集分类统计 / 灵感墙趋势）| 3 类图表 |
| T56 | **M16 OCR 增强**（公式识别 / 多语种）| 公式能识别 |
| T57 | **M17 SSE 增强**（断线重连 / 错误提示）| 断线自动重连 |
| T58 | 性能优化（启动时间 / 滚动流畅度）| 冷启动 < 2s |
| T59 | 真机测试所有功能（27 个模块）| 0 崩溃 |
| T60 | ProGuard 配 release minify | release APK 能跑 |

### 阶段 D1-G · 收尾 + V1.0.0 release（Day 34-36）

| # | 任务 | 验收 |
|---|------|------|
| T61 | 配签名（debug.keystore + 临时 release.keystore）| 能 build |
| T62 | 真机最终测试（clean install）| 完整流程 OK |
| T63 | 修 bug（按测试发现）| 修完无 P0 bug |
| T64 | 写 `lekao-android/README.md`（中文 + 安装步骤）| README 完整 |
| T65 | 写 `lekao-android/docs/architecture.md` | 架构文档完整 |
| T66 | 写 `lekao-android/docs/api-integration.md` | API 集成文档完整 |
| T67 | 写 `lekao-android/docs/user-guide.md` | 用户使用指南 |
| T68 | 跑完整 Gradle build（assembleDebug + assembleRelease）| 0 错 |
| T69 | 更新 `lekao/CHANGELOG.md`（V1.0.0 release 记录）| CHANGELOG 完整 |
| T70 | Git commit（`feat(android): V1.0.0 完整版 · 27 项功能`）| 三端同步 |
| T71 | 输 `lekao-android-V1.0.0.apk`（约 15-20MB）| 可群发 |
| T72 | 跑 Lighthouse mobile 验证 Android 性能（用 web 端）| perf 验证 |
| T73 | 写 release notes（用户使用指南）| 完整 |
| T74 | 用户验收（你装一遍）| OK |
| T75 | 标记 V1.0.0 完成 | V1.0.0 released |

---

## §6 · 验收标准

### 6.1 功能验收（27 项全过 · 不漏一项）

| # | 验收项 | 通过标准 |
|---|--------|---------|
| F01 | 登录（密码 + 验证码 2 种）| 都能登录，重启保持 |
| F02 | **M04 生物识别** | 第二次启动要指纹 |
| F03 | Dashboard | T-Coin 余额 + 6 入口 + 图表 |
| F04 | 课堂小结 | 传图 → 流式 → 保存 → 扣币 |
| F05 | 课堂反馈 | 文字 → 流式 → 保存 → 扣币 |
| F06 | **M01 系统相机** | 拍照能存到 App |
| F07 | **M02 多图选择** | 最多 9 张 |
| F08 | **M06 图片标注** | 能画箭头/圈/文字 |
| F09 | **M05 docx 导出** | 导出能在 Word 打开 |
| F10 | **M03 系统分享** | 能分享到微信/钉钉/邮件 |
| F11 | 灵感墙 | 列表 + 提交 + 点赞 + 评论 + TOP 3 |
| F12 | **M09 离线草稿箱** | 草稿能恢复 |
| F13 | **M08 桌面快捷方式** | 长按图标快速进 App |
| F14 | **M07 启动屏 Lottie** | 启动动画流畅 |
| F15 | **M11 桌面小部件** | 桌面小部件能进 App |
| F16 | **M12 FCM 推送** | 推送能收到 |
| F17 | **M13 主题切换** | 深色/浅色/跟随 |
| F18 | **M14 多语言** | 中英切换 |
| F19 | **M15 Dashboard 图表** | 3 类图表 |
| F20 | **M16 OCR** | 拍照自动识别 |
| F21 | **M17 SSE** | 灵感墙实时刷新 |
| F22 | **M10 图片智能裁切** | 拍照后自动识别边界 |
| F23 | 个人中心 | 改昵称 / 退出 / 主题 / 语言 |
| F24 | Admin 后台（admin 角色）| 流水/审计/封禁能用 |
| F25 | 错题集历史 | 能查询历史 |
| F26 | 课堂小结/反馈历史 | 能查询历史 |
| F27 | 灵感墙详情 | 评论/提交 |

### 6.2 质量验收

| # | 验收项 | 通过标准 |
|---|--------|---------|
| Q01 | 编译 | `assembleDebug` 0 错 0 警告 |
| Q02 | 单元测试 | 覆盖 SummaryRepository / DocxExporter / ImageAnnotator / OcrHelper |
| Q03 | APK 大小 | < 20MB |
| Q04 | 启动时间 | 冷启动 < 2s（中端机）|
| Q05 | 真机测试 | 至少 2 台 Android 手机（不同 API level）跑通 |

### 6.3 体验验收

| # | 验收项 | 通过标准 |
|---|--------|---------|
| E01 | 主题色 | 跟 Lekao Web 蓝白一致 |
| E02 | 字体 | Roboto |
| E03 | 加载态 | 所有请求有 loading |
| E04 | 错误提示 | 4xx/5xx 友好中文 |
| E05 | 空状态 | 列表空时显示"暂无数据" |
| E06 | 401 处理 | 自动跳登录页 |
| E07 | 触感反馈 | 按钮按下有 haptic |

---

## §7 · 风险 + 备选

| # | 风险 | 应对 |
|---|------|------|
| R01 | 36 天可能延期 | 25% buffer（Day 34-36 留作 buffer）|
| R02 | apache-poi 依赖大（+5MB）| 必要时换 OpenXML SDK 减体积 |
| R03 | Room 数据库迁移 | V1 简单 schema，V2 加迁移 |
| R04 | WorkManager 后台限制（Android 12+）| 用前台服务兜底 |
| R05 | CameraX 复杂 | 优先用系统相机 Intent，V2 再用 CameraX |
| R06 | ucrop 库维护 | 用免费版 |
| R07 | 启动屏 Lottie 性能 | 控制 JSON < 100KB |
| R08 | 桌面小部件电池消耗 | 用 Glance 框架（轻量）|
| R09 | FCM 配置复杂 | Firebase Console 项目提前建好 |
| R10 | ML Kit 体积大（+10MB）| 必要时切到云端 API |
| R11 | 用户第一次做 Android | 多查文档 + 多用 Android Studio 模板 |
| R12 | 真机 USB 调试连不上 | WiFi 调试（Android 11+）fallback |
| R13 | 多语言维护成本 | 用 stringResource() 集中管理 |
| R14 | FCM 在国内被墙 | 商业化后用极光/友盟推送替代 |
| R15 | 主题色跨版本差异 | Material 3 dynamic color 兜底 |

---

## §8 · 时间表（**36 天 · 7 周 + 1 天**）

- **D1-A**（2026-06-26 ~ 06-29）：环境 + 项目脚手架（4 天）
- **D1-B**（2026-06-30 ~ 07-04）：登录 + Dashboard + 启动屏（5 天）
- **D1-C**（2026-07-05 ~ 07-08）：课堂小结 + 课堂反馈（4 天）
- **D1-D**（2026-07-09 ~ 07-14）：错题集完整闭环（6 天）
- **D1-E**（2026-07-15 ~ 07-20）：灵感墙 + 个人中心 + Admin（6 天）
- **D1-F**（2026-07-21 ~ 07-28）：V0.2.0 高级特化（8 天）
- **D1-G**（2026-07-29 ~ 07-31）：收尾 + V1.0.0 release（3 天）
- **预计交付**：**2026-07-31**

---

## §9 · V1.0.0 范围外

### V2.0.0（V1.0.0 跑通后再加 · 约 14 天）

- ❌ **iOS 端**（Swift + SwiftUI，等买 Mac）
- ❌ **微信 OAuth 登录**（阻塞：公司主体）
- ❌ **Google Play 上架**（用户原话"不用上架"）
- ❌ **错题集云端同步**（跟 Web 一起做）
- ❌ **模板系统 UI**（跟 Web 一起做）
- ❌ **二维码扫描登录**（优先级低）

### 暂永远不做

- ❌ Google Play 上架（用户原话"不用上架"）
- ❌ 微信 OAuth（阻塞：公司主体）

---

## §10 · 相关文档

- [Lekao PRD §3.5 错题集](../PRD.md#35-错题集-核心)
- [Lekao PRD §3.6 课堂小结](../PRD.md#36-课堂小结)
- [Lekao PRD §3.7 课堂反馈](../PRD.md#37-课堂反馈)
- [Lekao v2.2.0 灵感墙 stage spec](./v2.2.0-inspiration-wall.md)
- [Lekao 部署指南](../../README.md)
- [Lekao API 集成指南](../api-integration.md)（待写）

---

**作者签名**：Claude（AI 时代独立架构师）
**审批人**：（待用户审批）
**审批日期**：（待填）

---

## 📋 用户反馈记录（V1.0.0 完整版）

- ✅ **位置**：`lekao/lekao-android/`（在 Lekao 仓库下）
- ✅ **仓库**：用现有 `TimeCraker/Lekao`，**不**新建
- ✅ **范围**：**全部做完**（V0.1.0 + V0.2.0 = 27 项）— 用户原话"全部都做完，一口气就是所有功能全部都做完，要全部包含在内"
- ✅ **错题集 docx**：必做（用户原话"不要少功能"）
- ✅ **错题集分享**：必做（用户原话"一键发家长群"）
- ✅ **iOS**：V2.0.0（等买 Mac）
- ✅ **预计交付**：2026-07-31（36 天）
