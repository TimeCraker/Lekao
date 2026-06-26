# Lekao Android · API 集成指南

> V1.0.0 · 30+ 端点 · 复用 Web next-auth JWT · SSE 流式 + 指数退避重连

---

## §1 · 一句话集成

Lekao Android **不**有独立后端，**完全复用** Lekao Web 的 Next.js API 路由（`https://lekao.asterforge.top/api/*`）+ next-auth 4.x 的 JWT cookie 鉴权。**所有 endpoint 一对一映射 Web**，改 API 必须两端同步。

---

## §2 · BASE_URL 配置

### 2.1 三种方式

**优先级从高到低**：

#### 方式 A：`local.properties`（开发推荐 · 不入仓）

```properties
# C:\Users\TimeCraker\Desktop\my_workspace\lekao\lekao-android\local.properties
sdk.dir=C\:\\Users\\TimeCraker\\AppData\\Local\\Android\\Sdk
lekao.baseUrl=https://lekao.asterforge.top
# lekao.baseUrl=http://10.0.2.2:3000   # 模拟器连宿主机
# lekao.baseUrl=http://192.168.1.100:3000  # 真机连 LAN
```

`app/build.gradle.kts:42` 读取此值注入 BuildConfig：

```kotlin
buildConfigField(
    "String",
    "LEKAO_BASE_URL",
    "\"${localProperties.getProperty("lekao.baseUrl", "https://lekao.asterforge.top")}\""
)
```

#### 方式 B：直接改 `app/build.gradle.kts`

```kotlin
buildConfigField(
    "String",
    "LEKAO_BASE_URL",
    "\"https://lekao.asterforge.top\""  // ← 改这里
)
```

#### 方式 C：CI/CD 注入

```bash
# GitHub Actions 风格
echo "lekao.baseUrl=https://staging.lekao.example.com" >> local.properties
./gradlew assembleRelease
```

### 2.2 验证

启动 App → logcat：

```bash
adb logcat -s LekaoAPI
# 期望输出: → GET /api/auth/me
# 不应包含 query 参数或 token
```

---

## §3 · 认证流程

### 3.1 Cookie 机制

Lekao Web 用 **next-auth 4.x** + **JWT session strategy**。登录后服务端发送：

```
Set-Cookie: next-auth.session-token=<JWT>; HttpOnly; Secure; SameSite=Lax
```

Android 端用 `LekaoCookieJar`（实现 `okhttp3.CookieJar`）自动存 + 自动带：

```kotlin
// 自动存：服务端 Set-Cookie 触发 saveFromResponse()
override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
    store[url.host] = cookies
    // 同步到 Android WebView CookieManager (PWA fallback)
    ...
}

// 自动带：每次请求触发 loadForRequest()
override fun loadForRequest(url: HttpUrl): List<Cookie> {
    return store[url.host] ?: emptyList()
}
```

**优点**：Web 端登录后 Cookie 写到 WebView → Android API 调 `LekaoApi` 自动带同一 cookie → **统一登录态**。

### 3.2 登录方式

| 方式 | 端点 | 请求体 | 响应 |
|------|------|--------|------|
| 密码登录 | `POST /api/auth/sign-in-password` | `{email, password}` | `{success, message}` + Set-Cookie |
| 验证码登录 | `POST /api/auth/send-code` → `POST /api/auth/verify-code` | `{email}` → `{email, code}` | 同上 |
| 重置密码 | `POST /api/auth/reset` | `{email, newPassword, code}` | `{success}` |
| 退出登录 | `POST /api/auth/signout` | `{}` | `{success}` + Clear-Cookie |

### 3.3 登录态判定

```kotlin
// AuthRepository.authState = MutableStateFlow<AuthState?>
// 启动时调 GET /api/auth/me → 200 = 已登录, 401 = 未登录
suspend fun bootstrap() {
    try {
        val me = api.me()
        _authState.value = AuthState.SignedIn(user = me.body()!!)
    } catch (e: HttpException) {
        if (e.code() == 401) _authState.value = AuthState.SignedOut
    }
}
```

### 3.4 退出登录的"全清"

```kotlin
// D1-B SettingsScreen 退出按钮
val future = LekaoCookieJar.clearAll(webView = null)
future.get(1, TimeUnit.SECONDS)  // 等异步 WebView cookie 清理
api.signOut()                    // 调服务端 signout
TokenStore.clearAll()             // 清 DataStore
```

**安全要点**（参考 [`CookieManager.kt:74-111`](../app/src/main/java/com/lekao/app/data/api/CookieManager.kt)）：
- OkHttp cookie jar 同步清（立刻生效）
- WebView 8 步清理（同步）
- WebView cookie store 异步清理 + CompletableFuture 暴露给调用方 await
- 1 秒超时保护（WebView 不可用时不阻塞）

---

## §4 · SSE 流式（D1-F T57 · M17）

### 4.1 端点

| 端点 | 用途 | 数据格式 |
|------|------|---------|
| `POST /api/lekao/summarize?template=summary` | 课堂小结 | `data: {"text":"..."}\n\n` 增量 |
| `POST /api/lekao/summarize?template=feedback` | 课堂反馈 | 同上 |
| `GET /api/lekao/ideas/stream` | 灵感墙实时 | `event: comment / like` + `data: {...}` |

