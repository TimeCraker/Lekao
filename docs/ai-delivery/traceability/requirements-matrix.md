---
id: TRACE-LEKAO-FOUNDATION-V3
title: LeKao 需求、验收、任务与命令追踪矩阵
kind: traceability
version: 2
status: READY
baseline_sha: 4a5780e92215fbe01db87b5e1827465135253efa
related: PRD-LEKAO-FOUNDATION-V3, S01-PRODUCT-INTEGRITY, S02-PLATFORM-FOUNDATION, S03-ADVANCED-EXPERIENCE, S04-OFFICE-FREE-DELIVERY
handoff_ref: N/A
observed_handoff_revision: N/A
---

# LeKao 需求、验收、任务与命令追踪矩阵

## 功能需求

| 需求                          | AC                                     | Task                       | 验证入口                                                                                |
| ----------------------------- | -------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------- |
| FR-001 产品能力真值           | AC-003、AC-010、AC-012                 | T-004、T-007               | `pnpm test:e2e --grep "auth responsive"`; `pnpm test -- capability-copy error-contract` |
| FR-002 可靠计费               | AC-001、AC-012                         | T-002                      | `pnpm test -- coin-ledger error-contract`                                               |
| FR-003 真实账户操作           | AC-002、AC-012                         | T-003                      | `pnpm test -- profile && pnpm test:e2e --grep "profile persists"`                       |
| FR-004 响应式导航             | AC-004                                 | T-005                      | `pnpm test:e2e --grep "mobile dashboard navigation"`                                    |
| FR-005 可执行 API 契约        | AC-005、AC-012                         | T-203、T-204、T-207        | `pnpm test:contract`; `\.\gradlew.bat testDebugUnitTest`                                |
| FR-006 统一教学资产           | AC-006、AC-011                         | T-205、T-206、T-207        | `pnpm test -- artifact-repository artifact-bundle storage-failure`                      |
| FR-007 完整备份与恢复         | AC-006                                 | T-206                      | `pnpm test -- artifact-bundle && pnpm test:e2e --grep "artifact restore"`               |
| FR-008 高级品牌与内容系统     | AC-008、AC-010、AC-014                 | T-301、T-302、T-303、T-307 | `pnpm test -- capability-copy design-tokens design-governance`; responsive visual E2E   |
| FR-009 任务型工作台           | AC-008、AC-013                         | T-304、T-305               | `pnpm test:e2e --grep "workspace shell                                                  | dashboard task priority | core workflow"` |
| FR-010 可观察失败与恢复       | AC-001、AC-002、AC-005、AC-011、AC-012 | T-002、T-003、T-203、T-205 | error-contract、profile、storage-failure tests                                          |
| FR-011 任务连续与首次引导     | AC-013                                 | T-304                      | `pnpm test:e2e --grep "dashboard task priority"`                                        |
| FR-012 奖励功能不破坏核心任务 | AC-013、AC-015                         | T-006、T-304               | `pnpm test -- checkin version-metadata`; dashboard priority E2E                         |
| FR-013 真实产物预览           | AC-016、AC-018                         | T-401、T-403               | `pnpm test -- deliver-render`; 真实页面预览与导出件对照                                 |
| FR-014 就地编辑与重导出       | AC-017、AC-018                         | T-402、T-403               | `pnpm test -- deliver-editable mistake-export-parity weekend-export-style-parity`       |
| FR-015 无 Office 交付         | AC-020                                 | T-405、T-406               | `pnpm test -- deliver-print`; Chrome 打印预览 + 390×844 走查                            |
| FR-016 AI 产出落进自有表格    | AC-019                                 | T-404                      | `pnpm test -- excel-sink`; 脱敏反馈表样本走查                                           |

## 非功能需求

| 需求                   | AC                             | Task                                     | 验证入口                                                                       |
| ---------------------- | ------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------ |
| NFR-001 质量门禁       | AC-007                         | T-201、T-208                             | `pnpm lint && pnpm typecheck && pnpm test && pnpm test:contract && pnpm build` |
| NFR-002 性能           | AC-009                         | T-303、T-306                             | `pnpm perf:audit -- --url http://127.0.0.1:3101 --runs 3`                      |
| NFR-003 可访问性       | AC-003、AC-004、AC-008         | T-004、T-005、T-302、T-303、T-304、T-306 | auth/mobile/component/a11y E2E                                                 |
| NFR-004 一致性         | AC-001、AC-005、AC-006、AC-012 | T-002、T-203、T-205、T-206               | ledger、contract、artifact tests                                               |
| NFR-005 可维护性       | AC-007、AC-008                 | T-202、T-302、T-305、T-307               | characterization tests、typecheck、visual gate                                 |
| NFR-006 兼容性         | AC-005、AC-006、AC-007         | T-203、T-206、T-207                      | contract、bundle、Android gates                                                |
| NFR-007 可观测性       | AC-001、AC-006、AC-012         | T-002、T-205                             | ledger/error/artifact event assertions                                         |
| NFR-008 内容与设计治理 | AC-010、AC-013、AC-014         | T-006、T-301、T-302、T-304               | capability-copy、design-governance、release-metadata、priority E2E             |
| NFR-009 产物不出浏览器 | AC-020                         | T-404、T-405、T-406                      | DevTools Network 面板走查 + `pnpm test -- excel-sink`                          |
| NFR-010 客户端依赖预算 | AC-016、AC-020                 | T-401、T-406                             | `pnpm build` 首屏 JS 前后数字比对                                              |

## 完整性规则

- 表中命令若由前置任务创建，必须按 Tasks 的依赖顺序执行；当前仓库没有这些脚本不代表可跳过。
- 脚本入口归属（2026-10-02 实测）：`pnpm test:e2e` 由 S01 T-001 建立（Work 含「配置 Vitest 与 Playwright」），`pnpm test:contract` 由 S02 T-203 建立（Files 含 contract scripts/CI config），`pnpm perf:audit` 由 S03 T-306 建立（Files 含 bundle/perf scripts）。在这些任务落地前，引用它们的 AC 只能标记为未验证，不得用人工截图或 AI 自评顶替。
- S04 的自动化验证只覆盖 `src/lib/deliver/**` 的 vitest 断言；DOM 渲染、打印分页、移动视口与 Office/WPS 对照属真实页面走查证据。
- 自动门禁通过不替代 S03 人工品牌/内容评审；人工证据缺失时 AC-010/014 保持 BLOCKED。
- Android、真实 AI provider、生产性能和人工评审属于环境/外部证据，不得使用 mock 或 AI 自评替代。
- 任何新增 FR/NFR 必须在同一 planning revision 中补齐 AC、Task 和验证入口。
