---
id: AUDIT-20260731-LEKAO
title: LeKao 全项目非安全审计报告
kind: audit
version: 1
status: READY
baseline_sha: 0c26d08cb71e84747f58ab030ea6c4f4f48b6637
related: PRD-LEKAO-FOUNDATION-V3 at ../prd/lekao-foundation-v3.prd.md
handoff_ref: N/A
observed_handoff_revision: N/A
---

# LeKao 全项目非安全审计报告

## 1. 执行摘要

LeKao 已具备可构建的 Next.js 产品、四条 Web 工作流、后台管理和 Android 客户端，但当前不适合直接进入“全量视觉翻新”。最先要解决的是产品承诺、跨端接口、付费一致性和数据连续性，否则新的界面会放大既有断链。

本次基线构建通过；ESLint 报告 92 个问题（54 errors、38 warnings）；Web 没有自动化测试脚本；Android 测试因审计环境无 JDK 无法执行。生产构建的本地 Lighthouse 三次移动端中位数为 Performance 91、LCP 3.397s、FCP 0.761s、TBT 52ms、CLS 0，主要 LCP 延迟来自首屏内容入场动效。安全风险按用户指令明确排除，不进入本报告排序和整改范围。

## 2. 审计方法与证据

| 维度               | 方法                                          | 结果                                   |
| ------------------ | --------------------------------------------- | -------------------------------------- |
| 可构建性           | `pnpm build`                                  | PASS，51 个静态页面，31 个 API 路由    |
| 静态质量           | `pnpm lint`                                   | FAIL，54 errors / 38 warnings          |
| Web 自动化测试     | `package.json` 与测试文件盘点                 | 无 test 脚本，仅 3 个手工脚本型检查    |
| Android 自动化测试 | `lekao-android/gradlew.bat testDebugUnitTest` | BLOCKED，环境无 Java/JDK               |
| 页面体验           | 桌面与 390×844 移动端真实浏览                 | 注册页溢出、移动工作台无导航等         |
| 性能               | 生产构建 Lighthouse，移动端 3 次              | 中位 Performance 91，LCP 3.397s        |
| 契约一致性         | Android Retrofit 接口与 `src/app/api/**` 对照 | 多个核心接口不存在或路径不一致         |
| 文档一致性         | README、BRD、PRD、ARCHITECTURE、Prisma 对照   | 数据表、阶段状态、商业化和能力描述漂移 |

说明：本地生产服务器缺少 `NEXTAUTH_SECRET`，使 `/api/auth/session` 返回 500；该错误本身属于环境配置，但公开营销页会主动请求会话，暴露了不必要的公开页客户端鉴权依赖。

## 3. 优先级定义

- P1：核心路径不可用、付费或数据可信度受损，应先于重设计解决。
- P2：必需质量、体验或产品真实性缺陷，应在下一发布周期解决。
- P3：不阻断发布但影响一致性、维护成本或品牌上限。

## 4. 已验证问题

### P1-001 Android 与 Web API 契约实质断裂

- 证据：`LekaoApi.kt` 调用 `auth/sign-in-password`、`auth/reset`、`auth/me`、`auth/signout`、`lekao/mistake/upload|list|export`、`admin/ban`、`admin/coin-adjust`、`lekao/fcm/register`；Web 实际没有这些路由，调币实际为 `admin/tcoin/adjust`。
- 影响：Android 的密码登录、会话恢复、错题同步/导出、封禁、调币和推送注册无法依约工作。
- 根因：没有版本化 API 描述、共享 DTO 生成和契约测试；客户端注释中的“spec”代替了可执行真值。
- 根治：以 OpenAPI/JSON Schema 作为唯一 API 真值；服务端校验与 Android DTO/客户端由契约生成或校验；CI 中启动服务并跑跨端 contract test。

### P1-002 AI 失败后已扣 T-Coin 不退款

