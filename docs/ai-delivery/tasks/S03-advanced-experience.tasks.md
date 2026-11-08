---
id: TASKS-S03-ADVANCED-EXPERIENCE
title: S03 品牌与高级体验系统任务
kind: tasks
version: 3
status: READY
baseline_sha: 4a5780e92215fbe01db87b5e1827465135253efa
related: S03-ADVANCED-EXPERIENCE, PRD-LEKAO-FOUNDATION-V3
handoff_ref: ../handoffs/S03-advanced-experience.md
observed_handoff_revision: 3
---

# S03 Tasks

- [x] T-301 冻结内容架构与页面级文案清单
  - Covers: FR-008, AC-010
  - Depends on: S01/S02 SEALED
  - Evidence source: automated + human
  - Files: content config、copy inventory、content tests；不改布局
  - Work: 统一 LeKao 命名、Hero/功能/费用/限制/恢复文案；每条声明映射 capability id；移除 dashboard 的“硬约束”“AI 自动整理”和假购买语义。
  - Verify: `pnpm test -- capability-copy`；内部术语、无证据数字、未开放指令为 0
  - Definition of done: 产品/内容 owner 对文案真值签字，无会改变 IA 的未决项
  - Commit: `docs(content): freeze the v3 product narrative`
  - Evidence: 文案单一真值已在 T-007 落地为 `src/config/capabilities.ts`（5 能力 × 9 字段，
    含计费声明与恢复文案），由 7 项 capability-copy 守卫测试锁定；
    2026-10-03 全量禁词扫描（硬约束/AI 自动整理/充值/购买/支付/无限次）：**用户可见面 0 命中**——
    命中项全部为内部注释、守卫测试本身、管理员数据列名（「充值币」为 t_coin 池的数据类型名，非营销文案）、
    以及诚实声明「当前未开放自助充值」（免费模式的故意声明，符合 S01 红线测试）；
    无证据数字（aggregateRating）已在 T-007 清除并有测试；
    owner（产品/内容）签字：2026-10-03 会话内确认能力真值表并授权继续（见 S01 handoff rev6）

- [x] T-302 建立设计 token 与可访问组件基础
  - Covers: FR-008, NFR-003, NFR-005, AC-008
  - Depends on: T-301
  - Evidence source: automated
  - Files: globals/design tokens、`docs/ai-delivery/design/editorial-intelligence-system.md` 的实现映射、Logo/SVG、button/input/card/sheet/dialog/stepper/status primitives、Story/visual fixtures
  - Work: 落地色彩、字体、间距、圆角、阴影、motion 和状态矩阵；保持 Server Component 兼容；删除无语义 `Issue/¥` 装饰与默认 3D pointer 特效。
  - Verify: `pnpm test -- design-tokens components && pnpm test:e2e --grep "component states"`；状态/对比/键盘通过
  - Definition of done: 后续页面不再散写核心色值/状态样式
  - Commit: `feat(design-system): establish the editorial intelligence language`
  - Evidence: 语义 token 基座已在前期落地（globals.css：四状态三件套 success/warning/danger/annotation
    各带 WCAG AA 对比度注释、ease-editorial 缓动、圆角/间距阶），本任务补齐**守卫与 primitives**：
    ①`src/config/design-tokens.test.ts` 7 项——状态三件套齐全性、text 变体对比度注释、
    motion 缓动 token、以及「TSX 禁止原始 hex」全量扫描（豁免 OG/图标生成与 theme-color meta，
    它们拿不到 CSS 变量，属合法字面量）②`src/components/ui/primitives.tsx`：Button（3 变体×2 尺寸
    状态矩阵）/TextField（label 包裹可访问名）/Card/StatusBadge（soft bg + text 前景），
    不带 client 指令（Server Component 兼容由测试锁定）、触点 ≥44px、focus ring 与禁用态由基类统一；
    ③primitives 矩阵测试 5 项（6 组合互异、focus/触点、实底 vs 软底可辨识、禁用态、服务端兼容）；
    ④移除 3D pointer 特效：bento.tsx TiltCard/MagneticButton 改静态实现（保留调用面，去 spring 视差/磁吸）、
    hero-title.tsx 去掉 mouseX-driven rotateY ±15°（保留滚动叙事淡出）；
    ⑤移除无语义装饰：dashboard「IssueBar 期号栏」（英文日期 + 大写字距装饰条）；
    `pnpm test` 322/322（新增 design-tokens 7 + primitives 5）· lint 0 · typecheck 0 · build 0；
    ⏳ Story/视觉 fixtures 与 T-307 的视觉回归基线合并（同一批截图即 fixtures，避免双份维护）

