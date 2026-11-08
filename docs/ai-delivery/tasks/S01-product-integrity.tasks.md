---
id: TASKS-S01-PRODUCT-INTEGRITY
title: S01 产品真实性与发布完整性任务
kind: tasks
version: 3
status: READY
baseline_sha: 24f980f6c3f48c199761d775fe2ddaf29b36af6a
related: S01-PRODUCT-INTEGRITY, PRD-LEKAO-FOUNDATION-V3
handoff_ref: ../handoffs/S01-product-integrity.md
observed_handoff_revision: 5
---

# S01 Tasks

- [x] T-001 建立 S01 测试入口与特征测试
  - Covers: NFR-001, AC-001, AC-002, AC-003, AC-004, AC-010, AC-012, AC-015
  - Depends on: none
  - Evidence source: automated
  - Files: `package.json`, `vitest.config.ts`, `playwright.config.ts`, `tests/**`, `e2e/**`, touched-module test seams
  - Work: Vitest 已在运行（197 项）；本任务补 Playwright 与 `pnpm test:e2e` 脚手架，并为**仍然存在**的缺口写可失败特征测试：计费双模式与无幂等 ledger（T-002 目标）、移动导航形态与移动端退出缺失（T-005 目标）、能力真值 registry 缺失（T-007 目标）；已满足项（profile 真实保存、条款链接、无 aggregateRating、签到单测）只做回归断言锁定，不再当红灯。
  - Verify: `pnpm test -- --run && pnpm test:e2e --list`；新入口可用，特征测试按预期红灯且不因配置错误失败
  - Definition of done: 每个 S01 AC 有稳定测试名和最短失败证据
  - Commit: `test(integrity): establish release-integrity baselines`
  - Evidence: `pnpm lint` 0 problem · `pnpm typecheck` exit 0 · `pnpm test` 197/197（红灯套件不入门槛）；
    `pnpm test:red` 4 failed —— reserveCoin/settleCoin/releaseCoin 未导出（AC-001/T-002）、`src/config/capabilities.ts` 缺失（AC-010/T-007）；
    `pnpm test:e2e` 6 passed / 1 failed / 2 skipped —— 320/390/430 无横向溢出与条款/隐私链接已回归锁定，
    failed = 认证表单缺 `name`+`autocomplete`（AC-003/T-004 红灯），skipped = AC-002/AC-004 需隔离测试库与已登录会话；
    Playwright 走系统 Edge（`channel: msedge`，不下载浏览器包），E2E 暂不接入 CI

- [x] T-002 实现幂等计费 ledger 与补偿状态机
  - Covers: FR-002, FR-010, NFR-004, NFR-007, AC-001, AC-012
  - Depends on: T-001
  - Evidence source: automated + environment
  - Files: `prisma/schema.prisma`, one new migration, `src/lib/coin*`, summarize/batch routes and clients, focused tests
  - Work: 实现 reserve/settle/release 幂等状态机与 ledger（`(userId,idempotencyKey)` unique）；把 summarize 的「先扣 + 多路退款」与 batch 的「生成成功后才扣」统一收敛到同一状态机；堵住 batch「AI 已生成但扣费失败仍返回成功」的白嫖口子；覆盖 provider 失败、stream 失败、timeout、重复与并发。
  - Verify: `pnpm test -- coin-ledger error-contract`；所有状态/余额/错误 envelope 断言通过
  - Definition of done: 失败不扣币，成功只结算一次，重复 key 返回同一结果
  - Commit: `fix(billing): make generation charges idempotent and reversible`
  - Evidence: `pnpm test` 218/218（coin-ledger 17 项 + error-envelope 4 项为本次新增）· `pnpm test:red` coin 出口契约转绿、capability 仍红 ·
    `pnpm lint` 0 · `pnpm typecheck` 0 · `pnpm build` exit 0 · `pnpm test:e2e` 6 passed/1 failed/2 skipped（与 T-002 前一致，无回归）；
    真实路由契约：未登录 POST /api/lekao/summarize 与 /api/lekao/feedback/batch 均返回 401 且 envelope 含 code/correlationId/recoveryAction/billingState；
    迁移 SQL 由 `prisma migrate diff --from-schema-datamodel … --to-schema-datamodel … --script` 离线生成并逐行比对一致（未连库、未 db push）；
    幂等键兼容期：已发布 Android 客户端不发键 → 默认服务端补键（`BILLING_IDEMPOTENCY_COMPAT=0` 转严格 400），结束策略 ADR 待 S02 补

