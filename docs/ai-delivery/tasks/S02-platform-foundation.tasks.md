---
id: TASKS-S02-PLATFORM-FOUNDATION
title: S02 工程与跨端平台基础任务
kind: tasks
version: 2
status: READY
baseline_sha: 4a5780e92215fbe01db87b5e1827465135253efa
related: S02-PLATFORM-FOUNDATION, PRD-LEKAO-FOUNDATION-V3
handoff_ref: ../handoffs/S02-platform-foundation.md
observed_handoff_revision: 3
---

# S02 Tasks

- [ ] T-201 建立全局质量门禁
  - Covers: NFR-001, AC-007
  - Depends on: S01 SEALED
  - Evidence source: automated
  - Files: ESLint/TS/test/CI config、`package.json`、为修复现有 lint 所需的具体源码
  - Work: 分类修复 54 errors/38 warnings；增加 typecheck/test/contract/e2e scripts；CI 顺序门禁，禁止全局 disable。
  - Verify: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`；全部 exit 0
  - Definition of done: 本地与 CI 同命令绿色，未使用现有错误基线豁免
  - Commit: `chore(quality): establish zero-error project gates`
  - Evidence: pending

- [ ] T-202 用特征测试拆分超大工作流
  - Covers: NFR-005, AC-007
  - Depends on: T-201
  - Evidence source: automated
  - Files: mistake/weekend/summary/history 相关 domain、state、adapter、view 与测试
  - Work: 先固定解析/导出/状态迁移行为，再拆分 500+ 行高风险模块；不改变输出格式。
  - Verify: `pnpm test -- mistake weekend summary history && pnpm typecheck`；快照/fixture 与重构前一致
  - Definition of done: 页面不再同时承载解析、存储、导出和渲染；新增模块符合 Spec 行数原则
  - Commit: `refactor(workflows): separate domain state adapters and views`
  - Evidence: pending

- [ ] T-203 冻结 OpenAPI v1 契约并加入覆盖检查
  - Covers: FR-005, FR-010, AC-005, AC-012
  - Depends on: T-201
  - Evidence source: automated
  - Files: `contracts/**`, contract scripts/tests, CI config
  - Work: 描述已支持能力；建立 declared↔implemented route 双向覆盖、schema/error envelope 校验和 breaking-change check。
  - Verify: `pnpm test:contract -- --grep "openapi route error-envelope"`；无孤儿 route/operation
  - Definition of done: API 真值可执行，Android 必需 operation 有明确 implemented/disabled 状态
  - Commit: `feat(api): establish an executable v1 contract`
  - Evidence: pending

- [ ] T-204 实现或移除断裂的跨端接口
  - Covers: FR-005, AC-005
  - Depends on: T-203
  - Evidence source: automated
  - Files: `src/app/api/v1/**`, legacy adapters, Android `LekaoApi`/repositories/models, focused tests
  - Work: 对每个 Android endpoint 二选一：按契约实现并测试，或从已发布 UI/API 声明中移除并明确 disabled；统一 admin path 和分页。
  - Verify: `pnpm test:contract && .\gradlew.bat testDebugUnitTest`；endpoint matrix 100% 闭环
  - Definition of done: 不存在客户端调用 404 route 的核心路径
  - Commit: `fix(platform): align android and web api operations`
  - Evidence: pending

- [ ] T-205 引入 Artifact 聚合与同步 repository
  - Covers: FR-006, FR-010, NFR-004, NFR-007, AC-011
  - Depends on: T-201
  - Evidence source: automated + environment
  - Files: Prisma 独立模型/migration、artifact domain/repository/API、本地与 Android adapter、测试
  - Work: 稳定 ID、revision/CAS、clientMutationId、状态、冲突和保存失败；旧存储以 adapter 兼容。
  - Verify: `pnpm test -- artifact-repository sync-conflict storage-failure`；并发/失败状态通过
  - Definition of done: Web UI 不直接拼接三套存储；保存状态真实可见
  - Commit: `feat(artifacts): unify teaching work persistence`
  - Evidence: pending

- [ ] T-206 实现完整 Artifact Bundle v2
  - Covers: FR-007, NFR-006, AC-006
  - Depends on: T-205
  - Evidence source: automated
  - Files: bundle schema/export/import/migration UI、fixtures、tests
  - Work: manifest + blobs + checksum + staging import；修正 added/updated/skipped；v1 明确降级。
  - Verify: `pnpm test -- artifact-bundle && pnpm test:e2e --grep "artifact restore"`；全新浏览器 3/3 图片一致
  - Definition of done: 完整性先验、原子导入、准确统计、损坏包不产生半成品
  - Commit: `feat(backup): add complete versioned artifact bundles`
  - Evidence: pending

- [ ] T-207 收敛 Android 产品状态并通过构建
  - Covers: FR-005, FR-006, AC-005, AC-007
  - Depends on: T-204, T-205
  - Evidence source: environment
  - Files: `lekao-android/**` 与 Android contract fixture
  - Work: 去除核心入口 Placeholder/mock 冒充；接入真实 repository 或明确 disabled；使 JDK/SDK 验证可重复。
  - Verify: `.\gradlew.bat testDebugUnitTest lintDebug assembleDebug`；全部 exit 0
  - Definition of done: release UI 不展示假数据，核心 API 全与契约匹配
  - Commit: `fix(android): align shipped screens with real platform capabilities`
  - Evidence: pending

- [ ] T-208 更新架构真值并执行最终门禁
  - Covers: NFR-001, NFR-005, AC-007
  - Depends on: T-202, T-203, T-204, T-205, T-206, T-207
  - Evidence source: automated
  - Files: current architecture、ADR、generated schema inventory、CI
  - Work: 修正文档表名/阶段，记录 API/Artifact/兼容决策；运行全套命令。
  - Verify: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:contract && pnpm build` 及 Android gate；全部 exit 0
  - Definition of done: 文档与代码生成清单一致，完整门禁可复跑
  - Commit: `docs(architecture): publish the current platform truth`
  - Evidence: pending
