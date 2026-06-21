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