- [x] T-003 接入真实个人资料保存
  - Covers: FR-003, FR-010, AC-002, AC-012
  - Depends on: T-001
  - Evidence source: automated
  - Files: profile route, `profile-actions.tsx`, auth/session types, focused tests
  - Work: 2026-10-02 复核：`PATCH /api/auth/me` 与 session 刷新已实现，本任务剩余范围为真实页面复核（保存 → 刷新 → 重登后值一致；服务端失败不显示成功）与回归测试锁定；无缺陷则关闭，不重写实现。
  - Verify: `pnpm test -- profile && pnpm test:e2e --grep "profile persists"`；刷新与重登后值一致，错误态不显示成功
  - Definition of done: 持久化行为有回归测试锁定；如发现缺陷则修复并保持 2xx 才显示成功
  - Commit: `fix(profile): persist account display names`
  - Evidence: 复核发现实现已在（PATCH /api/auth/me + session.update），但**未达规格 §4 契约**，本次补齐：
    上限 20→40、校验失败 422→400、补 correlationId/recoveryAction/稳定 envelope、成功返回 user + correlationId（保留 ok/name 兼容 Android）；
    客户端成功态仅在 2xx 后置位（无伪成功）且读取 user.name；
    单测 `src/app/api/auth/me/route.test.ts` 6 项（401/非法 JSON/非字符串/空白/41 字符→400、40 字符上界、只更新 name 字段、
    500 不带成功态字段）· `pnpm test` 224/224 · `pnpm lint` 0 · `pnpm typecheck` 0；
    AC-002 的登录态 E2E（保存→刷新→重登）仍受隔离测试库缺失阻塞，用例以 test.fixme 记录在 e2e/dashboard-session.spec.ts

- [x] T-004 修复认证表单与法律链接
  - Covers: FR-001, NFR-003, AC-003, AC-010
  - Depends on: T-001
  - Evidence source: automated
  - Files: login/register、共享 LegalLinks/FormField、focused E2E
  - Work: 条款/隐私链接已指向真实路由（2026-10-02 复核），剩余范围为表单 `name`/`autocomplete`/错误关联与 320/390/430 窄屏布局、触点尺寸。
  - Verify: `pnpm test:e2e --grep "auth responsive"`；320/390/430 截图与 DOM overflow 断言通过
  - Definition of done: 无横向滚动，条款可访问，表单可被密码管理器识别
  - Commit: `fix(auth-ui): restore responsive and legal form semantics`
  - Evidence: `pnpm test:e2e` **8 passed / 0 failed / 2 skipped**（T-004 前为 6 passed/1 failed，红灯已转绿）；
    新增/通过的门禁：注册与登录 320/390/430 无横向滚动、条款与隐私链接指向真实路由、
    `name`+`autocomplete` 语义（email/name/new-password/current-password/one-time-code）、主交互触点 ≥44px（min-h-11）；
    错误提示容器补 `role="alert"` 供读屏播报 · `pnpm lint` 0；
    AC-002/AC-004 两条 fixme 仍受隔离测试库阻塞（非本任务范围）

- [x] T-005 增加移动工作台导航
  - Covers: FR-004, NFR-003, AC-004
  - Depends on: T-001
  - Evidence source: automated
  - Files: dashboard navigation model、layout、`src/components/dashboard/sidebar.tsx`、mobile nav、focused E2E
  - Work: 现有 `DashboardMobileNav`(:232) 是 md 以下横向滚动条，需按规格 §3.4 重构为共享导航数据 + safe-area bottom nav（4 个高频入口）+ More sheet（历史/灵感/个人中心/退出），触点 ≥44px、当前项图标+文本双提示；移动端必须能退出登录。
  - Verify: `pnpm test:e2e --grep "mobile dashboard navigation"`；390×844 全路由可达性通过
  - Definition of done: 手机端任一 dashboard 页面最多两次交互到达规定入口
  - Commit: `feat(navigation): add a complete mobile workspace shell`
  - Evidence: 新增导航单一真值 `src/components/dashboard/navigation.ts`（桌面侧边栏与移动端读同一份）与
    `src/components/dashboard/mobile-nav.tsx`（底部 4 高频入口 + More sheet：控制台/记录×2/灵感/个人中心/管理员/退出）；
    移除旧的顶栏横滚 `DashboardMobileNav`；`TopBar` 由 `sticky top-14` 改 `top-0`，shell 增加底部安全区留白；
    触点 min-h-14(56px)、safe-area、focus trap + Esc（useDialogA11y）、当前项图标+文本双指示；
    单测 `src/components/dashboard/navigation.test.ts` 5 项锁定模型不变量（4 入口=四条核心流程、More 覆盖全部次级入口、
    无重叠、无重复 href、admin/退出不入普通列表）· `pnpm test` 229/229 · `pnpm lint` 0 · `pnpm typecheck` 0 · `pnpm build` exit 0；
    预渲染 SSR 产物核对：`.next/server/app/dashboard/mistake.html` 含 `移动端底部导航`、4 个核心入口 href、`更多`、`fixed bottom-0`、`safe-area-inset-bottom`；
    AC-004 的登录态交互（点击展开 More sheet）仍受隔离测试库阻塞，用例已按新结构改写并保持 fixme

