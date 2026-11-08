---
id: S02-PLATFORM-FOUNDATION
title: S02 工程与跨端平台基础
kind: stage-spec
version: 3
status: READY
baseline_sha: 4a5780e92215fbe01db87b5e1827465135253efa
related: PRD-LEKAO-FOUNDATION-V3, TASKS-S02-PLATFORM-FOUNDATION
handoff_ref: ../handoffs/S02-platform-foundation.md
observed_handoff_revision: 3
---

# S02 工程与跨端平台基础

## 1. 目标与非目标

目标：建立可信绿色质量门禁、可执行 API 真值和统一教学 Artifact 模型，使 Web 与 Android 共享同一行为契约，并能完整备份/恢复。

覆盖：FR-005/006/007/010，NFR-001/004/005/006/007，AC-005/006/007/011/012。

前置：S01 必须 SEALED，计费/error envelope 作为本 Stage 不可破坏行为。

非目标：不做全站视觉重设计；不新增支付；不强制所有旧本地数据上传；不处理安全专项。

## 2. 当前代码事实

- Web 有 31 条 route，但 Android `LekaoApi.kt` 声明多个不存在或路径不一致的接口。
- Android Ideas 屏仍使用 `PlaceholderScreen`，Dashboard 图表含 mock 数据，FCM 设置含 TODO。
- Web AI 历史、错题 section、图片、周末草稿分别落 IndexedDB/localStorage；Android 使用 Room 并尝试调用不存在的 mistake API。
- `history.json` 仅携带图片引用，不携带 Blob；merge 导入统计把新增计为 updated。
- lint 已于 2026-10 清零并转为 CI 硬门槛（`ci.yml` 不再 `continue-on-error`）；`lint`/`test`/`typecheck` 脚本存在，但仍无 `test:contract` 与 `test:e2e`（前者由本 Stage T-203 建立，后者由 S01 T-001 建立）。
- 多个核心文件 500–1280 行，把解析、状态、存储、导出与视图耦合。
- `ARCHITECTURE.md` 的表名与 Prisma 不一致。

## 3. 方案概览与数据流

### 3.1 API 单一真值

新增 `contracts/openapi/lekao-v1.yaml`（OpenAPI 3.1）和共享 JSON Schema。移动 API 固定 `/api/v1/**`；既有 Web 路由可作为适配器保留一段兼容期。契约描述 auth、profile、generation、artifact、ideas、admin 和 device token；每个 endpoint 必须有 operationId、输入输出、错误 envelope、鉴权、幂等性和示例。

Android DTO 通过生成任务或 schema conformance test 绑定契约。禁止在 Kotlin 注释中单独定义 endpoint 数量/形状。

### 3.2 Artifact 聚合

```text
Artifact
  id, ownerId, type, title, subject, status, schemaVersion, revision
  ├─ ArtifactRevision (structured payload + createdAt + clientMutationId)
  ├─ ArtifactAsset (blob key, mime, size, sha256)
  └─ SyncCursor / conflict metadata
```

服务端保存可同步的结构化内容和资产元数据；对象存储未就绪时，可先支持完整本地 Bundle 并把云端 asset 标为外部依赖，但 API/状态不得伪装为 synced。Web/Android 使用 repository adapter，UI 不直接调用 IndexedDB/Room/API。

### 3.3 质量与模块边界

建立四层门禁：lint → typecheck → unit/contract → build，另有 E2E smoke。先用 characterization tests 固定解析/导出行为，再按 domain/state/adapter/view 拆分超大组件。不要用 ESLint disable 批量消音 React 19 错误。

## 4. 实现契约

### UI 状态与交互

- 所有可持久化工作显示 `仅本机 | 保存中 | 已同步 | 同步失败 | 冲突`。
- localStorage/IndexedDB/Room 写入失败必须展示重试与导出兜底。
- Android 未实现能力必须隐藏或显示 disabled + 明确状态，禁止跳到 PlaceholderScreen 冒充完成。

### API

- Base：`/api/v1`；错误 envelope 继承 S01。
- Artifact：list/create/get/update/delete/bundle export/import；update 要求 `If-Match` revision 或 `clientMutationId`，冲突返回 409。
- Auth：Android 所需登录、me、signout 的实际方案必须与 NextAuth cookie 兼容；若某旧接口不保留，Android 同步改用契约指定路径。
- Admin：路径只能以 OpenAPI 为准；禁止同时维护 `coin-adjust` 和 `tcoin/adjust` 两套无适配说明的路径。
- 分页统一 `{items,page,pageSize,total,nextCursor}`，禁止每个 endpoint 自定义 `list/logs/ideas`。