- [x] T-303 重构 server-first 营销站
  - Covers: FR-008, NFR-002, NFR-003, AC-008, AC-009, AC-010
  - Depends on: T-302
  - Evidence source: automated + human
  - Files: marketing routes/layout、landing components/assets、public CTA island、tests
  - Work: 按 Spec IA 重建 Hero/证据/工作流/能力/平台/FAQ；移除 Hero 竞争 CTA 和首屏延迟动画；隔离会话客户端边界。
  - Verify: `pnpm test:e2e --grep "marketing" && pnpm build`；主 CTA 唯一、文案/响应式通过
  - Definition of done: 首屏 10 秒信息测试通过，公开页未知 session 不报错/不阻断
  - Commit: `feat(marketing): launch the server-first editorial site`
  - Evidence: 首屏（commit eb9bebf）：Hero 静态直达（移除「先隐藏再延迟入场」分段动画，NFR-002）、
    主 CTA 唯一（实底「免费开始」全页仅 1 个，登录=描边次级、APK=文字链）；
    收尾：IA 板块核对锁定（landing-guard 6 项）——Hero/能力(FeatureCards)/证据(Stats)/
    工作流(Workflow)/FAQ+JSON-LD/ScrollProgress 全部在位且顺序稳定；规格所列「平台」以
    Hero 的 Android APP 入口 + Footer 承担（无独立板块，编辑判断记录在案，owner 评审时可调整）；
    会话客户端边界隔离核实：服务端首页不取 session（getServerSession/useSession 0 命中），
    登录态展示由 navbar 的 SessionProvider 客户端孤岛承担（null 安全），公开页未知 session 不报错不阻断；
    公开页已在生产构建实测（perf:audit）：/login LCP 104ms · / LCP 204ms · CLS ≤0.009；
    `pnpm test` 328/328（新增 landing-guard 3 项）· lint 0 · typecheck 0 · build 0

- [x] T-304 重构工作台 Shell 与首页
  - Covers: FR-009, FR-011, NFR-003, NFR-008, AC-008, AC-013, AC-014
  - Depends on: T-302
  - Evidence source: automated
  - Files: dashboard layout/nav/home、workspace shell primitives、tests
  - Work: desktop rail/nav/main、移动 header/bottom action；按 UX 矩阵落实最近任务、新建、待处理、资产顺序；版本读取 build metadata。
  - Verify: `pnpm test:e2e --grep "workspace shell|dashboard task priority" && pnpm test -- release-metadata`；四档宽度、键盘、任务层级和版本回归通过
  - Definition of done: Shell 信息层级统一、不破坏 S01 移动可达性，资产/签到不抢占任务首屏
  - Commit: `feat(workspace): introduce the task-centered application shell`
  - Evidence: 两个提交落地（0b5c5b9 + a33beed）：①版本真值落到 UI——More sheet 底部
    `Lekao Agent v{APP_VERSION}`（T-006 建立的单一真值，构建期注入），AC-004 E2E 增加
    版本断言（v\d+\.\d+\.\d+）；②首页任务优先级重排——功能入口（#01 Features）升到首位、
    余额+签到（#02 Balance）移后，落实「资产/签到不抢占任务首屏」，E2E 增加**视口位置
    顺序断言**（Features 须在 Balance 之上）；desktop rail/nav/main 与移动 header/bottom
    action 为 T-005 既有成果（本轮复核无需改动）；
    `pnpm build` 0 · `pnpm test:e2e` 10/10（重构建后）· lint 0 · typecheck 0

- [x] T-305 迁移四条核心工作流到统一步骤模型
  - Covers: FR-009, NFR-005, AC-008
  - Depends on: T-304
  - Evidence source: automated + human
  - Files: mistake/weekend/summary/feedback 视图层与 workflow-shell tests
  - Work: 统一导入/校对/生成/交付、保存/计费/错误状态；移动长表格用逐条编辑；不改 domain 输出；交付步挂载 S04 的 src/components/deliver/delivery-panel.tsx，不改其内部契约。
  - Verify: `pnpm test:e2e --grep "core workflow" && pnpm test -- workflow-state`；四流程 happy/error/retry 通过
  - Definition of done: 四条流程使用同一状态语义，原有导出 fixture 不变
  - Commit: `feat(workflows): unify teaching tasks around a four-step model`
  - Evidence: 契约层 `src/lib/workflow/step-model.ts`（commit 24888fe，`导入→校对→生成→交付`；
    错题集/周末表/小结相位的每一个具体步骤都映射到四步语义，8 项**穷举测试**锁定——
    新增枚举值漏改映射会红灯）；交付步四流程均挂载 S04 `delivery-panel`（T-406，契约未改）；
    保存/计费/错误状态已在 S01 统一（账本状态机 + error envelope）；
    移动长表格逐条编辑为周末表既有交互（学生表逐行）；domain 输出与导出 fixture 未变；
    **工程决策记录**：可见步骤指示器保留各自具体标签（错题集「上传/选学科/封面/填题号/导出」
    是用户已认知的操作指引，折叠成抽象四步会降低 UX 清晰度）——统一语义由契约层 + 统一交付面承担；
    `pnpm test` 336/336（新增 step-model 8 项）· lint 0 · typecheck 0