- 证据：`src/app/api/lekao/summarize/route.ts` 在视觉识别前扣币，异常响应明确返回 `refunded: false` 和 TODO；批量反馈同样需要统一审查。
- 影响：用户为失败请求付费，直接破坏交易可信度，且条款包含退款表述。
- 根因：扣费是独立副作用，没有“预授权/结算/释放”状态机和请求幂等键。
- 根治：引入 generation job 与 coin ledger 事务：请求预留、成功结算、失败/超时释放；以 idempotency key 防重复扣退；任何响应都返回一致的账务状态。

### P1-003 移动端登录后没有工作台导航

- 证据：`Sidebar` 使用 `hidden md:flex`；`DashboardLayout` 没有移动端替代导航。
- 影响：手机用户只能依赖页面内部偶发链接或浏览器返回，核心功能不可发现。
- 根因：导航体系只按桌面侧栏设计，没有响应式信息架构契约。
- 根治：建立共享导航模型；桌面映射为 rail/sidebar，移动端映射为顶部上下文栏 + 底部主导航 + “更多”抽屉。

### P1-004 “跨设备恢复”不包含题图本体

- 证据：`history.json` 仅导出 `SavedSection[]` 和 `imageIds`，不导出 IndexedDB 中的 Blob；界面却以“跨设备恢复”表述能力。
- 影响：换设备导入后引用找不到图片，生成历史不完整，用户可能误以为已备份。
- 根因：数据模型把元数据、图片和工作流状态分散存储，备份契约没有定义完整性。
- 根治：统一 Artifact Bundle（manifest + blobs + checksum + schema version）；支持完整 ZIP 导出/导入，或登录后服务端同步；导入前给出缺失资产预检。

### P1-005 个人资料保存是伪成功

- 证据：`ProfileActions` 只等待 600ms 后显示“已保存”，随后还原原值，源码明确标注 Phase 2 未接 API。
- 影响：用户收到虚假的成功反馈。
- 根因：占位交互进入可发现的正式界面，没有 feature flag 或 disabled 状态。
- 根治：接入真实更新接口、刷新会话并持久化；若暂不实施则移除入口，不允许模拟成功。

### P2-001 静态质量门禁失效

- 证据：ESLint 54 errors，包含 React 19 effect/set-state、render 中读取 ref、回调声明顺序、显式 `any`、CJS 脚本配置不匹配等。
- 影响：真实回归与规则噪声混在一起，任何新改动都无法获得可信绿色门禁。
- 根因：升级 React/Next/ESLint 后未完成规则迁移，也未将 lint 设为合并门禁。
- 根治：先分类规则与源码缺陷，再分批清零；脚本目录采用独立 ESLint override；CI 强制 lint、typecheck、test、build。

### P2-002 缺少自动化回归体系

- 证据：`package.json` 无 `test`、`typecheck`、`test:e2e`；核心扣费、导入、文档生成和接口无稳定测试入口。
- 影响：当前“build 通过”不能证明产品行为正确。
- 根因：功能按页面增长，未建立测试金字塔和可注入边界。
- 根治：Vitest 覆盖纯逻辑/事务，route contract test 覆盖 API，Playwright 覆盖注册、生成、退款、导入和移动导航。

### P2-003 注册页窄屏横向溢出

- 证据：390×844 审计中页面 `scrollWidth` 442，验证码按钮右侧超出视口；按钮与输入横排且输入缺 `min-w-0`/响应式堆叠。
- 影响：发送验证码按钮被裁切，注册核心路径受阻。
- 根因：表单组件没有最小视口验收条件。
- 根治：小于 420px 改为纵向或固定按钮宽度 + 输入 `min-w-0`；加入 320/375/390/430 宽度视觉回归。

### P2-004 条款链接失效且表单语义不完整

