# Lekao Android 架构详解

> V1.0.0 · 63 个 Kotlin 文件 · 27 项功能 · 无 Hilt/Koin（手动注入）

---

## §1 · 一句话架构

**单 Activity + Compose Navigation + MVVM + Repository + 单例手注入**，无 DI 框架、无远程 config、无 feature module 拆分。**目标是 1 人 1 仓库 1 周出 V1.0.0，不是 1 个工程 6 个月**。

---

## §2 · 分层

```
┌──────────────────────────────────────────────────────────┐
│  UI Layer (Jetpack Compose)                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Dashboard    │  │ Summary      │  │ Mistake      │   │
│  │ Screen       │  │ Screen       │  │ Screen       │   │
│  │ + ViewModel  │  │ + ViewModel  │  │ + ViewModel  │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │ StateFlow      │ StateFlow        │ Flow       │
└─────────┼────────────────┼──────────────────┼───────────┘
          │                │                  │
┌─────────▼────────────────▼──────────────────▼───────────┐
│  Repository Layer (无状态, 持有 API/Token/Room 单例)     │
│  AuthRepository · MistakeRepository · IdeasRepository   │
│  SummaryRepository · FeedbackRepository                 │
└─────────┬────────────────┬──────────────────┬───────────┘
          │                │                  │
┌─────────▼────────────────▼──────────────────▼───────────┐
│  Data Layer                                              │
│  LekaoApi (Retrofit) · TokenStore (DataStore)           │
│  LekaoDatabase (Room) · SseClient · MistakeSyncWorker   │
└──────────────────────────────────────────────────────────┘
```

### 2.1 UI Layer（13 个 Screen + 13 个 ViewModel）

每个功能模块目录结构：

```
ui/dashboard/
├── DashboardScreen.kt          ← @Composable, 接收 state + 触发事件
├── DashboardViewModel.kt       ← 持有 StateFlow<UiState>, 暴露 onXxx() 方法
├── CoinChartCard.kt            ← 复用图表组件
├── IdeasTrendChart.kt
└── MistakeSubjectChart.kt
```

**约定**：
- Screen 是 `@Composable`，**不持有业务状态**，所有 state 来自 ViewModel
- ViewModel 通过 `viewModel()` 获取（`androidx.lifecycle.viewmodel.compose`）
- 跨页面数据通过 `SavedStateHandle` 或 Repository 单例传递，**不**用全局 EventBus

### 2.2 Repository Layer（6 个 Repository）

| Repository | 职责 | 关键依赖 |
|------------|------|---------|
| `AuthRepository` | 登录态、签到、注册、me 信息、signout | LekaoApi, TokenStore |
| `SummaryRepository` | 课堂小结（SSE 流式）| LekaoApi, SseClient |
| `FeedbackRepository` | 课堂反馈（SSE 流式）| LekaoApi, SseClient |
| `MistakeRepository` | 错题集 CRUD + 拍照/导出/同步 | LekaoApi, Room DAO, MistakeSyncWorker |
| `IdeasRepository` | 灵感墙列表/详情/评论/点赞 + SSE | LekaoApi, SseClient |

**约定**：
- Repository 是**单例**（`object` 或 `companion object` + `getInstance`），**不**用 DI 容器
- 暴露 `suspend fun` 和 `Flow<T>`，**不**返回 `LiveData`（统一 StateFlow）
- 错误向上抛 `Throwable`（含 HttpException / IOException），ViewModel 用 `ErrorMessages.safe()` 转中文

### 2.3 Data Layer

| 组件 | 作用 | 备注 |
|------|------|------|
| `LekaoApi` (Retrofit interface) | 30+ API 端点 | `@POST/GET` 注解 + `suspend fun` |
| `RetrofitClient` | Retrofit + OkHttp 单例工厂 | OkHttp 配 CookieManager + Logging Interceptor |
| `CookieManager` (OkHttp) | next-auth JWT cookie 自动管理 | `java.net.CookieManager` + cookieJar |
| `TokenStore` (DataStore Preferences) | 持久化登录态 + 主题色 + 语言 | `object TokenStore` 单例 |
| `LekaoDatabase` (Room) | 错题集草稿本地存储 | `MistakeDraft` 实体 + `MistakeDraftDao` |
| `SseClient` | SSE 长连接 + 指数退避重连 | 1s → 2s → 4s → ... max 30s |
| `MistakeSyncWorker` | 后台错题同步（断网/前台都跑）| WorkManager `CoroutineWorker` |

---

## §3 · 关键设计决策

### 3.1 为什么不上 Hilt/Koin？

