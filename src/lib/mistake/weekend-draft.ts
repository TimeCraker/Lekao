/**
 * 周末错题反馈表 · 草稿管理（localStorage）
 * 来源：docs/stages/weekend-mistake-table-v0.md Stage 1
 *
 * 草稿策略：
 * - 按 fileHash + sheetName 独立存储（多 Sheet 不串）
 * - 保存：编辑时实时（debounce 由 workflow 控制）
 * - 恢复：上传同名/同 hash 文件时自动合并
 * - 清空：用户点"重置全部"按钮
 */

import type { WeekendDraft } from "./weekend-types";
import { WEEKEND_DRAFT_SCHEMA_VERSION } from "./weekend-types";

const STORAGE_PREFIX = "weekend:";

/** 构造 localStorage key */
function draftKey(fileHash: string, sheetName: string): string {
  return `${STORAGE_PREFIX}${fileHash}:${sheetName}`;
}

/** 保存草稿（按 Sheet · ⭐ Stage 6.7：写入 schemaVersion） */
export function saveWeekendDraft(draft: WeekendDraft): void {
  if (typeof window === "undefined") return;
  try {
    const payload: WeekendDraft = {
      ...draft,
      schemaVersion: WEEKEND_DRAFT_SCHEMA_VERSION,
    };
    localStorage.setItem(
      draftKey(draft.fileHash, draft.sheetName),
      JSON.stringify(payload),
    );
  } catch (e) {
    // localStorage 满或禁用 → 静默失败
    console.warn("[weekend-draft] 保存失败", e);
  }
}

/**
 * 加载草稿
 *
 * ⭐ Stage 6.7：schemaVersion 兼容
 * - 老草稿（无 schemaVersion 字段）视为 v0 → 忽略（按当前 schema 重新走解析）
 * - schemaVersion 不匹配 → 忽略（说明中间发生过 schema 不兼容变更）
 * - 匹配 → 返回
 */
export function loadWeekendDraft(
  fileHash: string,
  sheetName: string,
): WeekendDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(draftKey(fileHash, sheetName));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeekendDraft;
    // 简单校验
    if (parsed.fileHash !== fileHash || parsed.sheetName !== sheetName)
      return null;
    // ⭐ Stage 6.7：schema version 兼容
    if (parsed.schemaVersion !== WEEKEND_DRAFT_SCHEMA_VERSION) {
      console.info(
        `[weekend-draft] 草稿 schemaVersion=${parsed.schemaVersion ?? "v0"} 与当前 ${WEEKEND_DRAFT_SCHEMA_VERSION} 不匹配，忽略`,
      );
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** 清空单个 Sheet 草稿 */
export function clearWeekendDraft(fileHash: string, sheetName: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(draftKey(fileHash, sheetName));
  } catch (e) {
    console.warn("[weekend-draft] 清空失败", e);
  }
}