- 证据：登录与注册中的服务条款、隐私政策均为 `href="#"`，尽管真实 `/terms`、`/privacy` 页面存在；输入缺 `name` 和 `autocomplete`。
- 影响：用户无法在同意前阅读条款，密码管理器和表单辅助能力下降。
- 根因：认证页面没有复用统一 LegalLinks 与 FormField 组件。
- 根治：统一组件、真实路由、正确 autocomplete/name/inputmode、字段级错误和焦点管理。

### P2-005 公开营销页被会话依赖整体客户端化

- 证据：marketing layout 包裹 `SessionProvider`，Navbar 直接 `useSession()`；本地缺 secret 时公开首页出现会话请求错误。
- 影响：增加公开页 JS、网络请求和故障耦合，影响性能与稳定性。
- 根因：为一个 CTA 状态把全局会话 Provider 扩散到静态营销树。
- 根治：营销页默认 Server Component；导航只用最小客户端 island，或由服务端 cookie 判定并渐进增强。

### P2-006 首屏 LCP 被装饰性动效延迟

- 证据：生产 Lighthouse 三次移动端 LCP 中位数 3.397s；LCP 元素为“注册即送 5 枚 T-Coin…”段落，element render delay 约 1.274s。
- 影响：首屏感知慢，性能未达到 Good（≤2.5s）。
- 根因：首屏文本被 stagger/opacity 动画作为不可见内容延后呈现。
- 根治：所有 LCP 候选首帧可见；动画只使用不影响可见性的 transform，非关键元素在首帧后增强。

### P2-007 营销承诺与真实能力/阶段不一致

- 证据：首页宣称多类上传与导出，功能卡使用“AI 按 BRD 硬约束格式”；产品同时出现“内测中”、公开 APK、付费币和完整产品承诺。
- 影响：用户无法判断哪些能力可用、免费、试验中或只在 Web/Android 提供。
- 根因：没有 capability registry 和发布状态作为文案真值。
- 根治：建立能力矩阵（平台、输入、输出、费用、状态、限制）；营销文案从矩阵审查，不再使用内部术语。

### P2-008 JSON-LD 使用无证据的聚合评分

- 证据：marketing layout 写死 `ratingValue=5`、`ratingCount=1`，项目没有真实评价数据来源。
- 影响：结构化数据缺乏可证明来源，伤害搜索与品牌可信度。
- 根因：把 SEO 元数据当装饰内容而非可审计产品声明。
- 根治：立即移除 aggregateRating，只有具备可见、可追溯评价后才恢复。

### P2-009 充值、退款和余额文案没有闭环

- 证据：产品多处提示“充值后再试”、条款描述退款；充值通道实际仍是 Phase 2，用户端无购买闭环。
- 影响：错误恢复动作不可执行，条款与产品能力不对称。
- 根因：资产状态、商业化状态和错误文案没有共同状态机。
- 根治：未开放充值时统一为“联系管理员/等待开放”且标明渠道；上线前补齐订单、支付、退款和账单明细，不提前承诺。

### P2-010 文档与数据库真值漂移

- 证据：`ARCHITECTURE.md` 描述 `lekao_users`、`coin_log`、`verify_codes`；Prisma 实际为 `users`、`lekao_coin_log`、`verification_codes`。
- 影响：维护者可能基于错误表名实施迁移或排障。
- 根因：BRD、PRD、架构文档兼做历史日志，没有生成式事实表或更新门禁。
- 根治：建立 Current Architecture 与 ADR；Schema/API 清单由代码生成并在 CI 校验，历史规划转入 changelog。

### P2-011 工作流文件过大，状态与副作用耦合

- 证据：`weekend-mistake-workflow.tsx` 1280 行、`mistake-workflow.tsx` 942 行、多个 500–800 行组件/route。
- 影响：难以测试、重用和安全重构，React lint 问题集中出现。
- 根因：页面组件同时承担解析、状态机、存储、导出和呈现。
- 根治：按 domain service、state machine、adapter、view model、presentational component 分层；先加 characterization tests 再拆分。

