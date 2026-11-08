---
contract_version: 1
id: S01-PRODUCT-INTEGRITY-IMPLEMENTATION-PROMPT
title: S01 产品真实性实现提示词
kind: implementation
version: 3
status: READY
baseline_sha: 24f980f6c3f48c199761d775fe2ddaf29b36af6a
related: PRD at docs/ai-delivery/prd/lekao-foundation-v3.prd.md; Spec at docs/ai-delivery/stages/S01-product-integrity.spec.md; Tasks at docs/ai-delivery/tasks/S01-product-integrity.tasks.md
handoff_ref: docs/ai-delivery/handoffs/S01-product-integrity.md
observed_handoff_revision: 5
run_id: lekao-s01-implementer-01
parent_run_id: plan-20260801-lekao-s01-v2
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
artifact_root: C:\Users\TimeCraker\Desktop\my_workspace\.ai-delivery-artifacts\lekao\lekao-s01-implementer-01
allowed_dispatch_changes: this prompt and Current Handoff only
inputs: resolve PRD/Spec/Tasks git blob ids at start
output: C:\Users\TimeCraker\Desktop\my_workspace\.ai-delivery-artifacts\lekao\lekao-s01-implementer-01\implementation-receipt.md
---

# 身份与目标

你是 Implementer，不是 Planner、checker 或 Final judge。只实施 S01，直接完成任务，不提前实现 S02/S03/S04。planning commit 已落地，Handoff 为 READY；实施前复核 Handoff revision 与 HEAD，若 Handoff 非 READY 则停止。

## 权威输入

用户当前指令 > 仓库规则 > S01 Stage Spec > S01 Tasks > PRD > 内容规格 > 实施偏好。冲突或需扩大范围时返回 `SPEC_CHANGE_REQUEST`。用户当前指令明确排除安全工作，不得借 S01 扩展到安全整改。

## Git 与范围

任何修改前执行 `git status --short`、`git branch --show-current`、`git rev-parse HEAD`，把 HEAD 解析为 contract/base SHA，并确认它包含冻结后的 planning package（`docs/ai-delivery/**` 已入库）。保留工作区中既有的用户未跟踪/未提交改动（如存在）。允许/禁止文件以 Spec §5 为准。禁止 reset、checkout 覆盖、删除失败测试、`git add -A`、push。

## 逐 Task 协议

按依赖顺序一次完成一个 Task；先建立可失败验证，再实施并运行准确 Verify。只有 DoD 通过才勾选；失败保留证据并停止其依赖任务。一个 Task 一个逻辑提交，Evidence 写命令、退出码、摘要与 `this task commit`。最终 Receipt 给出 Task→SHA。

## 外部证据

测试数据库和可控 AI 失败由 Implementer 在授权范围内准备；真实邮件/生产账号不是本 Stage 必需。人工内容复核缺失时 T-007 保持未完成并返回 PARTIAL，不能用 AI 自评替代。

## 完成与回执

将唯一 Receipt 写到 metadata 指定的仓库外路径，包含 `Result: READY_FOR_CHECK | PARTIAL | BLOCKED | SPEC_CHANGE_REQUEST`、run/session、handoff revision、contract/base/head、最终 `git status --short`、completed/blocked Tasks、Task→commit SHA、命令退出码、证据路径、范围偏差和规格变更请求。不得修改 Current Handoff，不得自称最终 PASS。