### 4.2 客户端实现

参见 [`util/SseClient.kt`](../app/src/main/java/com/lekao/app/util/SseClient.kt)。关键点：

**指数退避重连**：

```kotlin
companion object {
    private const val INITIAL_RETRY_DELAY_MS = 1000L
    private const val MAX_RETRY_DELAY_MS = 30_000L
    private const val RETRY_MULTIPLIER = 2.0
}

var retryDelay = INITIAL_RETRY_DELAY_MS
while (isActive && !isDisconnected) {
    try {
        // 读取事件流...
        retryDelay = INITIAL_RETRY_DELAY_MS  // 成功后重置
    } catch (t: Throwable) {
        if (isDisconnected) return@launch
        delay(retryDelay)
        retryDelay = (retryDelay * RETRY_MULTIPLIER).toLong().coerceAtMost(MAX_RETRY_DELAY_MS)
    }
}
```

**协议**：

```
event: comment
data: {"id":"abc","text":"新评论","author":"..."}

event: like
data: {"ideaId":"xyz","count":42}

data: [DONE]
```

### 4.3 课堂小结用法

```kotlin
class SummaryViewModel : ViewModel() {
    private val _streamText = MutableStateFlow("")
    val streamText: StateFlow<String> = _streamText.asStateFlow()

    fun startSummary(imageBase64: String) = viewModelScope.launch {
        try {
            SummaryRepository.stream(imageBase64, template = "summary")
                .catch { _error.emit(ErrorMessages.safe(it)) }
                .collect { chunk ->
                    _streamText.value = _streamText.value + chunk
                }
        } finally {
            _isStreaming.value = false
        }
    }
}
```

### 4.4 灵感墙 SSE 用法

```kotlin
class IdeasViewModel : ViewModel() {
    private val sseClient = SseClient(
        client = OkHttpClientProvider.client,
        url = "${LekaoConfig.BASE_URL}${LekaoConfig.API_VERSION}/lekao/ideas/stream",
        scope = viewModelScope
    )

    fun connect() {
        sseClient.onEvent = { event ->
            when (event.type) {
                "comment" -> _comments.update { appendNewComment(event.data) }
                "like" -> _ideas.update { updateLikeCount(event.data) }
            }
        }
        sseClient.connect()
    }

    fun disconnect() {
        sseClient.disconnect()
    }

    override fun onCleared() {
        super.onCleared()
        sseClient.disconnect()  // 防泄漏
    }
}
```

### 4.5 注意事项

- **超时配置**：`WRITE_TIMEOUT_SECONDS = 60`（SSE 长连接要长）
- **重连 HTTP 4xx 不重连**（业务错误，不会自愈）
- **内存管理**：SseClient 持有 viewModelScope 引用，ViewModel 销毁时 disconnect 防泄漏
- **后台 → 前台**：默认 Android 会暂停网络，回到前台需 `connect()` 一次

---

## §5 · 错误码

| HTTP | 含义 | Android 端处理 |
|------|------|---------------|
| **200** | 成功 | 解析 body |
| **400** | 请求参数错 | Toast "请求参数错误" |
| **401** | 未登录 / session 过期 | 清 cookie + 跳 Login |
| **403** | 无权限 | "无权限"（Admin 功能）|
| **404** | 资源不存在 | "资源不存在" |
| **408 / 504** | 超时 | "请求超时"（自动重试 1 次）|
| **429** | 限流 | "操作太频繁"（不重试）|
| **500-599** | 服务端错 | "服务器错误"（指数退避 1 次）|

### 5.1 集中映射

[`util/ErrorMessages.kt`](../app/src/main/java/com/lekao/app/util/ErrorMessages.kt)：

