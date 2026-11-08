---
id: S01-PRODUCT-INTEGRITY
title: S01 产品真实性与发布完整性
kind: stage-spec
version: 3
status: READY
baseline_sha: 24f980f6c3f48c199761d775fe2ddaf29b36af6a
related: PRD-LEKAO-FOUNDATION-V3, TASKS-S01-PRODUCT-INTEGRITY
handoff_ref: ../handoffs/S01-product-integrity.md
observed_handoff_revision: 5
---

# S01 产品真实性与发布完整性

## 1. 目标与非目标

目标：消除会造成付费、保存、认证和移动端核心路径不可信的行为；建立产品能力真值，使公开文案只承诺已实现能力。

覆盖：FR-001/002/003/004/010/012，NFR-003/004/007/008，AC-001/002/003/004/010/012/015。

非目标：不统一 Android API；不迁移历史数据；不做全站视觉重设计；不接支付；不处理安全审计项。

## 2. 当前代码事实

> 2026-10-02 于 `24f980f` 重新勘察。原文写于 `575a9cd`（2026-08-01），其中「profile 伪成功」「无移动导航」「条款链接为 #」「aggregateRating」「签到无 test 入口」「手写版本号」六项已被后续提交修掉或改造，实施时以本节为准；仍满足原始 AC，但 T-003/T-004/T-005/T-006 的真实剩余范围已按本节收窄。

- `src/lib/coin.ts` 只有 `deductCoin`(:34)、`getCoinBalance`(:91)、`refundCoin`(:124)：直接改余额，**无 request/job ledger、无 idempotency key**，退款无账务记录、不可审计、不可对账。
- 两个收费路径扣费时机**不一致**：`summarize/route.ts` 先扣（:321）后多路退款（vision 失败 :342、空输出 :414、文本流错误 :476、流构造失败 :507）；`feedback/batch/route.ts` 生成成功后才扣（:236），且扣费失败只写日志仍返回成功 —— 存在「AI 已生成但未扣币」的白嫖口子。两条路径都没有幂等键，重试语义未定义。
- `src/app/dashboard/profile/profile-actions.tsx` 已接 `PATCH /api/auth/me`（`src/app/api/auth/me/route.ts:21`，含 trim/长度校验与 session 刷新），不再有 PoC 阶段的假成功；剩余范围为真实页面复核与回归锁定。
- 移动端导航：`DashboardMobileNav` 原为 md 以下「顶部横向滚动条 + 全部 9 个入口」，需横向滚动才能触达记录/灵感，入口高度约 30px。**退出登录在移动端原本可达**（`TopBar` 每页渲染 `aria-label="退出登录"` 按钮 + 个人中心头像，36px），因此 §3.4 的真实缺口是导航形态（底部 4 高频入口 + More sheet）与触点尺寸（30–36px < 44px），不是「没有退出入口」。T-005 已按 §3.4 重构。
- 登录/注册的条款与隐私链接已指向 `/terms`、`/privacy`（不再是 `#`）；表单 `name`/`autocomplete`/错误关联与 320px 窄屏布局仍需逐项核对。
- 全仓已无 `aggregateRating`/`ratingValue`；`src/config/` 目录不存在，能力真值 registry（`src/config/capabilities.ts`）尚未建立，营销/FAQ/帮助文案与真实能力之间没有可执行的一致性校验。
- `src/lib/checkin.test.ts`（17 项）已在 `pnpm test` 中运行；全仓无硬编码产品版本，`package.json` 为 2.7.0，页面**不展示**产品版本（`history-mgmt` 的 `HISTORY_JSON_VERSION` 是数据结构版本，与产品版本无关）。
- 测试入口现状：Vitest 可用（197 项、CI 硬门槛）；**无 Playwright、无 `test:e2e` 脚本**，`perf:audit`（S03 T-306）与 `test:contract`（S02 T-203）同样尚未建立。

品牌命名（`Lekao Agent` → `LeKao`）与首页 CTA 收敛属 S03 T-301/T-303 范围，S01 只负责能力真值与虚假声明，不重复改同一批文案。

## 3. 方案概览与控制流

### 3.1 计费状态机

新增 `LekaoGenerationCharge`（具体命名可保持语义等价）作为收费请求 ledger：

```text
request + idempotencyKey
  -> reserveCoin(transaction)
  -> AI job
     -> success: settle
     -> failure/timeout/cancel: release(transaction)
  -> response { billingState, balance, correlationId }
```

`reserveCoin`、`settleCoin`、`releaseCoin` 都必须幂等；余额修改与 ledger 状态迁移在同一数据库事务内。允许直接 reserve 时扣减，但 release 必须按原 source 精确返还；不允许根据当前余额猜测退款池。

### 3.2 产品真值

新增 `src/config/capabilities.ts`，字段固定为 `id, label, platforms, status, inputs, outputs, billing, limits, recovery`。S01 仅把营销/帮助/错误文案接到这份真值或与之进行静态一致性测试，不重做布局。

### 3.3 认证与个人资料

新增真实 profile PATCH route。客户端保存成功后调用 session `update()` 或等价刷新；刷新页面仍显示新值。条款/隐私链接复用统一组件；表单字段具备 `name`、`autocomplete` 和错误关联。

### 3.4 响应式导航