### 数据模型、迁移与兼容性

- 新表不修改共享 `users` 结构；通过 `ownerId` 引用既有用户。
- Artifact `id` 使用跨端稳定 UUID；revision 单调递增；asset sha256 唯一性与 owner 访问边界独立。
- history v1 导入器保留，只能标为 metadata-only，并向用户报告 missing assets；新 bundle schema version=2。
- migration 含 backfill strategy、dry-run 和 rollback SQL/Prisma 步骤；旧本地数据不自动删除。

### 身份、权限、安全和隐私

安全专项 N/A；保持现有 session 认证。Artifact API 只返回当前 owner 数据；教学原文/图片不进入结构化日志。

### 错误、超时、重试与降级

- 同步采用指数退避和有界重试；永久校验错误不自动重试。
- 冲突不静默 last-write-wins；至少保留本地/远端副本与时间，允许用户选择。
- Bundle 导入先全量校验 checksum/schema/空间，再开始写；失败默认原子回滚。

### 日志、指标与可观测性

事件：contract mismatch、artifact create/update/sync/conflict、bundle export/import；包含版本、数量、字节、耗时和错误码。

### 并发、事务、缓存和一致性

Artifact revision 在事务内 compare-and-swap；相同 clientMutationId 幂等。Bundle import 使用 staging，全部验证后切换为 committed。

## 5. 允许与禁止范围

允许：`contracts/**`、`scripts/contract/**`、`package.json`/lint/test/CI 配置、`prisma` 独立 LeKao 模型、`src/app/api/v1/**`、artifact/repository 模块、旧本地存储适配器、Android API/data/domain/UI 中与契约收敛相关文件、超大工作流的行为保持重构、架构文档与测试。

禁止：营销页视觉重做、支付、共享 users 表迁移、无兼容方案删除旧 route、扩大到其他仓库、安全专项。

## 6. Task 顺序与依赖

T-201 为全部前置；T-202 与 T-203 可并行；T-204 依赖 T-203；T-205 依赖 T-201；T-206 依赖 T-205；T-207 依赖 T-203/204/205；T-208 依赖全部。

## 7. 验证矩阵

| AC      | 层级              | 命令/方法                                                                      | 预期                                                   | required | final_judge |
| ------- | ----------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------ | -------- | ----------- |
| AC-005  | contract          | `pnpm test:contract`                                                           | OpenAPI lint、route coverage、Android conformance 通过 | yes      | rerun       |
| AC-006  | integration + E2E | `pnpm test -- artifact-bundle && pnpm test:e2e --grep "artifact restore"`      | 新浏览器恢复 3/3 图片且 checksum 一致                  | yes      | rerun       |
| AC-007  | full gate         | `pnpm lint && pnpm typecheck && pnpm test && pnpm test:contract && pnpm build` | 全部 exit 0，无基线忽略                                | yes      | rerun       |
| AC-011  | E2E               | `pnpm test:e2e --grep "storage failure"`                                       | 存储受限时可见失败且可重试                             | yes      | rerun       |
| AC-012  | contract          | `pnpm test:contract -- --grep error-envelope`                                  | 核心失败 schema 一致                                   | yes      | rerun       |
| Android | unit/build        | `.\gradlew.bat testDebugUnitTest lintDebug assembleDebug`                      | 全部 exit 0                                            | yes      | rerun       |

## 8. 部署、回滚和数据恢复

先上线兼容 API 和新表，再发布 Web，最后发布 Android。旧 API 至少保留一个已发布 Android 版本窗口并记录调用量；归零后才删除。Artifact migration 先影子写、校验一致性，再切读路径。回滚时停止新写入、切回旧适配器，保留新表与 bundle，不删除用户本地数据。

## 9. 风险、假设和未决问题

- BLOCKER：S01 尚未 SEALED；owner：S01 Final judge。
- Android 验证需要 JDK/SDK/模拟器；owner：环境 owner，最迟 T-207 前提供。
- 本 Stage 已定只交付完整本地 Bundle + 服务端 metadata/同步状态；云端图片对象存储与二进制同步明确为后续非目标，因此不阻塞 S02。
- 共享 users 表变更不在范围内。