```kotlin
object ErrorMessages {
    fun safe(t: Throwable): String = when (t) {
        is HttpException -> when (t.code()) {
            401 -> "登录已过期"
            403 -> "无权限"
            404 -> "资源不存在"
            408, 504 -> "请求超时"
            429 -> "操作太频繁，请稍后再试"
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

**ViewModel 用法**：

```kotlin
catch (e: Throwable) {
    _error.emit(ErrorMessages.safe(e))  // 中文文案，**不**泄漏服务端原始信息
}
```

---

## §6 · HTTP 日志拦截器（安全设计）

### 6.1 设计原则

**Default-deny**：默认全屏蔽，只打白名单字段。

**禁止日志**：
- ❌ Request body（可能含密码 / JWT / 用户隐私）
- ❌ Response body（同上）
- ❌ URL query 参数（可能含 token / code / email）
- ❌ 黑名单 header（Authorization / Cookie / Set-Cookie / Proxy-Auth / X-API-Key）

**允许日志**：
- ✅ METHOD + encodedPath（无 query）
- ✅ 响应状态码
- ✅ 几个白名单 header（X-Client-Platform / Content-Type / Content-Length / Cache-Control）

### 6.2 Release 包自动跳过

```kotlin
private object SafeHttpLogInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        if (!BuildConfig.DEBUG) {
            return chain.proceed(chain.request())  // Release 完全无日志
        }
        // Debug 才走白名单打印
        ...
    }
}
```

### 6.3 客户端诊断 Header

`RetrofitClient` 配 `clientHeadersInterceptor` 自动加：

```
X-Client-Platform: android
X-Client-Version: 1.0.0
X-Client-Code: 1
Accept: application/json
```

服务端可读这些做平台分流 / 兼容判断。

---

## §7 · API 端点总览（30+）

### 7.1 Auth（6）

| 端点 | 方法 | 用途 |
|------|------|------|
| `/api/auth/send-code` | POST | 发送邮箱验证码 |
| `/api/auth/verify-code` | POST | 验证码登录 |
| `/api/auth/sign-in-password` | POST | 邮箱密码登录 |
| `/api/auth/reset` | POST | 重置密码 |
| `/api/auth/me` | GET | 当前用户信息 |
| `/api/auth/signout` | POST | 退出登录 |

### 7.2 Lekao 业务（7）

| 端点 | 方法 | 用途 |
|------|------|------|
| `/api/lekao/summarize` | POST (SSE) | 课堂小结 / 反馈（按 template 区分）|
| `/api/lekao/mistake/upload` | POST | 错题图片上传 |
| `/api/lekao/mistake/list` | GET | 错题列表（分页）|
| `/api/lekao/mistake/export` | POST | 生成 docx 导出链接 |
| `/api/lekao/ideas` | GET | 灵感墙列表（分页 + sort）|
| `/api/lekao/ideas` | POST | 提交新灵感 |
| `/api/lekao/ideas/{id}/like` | POST | 点赞 / 取消点赞 |
| `/api/lekao/ideas/{id}/comments` | GET | 评论列表（分页）|
| `/api/lekao/ideas/{id}/comments` | POST | 发表评论 |
| `/api/lekao/fcm/register` | POST | FCM token 上报 |

### 7.3 Admin（4）

| 端点 | 方法 | 用途 |
|------|------|------|
| `/api/admin/audit-log` | GET | 审计日志（分页 + action 过滤）|
| `/api/admin/coin-log` | GET | T-Coin 流水（分页 + email 过滤）|
| `/api/admin/ban` | POST | 封禁 / 解封用户 |
| `/api/admin/coin-adjust` | POST | 管理员调币 |

### 7.4 Ideas SSE（1）

| 端点 | 方法 | 用途 |
|------|------|------|
| `/api/lekao/ideas/stream` | GET | 灵感墙实时事件流 |

---

## §8 · 限流 + 防滥用

### 8.1 服务端策略

Lekao Web 用 next-auth rate limit + 业务级计数：

| 端点 | 限流 |
|------|------|
| `/api/auth/send-code` | 1 次/分钟/IP + 5 次/小时/邮箱 |
| `/api/lekao/summarize` | 10 次/分钟/用户（流式输出本身已 slow）|
| `/api/admin/*` | 仅 ADMIN 角色可调 |

### 8.2 客户端策略

- **不**做主动退避（依赖服务端 429 返回）
- 收到 429 → Toast "操作太频繁" + 不重试
- SSE 不重连 4xx，但 5xx 自动重连（指数退避）

---

## §9 · 数据模型同步

所有 API response 必须跟 Web 端 TypeScript 类型一致。Android 用 Gson + data class：

```kotlin
data class IdeaDto(
    val id: String,
    val title: String,
    val content: String,
    val author: AuthorDto,
    val likeCount: Int = 0,
    val commentCount: Int = 0,
    val liked: Boolean = false,
    val createdAt: Long,
    val tags: List<String> = emptyList()
)
```

**ProGuard 保留**（避免 minify 后字段名错乱）：

```proguard
-keep class com.lekao.app.data.api.** { *; }
```

---

## §10 · 联调测试

### 10.1 后端日志对照

```bash
# 服务器看 next.js 日志
ssh user@server 'pm2 logs lekao-web' | grep -E "(POST|GET) /api"
```

### 10.2 Android 抓包

```bash
# Charles / Fiddler 配 Android 代理
# 1. 手机 WiFi → 代理 → 电脑 IP:8888
# 2. 电脑装 Charles root cert
# 3. 过滤 host = lekao.asterforge.top
```

### 10.3 调试模式切换 BASE_URL

```bash
# 模拟器 → 宿主机 Web
echo "lekao.baseUrl=http://10.0.2.2:3000" > local.properties
./gradlew assembleDebug && adb install -r app/build/outputs/apk/debug/app-debug.apk

# 真机 → LAN Web
echo "lekao.baseUrl=http://192.168.1.100:3000" > local.properties
./gradlew assembleDebug && adb install -r ...
```

---

## 📎 相关文档

- [`architecture.md`](architecture.md) — 整体架构（SSE 章节 / Cookie 章节）
- [`user-guide.md`](user-guide.md) — 用户使用
- [`../stages/d1-lekao-android.md`](../stages/d1-lekao-android.md) — V1.0.0 spec
