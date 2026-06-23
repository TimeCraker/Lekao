/**
 * 错题集 section 累积存储（T22 支撑）
 *
 * 设计：每次生成 docx 时把当天 section 存到 IndexedDB
 * 下次生成时读取所有历史 sections，合并到完整 docx
 * 用户手工编辑的 docx 不会被解析（保持"不解析用户编辑"的简化原则）
 */

import { openDB, type IDBPDatabase } from "idb";

export interface SavedSection {
  id: string; // `${sheetName}:${studentName}:${date}`
  studentName: string;
  sheetName: string; // 学科
  date: string;
  classroomSlotsJson: string; // 序列化（不含图片 Blob）
  homeworkSlotsJson: string;
  imageIds: string[]; // 关联的图片 ID（在另一个 IndexedDB 库）
  /** v2: 该学生当天的堂测错题号列表 —— 用于 docx 构建时过滤（防止旧 section 含全班数据导致文档膨胀） */
  classroomQNumbers?: string[];
  /** v2: 该学生当天的作业错题号列表 */
  homeworkQNumbers?: string[];
  /** 结构版本号：1=带 QNumbers，undefined=旧版（不含 QNumbers，全量 slots） */
  sectionVersion?: 1;
  createdAt: number;
}

const SECTION_DB = "lekao-mistake-sections";
const SECTION_STORE = "sections";
const SECTION_VERSION = 1;

interface SectionSchema {
  sections: {
    key: string;
    value: SavedSection;
    indexes: { "by-student-sheet": [string, string] };
  };
}

let dbPromise: Promise<IDBPDatabase<SectionSchema>> | null = null;

function getDB(): Promise<IDBPDatabase<SectionSchema>> {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB 不可用");
  }
  if (!dbPromise) {
    dbPromise = openDB<SectionSchema>(SECTION_DB, SECTION_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(SECTION_STORE)) {
          const store = db.createObjectStore(SECTION_STORE, { keyPath: "id" });
          store.createIndex("by-student-sheet", ["sheetName", "studentName"]);
        }
      },
    });
  }
  return dbPromise;
}

/**
 * 保存今天的 section（学生 + 学科 + 日期 唯一）
 */
export async function saveSection(section: SavedSection): Promise<void> {
  const db = await getDB();
  await db.put(SECTION_STORE, section);
}

/**
 * 读取某学生某学科的所有历史 sections
 */
export async function loadSections(
  sheetName: string,
  studentName: string,
): Promise<SavedSection[]> {
  const db = await getDB();
  const tx = db.transaction(SECTION_STORE, "readonly");
  const idx = tx.store.index("by-student-sheet");
  const results = await idx.getAll([sheetName, studentName]);
  // 按日期升序
  results.sort((a, b) => a.date.localeCompare(b.date));
  return results;
}

/**
 * 检查某学生某学科某日期是否已有 section
 */
export async function hasSection(
  sheetName: string,
  studentName: string,
  date: string,
): Promise<boolean> {
  const db = await getDB();
  const id = `${sheetName}:${studentName}:${date}`;
  const result = await db.get(SECTION_STORE, id);
  return !!result;
}

/**
 * 删除某学生某学科的所有 sections（清理时用）
 */
export async function clearStudentSections(
  sheetName: string,
  studentName: string,
): Promise<void> {
  const sections = await loadSections(sheetName, studentName);
  const db = await getDB();
  const tx = db.transaction(SECTION_STORE, "readwrite");
  for (const s of sections) {
    await tx.store.delete(s.id);
  }
  await tx.done;
}

/**
 * 删除某学生某学科某日期的 section
 */
export async function deleteSection(
  sheetName: string,
  studentName: string,
  date: string,
): Promise<void> {
  const db = await getDB();
  const id = `${sheetName}:${studentName}:${date}`;
  await db.delete(SECTION_STORE, id);
}

/**
 * v2 新增：加载所有 sections（用于历史管理/跨设备导入）
 *
 * 可选 filter：
 * - sheetName：按学科过滤
 * - date：按日期过滤
 *
 * 不传 filter 返回全部。返回按 date 升序。
 */
export async function loadAllSections(
  filter?: { sheetName?: string; date?: string },
): Promise<SavedSection[]> {
  const db = await getDB();
  const all = await db.getAll(SECTION_STORE);
  const filtered = !filter
    ? all
    : all.filter(
        (s) =>
          (!filter.sheetName || s.sheetName === filter.sheetName) &&
          (!filter.date || s.date === filter.date),
      );
  return filtered.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * v2 新增：删除某学科某日期的所有 section（按日期批量删）
 * 返回删除的条数。
 */
export async function deleteSectionByDate(
  sheetName: string,
  date: string,
): Promise<number> {
  const all = await loadAllSections({ sheetName, date });
  if (all.length === 0) return 0;
  const db = await getDB();
  const tx = db.transaction(SECTION_STORE, "readwrite");
  for (const s of all) {
    await tx.store.delete(s.id);
  }
  await tx.done;
  return all.length;
}

/**
 * v3 新增（阶段 3 预备）：清空所有 sections（管理页"清空历史"用）
 */
export async function clearAllSections(): Promise<void> {
  const db = await getDB();
  await db.clear(SECTION_STORE);
}