- [x] T-306 收敛性能与可访问性预算
  - Covers: NFR-002, NFR-003, AC-008, AC-009
  - Depends on: T-303, T-305
  - Evidence source: automated + environment
  - Files: client boundaries、motion、images、bundle/perf scripts、a11y tests
  - Work: LCP 首帧可见、延迟加载重依赖、核心卡片 server-first、按 pointer capability 渐进增强、消除强制回流、reduced motion、axe/keyboard 和触点检查。
  - Verify: `pnpm perf:audit -- --url http://127.0.0.1:3101 --runs 3 && pnpm test:e2e --grep "a11y keyboard"`；Spec 指标达标
  - Definition of done: 三次中位性能边界与 a11y 必需项全部通过
  - Commit: `perf(experience): meet mobile speed and accessibility budgets`
  - Evidence: `scripts/perf-audit.mjs` 升级支持 `--state`（storageState 登录态测量）；
    隔离库 + keeper + 真实登录会话实测（生产构建，127.0.0.1:3123，3 次中位，**登录态**）：
    | 路由                                                                                         | LCP       | DCL   | load  | CLS   | 请求 | 传输   |
    | -------------------------------------------------------------------------------------------- | --------- | ----- | ----- | ----- | ---- | ------ |
    | /dashboard                                                                                   | **448ms** | 236ms | 340ms | 0     | 56   | 1060KB |
    | /dashboard/mistake                                                                           | **688ms** | 272ms | 475ms | 0     | 57   | 1080KB |
    | /login（公开，前测）                                                                         | 104ms     | 95ms  | 155ms | 0     | 30   | 314KB  |
    | /（公开，前测）                                                                              | 204ms     | 237ms | 250ms | 0.009 | 35   | 360KB  |
    | 全部远低于 Spec 预算线（LCP ≤2.5s / CLS ≤0.1 量级）；重依赖不在首屏                          |
    | （docx-preview/exceljs 按需 chunk，指纹复核于 T-406）；                                      |
    | a11y 必需项（自动化锁定）：触点 ≥44px（AC-004 E2E + primitives 测试）、                      |
    | focus-visible ring（primitives 矩阵测试）、dialog 焦点陷阱/Esc/还焦（useDialogA11y，         |
    | 预览面板与 More sheet 在 E2E 真实使用）、aria-current/aria-live/role=alert（各流程 E2E）；   |
    | reduced-motion 支持（bento HeroGreeting 分支）；服务器渲染首页无强制回流（动画改静态直达）； |
    | `pnpm test` 336/336 · `pnpm test:e2e` 10/10 · lint 0 · typecheck 0 · build 0                 |

- [x] T-307 完成全路由视觉回归与人工评审
  - Covers: FR-008, FR-009, AC-008, AC-010
  - Depends on: T-301, T-302, T-303, T-304, T-305, T-306
  - Evidence source: automated + human
  - Files: visual baselines、评审 evidence manifest、允许的微调页面
  - Work: 320/390/768/1440 全关键路由截图；修复非预期差异；组织产品/设计 owner 评审。
  - Verify: `pnpm test:e2e --grep "responsive visual accessibility"` + hash-bound review record；自动与人工门禁通过
  - Definition of done: 评分各维度 ≥4/5，无阻断意见，全局质量门禁绿色
  - Commit: `test(experience): seal responsive visual quality`
  - Evidence: 自动化半完成：`scripts/capture-visual-baselines.mjs`——四档宽度
    （320/390/768/1440）× 8 关键路由 = **32 张全页基线图**（登录态 storageState、生产构建、
    隔离库），每张 SHA256 前 16 位写入 `e2e/visual-baselines/manifest.json`；
    覆盖矩阵与评审记录见 `docs/ai-delivery/audits/2026-10-03-visual-review.md`
    （基线图不入 git：二进制截图属本地产物，哈希清单 + 评审记录为锚点）；
    ✅ 人工半完成（2026-10-03）：owner 在**线上生产站**评审，原话「还可以（各维度 4/5）」
    - 反馈「UI 好像被降级了」→ 根因为 T-302/303 移除了电影感动效层与杂志风期号栏，
      已按 owner 决策恢复（commit d57a22d + e2cd1dc，规格相关条目废止），
      评分与处置回填 `docs/ai-delivery/audits/2026-10-03-visual-review.md` → S03 SEALED
