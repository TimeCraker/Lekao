# D1 · Lekao Android 客户端（v0.1.0 · MVP + 手机特化）

> **目标**：用 Kotlin + Jetpack Compose 写一个 Android 原生 APP，**功能完全对齐 Lekao Web + 11 项手机特化功能**（拍照/分享/生物识别/离线/桌面快捷方式等），**1 个 commit 仓库 monorepo**（不新建独立仓库）
> **背景**：用户没做过手机 APP，想用 Lekao 当例子练手；**功能不能少，要比 Web 更丰富**（用户原话）；Windows + Android 真机 = 走 D1（Android Native 单平台），暂缓 iOS
> **日期**：2026-06-25
> **关联**：[Lekao Web 仓库](https://github.com/TimeCraker/Lekao) | [Lekao 部署](https://lekao.asterforge.top)

---

## §0 · 一句话价值

让培训机构助教**装一个 10-15MB 的安卓 APP 到手机**（群发安装包），点图标全屏打开——**功能跟 Web 一样全**，**还多 11 项手机专属**（拍照/裁切/涂鸦/系统分享/指纹登录/桌面快捷方式/离线草稿/启动屏 Lottie 等）。**1 个仓库 + 1 个 commit 节奏管理两端**。

---

## §1 · 范围（Scope）

### 1.1 仓库策略（用户拍板）

| 维度 | 决策 |
|------|------|
| **项目位置** | `C:\Users\TimeCraker\Desktop\my_workspace\lekao\lekao-android\`（**Lekao 仓库子目录**）|
| **Git 仓库** | **用现有 `TimeCraker/Lekao`**，**不**新建独立仓库（用户原话"网页端和手机端放一起也没啥问题"）|
| **Monorepo 结构** | `lekao/` 仓库根 → `lekao-android/` 子目录（Android 项目）|
| **目录隔离** | `lekao-android/` 跟 `src/` `prisma/` `docs/` 完全独立，互不污染 |
| **依赖管理** | Web 用 pnpm，Android 用 Gradle，**互不依赖** |
| **CI/CD** | Web 走 `lekao-web` systemd 服务；Android 走本地 build → 群发 .apk（**不上架**）|

### 1.2 V0.1.0 功能清单（基础功能 · 必须对齐 Web）

| 优先级 | 功能模块 | 用户故事 | 复用 Lekao API |
|--------|---------|---------|---------------|
| **P0** | 邮箱密码登录 | 邮箱密码登录 + 重置密码 | `POST /api/auth/sign-in-password` + `/api/auth/reset` |
| **P0** | 验证码登录 | 邮箱 + 6 位验证码 | `POST /api/auth/send-code` + `/api/auth/verify-code` |
| **P0** | Dashboard 首页 | T-Coin 余额 + 6 个功能入口卡片 | `GET /api/auth/me` |
| **P0** | 课堂小结 | 传图 → AI 流式生成 subject + topic + feedback + summary | `POST /api/lekao/summarize` (SSE) |
| **P0** | 课堂反馈 | 文字输入 → AI 流式生成 feedback | `POST /api/lekao/summarize` (template=feedback) |
| **P0** | 错题集 Mistake | 拍照/选图 → 划题 → 选科目 → 导出 docx/zip | `POST /api/lekao/mistake/*` |
| **P0** | 灵感墙 Ideas | 浏览 + 提交 + 点赞 + 评论 + TOP 3 | `GET/POST /api/lekao/ideas` + `/comments` + `/like` |
| **P1** | 个人中心 | 改昵称 / 退出登录 | `GET /api/auth/me` + `POST /api/auth/signout` |
| **P1** | 灵感墙详情 | 评论 / 提交 | 复用 P0 |
| **P2** | Admin 后台 | 仅 admin 角色可见 | `GET /api/admin/*` |

### 1.3 V0.1.0 手机特化功能（11 项 · "比 Web 更丰富"）

| # | 功能 | 用户价值 | 实现成本 | 优先级 |
|---|------|---------|---------|-------|
| **M01** | **系统相机拍照** | 错题集核心，无拍照 = 错题集残废 | 1 天 | 🔴 P0 |
| **M02** | **相册多图选择**（最多 9 张）| 错题集核心 | 0.5 天 | 🔴 P0 |
| **M03** | **系统分享**（分享 docx/zip 到微信/钉钉/邮件）| **用户原话"一键发家长群"** = 错题集发出去 | 0.5 天 | 🔴 P0 |
| **M04** | **生物识别登录**（指纹/Face ID）| 体验升级 + 安全 | 0.5 天 | 🟡 P1 |
| **M05** | **错题集 docx 导出**（apache-poi，跟 Web 一样）| **用户原话"不要少功能"** | 2 天 | 🟡 P1 |
| **M06** | **错题集图片标注**（涂鸦/箭头/裁切/文字）| 老师常用 | 2 天 | 🟡 P1 |
| **M07** | **App 启动屏 + Lottie 动画** | 第一印象 | 0.5 天 | 🟡 P1 |
| **M08** | **桌面快捷方式**（长按图标 → 快速做小结/反馈/灵感）| 体验 | 0.5 天 | 🟢 P2 |
| **M09** | **离线缓存 + 错题集草稿箱**（Room + WorkManager）| 断网可编辑 | 3 天 | 🟢 P2 |
| **M10** | **图片智能裁切**（拍照后自动识别错题边界）| 体验 | 1 天 | 🟢 P2 |
| **M11** | **首页快捷入口**（桌面小部件 / Tile / Touch Bar）| 体验 | 1 天 | 🟢 P2 |

**V0.1.0 必做**（P0 + P1 = 5+6 = 11 项）= **基础 10 + 特化 5 = 15 项**

### 1.4 V0.2.0 暂缓（先跑通 V0.1.0 再加）

- **M12. 推送通知**（FCM 集成 + 通知权限）
- **M13. 主题切换**（深色/浅色/跟随系统）
- **M14. 多语言**（中英切换）
- **M15. Dashboard 图表**（Vico 图表库）
- **M16. OCR 拍照识别**（ML Kit）
- **M17. SSE 长连接**（灵感墙实时刷新）
- **M18. 二维码扫描登录**（CameraX + ML Kit）
- **M19. 错题集云端同步**（跟 Web 一起做）
- **M20. 模板系统 UI**（跟 Web 一起做）
- **M21. 微信 OAuth**（阻塞：公司主体）

### 1.5 V0.3.0 暂缓

- ❌ **iOS 端**（需 Mac + Xcode，等买 Mac）
- ❌ **App Store / Google Play 上架**（用户原话"不用上架"）

---

## §2 · 技术栈

### 2.1 核心栈

| 类别 | 技术 | 版本 | 用途 |
|------|------|------|------|
| **语言** | Kotlin | 1.9.24 | 主语言（Android 官方）|
| **UI 框架** | Jetpack Compose | BOM 2024.10.01 | 声明式 UI（替代 XML）|
| **设计系统** | Material 3 | 1.3.1 | Google 最新设计 |
| **构建** | Gradle | 8.10.2 | 构建系统 |
| **IDE** | Android Studio | Ladybug 2024.2.2 | Windows 直接装 |
| **minSdk** | 26 (Android 8.0) | — | 覆盖 99% 设备 |
| **targetSdk** | 34 (Android 14) | — | Play Store 要求 |
| **compileSdk** | 35 (Android 15) | — | 最新 API |

### 2.2 关键依赖

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
    implementation("com.github.yalantis:ucrop:2.2.10")  // 图片裁切

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
- ❌ **ML Kit OCR**（V0.1.0 不做，V0.2.0 加）
- ❌ **FCM**（推送通知，V0.2.0 加）
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
            │   │   ├── theme/
            │   │   ├── login/
            │   │   ├── dashboard/
            │   │   ├── summary/
            │   │   ├── feedback/
            │   │   ├── mistake/
            │   │   ├── ideas/
            │   │   ├── settings/
            │   │   ├── admin/
            │   │   └── components/   ← 复用组件
            │   ├── util/
            │   │   ├── BiometricHelper.kt
            │   │   ├── CameraHelper.kt
            │   │   ├── DocxExporter.kt
            │   │   ├── ImageAnnotator.kt
            │   │   ├── ShareHelper.kt
            │   │   └── SplashScreenHelper.kt
            │   └── nav/
            └── res/
                ├── values/ (colors.xml, strings.xml, themes.xml)
                ├── drawable/
                ├── mipmap-*/ (5 个图标尺寸)
                ├── raw/ (Lottie JSON)
                └── xml/
                    ├── network_security_config.xml
                    ├── file_paths.xml (FileProvider)
                    └── shortcuts.xml (M08 桌面快捷方式)
```

### 3.3 关键架构决策

#### 3.3.1 Auth 方案：JWT Cookie（复用 Lekao next-auth）

**Lekao 用 next-auth，session 存 JWT cookie**。Android 客户端：

1. 用户登录 → 调 `POST /api/auth/verify-code` → 服务端 `Set-Cookie: next-auth.session-token=xxx`
2. OkHttp CookieManager 自动存 cookie
3. **后续所有请求 OkHttp 自动带 cookie**
4. App 重启 → DataStore 持久化 cookie → OkHttp 恢复
5. **M04 生物识别** 二次确认（指纹/Face 校验后才解锁已登录状态）

```kotlin
// RetrofitClient.kt
val cookieJar = object : CookieJar {
    private val store = mutableMapOf<String, List<Cookie>>()
    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        store[url.host] = cookies
    }
    override fun loadForRequest(url: HttpUrl): List<Cookie> = store[url.host] ?: emptyList()
}
```

#### 3.3.2 流式响应（SSE）— 课堂小结流式输出

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
        override fun onFailure(call: Call<ResponseBody>, t: Throwable) { /* handle error */ }
    })
}
```