- **依赖图很小**：63 个文件 + 6 个 Repository，**手注入够用**
- **避免 KSP/KAPT 构建时间膨胀**：Hilt 编译期生成代码，对小项目是负 ROI
- **学习成本**：新 Contributor 看 `LekaoApp.kt` 一眼就懂

**手动注入实现**（`LekaoApp.kt`）：

```kotlin
class LekaoApp : Application() {
    override fun onCreate() {
        super.onCreate()
        // 单例初始化（lazy, 首次访问时创建）
        TokenStore.getInstance(this)
    }
}

// Repository 单例模式（不依赖 Android context 时用 object）
object AuthRepository {
    val authState: StateFlow<AuthState?> = TokenStore.cookieFlow.map { ... }
        .stateIn(GlobalScope, SharingStarted.Eagerly, null)
    suspend fun signInPassword(email: String, password: String) = ...
}

// 依赖 Android context 的 Repository（Room/WorkManager）
class MistakeRepository private constructor(private val db: LekaoDatabase) {
    companion object {
        @Volatile private var INSTANCE: MistakeRepository? = null
        fun getInstance(context: Context): MistakeRepository = INSTANCE ?: synchronized(this) {
            INSTANCE ?: MistakeRepository(LekaoDatabase.getInstance(context)).also { INSTANCE = it }
        }
    }
}
```

### 3.2 为什么用 MVVM 而不是 MVI？

- **Screen 数量多（13 个），每个业务不复杂**——MVI 的 Reducer/State/Intent 三件套是过度设计
- **MVVM + StateFlow 足够表达 90% 状态**
- 唯一例外：**课堂小结/反馈的 SSE 流式** 用了类似 MVI 的 `sealed class StreamEvent`：

```kotlin
sealed class SummaryEvent {
    data class Chunk(val text: String) : SummaryEvent()
    data class Complete(val fullText: String) : SummaryEvent()
    data class Error(val message: String) : SummaryEvent()
}

class SummaryViewModel : ViewModel() {
    private val _events = MutableSharedFlow<SummaryEvent>()
    val events: SharedFlow<SummaryEvent> = _events.asSharedFlow()

    fun startSummary(imageBase64: String) = viewModelScope.launch {
        SummaryRepository.stream(imageBase64)
            .catch { _events.emit(SummaryEvent.Error(ErrorMessages.safe(it))) }
            .collect { _events.emit(it) }
    }
}
```

### 3.3 状态管理：StateFlow vs SharedFlow vs Flow

| 场景 | 用 | 例子 |
|------|---|------|
| UI 状态（"当前余额" "是否加载中"）| `StateFlow<T>` | `uiState: StateFlow<DashboardUiState>` |
| 一次性事件（错误提示 / Snackbar）| `SharedFlow<T>` | `errorEvent: SharedFlow<String>` |
| 数据流（SSE / WorkManager 进度）| `Flow<T>` → ViewModel 收集 | SummaryRepository.stream() |

### 3.4 签名策略

**当前状态（V1.0.0）**：
- Release build 用 **debug 签名**（`app/build.gradle.kts:60`）—— 仅供内部测试和群发
- 商业化前必须替换为正式 `release.keystore`

**配置方法**（待 T61 实施）：
```bash
# 1. 生成 release 签名（命令行）
keytool -genkey -v -keystore release.keystore -alias lekao -keyalg RSA -keysize 2048 -validity 10000

# 2. 加到 local.properties（不入仓）
lekao.keystore.path=/Users/me/keys/release.keystore
lekao.keystore.password=xxx
lekao.keystore.alias=lekao
lekao.keystore.aliasPassword=xxx

# 3. build.gradle.kts 读取并配置 signingConfig
```

### 3.5 ProGuard 策略（D1-F T60）

**原则**：keep 规则只覆盖**反射/序列化/Compose Compiler 必需的类**，业务代码靠 R8 自动 minify。

```proguard
# ============ Compose ============
-keep class androidx.compose.** { *; }
-keepclassmembers class * { @androidx.compose.runtime.* *; }

# ============ Retrofit / OkHttp ============
-keepattributes Signature, InnerClasses, EnclosingMethod
-keepattributes RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations
-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}

# ============ Vico（图表）============
-keep class com.patrykandpatrick.vico.** { *; }

# ============ ML Kit（OCR）============
-keep class com.google.mlkit.** { *; }
-keep class com.google.android.gms.internal.mlkit_** { *; }

# ============ POI（docx 导出）============
-keep class org.apache.poi.** { *; }
-keep class org.openxmlformats.schemas.** { *; }

# ============ Gson Models（项目内数据类）============
-keep class com.lekao.app.data.api.** { *; }

# ============ Glance（小部件）============
-keep class androidx.glance.** { *; }

# ============ Firebase Messaging ============
-keep class com.google.firebase.messaging.** { *; }
```

