---
contract_version: 1
id: S02-PLATFORM-FOUNDATION-IMPLEMENTATION-PROMPT
title: S02 平台基础实现提示词
kind: implementation
version: 2
status: BLOCKED
baseline_sha: 4a5780e92215fbe01db87b5e1827465135253efa
related: PRD at docs/ai-delivery/prd/lekao-foundation-v3.prd.md; Spec at docs/ai-delivery/stages/S02-platform-foundation.spec.md; Tasks at docs/ai-delivery/tasks/S02-platform-foundation.tasks.md
handoff_ref: docs/ai-delivery/handoffs/S02-platform-foundation.md
observed_handoff_revision: 3
run_id: lekao-s02-implementer-01
parent_run_id: plan-20260801-lekao-s02-v2
authority: non-final
session_id: UNAVAILABLE
independence: N/A
repo: C:\Users\TimeCraker\Desktop\my_workspace\lekao
branch: main
root_contract_sha: RESOLVE_AT_START
contract_sha: RESOLVE_AT_START
implementation_base_sha: RESOLVE_AT_START
implementation_head_sha: N/A
workspace: source
worktree_path: N/A
shell: powershell
source_dirty_manifest: capture before edits
evidence_manifest: none
dispatch_manifest_path: N/A
artifact_root: C:\Users\TimeCraker\Desktop\my_workspace\.ai-delivery-artifacts\lekao\lekao-s02-implementer-01
allowed_dispatch_changes: this prompt and Current Handoff only
inputs: resolve PRD/Spec/Tasks/S01 acceptance git blob ids at start
output: C:\Users\TimeCraker\Desktop\my_workspace\.ai-delivery-artifacts\lekao\lekao-s02-implementer-01\implementation-receipt.md
---

# 身份与目标

你是 Implementer，不是 Planner、checker 或 Final judge。仅在 S01 SEALED 且 S02 Handoff READY 后实施 S02；否则立即 BLOCKED。不得提前重做 S03 UI。

## 权威输入

用户当前指令 > 仓库规则 > S02 Spec > S02 Tasks > PRD > 追踪矩阵 > 实施偏好。S01 SEALED 行为是不可破坏依赖。冲突返回 `SPEC_CHANGE_REQUEST`。本轮安全工作明确不在范围内。

## Git 与范围

修改前执行 `git status --short`、`git branch --show-current`、`git rev-parse HEAD`，验证 HEAD 为独立 S02 planning contract，并记录 S01 acceptance SHA。保留用户 dirty state。范围严格按 Spec §5；禁止 reset、覆盖、删除失败测试、无检查 `git add -A` 和 push。

## 逐 Task 协议

按依赖逐项：先红灯验证，再实现，运行 Verify，DoD 通过才勾选并形成一个逻辑提交。前置阻塞时只能继续无依赖任务。Evidence 与最终 Receipt 必须记录 Task→SHA、命令/退出码和原始证据。

## 外部证据

JDK/Android SDK/模拟器由环境 owner 提供；缺失时 T-207 和依赖它的 T-208 保持未完成。云二进制同步不在本 Stage 范围内，不得自行采购对象存储或扩大范围。真实外部结果不能用 mock 代替。

## 完成与回执

向 metadata 指定仓库外路径写唯一 Implementation Receipt，字段使用 `READY_FOR_CHECK | PARTIAL | BLOCKED | SPEC_CHANGE_REQUEST`，包含全部绑定 SHA、handoff revision、dirty state、Task→SHA、命令退出码、证据、范围偏差和规格变更。不得修改 Handoff 或宣称最终 PASS。