#### 3.3.3 错题集 docx 导出（M05 · 跟 Web 一样）

**V0.1.0 必须做 docx**（用户原话"不要少功能"）。用 apache-poi：

```kotlin
// DocxExporter.kt
fun exportMistakeToDocx(mistake: Mistake, outputFile: File) {
    val document = XWPFDocument()
    // 1. 标题
    document.createParagraph().createRun().setText("错题集 - ${mistake.subject}")
    // 2. 每道错题
    mistake.questions.forEachIndexed { i, q ->
        val para = document.createParagraph()
        para.createRun().setText("第 ${i+1} 题：${q.content}")
        if (q.imagePath != null) {
            para.addRun(XWPFUtils.addPicture(document, q.imagePath))
        }
    }
    // 3. 保存
    FileOutputStream(outputFile).use { document.write(it) }
}
```

#### 3.3.4 错题集图片标注（M06 · Android 独占）

**老师拍照后能在图片上画箭头/圈出/加文字**。实现方式：自定义 Compose Canvas 组件 + 触摸事件。

```kotlin
@Composable
fun ImageAnnotator(
    imageUri: Uri,
    annotations: SnapshotStateList<Annotation>,
    onAnnotationAdd: (Annotation) -> Unit
) {
    Box {
        AsyncImage(model = imageUri, contentDescription = null)
        Canvas(Modifier.fillMaxSize()) {
            annotations.forEach { drawAnnotation(it) }
        }
        // 触摸事件 → 添加标注
    }
}
```

