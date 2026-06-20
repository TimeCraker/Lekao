/**
 * 错题集功能 · 全部数据结构
 * 来源：docs/STAGE-mistake-collection.md §5
 *
 * 关键决策（v0.4 用户对齐）：
 * - 大题粒度：不拆括号内小题（"1（2 8）" 作为一个完整题号）
 * - 字符串原样保留：'针2' / '全对' / '未交' 不规范化
 * - 堂测 / 作业分开：两个独立池子 + Word 两个 section
 */

// 单个学生在一节课的错题信息
export interface StudentMistakes {
  rowIndex: number; // 在 Sheet 中的行号（用于追溯）
  name: string; // 姓名（必填）
  classroomQNumbers: string[]; // 堂测错题号（"1", "2", "针2", "全对"）
  homeworkQNumbers: string[]; // 作业错题号
  isAllCorrect: boolean; // 是否全对（两列都"全对"或空）
}

// 整个 Sheet 的解析结果
export interface MistakeCollection {
  sheetName: string; // "化学冲刺班"
  classroomName: string; // 从 Sheet 第 1 行抓的班级名
  date: string; // 从 Sheet 第 1 行抓的日期（ISO 格式 YYYY-MM-DD）
  students: StudentMistakes[];
  rawSheetData: unknown[][]; // 原始 Sheet 数据（用于预览）
  // 列索引信息（解析阶段确定）
  columns: {
    nameCol: number; // 姓名列
    classroomCol: number; // 堂测错题列
    homeworkCol: number; // 作业错题列
  };
}

// 去重后的题号（含计数）
export interface DedupedQNumber {
  qNumber: string; // "1" / "2" / "针2" / "1（2 8）"
  errorCount: number; // 错的人数
  isAllCorrect: boolean; // 是否这个题号都是"全对"
}

// 单个题号槽位的用户填写内容
export interface QNumberSlot {
  qNumber: string; // 对应的题号
  qType: "classroom" | "homework";
  imageBlobId?: string; // IndexedDB 中的图片 ID（不存 Blob 在 LS）
  imagePreviewUrl?: string; // 预览用 object URL（内存中临时）
  textContent?: string; // 文字描述
  isMarkedAllCorrect: boolean; // 手动标记全对
}

// 单个学生的完整 Word 数据
export interface StudentWordData {
  studentName: string;
  sheetName: string; // 学科
  date: string; // ISO 日期
  classroomSlots: QNumberSlot[];
  homeworkSlots: QNumberSlot[];
}

// IndexedDB 中存储的图片记录
export interface ImageRecord {
  id: string;
  blob: Blob;
  qNumber: string;
  qType: "classroom" | "homework";
  createdAt: number;
}

// 步骤状态机
export type MistakeStep = "upload" | "selectSheet" | "fillSlots" | "export";

// LocalStorage 草稿
export interface MistakeDraft {
  collectionId: string; // sessionStorage key (避免多 sheet 冲突)
  sheetName: string;
  date: string;
  slots: Record<string, QNumberSlot>; // key = `${qType}:${qNumber}`
  studentSelection: string[]; // 选中的学生姓名
  savedAt: number;
}