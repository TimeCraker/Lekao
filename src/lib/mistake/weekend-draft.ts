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

const STORAGE_PREFIX = "weekend:";

/** 构造 localStorage key */
function draftKey(fileHash: string, sheetName: string): string {
  return `${STORAGE_PREFIX}${fileHash}:${sheetName}`;
}

/** 保存草稿（按 Sheet） */
export function saveWeekendDraft(draft: WeekendDraft): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(draftKey(draft.fileHash, draft.sheetName), JSON.stringify(draft));
  } catch (e) {
    // localStorage 满或禁用 → 静默失败
    console.warn("[weekend-draft] 保存失败", e);
  }
}

/** 加载草稿 */
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
    if (parsed.fileHash !== fileHash || parsed.sheetName !== sheetName) return null;
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

/** 清空整个文件的所有 Sheet 草稿（扫描前缀） */
export function clearAllWeekendDrafts(fileHash: string): void {
  if (typeof window === "undefined") return;
  try {
    const prefix = `${STORAGE_PREFIX}${fileHash}:`;
    const keysToDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) keysToDelete.push(k);
    }
    keysToDelete.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    console.warn("[weekend-draft] 清空全部失败", e);
  }
}

/** 列出所有周末错题表草稿（调试用） */
export function listWeekendDrafts(): Array<{
  fileHash: string;
  sheetName: string;
  savedAt: number;
}> {
  if (typeof window === "undefined") return [];
  const out: Array<{ fileHash: string; sheetName: string; savedAt: number }> = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw) as WeekendDraft;
          out.push({
            fileHash: parsed.fileHash,
            sheetName: parsed.sheetName,
            savedAt: parsed.savedAt,
          });
        }
      }
    }
  } catch {
    // ignore
  }
  return out;
}