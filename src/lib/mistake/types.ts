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
}

// 单个题号槽位的用户填写内容
export interface QNumberSlot {
  qNumber: string; // 对应的题号
  qType: "classroom" | "homework";
  /**
   * IndexedDB 中的图片 ID（不存 Blob 在 LS）
   * 🟡 v0 旧字段：单图。新版本请用 imageBlobIds。
   * 保留以兼容旧草稿，新写入统一用 imageBlobIds。
   */
  imageBlobId?: string;
  /**
   * 最多 3 张图的 IndexedDB ID 列表（按上传顺序）
   * v2 升级（2026-06-22）：用户原话"每道题最多 3 张图，可连续上传"
   */
  imageBlobIds?: string[];
  /** 预览用 object URL（内存中临时，与 imageBlobIds 一一对应）*/
  imagePreviewUrls?: string[];
  textContent?: string; // 文字描述
  isMarkedAllCorrect: boolean; // 手动标记全对
}

/**
 * 获取槽位所有图片 ID（向后兼容旧 imageBlobId）
 * 优先返回新字段 imageBlobIds；旧字段 imageBlobId 自动作为单元素数组
 */
export function getImageIds(slot: QNumberSlot): string[] {
  if (slot.imageBlobIds && slot.imageBlobIds.length > 0) {
    return slot.imageBlobIds;
  }
  if (slot.imageBlobId) {
    return [slot.imageBlobId];
  }
  return [];
}

/**
 * 判断槽位是否有图片
 */
export function hasImages(slot: QNumberSlot): boolean {
  return getImageIds(slot).length > 0;
}

/** 每道题最多图片数（2026-06-22 用户决策）*/
export const MAX_IMAGES_PER_SLOT = 3;

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
export type MistakeStep =
  | "upload"
  | "selectSheet"
  | "confirmCover" // v2 新增：封面信息确认（班级 + 学科预筛选）
  | "fillSlots"
  | "export";

// LocalStorage 草稿
export interface MistakeDraft {
  collectionId: string; // sessionStorage key (避免多 sheet 冲突)
  sheetName: string;
  date: string;
  slots: Record<string, QNumberSlot>; // key = `${qType}:${qNumber}`
  studentSelection: string[]; // 选中的学生姓名
  savedAt: number;
}