---

## §4 · SSE 长连接（M17）

### 4.1 设计目标

- 自动重连（断网/服务端重启/切到后台再回来）
- 不爆内存（不泄漏 Job/Callback）
- 业务方不感知重连（回调模式）

### 4.2 协议

服务端发送（`/api/lekao/ideas/stream`）：

```
event: comment
data: {"id":"...","text":"...","author":"..."}

event: like
data: {"ideaId":"...","count":42}

data: [DONE]
```

### 4.3 客户端实现

参见 [`app/src/main/java/com/lekao/app/util/SseClient.kt`](../app/src/main/java/com/lekao/app/util/SseClient.kt)。

**重连策略**：指数退避 1s → 2s → 4s → 8s → 16s → max 30s。HTTP 4xx 不重连（业务错误），其他全部重连。

**生命周期**：
- `IdeasScreen` 进入 → `IdeasViewModel.onScreenEnter()` 调 `SseClient.connect()`
- `IdeasScreen` 离开 → `IdeasViewModel.onScreenExit()` 调 `SseClient.disconnect()`
- ViewModel `onCleared()` 兜底 disconnect（防泄漏）

### 4.4 注意事项

- OkHttp Cookie 自动带上（next-auth JWT）— **不需要手动加 Authorization 头**
- 服务器发送 `event: comment` 客户端就解析为 `SseEvent(type="comment", data=...)`
- `data: [DONE]` 是流结束标记，触发 `disconnect()` 的 callback

---

## §5 · 推送通知（M12）

### 5.1 三 Channel 分类

| Channel ID | 用途 | 颜色 | 优先级 |
|-----------|------|------|--------|
| `idea_channel` | 灵感墙新评论/点赞 | 蓝 | Default |
| `system_channel` | 系统通知 | 灰 | Low |
| `comment_channel` | 评论被回复 | 绿 | High |

### 5.2 数据流

```
FCM Server → onMessageReceived(remoteMessage)
  ↓ 解析 data.type
  ↓ NotificationHelper.show(type, title, body)
  ↓ 选 channel + 设 group key
  ↓ NotificationManagerCompat.notify(id)
```

**Grouping**：同一 `ideaId` 的多条评论合并为 1 个 summary notification（`NotificationCompat.InboxStyle`）。

### 5.3 Token 上报

FCM token 变化时自动 `PUT /api/auth/fcm-token`（带 next-auth cookie）。token 永不上 log（只 log `token.hashCode()`）。

---

## §6 · 离线 + 后台同步（M09）

### 6.1 Room 草稿箱

```kotlin
@Entity(tableName = "mistake_drafts")
data class MistakeDraft(
    @PrimaryKey val id: String,        // UUID
    val subject: String,
    val imagePaths: List<String>,      // 本地图片路径（content://）
    val ocrText: String,
    val createdAt: Long,
    val syncStatus: SyncStatus,        // PENDING / SYNCING / SYNCED / FAILED
)

enum class SyncStatus { PENDING, SYNCING, SYNCED, FAILED }
```

### 6.2 WorkManager 同步策略

```kotlin
class MistakeSyncWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {
    override suspend fun doWork(): Result {
        val drafts = MistakeDraftDao.getPending()
        drafts.forEach { draft ->
            try {
                MistakeRepository.upload(draft)
                MistakeDraftDao.markSynced(draft.id)
            } catch (e: Exception) {
                MistakeDraftDao.markFailed(draft.id, e.message ?: "")
            }
        }
        return if (MistakeDraftDao.hasFailed()) Result.retry() else Result.success()
    }
}
```

**触发条件**：
- 用户手动点 "立即同步" 按钮 → `OneTimeWorkRequest`
- 网络从断开 → 恢复 → `WorkManager` 自动 enqueue
- App 启动时 → 兜底 `enqueueUniqueWork`

### 6.3 数据流

```
用户在 MistakeScreen 编辑（断网）
  ↓ 自动保存到 Room (PENDING)
  ↓ 网络恢复
  ↓ WorkManager 触发 MistakeSyncWorker
  ↓ 逐条上传到 LekaoApi
  ↓ 标记 SYNCED 或 FAILED
  ↓ UI 刷新列表
```

---

## §7 · 主题系统（M13）

### 7.1 5 套主色

`TokenStore` 持久化用户选择：