### P2-012 存储失败被静默吞掉，历史语义割裂

- 证据：周末草稿 localStorage 写入失败静默忽略；AI 历史、错题 section、图片 Blob、Android Room 分属不同存储。
- 影响：用户以为已保存但可能丢失，且跨浏览器/跨端不可连续。
- 根因：没有统一 artifact repository、保存状态和持久化等级。
- 根治：定义 local-only / syncing / synced / failed；保存失败必须可见且可重试；统一服务端 artifact identity。

### P2-013 导入统计语义错误

- 证据：`importHistoryFromJson` 的 merge 模式在新增记录后累加 `updated`，注释与行为矛盾；循环内反复读取全部 section。
- 影响：导入结果反馈错误，数据量上升后性能退化。
- 根因：没有导入行为测试和一次性索引。
- 根治：导入前建立 id Set，精确定义 added/skipped/updated，并覆盖 overwrite/merge/损坏数据测试。

### P3-001 品牌命名与视觉语言碎片化

- 证据：界面并用 LeKao、Lekao Agent、AI 智能助教；Logo 主要是字母 L，公开页与工作台仍是通用蓝白 SaaS 卡片。
- 影响：产品识别度和专业可信度低，难以支撑“高级”定位。
- 根因：缺少品牌架构、设计原则和 token/component governance。
- 根治：统一品牌名 LeKao，建立“Editorial Intelligence / 教学编辑台”设计方向与跨端 design tokens。

### P3-002 首屏 CTA 层级竞争

- 证据：登录、免费开始、Android 下载、联系作者同时抢占 Hero 注意力；移动端反而隐藏“免费开始”。
- 影响：用户下一步不清晰，转化路径不连续。
- 根因：首屏没有唯一主任务和漏斗事件定义。
- 根治：唯一主 CTA“免费创建工作台”，次 CTA“查看 3 分钟演示”；登录降级，Android 下载移到平台章节，联系入口进入页尾。

### P3-003 可触达区域与响应式细节不足

- 证据：移动端 Logo、登录和页尾部分链接小于 44px；工作台横向 padding 在手机上仍使用 32px。
- 影响：触控可用性和小屏信息密度不稳定。
- 根因：组件验收只覆盖视觉样式，没有触控与最小宽度矩阵。
- 根治：交互目标最小 44×44px；统一 responsive spacing tokens；对 320px 起的关键路由做自动截图。

## 5. 目标产品与设计方向

建议采用“Editorial Intelligence / 教学编辑台”而非泛 AI 渐变风：瓷白工作纸、午夜墨色、信号钴蓝、少量批注珊瑚色；以版面网格、文档页、批注轨迹和数据刻度建立识别度。动效服务于状态变化，不延迟信息出现，不使用鼠标尾迹承担品牌价值。

工作台采用三层信息架构：全局导航（产品/历史/资产）→ 当前任务步骤（导入/校对/生成/交付）→ 上下文检查器（学生、题号、输出设置）。移动端映射为底部主导航和全屏步骤流，不压缩桌面侧栏。

文案从内部实现语言切换为用户任务语言：不说“按 BRD 硬约束生成”，而说“按可直接粘贴到班级群和教务表的格式输出”；所有数字、费用、平台和输出承诺必须来自 capability registry。

## 6. 推荐实施顺序

1. S01 产品真实性与发布完整性：停止伪成功/错误承诺，修复扣费补偿、移动导航和认证路径。
2. S02 工程与跨端契约基础：质量门禁、可执行 API 真值、统一 artifact 数据模型、Android 收敛。
3. S03 品牌与高级体验系统：在可信契约上重构营销页和工作台，完成文案、性能与响应式体系。

## 7. 明确排除

本报告不评价或修复安全风险；不执行数据库迁移、生产发布、支付接入或品牌商标注册；不把本地缺失环境变量或 JDK 直接判为代码缺陷。
