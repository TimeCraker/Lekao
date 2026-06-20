/**
 * 错题号去重 + 排序 (T17)
 * 来源：STAGE spec §1.3 + §2 Step 4
 *
 * 关键决策（PRD §8.3.2）：
 * - 大题粒度去重：不拆括号内小题
 * - 字符串原样保留：'针2' / '全对' / '未交' 不规范化
 * - 数字优先排序：1, 2, 7, 10（不是字母序 1, 10, 2）
 * - 堂测 / 作业分别去重（不合并）
 */

import type { DedupedQNumber, StudentMistakes } from "./types";

/**
 * 自然排序比较函数（数字优先于字母）
 *
 * 例：
 * - "1" < "2" < "7" < "10"
 * - "1（2 8）" < "2（7）"
 * - "全对" 排到末尾（无数字）
 * - "针2" 排在数字后
 */
export function naturalCompare(a: string, b: string): number {
  // 把字符串切成"数字段 / 文本段"
  const aTokens = a.match(/\d+|\D+/g) ?? [a];
  const bTokens = b.match(/\d+|\D+/g) ?? [b];

  const len = Math.min(aTokens.length, bTokens.length);
  for (let i = 0; i < len; i++) {
    const aTok = aTokens[i];
    const bTok = bTokens[i];

    const aIsNum = /^\d+$/.test(aTok);
    const bIsNum = /^\d+$/.test(bTok);

    if (aIsNum && bIsNum) {
      const diff = Number(aTok) - Number(bTok);
      if (diff !== 0) return diff;
    } else if (aIsNum && !bIsNum) {
      // 数字段先于文本段
      return -1;
    } else if (!aIsNum && bIsNum) {
      return 1;
    } else {
      // 都是文本段：普通字符串比较
      const cmp = aTok.localeCompare(bTok, "zh-CN");
      if (cmp !== 0) return cmp;
    }
  }

  return aTokens.length - bTokens.length;
}

/**
 * 提取一个字符串首部数字（用于排序 fallback）
 */
function leadingNumber(s: string): number {
  const m = s.match(/\d+/);
  return m ? Number(m[0]) : Infinity;
}

/**
 * 对题号列表去重 + 统计错的人数 + 排序
 *
 * @param students 学生错题信息（来自 parseSheet）
 * @param qType "classroom" | "homework"
 * @returns 去重后的题号数组（含计数）
 */
export function dedupQNumbers(
  students: StudentMistakes[],
  qType: "classroom" | "homework",
): DedupedQNumber[] {
  const counter = new Map<string, { count: number; allCorrect: boolean }>();

  for (const student of students) {
    const qNumbers =
      qType === "classroom" ? student.classroomQNumbers : student.homeworkQNumbers;

    for (const q of qNumbers) {
      const existing = counter.get(q);
      if (existing) {
        existing.count++;
      } else {
        counter.set(q, { count: 1, allCorrect: q === "全对" });
      }
    }
  }

  // 转数组 + 自然排序
  const result: DedupedQNumber[] = Array.from(counter.entries()).map(
    ([qNumber, info]) => ({
      qNumber,
      errorCount: info.count,
      isAllCorrect: info.allCorrect,
    }),
  );

  // 排序规则：
  // 1. "全对" 排到末尾（特殊）
  // 2. 其余按自然排序（数字优先）
  result.sort((a, b) => {
    if (a.qNumber === "全对" && b.qNumber !== "全对") return 1;
    if (b.qNumber === "全对" && a.qNumber !== "全对") return -1;
    if (a.qNumber === "全对" && b.qNumber === "全对") return 0;

    // 主排序：自然排序
    const cmp = naturalCompare(a.qNumber, b.qNumber);
    if (cmp !== 0) return cmp;

    // 副排序：错的人数倒序
    return b.errorCount - a.errorCount;
  });

  return result;
}

/**
 * 快速计算某个题号在多少学生中出现过（用于 UI 显示）
 */
export function getErrorCount(
  students: StudentMistakes[],
  qNumber: string,
  qType: "classroom" | "homework",
): number {
  return students.filter((s) =>
    qType === "classroom"
      ? s.classroomQNumbers.includes(qNumber)
      : s.homeworkQNumbers.includes(qNumber),
  ).length;
}

/**
 * 统计全班错题概况（用于顶部摘要）
 */
export function summarizeCollection(students: StudentMistakes[]): {
  totalStudents: number;
  allCorrectCount: number;
  classroomQCount: number;
  homeworkQCount: number;
} {
  const classroomSet = new Set<string>();
  const homeworkSet = new Set<string>();

  for (const s of students) {
    for (const q of s.classroomQNumbers) classroomSet.add(q);
    for (const q of s.homeworkQNumbers) homeworkSet.add(q);
  }

  return {
    totalStudents: students.length,
    allCorrectCount: students.filter((s) => s.isAllCorrect).length,
    classroomQCount: classroomSet.size,
    homeworkQCount: homeworkSet.size,
  };
}