# LeKao · 更新日志

> 所有重要变更记录在此。版本号遵循 [Semantic Versioning](https://semver.org/)。

---

## [v2.7.0] - 2026-09-29 · 全站美术升级：迁移 ResumeAIX 设计方法体系

### 🎨 设计系统立法（commit bce936a）

- **`DESIGN.md` 单一事实源**：三文档仲裁（globals.css 现网值为锚）、令牌总表、装饰词白名单 ORN-01~11 登记制、动效/微交互/质感规格、状态徽章语义映射
- `ui-polish/rules.md` 全文并入 DESIGN.md §8；`AUDIT.md` 开「美术升级轮」台账（B0-B6 逐批记录）

### ♿ reduce 防线真实化（commit 1b268ac）

- `useReducedMotion` 弃用 motion/react 转发版，改 `useSyncExternalStore` 自制（SSR 首帧恒 false，杜绝 hydration 分叉），12 处 import 全量切换
- Providers + AdminShell 双挂 `MotionConfig reducedMotion="user"`（补 admin layout 不经 Providers 的门控缺口）
- 移除从未挂载的 lenis 平滑滚动依赖

### 🔧 动效层收编（commit 1f06d04 + 8b96996）

- reduce 钳制块四清单化（补 delay 归零，修 4 处「隐形后闪现」）；全站默认缓动 + `--ease-editorial` 权威曲线令牌
- 删 7 个死工具类 + 8 个死 keyframes；5 处 inline 动画挂载迁登记类；11 处曲线字面量归 `src/lib/motion-tokens.ts`（时长三档 / 弹簧四档）
- 裸色归令牌：签到发光 blue-500→accent、errorPulse / rowFlash / 表格 hover、CheckIcon、admin svg-charts 回退值

### ✨ 印刷装饰词汇落地（commit 00ce17e + cfff568 + 7a0d346 + 7972efd + e9c33d1 + 7d7cf41 + 7a0d346）

- 质感层：全局 grain（ORN-09）；浅底局部点阵按 ORN-11 规则统一移除（hero / about / login / register）
- 点线价目行（ORN-02）：控制台余额拆分、个人中心账号详情
- 检讫章（ORN-07）：签到成功 stamp-in 盖章动效（回访已签不重播）
- 状态徽章 ORN-03：灵感墙三档语义浅底统一（mono + 前置圆点）
- Fraunces 400-italic 字面落地（消除 6 处合成斜体）；表单 focus 仪式感（9 字段 label 变色 + 发丝线）
- AI 生成占位：读图/等首包期间 AiThinkingDots 三点脉冲（出字后自动门控）

### 🔧 admin 令牌化与对比度（commit ca12fbd）

- 68 处 tailwind palette 裸类清零（统计条语义族映射 / 审计操作色 / 类型章）；svg-charts 回退 hex 与裸 rgba 清零
- 修复对比度真 bug：调币按钮琥珀底白字 ≈2.2:1 → accent-text；复制钮、错误卡、about CTA 等多处文字达 4.5:1

### 📝 运维（commit a776154）

- 部署脚本补根级 `.prisma` 符号链接步骤（修复 2026-09-29 生产登录 500 事故根因：pnpm 虚拟存储 × Turbopack 外置桩解析缺口）

---

## [v2.6.0] - 2026-08-28 · 云端生成历史 + 周末表接模板 + 改名真保存

### ✨ 新增 · 云端生成历史用户侧可见（commit c076fd2）

- **`GET /api/lekao/history`**（session userId 隔离、分页）：查 `lekao_class_summaries` / `lekao_class_feedbacks` 落盘文本（纯文字，不含图片）
- **history 页云端 + 本地合并展示**：云端条目带「永久保存」徽章，换设备/清缓存不再丢历史；零新表零 migration
- Stage Spec：`docs/stages/cloud-history-readonly.md`

### ✨ 新增 · 周末反馈表接入自定义模板（commit 0d235d0）

- `buildBatchFeedbackPrompt` 增加 style 注入（与 summary/feedback 同款 buildStyleBlock 模式）
- batch API 接收 `templateId`：preset 直映射 / 自有模板归属校验 / 无效越权静默回退 standard（不 500）
- 周末反馈面板加模板下拉——周末反馈直接发家长群，称呼/签名需求最强的场景补齐

### 🔧 修复 · 个人中心真保存（commit e42a5c4 + 8ce7deb）

- **改名真保存**：`PATCH /api/auth/me`（长度 1-20 校验；users 表仅 UPDATE name 一个字段，共享表红线写进注释）+ next-auth `session.update()` 刷新登录态——替换原 setTimeout 假保存
- 个人中心侧边栏显式入口 + 改名后页面即时刷新

### 📝 文档 · 版本真值对齐（commit 8a6aa1e）

- package.json 2.3.0 → 2.5.0（本条目发布时同步 2.6.0）
- README T-Coin 叙事改写：注册即送/每次消耗 → 每日签到 7 日递增 2-8 币 + 失败自动退款，不付费不充值

---

## [v2.5.0] - 2026-08-18 · UI 全面改版 + 自定义模板 V1 + 侧边栏重构

**8 月三批改动：错题反馈健壮性修复（8/04）→ 全站 UI 改版与文案重写（8/09）→ T-Coin 退款 + 侧边栏 + 自定义模板 + 移动端适配（8/18）。**

### ✨ 新增 · 自定义模板 V1（8/18 · commit 28361a6）

- **`LekaoTemplate` 表首次投入使用**（content 列存结构化 style JSON，零 schema 迁移）
- **预设 2 套**（代码常量）：`standard` 标准 / `concise` 简洁（条目更短、去客套话）
- **我的模板**：name / greeting 开头称呼 / tone 语气三选一 / signature 签名 / extraNote 附加要求，全部结构化字段
- **3 个 API**（session userId 隔离）：`GET /api/lekao/templates` / `POST`（每类型上限 5 个 → 422）/ `DELETE`（仅本人）
- **prompt 注入**：`buildSummaryPrompt` / `buildFeedbackPrompt` 增加可选 `style` 参数；无效/越权 templateId 静默回退 standard（不 500）
- **UI**：summary / feedback 页模板下拉 + 管理弹窗（新建/编辑/删除）

### ✨ 新增 · 侧边栏信息架构重构（8/18 · commit aaa8baf）

- **4 分组导航**：总览（新增控制台主页入口）/ 生成工具 / 我的记录 / 社区 + 管理（admin）
- **「错题反馈表」改名「周末反馈表」**（与作业/堂测反馈、错题集生成区分，侧边栏 + QuickCard + TopBar 三处一致）
- collapsed 模式分组标题隐藏，active 高亮 / localStorage 持久化 / tooltip 行为保持

### ✨ 新增 · UI 改版基建（8/09 · Stage 0-6）

- **Stage 0**（e265132）：配色升级 + 文案合规 + 死代码清理
- **Stage 2**（7a75329）：路由级 loading / error / not-found 状态骨架
- **Stage 4/5/6**（16d21f6 + e7d8df0）：全局排版基建 + 模块精修 + A11y
- **移动端导航**（b145cef）：dashboard <768px 顶部横向导航 + Hero 文案精修
- **全站文案重写**（109e204）：品牌名回 Lekao Agent，删除 product-copy-system spec
- **Navbar 衬线 + history 空态/loading 升级**（8/01 · ba815b5）

### 🔧 修复 · T-Coin 与错题反馈（8/04 + 8/18）

- **AI 失败自动退款**（2b993b1）：空输出 / vision 失败等真实触发，流水 `AI失败自动退款-{原因}-{cid}`，成功扣 1、失败不扣；去充值化改签到引导
- **batch-feedback 健壮性三连**（486b5cb + 60d55cb + 4e43641）：索引匹配替代顺序兜底 / 诊断日志 console.error + 字段名兼容 / AI 空 content 自动重试 + 失败不扣币 / 日志脱敏
- **weekend 姓名匹配兜底**（97b2c49）
- **移动端适配**（6592c11）：3 视口（375/390/768）程序化审计 15 页，修复 mistake 步骤条 375px 溢出（overflow-x-auto）和签到卡 768px 溢出（flex-wrap），PC 1440px 零回归

### 🏠 仓库治理（8/09）

- **PII / 教学原文 / APK 出 git**（aba22cc）：APK 迁移 GitHub Releases
- 归档一次性调试脚本 + 新增仓库级 CLAUDE.md（f3e2eec）

### 📦 Commits

```
ba815b5  feat(ui): Navbar 衬线 + history 空态/loading 升级
97b2c49  fix(weekend): AI 反馈姓名匹配兜底
486b5cb  fix(mistake/batch-feedback): 索引匹配替代顺序兜底 + 日志脱敏
60d55cb  fix(mistake/batch-feedback): 诊断日志 console.error + 字段名/index 健壮性兼容
4e43641  fix(mistake/batch-feedback): AI 空 content 自动重试 + 失败不扣币
e265132  refactor(ui): Stage 0 配色升级+文案合规+死代码清理
b145cef  feat(ui): dashboard 移动端导航 + Hero 文案精修
16d21f6  style(ui): Stage 4 全局排版基建
7a75329  feat(ui): Stage 2 路由状态骨架
e7d8df0  refactor(ui): Stage 4/5/6 排版精修+模块精修+A11y
109e204  feat(ui): 全站文案重写+品牌名回 Lekao Agent
aaa8baf  feat(sidebar): 侧边栏信息架构重构
28361a6  feat(templates): 自定义模板 V1（结构化字段）
2b993b1  fix(coin): AI 失败自动退款 + 去充值化改签到引导
6592c11  fix(mobile): 移动端适配审计与两处溢出修复
```

---

## [v2.4.0] - 2026-07-07 · 管理后台数据分析（T44 · commit 1+2+3 完整版）

**管理后台能看到"现在有几个人正在用" + "每天用了多少次"，4 数字卡 + 5 聚合 API + Redis 心跳。**

### ✨ 新增（后端数据层 · commit 1）

- **5 个聚合 API**（admin 角色校验 + 5min unstable_cache 缓存）
  - `GET /api/admin/online-users` — 实时在线人数（Redis ZSET 5s 实时）
  - `GET /api/admin/analytics/overview` — 5 数字卡（累计用户 / DAU / 今日小结 / 今日反馈 / 错题=N/A）
  - `GET /api/admin/analytics/trend-7d` — 7 天每日 DAU + 小结 + 反馈
  - `GET /api/admin/analytics/trend-30d` — 30 天每日趋势
  - `GET /api/admin/analytics/hourly-24h` — 24h 高峰分布（按小时聚合）
- **3 个 lib 模块**（职责清晰，0 业务耦合）
  - `src/lib/redis.ts` — ioredis 单例（HMR 友好）
  - `src/lib/redis-online.ts` — ZSET 滑动窗口 30s 心跳
  - `src/lib/analytics.ts` — 5 个聚合函数（groupBy + Set 去重）
  - `src/lib/cache-admin.ts` — `unstable_cache` 5min wrapper
- **proxy.ts 心跳集成** — `void updateOnlineHeartbeat(token.sub)` fire-and-forget

### ✨ 新增（前端可视化 · commit 2 + 3）

- **3 个共享 UI 组件**
  - `StatCard` — 通用数字卡（数字 + 图标 + 标签 + 备注 + 同比箭头）
  - `OnlineBadge` — Navbar 右上角 `● N 在线` 徽章（5s 轮询 + pulse 动画，触屏静止）
  - `TodayStrip` — 仪表盘 5 数字卡横条（5min 轮询）
- **1 个 analytics 页面组件**
  - `AnalyticsOverviewStrip` — `/admin/analytics` 顶部 5 数字卡（server 注入 + client 5min 轮询）
- **4 个纯 SVG 图表**（0 依赖，~600 行手写）
  - `BarChart7d` — 7 天 DAU 柱状图（柱顶数字 + 入场动画 + 网格）
  - `TrendLine30d` — 30 天趋势线（渐变面积 + 描边动画 + 最新点/最高点标注）
  - `SummaryFeedbackDualLine` — 小结 vs 反馈 双折线（蓝实线 + 绿虚线 + 图例）
  - `HourlyHeat24h` — 24h 高峰柱状（每 4h 标 X 轴 + 高峰数字标注）
- **新页面 `/admin/analytics`** — server component，await 4 个聚合函数（走 5min cache），server-side 渲染 5 数字卡 + 4 SVG（避免翻页闪烁）
- **admin sidebar 新菜单项** — "数据分析" + Navbar 顶部 OnlineBadge 徽章（桌面 + 移动端均显示）
- **新 icon `ChartIcon`** — 3 柱状条 SVG

### 🎨 设计语言

- 配色：主站 token `var(--accent-text, #1d4ed8)` 蓝 + `var(--success-text, #047857)` 绿（不引入新色板）
- 入场动画：只触发 1 次（mount 时），无循环扰民
- 0 数据态：友好提示"暂无 X 天数据"（不显示空白）
- 触屏设备：徽章 pulse 动画静止，节省 GPU
- 数字标注：图关键点（最新/最大/高峰）才标注，不每点都标（避免视觉噪音）

### 🎯 累计用户口径

- 3 张表 userId 去重：`lekao_class_summaries ∪ lekao_class_feedbacks ∪ lekao_coin_log`
- 字面"用过 Lekao 的人"（与"注册了没用过"区分）

### 🔧 依赖

- 新增 `ioredis@^5`（连接腾讯云 :6380 Redis 容器）

### 📦 Commits

```
8bd0fed  feat(analytics): T44 commit 1/3 · admin 5 API + Redis online heartbeat
(待)      feat(analytics): T44 commit 2/3 · Navbar 在线徽章 + 仪表盘 5 数字卡
(待)      feat(analytics): T44 commit 3/3 · /admin/analytics 页面 + 4 纯 SVG 图
```

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

| 模块                            | 功能                                                                                          |
| ------------------------------- | --------------------------------------------------------------------------------------------- |
| 课堂小结                        | 上传讲义图片 → AI 识别学科/章节/知识点 → 生成课堂小结（含授课内容 + 学习要求 + 可选作业反馈） |
| 作业/堂测反馈                   | 上传讲义图片 → AI 生成 10/20/30/40/50 条逐题反馈 + 作业总体小结（4 挡字数：标准/×1.5/×2/×3）  |
| 错题集 Word                     | Excel 模板 + 拖拽题目图片（每题最多 3 张）→ 5 分钟生成全班 Word 错题文档（**永久免费**）      |
| T-Coin 体系                     | 注册即送 5 枚（够生成 5 次），扣费优先 gift_coin → t_coin                                     |
| 邮箱密码登录 + 验证码登录双模式 | 邀请码支持（可选，填了送 15 枚）                                                              |
| 本地历史（IndexedDB）           | 用户可查本地历史，主动清除                                                                    |

### 🔒 安全设计

| 层                  | 实现                                                               |
| ------------------- | ------------------------------------------------------------------ |
| banned 拦截（4 层） | `authorize` + `signIn` callback + `verify-code` + `proxy.ts`       |
| Rate Limit（双层）  | 用户级 5 次/60s + 全局并发 5/instance + 队列 100 + 60s 超时        |
| AI 错误友好分类     | 402 余额不足 / 429 限流 / 超时 / 上下文超长 → SSE `__ERROR__` 事件 |
| Prisma 连接池       | `?connection_limit=4&pool_timeout=20` 防 DB 撑爆                   |
| nginx limit_req     | 20r/s + burst 50 防 DDoS                                           |
| Security Review     | 7 个 MEDIUM + 1 个 CRITICAL 全部修复                               |

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

| 层        | 选型                                   |
| --------- | -------------------------------------- |
| 前端      | Next.js 16 + React 19 + Tailwind 4     |
| 数据库    | PostgreSQL + Prisma 6                  |
| 认证      | next-auth v4 + JWT                     |
| 视觉模型  | Qwen3-VL-8B-Instruct（硅基流动）       |
| 文本模型  | DeepSeek-V4-Flash                      |
| Word 生成 | docx + JSZip                           |
| 图片压缩  | browser-image-compression + Web Worker |

---

## [1.x] - 2026-06-20 ~ 2026-06-22

详见 git log：

- Phase 1 (T1-T15)：脚手架 + 登录系统 + 部署 + Lighthouse a11y 100
- Phase 2：课堂小结 + 反馈业务功能
- P0 三件套 + 9 项安全加固 + 监控告警

---

## 下阶段规划

> 2026-10-05 口径更新：项目已定版**免费模式**（每日签到得 T-Coin，不做付费 / 充值 / 商业化变现），早期「阻塞商业化：微信支付」路线随之废止。原 P1 项中，移动端适配与自定义模板 UI 已在 v2.5.0 落地。

- T42 批量并行生成（4h，等用户拍板）
- Sentry 接入（已由 QQ 邮件告警替代，暂无需要）

---

**维护者**：LeKao 团队
**License**: Private