抽取共享 `dashboardNavigation` 数据。桌面继续使用 Sidebar；移动端增加 4 个高频入口的 bottom nav 和包含历史/灵感/个人中心/退出的 More sheet。任何 dashboard route 都必须能访问该导航。

## 4. 实现契约

### UI 状态与交互

- 保存状态仅允许 `idle | submitting | success | error`；success 必须由 2xx 持久化响应触发。
- 320px 注册表单无横向滚动；验证码区在窄屏纵向堆叠，在 ≥420px 可横排。
- 移动底栏尊重 safe-area，当前项有文本与图标双重提示；触点 ≥44×44px。
- 余额不足时若充值未开放，recovery action 不得写“充值后再试”，改为 capability registry 中的真实渠道。
- 签到成功只由服务端幂等结果触发；重复响应、网络重试和 Asia/Shanghai 日期边界不得重复奖励。

### API

- `PATCH /api/auth/profile`：输入 `{name: string}`；trim 后 1–40 字符；成功 `{user:{id,email,name}, correlationId}`；400 校验、401 未登录、409 冲突（如适用）、500 稳定错误结构。
- 收费接口要求 `Idempotency-Key` header 或 body `requestId`；缺失返回 400。兼容期可由客户端生成 UUID，不允许服务端每次重试重新生成。
- 所有核心失败：`{error, code, correlationId, recoveryAction, billingState}`。

### 数据模型、迁移与兼容

- ledger 至少包含 `id, userId, idempotencyKey, operation, amount, source, state, correlationId, createdAt, settledAt, releasedAt`；`(userId,idempotencyKey)` unique。
- migration 必须可回滚；不改共享 `users` 字段，仅在独立 LeKao 表新增数据。
- 旧客户端无 idempotency key 的请求在短兼容期可生成一次并返回，但 Web 本阶段必须显式发送；兼容期结束策略写 ADR。

### 身份、权限、安全和隐私

N/A（安全审计暂停）；仍必须沿用现有认证边界，profile 只能修改当前用户，日志不得记录教学原文。

### 错误、超时、重试与降级

- provider 错误、stream 中断、timeout 和客户端取消均进入 release；若 release 失败，job 标为 `release_pending` 并由可重试补偿器处理，不能返回“已退款”。
- profile 失败保留用户输入并聚焦错误；本地存储不可用时不影响导航。

### 日志、指标与可观测性

记录 generation request 的状态迁移、耗时、operation、billingState、correlationId；禁止记录图片/base64/rawText。

### 并发、事务、缓存与一致性

同一 `(userId,idempotencyKey)` 并发仅一条 ledger；重复 settle/release 返回原结果；settled 不可 release，released 不可 settle，非法迁移记录告警并返回 409。

## 5. 允许与禁止范围

允许：`prisma/schema.prisma`、新 migration、`src/lib/coin*`、两个收费 route 及其客户端、`src/config/**`、认证/profile、dashboard layout/navigation、登录注册、营销/帮助/条款相关文案、对应测试、package scripts。

禁止：`lekao-android/**`、核心错题解析/导出算法、全局视觉重写、支付集成、与 S01 无关的 admin 页面、安全专项改动。

## 6. Task 顺序

T-001 → T-002 → T-003；T-004、T-005、T-006 可在 T-001 后独立；T-007 汇总验证依赖全部前置任务。

## 7. 验证矩阵

| AC         | 层级               | 命令/方法                                                         | 预期                                  | required | final_judge |
| ---------- | ------------------ | ----------------------------------------------------------------- | ------------------------------------- | -------- | ----------- |
| AC-001     | integration        | `pnpm test -- coin-ledger`                                        | 失败/超时/重复请求余额与 ledger 正确  | yes      | rerun       |
| AC-002     | API + E2E          | `pnpm test -- profile && pnpm test:e2e --grep "profile persists"` | 刷新后持久化，失败无伪成功            | yes      | rerun       |
| AC-003     | E2E                | `pnpm test:e2e --grep "auth responsive"`                          | 320/390 无 overflow，legal links 正确 | yes      | rerun       |
| AC-004     | E2E                | `pnpm test:e2e --grep "mobile dashboard navigation"`              | 任一页面可达核心入口                  | yes      | rerun       |
| AC-010     | static + E2E       | `pnpm test -- capability-copy`                                    | 无内部术语/无证据评分/假充值恢复动作  | yes      | rerun       |
| AC-012     | integration        | `pnpm test -- error-contract`                                     | 错误 envelope 字段齐全                | yes      | rerun       |
| AC-015     | unit + integration | `pnpm test -- checkin`                                            | 同日幂等、七日循环和上海时区边界正确  | yes      | rerun       |
| regression | build              | `pnpm build`                                                      | exit 0                                | yes      | rerun       |

## 8. 部署、回滚与数据恢复

先部署 migration，再部署兼容新旧请求的应用。回滚应用时保留 ledger 表，禁止回滚已发生的余额事务；需要回滚 schema 时先导出 ledger 并确认旧应用不会继续写。通过 feature flag 分别控制新计费与移动导航；计费 flag 只能在补偿队列为空时关闭。

## 9. 风险、假设和未决问题

- 假设可提供隔离测试数据库和可控 provider 失败桩；owner：Implementer/环境 owner。
- 流式响应在 header 发出后失败的客户端语义需测试覆盖，不能以 200 代表结算成功。
- 无改变方案的未决产品问题；充值保持未开放状态。
