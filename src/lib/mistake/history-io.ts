/**
 * 错题集 history.json 导出/导入工具（v3 新增 · 阶段 3）
 *
 * 设计：
 * - JSON schema 带 version 字段（未来扩展）
 * - sections 是 SavedSection[] 快照（不含图片 Blob，只含 imageIds 引用）
 * - 写盘：File System Access API 优先，降级走 file-saver 下载
 * - 导入：overwrite / merge 两种模式
 */

import { saveAs } from "file-saver";
import {
  loadAllSections,
  saveSection,
  clearAllSections,
  type SavedSection,
} from "./section-store";
import { writeFile } from "./fs-access";

/** history.json schema 版本号 */
export const HISTORY_JSON_VERSION = 1;

/** 文件名（固定，便于覆盖模式）*/
export const HISTORY_JSON_FILENAME = "lekao-history.json";

export interface HistoryJson {
  version: 1;
  exportedAt: string;
  sections: SavedSection[];
}

/**
 * 导出当前 IndexedDB 所有 sections 为 HistoryJson 对象
 */
export async function exportHistoryToJson(): Promise<HistoryJson> {
  const sections = await loadAllSections();
  return {
    version: HISTORY_JSON_VERSION,
    exportedAt: new Date().toISOString(),
    sections,
  };
}

/**
 * 解析 + 校验 + 导入 history.json
 *
 * @param json 待导入的对象（未类型化）
 * @param mode "overwrite" = 先清空 IndexedDB 再 put；"merge" = 跳过已存在 id
 * @returns { added, skipped, updated } 导入统计
 */
export async function importHistoryFromJson(
  json: unknown,
  mode: "overwrite" | "merge",
): Promise<{ added: number; skipped: number; updated: number }> {
  // 校验 schema
  if (!json || typeof json !== "object") {
    throw new Error("history.json 不是有效的 JSON 对象");
  }
  const obj = json as Partial<HistoryJson>;
  if (obj.version !== HISTORY_JSON_VERSION) {
    throw new Error(
      `history.json 版本不匹配（期望 ${HISTORY_JSON_VERSION}，收到 ${obj.version ?? "未知"}）`,
    );
  }
  if (!Array.isArray(obj.sections)) {
    throw new Error("history.json 格式错误：sections 不是数组");
  }

  if (mode === "overwrite") {
    await clearAllSections();
  }

  let added = 0;
  let skipped = 0;
  let updated = 0;

  for (const sec of obj.sections) {
    // 校验每个 section 至少有 id
    if (!sec || typeof sec !== "object" || typeof sec.id !== "string") {
      skipped++;
      continue;
    }
    // merge 模式：id 已存在则跳过
    if (mode === "merge") {
      const existing = await loadAllSections();
      if (existing.some((s) => s.id === sec.id)) {
        skipped++;
        continue;
      }
    }
    await saveSection(sec);
    // 区分 added vs updated（overwrite 后所有都是 added；merge 都是 added；除非用户传空库再 merge）
    if (mode === "overwrite") {
      added++;
    } else {
      // merge 模式：saveSection 是 put，已存在会覆盖
      updated++;
    }
  }

  return { added, skipped, updated };
}

/**
 * 写入 history.json 到指定目录或触发下载
 *
 * @param dirHandle FS Access API 目录句柄（不传则走 file-saver 下载）
 * @returns { method: "fs-access" | "download", size } 写入方式 + 字节数
 */
export async function writeHistoryJson(
  dirHandle?: FileSystemDirectoryHandle,
): Promise<{ method: "fs-access" | "download"; size: number }> {
  const history = await exportHistoryToJson();
  const json = JSON.stringify(history, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const size = blob.size;

  if (dirHandle) {
    try {
      await writeFile(dirHandle, HISTORY_JSON_FILENAME, blob);
      return { method: "fs-access", size };
    } catch (e) {
      console.warn(
        "[history.json] FS Access 写入失败，降级为下载",
        e instanceof Error ? e.message : e,
      );
    }
  }
  saveAs(blob, HISTORY_JSON_FILENAME);
  return { method: "download", size };
}