| Key | 名称 | Light Primary | Dark Primary |
|-----|------|--------------|--------------|
| `blue` | 蓝（默认 · 复用 Web）| `#3B82F6` | `#60A5FA` |
| `coral` | 珊瑚 | `#F97316` | `#FB923C` |
| `emerald` | 翡翠 | `#10B981` | `#34D399` |
| `purple` | 紫 | `#8B5CF6` | `#A78BFA` |
| `amber` | 琥珀 | `#F59E0B` | `#FBBF24` |

### 7.2 数据流

```
TokenStore.customColorFlow (DataStore)
  ↓ MainActivity.onCreate() 读
  ↓ ThemeManager.restore() 设当前主题
  ↓ LekaoTheme(customColorKey=...)
  ↓ Compose MaterialTheme.colorScheme
  ↓ UI 自动重绘
```

### 7.3 深色 / 浅色 / 跟随系统

`ThemeManager.darkMode` 持久化为 `system/light/dark`。`LekaoTheme` 读 `isSystemInDarkTheme()` 决定。

---

## §8 · 多语言（M14）

### 8.1 实现

```kotlin
// AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags("en"))
// 立即生效，无需重启
```

### 8.2 资源组织

```
res/values/strings.xml         ← 简体中文（默认）
res/values-en/strings.xml      ← English
```

**注意**：M14 是**系统级切换**，不是 App 内手动。用户在系统设置改语言 → App 收到 `onConfigurationChanged` → Activity 重建 → UI 用对应 strings。

`AppCompatDelegate.setApplicationLocales()` 触发进程重建（不是 Activity），延迟约 200ms。

---

## §9 · 启动性能（M07 + T58）

### 9.1 实测（Debug Build · 中端机）

| 阶段 | 耗时 |
|------|------|
| processStart（系统 fork） | ~400ms |
| Application init | ~250ms |
| SplashScreen 显示 | ~120ms |
| first frame（Compose） | ~180ms |
| **总计冷启** | **~950ms** |
| Splash 持续到 SplashScreen.kt 跳转 | +600ms |

### 9.2 关键优化

- `android:hardwareAccelerated="true"`（默认，但显式标注）
- `android:largeHeap="false"`（避免浪费内存）
- Application 初始化**只**做 DataStore + 单例 lazy 装载
- Compose 入口点用 `LekaoTheme { AppNavigation() }`，**不**做阻塞 I/O
- `StartupProfiler` 标记关键节点，release 包也能看 logcat

---

## §10 · 安全设计

### 10.1 错误消息脱敏

**不**把上游原始错误抛给 UI。集中式 `ErrorMessages.safe(throwable)`：

```kotlin
object ErrorMessages {
    fun safe(t: Throwable): String = when (t) {
        is HttpException -> when (t.code()) {
            401 -> "登录已过期"
            403 -> "无权限"
            408, 504 -> "请求超时"
            429 -> "操作太频繁"
            in 500..599 -> "服务器错误"
            else -> "请求失败 (${t.code()})"
        }
        is SocketTimeoutException -> "请求超时"
        is UnknownHostException -> "网络连接失败"
        is ConnectException -> "无法连接到服务器"
        is IOException -> "网络错误"
        else -> "操作失败，请稍后再试"
    }
}
```

### 10.2 日志脱敏

- **不** log cookie / token / email / IP 完整地址
- FCM token 只 log `token.hashCode()`
- IP 在 AdminAuditLogScreen 显示时打码到 `/24`（`1.2.3.0`）

### 10.3 ProGuard 混淆

Release build minify + shrink resources。Gson Models 用 `-keep class com.lekao.app.data.api.** { *; }` 保留字段名（避免反序列化失败）。

---

## §11 · 待改进（V1.0.0 之后再说）

| 改进 | 优先级 | 阻塞 |
|------|--------|------|
| 拆 `:feature-mistake` / `:feature-ideas` 等 module | 低 | 无（V1.0.0 体积 OK）|
| 加 Hilt 简化 Repository 注入 | 低 | 无（手注入可读性更好）|
| Compose Multiplatform 跨 iOS | 中 | 需 Mac（V2.0.0）|
| 微信 OAuth 登录 | 中 | 公司主体（V2.0.0）|
| 错题集云端同步 | 中 | 跟 Web 一起（V2.0.0）|
| 模板系统 UI | 低 | 跟 Web 一起（V2.0.0）|

**判断标准**：能立刻给付费用户多一个 → 做；只是代码更工整 → 推迟。

---

## 📎 相关文档

- [`api-integration.md`](api-integration.md) — API 集成详解
- [`user-guide.md`](user-guide.md) — 用户使用指南
- [`../stages/d1-lekao-android.md`](../stages/d1-lekao-android.md) — V1.0.0 spec 主文档