- [x] T-006 固化签到幂等与版本真值
  - Covers: FR-012, NFR-008, AC-015
  - Depends on: T-001
  - Evidence source: automated
  - Files: `src/lib/checkin*`, `src/app/api/checkin/route.ts`, build metadata（如需展示版本）, focused tests
  - Work: 单测已有 17 项；补路由级/DB 级幂等回归（同日重复、并发、Asia/Shanghai 0 点边界、七日循环）；版本真值：页面当前不展示产品版本且全仓无硬编码版本，本任务决定并落地「从 build metadata 读取后展示」或「保持不展示 + 断言无版本漂移」；不改变已验证奖励规则。
  - Verify: `pnpm test -- checkin version-metadata`；奖励只发一次且版本与 package/build 一致
  - Definition of done: 签到回归绿色，页面无手写版本漂移
  - Commit: `test(checkin): lock reward and release metadata invariants`
  - Evidence: 复核发现两个真实缺陷并修复：①并发同日签到因唯一冲突落进 catch 返回 500（应返回 alreadyCheckedIn）；
    ②余额写入用「读后写绝对值」，会覆盖并发发生的 AI 扣费/退款 —— 改为未初始化(-1)置为奖励值、否则原子 increment，事务内读余额生成审计流水；
    401/404/500 统一走错误契约（真实路由核实：未登录 POST /api/checkin → 401 + 五字段 envelope）；
    新增 `src/app/api/checkin/route.test.ts` 9 项（未登录/首签/未初始化/同日重放/并发唯一冲突/七日循环/中断重置/昨天递增/用户不存在）；
    版本真值：`next.config.ts` 构建期从 package.json 注入 `NEXT_PUBLIC_APP_VERSION`，新增 `src/lib/version.ts`（APP_VERSION）与
    `src/lib/version.test.ts` 3 项（x.y.z 格式、注入接线、src 内无硬编码 Web 版本号 —— 剔除注释/SVG 坐标/Android 发版 URL）；
    · `pnpm test` 241/241 · `pnpm lint` 0 · `pnpm typecheck` 0 · `pnpm build` exit 0；
    版本展示（消费方）按 S03 §5.2 由 T-304 落地，S01 只建立单一真值与防漂移锁定

- [x] T-007 建立能力真值并收敛产品声明
  - Covers: FR-001, FR-010, AC-010, AC-012
  - Depends on: T-002, T-003, T-004, T-005, T-006
  - Evidence source: automated + human
  - Files: `src/config/capabilities.ts`（新建）、marketing/FAQ/usage-guide/terms/profile 的相关文案与 JSON-LD、copy tests
  - Work: 新建能力真值 registry（字段 `id/label/platforms/status/inputs/outputs/billing/limits/recovery`）并把公开声明接上静态一致性测试；移除内部术语与伪充值恢复动作（无证据评分已于 2026-10 清理，改为回归断言）；品牌命名统一归 S03 T-301，本任务不抢改名。
  - Verify: `pnpm test -- capability-copy && pnpm build`；静态断言与构建通过
  - Definition of done: 所有关键声明可追溯到 registry；人工内容复核无阻断项
  - Commit: `fix(content): align product claims with shipped capabilities`
  - Evidence: 自动化部分完成 —— 新增 `src/config/capabilities.ts`（5 条能力 × 固定 9 字段；收费能力恰为
    weekend-mistake / summary / feedback 且单价 1 币；mistake 免费；checkin 为奖励；Android 只声明已实现的 summary/feedback）；
    新增 `src/config/capability-copy.test.ts` 7 项：registry 结构完整性、收费集合与单价、免费/奖励能力、平台边界、
    文案收费数字必须落在 registry 金额集合内（排除「赠送」语义）、公开文案无内部术语、每条能力名称在站点源码中出现；
    出口契约 `tests/red/capability-registry.test.ts` 与 `tests/red/coin-ledger.test.ts` 均已转绿（S01 红灯证据清零）；
    规格 Verify `pnpm test -- capability-copy` → 7 passed · `pnpm test` 248/248 · `pnpm lint` 0 · `pnpm typecheck` 0 · `pnpm build` exit 0；
    ⏳ 仍未勾选的理由（DoD 缺口，非实现缺口）：DoD 要求「人工内容复核无阻断项」，该签字须由产品/内容 owner（用户）给出，
    AI 自评不作证据（追踪矩阵完整性规则）。