#### 3.3.5 系统分享（M03 · 错题集发家长群）

**用户上一条原话："错题集 → 一键发家长群"**。Android 用系统分享 Intent：

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

**App 关闭时错题集草稿保存到本地**，下次打开恢复。Room 数据库：

```kotlin
@Entity(tableName = "mistake_drafts")
data class MistakeDraft(
    @PrimaryKey val id: String,
    val subject: String,
    val topic: String,
    val imagePaths: List<String>,
    val questions: String,  // JSON
    val createdAt: Long,
    val syncedAt: Long?    // null = 未同步
)

@Dao
interface MistakeDraftDao {
    @Query("SELECT * FROM mistake_drafts WHERE syncedAt IS NULL")
    fun getUnsyncedDrafts(): Flow<List<MistakeDraft>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(draft: MistakeDraft)

    @Query("DELETE FROM mistake_drafts WHERE id = :id")
    suspend fun delete(id: String)
}
```

**WorkManager 同步**：网络可用时自动上传草稿到服务端。

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

#### 3.3.8 主题色：复用 Lekao 蓝白

```kotlin
// Color.kt
val LekaoBlue = Color(0xFF3B82F6)        // --accent
val LekaoBlueText = Color(0xFF1D4ED8)    // --accent-text
val LekaoCanvas = Color(0xFFFAFBFC)      // --canvas
val LekaoParchment = Color(0xFFF5F5F4)   // --parchment
val LekaoSignal = Color(0xFFFB7185)      // --signal (signal coral)
val LekaoInk = Color(0xFF1F2937)         // --ink
val LekaoInkMuted = Color(0xFF6B7280)    // --ink-muted
val LekaoInkSubtle = Color(0xFF9CA3AF)   // --ink-subtle
val LekaoHairline = Color(0xFFE5E7EB)    // --hairline
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

### 4.3 错误处理

Lekao API 返回 `{ error: "..." }` 4xx/5xx。Android 端：
- 401 → 自动跳登录页
- 403 → banned 提示
- 429 → 限流提示
- 5xx → "服务器错误，请稍后重试"

---

## §5 · 任务分解（23 天 · 50+ T 任务）

### Day 1-2 · 环境 + Kotlin + Compose 入门

| # | 任务 | 验收 |
|---|------|------|
| T01 | 装 Android Studio Ladybug | 能打开 |
| T02 | Kotlin 基础（变量/函数/类/lambda）| 写 List 排序 demo |
| T03 | Compose 基础（Composable / Modifier / State）| 写计数器 |
| T04 | Material 3 组件（Button/TextField/Card）| 写登录页 UI（假数据）|
| T05 | `lekao-android/` 目录建好（用户要求）| GitHub 仓库目录已建（不新建仓库）|

### Day 3-4 · 项目脚手架 + 登录 + 生物识别

| # | 任务 | 验收 |
|---|------|------|
| T06 | 新建 `lekao-android/` 项目（package `com.lekao.app`）| 项目能 build |
| T07 | 配 build.gradle.kts 依赖（Retrofit/Coil/Navigation/CameraX/POI/Room）| Gradle sync 成功 |
| T08 | 主题色 + 字体（复用 Lekao 蓝白）| 启动后背景蓝白 |
| T09 | Retrofit + OkHttp + CookieManager 配 BASE_URL | ping 通 lekao.asterforge.top |
| T10 | AuthRepository（send-code/verify-code/sign-in-password）| 真机登录成功 |
| T11 | LoginScreen + LoginViewModel（密码 + 验证码 2 选 1）| 跳空 Dashboard |
| T12 | TokenStore（DataStore 存 JWT cookie）| 重启不用重登 |
| T13 | **M04 BiometricHelper**（指纹/Face 二次确认）| 第二次启动要指纹 |

### Day 5-7 · Dashboard + Summary + Feedback

| # | 任务 | 验收 |
|---|------|------|
| T14 | Navigation 配全 | 各页能跳 |
| T15 | DashboardScreen（6 入口卡片 + T-Coin 余额）| 数据正确 |
| T16 | SummaryRepository（SSE 流式）| 解析 SSE |
| T17 | SummaryScreen（图片上传 + 流式显示 + 保存）| 完整跑通 |
| T18 | FeedbackRepository（复用 Summary，template=feedback）| 写 FeedbackScreen |
| T19 | FeedbackScreen（文字输入 + 流式显示）| 完整跑通 |
| T20 | 单元测试 SummaryRepository（SSE 解析）| Gradle test 过 |

### Day 8-10 · 错题集（拍照/选图/标注/docx）

| # | 任务 | 验收 |
|---|------|------|
| T21 | **M01 CameraHelper**（调起系统相机 ACTION_IMAGE_CAPTURE + FileProvider）| 能拍照存 cache |
| T22 | **M02 PhotoPicker 集成**（多图选择，最多 9 张）| 能选多图 |
| T23 | **M10 图片智能裁切**（拍照后 ucrop）| 拍照后能裁切 |
| T24 | **M06 ImageAnnotator**（涂鸦/箭头/裁切/文字）| 标注功能 OK |
| T25 | 错题集列表（本地 + 提交到服务端）| 能保存 |
| T26 | 错题集详情页（划题 + 选科目 + 备注）| 编辑 OK |
| T27 | **M05 DocxExporter**（apache-poi 生成 docx）| 导出 docx 能打开 |
| T28 | **M03 ShareHelper**（系统分享 docx）| 能分享到微信 |
| T29 | 调用 `/api/lekao/mistake/list` 看历史 | 历史能查 |

### Day 11-12 · 灵感墙

| # | 任务 | 验收 |
|---|------|------|
| T30 | IdeasListScreen（列表 + 筛选 + 排序 + 搜索）| 浏览正常 |
| T31 | 提交灵感弹窗（标题 50 + 描述 500）| 提交成功 |
| T32 | 点赞（乐观更新 + API）| 点赞 OK |
| T33 | 评论（懒加载 + 提交）| 评论 OK |
| T34 | TOP 3 横排 | 排行正确 |

### Day 13-14 · 离线缓存 + WorkManager

| # | 任务 | 验收 |
|---|------|------|
| T35 | **M09 Room 数据库**（mistake_drafts 表）| Room 跑通 |
| T36 | MistakeDraftDao + Repository | DAO 测试过 |
| T37 | **WorkManager 同步**（网络可用时上传草稿）| 后台自动同步 |
| T38 | 错题集草稿箱 UI | 草稿能恢复 |

### Day 15-16 · 启动屏 + Lottie + 桌面快捷方式

| # | 任务 | 验收 |
|---|------|------|
| T39 | **M07 Lottie 动画**（启动屏 + loading）| 启动动画流畅 |
| T40 | SplashScreenHelper（Android 12+ SplashScreen API）| 启动屏统一 |
| T41 | **M08 App Shortcuts**（长按图标快速做小结/反馈/灵感）| 长按图标出 3 个快捷 |
| T42 | **M11 首页快捷入口**（桌面小部件 AppWidget）| 桌面小部件能进 App |

### Day 17-18 · 个人中心 + Admin 后台

| # | 任务 | 验收 |
|---|------|------|
| T43 | SettingsScreen（改昵称 / 退出登录 / 主题）| 改昵称成功 |
| T44 | Admin 后台入口（仅 admin 角色可见）| admin 能进 |
| T45 | Admin Dashboard 简化版（流水/审计/封禁查询）| 3 模块能用 |

### Day 19-20 · 打包 + ProGuard + 真机测试

| # | 任务 | 验收 |
|---|------|------|
| T46 | 配签名（debug.keystore + 临时 release.keystore）| 能 build |
| T47 | ProGuard 配 release minify | release APK 能跑 |
| T48 | 真机测试所有功能（11 大模块）| 0 崩溃 |
| T49 | 修 bug（按测试发现）| 修完无 P0 bug |

### Day 21-22 · 文档 + Git

| # | 任务 | 验收 |
|---|------|------|
| T50 | 写 `lekao-android/README.md`（中文 + 安装步骤）| README 完整 |
| T51 | 写 `lekao-android/docs/architecture.md` | 架构文档完整 |
| T52 | 写 `lekao-android/docs/api-integration.md` | API 集成文档完整 |
| T53 | 写 `lekao-android/docs/user-guide.md` | 用户使用指南 |

### Day 23 · 收尾 + V0.1.0 release

| # | 任务 | 验收 |
|---|------|------|
| T54 | 跑完整 Gradle build（assembleDebug + assembleRelease）| 0 错 |
| T55 | 真机最终测试（clean install）| 完整流程 OK |
| T56 | 更新 `lekao/CHANGELOG.md`（v0.1.0 release 记录）| CHANGELOG 完整 |
| T57 | Git commit（`feat(android): v0.1.0 MVP + 11 项手机特化`）| 三端同步 |
| T58 | 输 `lekao-android-v0.1.0.apk`（约 10-15MB）| 可群发 |

---

## §6 · 验收标准

### 6.1 功能验收（必过）

| # | 验收项 | 通过标准 |
|---|--------|---------|
| F01 | 登录（密码 + 验证码 2 种）| 都能登录，重启保持 |
| F02 | **M04 生物识别** | 第二次启动要指纹 |
| F03 | Dashboard | T-Coin 余额 + 6 入口 |
| F04 | 课堂小结 | 传图 → 流式 → 保存 → 扣币 |
| F05 | 课堂反馈 | 文字 → 流式 → 保存 → 扣币 |
| F06 | **M01 系统相机** | 拍照能存到 App |
| F07 | **M02 多图选择** | 最多 9 张 |
| F08 | **M06 图片标注** | 能画箭头/圈/文字 |
| F09 | **M05 docx 导出** | 导出能在 Word 打开 |
| F10 | **M03 系统分享** | 能分享到微信/钉钉/邮件 |
| F11 | 灵感墙 | 列表 + 提交 + 点赞 + 评论 |
| F12 | **M09 离线草稿箱** | 草稿能恢复 |
| F13 | **M08 桌面快捷方式** | 长按图标快速进 App |
| F14 | **M07 启动屏 Lottie** | 启动动画流畅 |
| F15 | **M11 桌面小部件** | 桌面小部件能进 App |
| F16 | Admin 后台（admin 角色）| 流水/审计/封禁能用 |

### 6.2 质量验收

| # | 验收项 | 通过标准 |
|---|--------|---------|
| Q01 | 编译 | `assembleDebug` 0 错 0 警告 |
| Q02 | 单元测试 | 覆盖 SummaryRepository / DocxExporter / ImageAnnotator |
| Q03 | APK 大小 | < 15MB |
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
| E07 | 触感反馈 | 按钮按下有 haptic（V0.2.0 也可）|

---

## §7 · 风险 + 备选

| # | 风险 | 应对 |
|---|------|------|
| R01 | 14 → 23 天可能延期 | 25% buffer（Day 21-22 留作 buffer）|
| R02 | apache-poi 依赖大（+5MB）| 必要时换 OpenXML SDK 减体积 |
| R03 | Room 数据库迁移 | V1 简单 schema，V2 加迁移 |
| R04 | WorkManager 后台限制（Android 12+）| 用前台服务兜底 |
| R05 | CameraX 复杂 | 优先用系统相机 Intent，V2 再用 CameraX |
| R06 | ucrop 库维护 | V0.1.0 用免费版，V0.2.0 换 Custom |
| R07 | 启动屏 Lottie 性能 | 控制 JSON < 100KB |
| R08 | 桌面小部件电池消耗 | 用 Glance 框架（轻量）|
| R09 | 用户第一次做 Android | 多查文档 + 多用 Android Studio 模板 |
| R10 | 真机 USB 调试连不上 | WiFi 调试（Android 11+）fallback |

---

## §8 · 时间表（23 天 · 5 周 + 3 天）

- **Day 1-2**（2026-06-26 ~ 06-27）：环境 + Kotlin + Compose
- **Day 3-4**（2026-06-28 ~ 06-29）：脚手架 + 登录 + 生物识别
- **Day 5-7**（2026-06-30 ~ 07-02）：Dashboard + Summary + Feedback
- **Day 8-10**（2026-07-03 ~ 07-05）：错题集（拍照/标注/docx/分享）
- **Day 11-12**（2026-07-06 ~ 07-07）：灵感墙
- **Day 13-14**（2026-07-08 ~ 07-09）：离线缓存 + WorkManager
- **Day 15-16**（2026-07-10 ~ 07-11）：启动屏 + Lottie + 桌面快捷方式
- **Day 17-18**（2026-07-12 ~ 07-13）：个人中心 + Admin 后台
- **Day 19-20**（2026-07-14 ~ 07-15）：打包 + ProGuard + 真机测试
- **Day 21-22**（2026-07-16 ~ 07-17）：文档 + Git（buffer）
- **Day 23**（2026-07-18）：V0.1.0 release
- **预计交付**：2026-07-18

---

## §9 · V0.1.0 范围外

### V0.2.0（V0.1.0 跑通后再加 · 约 9 天）

- M12 推送通知（FCM）
- M13 主题切换（深色/浅色/跟随）
- M14 多语言（中英）
- M15 Dashboard 图表（Vico）
- M16 OCR 拍照识别（ML Kit）
- M17 SSE 长连接（灵感墙实时）
- M18 二维码扫描登录（CameraX + ML Kit）

### V0.3.0（约 14 天 · 等买 Mac）

- ❌ iOS 端（Swift + SwiftUI）

### 暂永远不做

- ❌ Google Play 上架（用户原话"不用上架"）
- ❌ 微信 OAuth（阻塞：公司主体）
- ❌ 错题集云端落盘（跟 Web 一起做）

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

## 📋 用户反馈记录（v2 重写后）

- ✅ **位置**：`lekao/lekao-android/`（在 Lekao 仓库下）
- ✅ **仓库**：用现有 `TimeCraker/Lekao`，**不**新建
- ✅ **范围**：**全做 + 手机端更丰富**（11 项特化功能）
- ✅ **错题集 docx**：V0.1.0 必做（用户原话"不要少功能"）
- ✅ **错题集分享**：V0.1.0 必做（用户原话"一键发家长群"）
