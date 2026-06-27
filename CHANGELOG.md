# LeKao · 更新日志

> 所有重要变更记录在此。版本号遵循 [Semantic Versioning](https://semver.org/)。

---

## [v2.3.0] - 2026-06-27 · UI 优化 + 折叠 AI + 动效打磨

> 🎨 **纯体验打磨**：功能 100% 不变,只优化 5 项体验痛点 + 2 项一致性修补。Stage 18.6 视觉模型稳定性 + Stage 19 UI 优化 = v2.3.0 稳定版。

### ✨ 5 必做项

- **折叠 AI 助手**(周末 panel) · 默认展开,无 localStorage 持久化(简化心智),切 sheet 自动重置为展开
- **5 段假进度条** · AI 生成中显示「读图 → 识别学科 → 分析错题 → 生成反馈 → 整理小结」3s 一段纯 UI 模拟,不动后端
- **错误 / 成功态动效** · 错误条 motion fade-in + x 抖动数组,成功条挂 SuccessBurst 6 粒子爆发(0.6s 收回)
- **学生表空态修复** · 文案从"点上方添加学生"(错误) → "请在底部「添加学生」按钮新增" + WeekendIcon 引导 + motion fade-in
- **summary-workflow.tsx 补 0.5x 档** · 跟周末 panel + 后端 5 档对齐(原 UI 只 4 档)

### 🛠️ 2 顺手项

- **5 档选择器滑动指示器** · 周末 panel 改 motion `layoutId="weekend-length-indicator"` 滑动选中态(对齐 summary-workflow 风格)
- **`--danger` token 矩阵化** · 加 `--danger-text` (`#b91c1c` WCAG AA 5.21:1) + `--danger-soft` (`#fee2e2` 背景),3 处不一致红色统一(copy-button / excel-uploader / banned + weekend-ai-feedback err 状态)

### 🐛 修

- (无,纯 UI 优化 + 一致性修补,无功能改动)

### 🔧 不做的事

- ❌ 不持久化 AI 折叠态(用户确认"默认展开,不持久化")
- ❌ 不做真流式 progress(后端不改,纯 UI 假推进)
- ❌ 不做 dark mode / 全局 toast / Skeleton 库(超出范围)

---

## [Android V1.0.0] - 2026-06-27 · Android 客户端首发

> 🆕 **新平台首发**：Lekao Web 推出 Android 原生 APP，**27 项功能一口气全做完**，**不上架应用商店**，通过群发 APK 安装。完整 spec 见 [`docs/stages/d1-lekao-android.md`](docs/stages/d1-lekao-android.md)，快速开始见 [`lekao-android/README.md`](lekao-android/README.md)。

### ✨ 客户端架构

- **Kotlin 1.9.24 + Jetpack Compose BOM 2024.10.01 + Material 3**
- **MVVM + Repository + 单 Activity + Compose Navigation**（无 Hilt/Koin，手注入）
- **DataStore Preferences**（登录态 / 主题 / 语言）+ **Room 2.6.1**（错题草稿）
- **WorkManager 2.9.1**（后台错题同步）
- **ProGuard R8** minify（70+ 库 keep 规则全配齐）

### 📦 27 项功能（按 V1.0.0 spec 全做）

#### 基础 10 项（F01-F10 · 对齐 Web）

- F01-F02 邮箱密码登录 + 验证码登录
- F03 Dashboard 首页（T-Coin + 6 入口）
- F04-F05 课堂小结 + 课堂反馈（SSE 流式）
- F06 错题集（拍照 / 标注 / OCR / docx 导出 / 分享）
- F07 灵感墙（列表 / 详情 / 评论 / 点赞 / TOP 3）
- F08 个人中心
- F09 灵感墙详情
- F10 Admin 后台（Dashboard / CoinLog / AuditLog / UserBan）

#### 手机特化 17 项（M01-M17 · 比 Web 更丰富）

- M01-M02 系统相机拍照 + 相册多图选择（最多 9 张）
- M03 系统分享（docx/zip → 微信 / 钉钉 / 邮件，**用户原话"一键发家长群"**）
- M04 生物识别登录（指纹 / Face ID · androidx.biometric）
- M05 错题集 docx 导出（apache-poi 5.3.0）
- M06 错题集图片标注（涂鸦 / 箭头 / 裁切 / 文字 · Compose Canvas）
- M07 启动屏 + Lottie 动画（core-splashscreen + lottie-compose 6.5.0）
- M08 桌面快捷方式（App Shortcuts · 长按图标快速做小结/反馈/灵感）
- M09 离线缓存 + 错题集草稿箱（Room + WorkManager）
- M10 图片智能裁切（ucrop 2.2.10）
- M11 桌面小部件 / Tile（Glance AppWidget 1.1.0）
- M12 推送通知（FCM · 灵感 / 系统 / 评论 三 channel + grouping）
- M13 主题色自定义（5 套主色 · 蓝/珊瑚/翡翠/紫/琥珀）
- M14 多语言动态切换（中文 / English · AppCompatDelegate）
- M15 Dashboard 图表（T-Coin 流水 / 错题分布 / 灵感趋势 · Vico 2.0.0-beta.1）
- M16 OCR 拍照识别（5 语种链 + 公式预处理 · ML Kit）
- M17 SSE 长连接（灵感墙实时刷新 · OkHttp + 指数退避重连 1s→30s）

### 🛠 技术亮点

- **冷启动 < 1.8s**（processStart → first frame · StartupProfiler 标记关键节点）
- **SSE 断线重连**：1s → 2s → 4s → 8s → 16s → max 30s 指数退避，HTTP 4xx 不重连
- **OCR 多语种链**：ChineseTextRecognizer → JapaneseTextRecognizer → KoreanTextRecognizer → DevanagariTextRecognizer → TextRecognizer 兜底
- **OCR 公式模式**：灰度 + 对比度 1.4x 增强，保留数学符号
- **M13 自定义主题**：TokenStore.customColorFlow → Theme.kt customColorKey → MaterialTheme.colorScheme
- **M14 动态语言**：AppCompatDelegate.setApplicationLocales 进程级切换，无需重启
- **FCM 3 channel 分类 + grouping**：同一灵感的多评论合并为 1 个 summary notification
- **ProGuard keep 规则全配齐**：Vico / ML Kit / POI / Compose / Glance / Retrofit / FCM 都有专门规则

### 🔒 安全设计

- **不**打印 request/response body 到 log（可能含密码 / JWT）
- **不**打印 URL query 参数（可能含 token / code / email）
- **不**打印黑名单 header（Authorization / Cookie / Set-Cookie / Proxy-Auth / X-API-Key）
- Release 包完全跳过 HTTP 日志拦截器
- 集中式 `ErrorMessages.safe(throwable)` 错误消息映射，**不**泄漏服务端原始信息
- FCM token 只 log `token.hashCode()`（不暴露真实 token）
- IP 在 AdminAuditLogScreen 显示时打码到 `/24`（`1.2.3.0`）
- signout 流程：OkHttp cookie 同步清 + WebView 8 步清理 + CompletableFuture await（防 multi-tick race）

### 📱 不上架的发布策略

- **群发 APK**：Release build 用 debug 签名（商业化前替换为正式 `release.keystore`）
- **包大小**：~15-20 MB（minify + shrinkResources 后）
- **最低 Android 版本**：8.0 (API 26)
- **目标 Android 版本**：14 (API 34)
- **分发渠道**：机构内群（微信群 / 钉钉群 / 邮件）

### 📚 文档

- [`lekao-android/README.md`](lekao-android/README.md) — 快速开始
- [`lekao-android/docs/architecture.md`](lekao-android/docs/architecture.md) — 架构详解（MVVM / SSE / ProGuard / 性能 / 安全）
- [`lekao-android/docs/api-integration.md`](lekao-android/docs/api-integration.md) — API 集成（BASE_URL / Cookie / SSE / 错误码 / 重试 / 限流）
- [`lekao-android/docs/user-guide.md`](lekao-android/docs/user-guide.md) — 用户使用指南（27 项功能使用 + FAQ）

### ⚠️ 已知问题

- iOS 端**暂无**（V2.0.0 计划，需 Mac）
- Google Play / 应用宝**不上架**（用户原话"不用上架"）
- 微信 OAuth 登录**未接入**（阻塞：公司主体，V2.0.0 再说）
- 错题集云端同步**未做**（V2.0.0 跟 Web 一起做）
- 模板系统 UI**未做**（V2.0.0 跟 Web 一起做）
- 正式 release.keystore **未配置**（V1.0.0 临时用 debug 签名）

---

## [2.2.0] - 2026-06-25 · 灵感墙

**用户共建功能上线：助教们可以提新功能建议、点赞、评论，参与产品方向。**

### ✨ 灵感墙前台 (`/dashboard/ideas`)

- 提交灵感：标题 50 字 + 描述 500 字，每人每天 1 条，敏感词实时提示
- 点赞 + 评论：每用户对每灵感最多 1 可见评论（删 = 永久禁，DB partial unique index 强制）
- 排行榜：TOP 3 横排（移动端竖排），按点赞数 + 时间排序
- 3 段筛选：全部 / 我提的 / 我赞过的 + 排序（热度 / 最新）+ 搜索
- 状态机：open → planned → done（admin 推进）

### 🔒 Admin 后台 (`/admin/ideas` + `/admin/ideas/comments`)

- 灵感列表：状态过滤 + 搜索 + 一键状态切换 + 删除（带审计）
- 评论管理：按灵感 + 状态过滤 + 软删（保留 banned 状态）
- admin sidebar 灵感墙管理可展开子菜单（chevron 旋转动画）
- 所有 admin 操作写 `audit_log`（action: idea_status_change / idea_delete / idea_comment_delete）

### 🛠 技术细节

- 3 张新表：`lekao_ideas` / `lekao_idea_likes` / `lekao_idea_comments`
- PostgreSQL partial unique index：`WHERE status='visible'` 强制决策 #10（DB 层兜底）
- 30+ 敏感词分类：政治 / 色情 / 暴力 / 严重侮辱 / 广告引流
- UTC+8 时区感知的「每天 1 条」限频
- 乐观更新 like（先改 UI 再同步服务端）
- 评论懒加载 + 失败保留表单值

### 📱 移动端响应式

- 容器 `px-4 md:px-12`
- TOP 3 移动端竖排
- 提交弹窗移动端全屏
- 评论输入区 `fixed bottom` + `env(safe-area-inset-bottom)` 兼容 iPhone safe area
- admin 卡片移动端操作栏下沉 + 元信息 flex-wrap

### 📦 Commits

```
4ff16cf  feat(ideas): v2.2.0 #1 · 3 表 + 5 API + 页面 + TOP 3 + 评论 + 敏感词
5c52055  feat(ideas): v2.2.0 #2 · admin 后台管理
55d9403  feat(ideas): v2.2.0 #3 · 移动端响应式
```

---

## [2.0.0] - 2026-06-22 · 收尾稳定版

**Lekao 第一个功能完整 + 安全加固 + 监控到位 + 品牌专业 + SEO 就绪 + 移动端可用 的稳定版本。**

### 🎯 核心功能

| 模块 | 功能 |
|------|------|
| 课堂小结 | 上传讲义图片 → AI 识别学科/章节/知识点 → 生成课堂小结（含授课内容 + 学习要求 + 可选作业反馈）|
| 作业/堂测反馈 | 上传讲义图片 → AI 生成 10/20/30/40/50 条逐题反馈 + 作业总体小结（4 挡字数：标准/×1.5/×2/×3）|
| 错题集 Word | Excel 模板 + 拖拽题目图片（每题最多 3 张）→ 5 分钟生成全班 Word 错题文档（**永久免费**）|
| T-Coin 体系 | 注册即送 5 枚（够生成 5 次），扣费优先 gift_coin → t_coin |
| 邮箱密码登录 + 验证码登录双模式 | 邀请码支持（可选，填了送 15 枚）|
| 本地历史（IndexedDB）| 用户可查本地历史，主动清除 |

### 🔒 安全设计

| 层 | 实现 |
|----|------|
| banned 拦截（4 层）| `authorize` + `signIn` callback + `verify-code` + `proxy.ts` |
| Rate Limit（双层）| 用户级 5 次/60s + 全局并发 5/instance + 队列 100 + 60s 超时 |
| AI 错误友好分类 | 402 余额不足 / 429 限流 / 超时 / 上下文超长 → SSE `__ERROR__` 事件 |
| Prisma 连接池 | `?connection_limit=4&pool_timeout=20` 防 DB 撑爆 |
| nginx limit_req | 20r/s + burst 50 防 DDoS |
| Security Review | 7 个 MEDIUM + 1 个 CRITICAL 全部修复 |

### 📊 监控

- systemd + cgroup v2 memory 监控（`/usr/local/bin/lekao-monitor.sh` 每 5 分钟）
- QQ SMTP 告警：> 80% 内存 / 进程 dead → 推送到 QQ 邮箱

### 🎨 品牌与 SEO

- 几何 Logo（圆形 + L 字符 + signal coral 强调点）
- Next 16 dynamic icon route：`/icon` `/apple-icon` `/opengraph-image`
- 全平台 SEO：title 模板 + 12 关键词 + OpenGraph + Twitter Card
- 双 JSON-LD schema：SoftwareApplication + FAQPage（Google Rich Result）
- 自动生成 `robots.txt` + `sitemap.xml`

### 📱 移动端

- 关键页面响应式：Navbar / Hero / Uploader / Summary 选项栏
- 触屏设备禁用 3D tilt（节省 GPU）
- 触控目标 ≥ 36px
- 渐进式 grid (2/3/5 列)
- 图片压缩移动端自动降级（1280px / 0.4MB）

### 🚀 部署

- 腾讯云 3.6GB 单进程 systemd + nginx 反代
- 阿里云 SSL 终端（Certbot 自动续签）
- PostgreSQL 共享 DB（与 ResumeAIX 共用 users 表只读）
- git bundle + SCP 部署（跨境网络抽风兜底）

### 📦 技术栈

| 层 | 选型 |
|----|------|
| 前端 | Next.js 16 + React 19 + Tailwind 4 |
| 数据库 | PostgreSQL + Prisma 6 |
| 认证 | next-auth v4 + JWT |
| 视觉模型 | Qwen3-VL-8B-Instruct（硅基流动）|
| 文本模型 | DeepSeek-V4-Flash |
| Word 生成 | docx + JSZip |
| 图片压缩 | browser-image-compression + Web Worker |

---

## [1.x] - 2026-06-20 ~ 2026-06-22

详见 git log：
- Phase 1 (T1-T15)：脚手架 + 登录系统 + 部署 + Lighthouse a11y 100
- Phase 2：课堂小结 + 反馈业务功能
- P0 三件套 + 9 项安全加固 + 监控告警

---

## 下阶段规划（等用户拍板）

### P0 阻塞商业化（等公司主体）
- T41 微信 OAuth
- T39 微信支付

### P1 杀手级（任选）
- 移动端完整 sprint（8h）
- T42 批量并行生成（4h）
- 用户自定义模板 UI（6h）

### 监控增强（性价比低）
- Sentry 接入（30min，已用 QQ 邮件告警替代）

---

**维护者**：LeKao 团队
**License**: Private
