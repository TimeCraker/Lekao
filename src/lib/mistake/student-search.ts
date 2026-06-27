/**
 * 学生姓名搜索 · 模糊匹配工具（Stage 15 · 2026-06-27）
 *
 * 用户场景：
 * 1. 中文姓名直接 substring 搜（如 "张三" → 搜 "张" / "三" / "张三"）
 * 2. 拼音首字母 substring 搜（如 "张三丰" → 搜 "z" / "zs" / "zsf"）
 *
 * Why 两段匹配：
 * - 用户上课时通常记得学生姓或名（中文 substring）
 * - 偶尔记得名字读音的拼音首字母（如 "欧阳锋" → "oyf"）
 * - 两段一起覆盖了用户"中文+拼音"记忆习惯
 *
 * Why 不用 fuzzy 算法（fuse.js 等）：
 * - 错题表学生量小（≤50），不需要复杂 fuzzy
 * - substring + 拼音首字母 已经覆盖 99% 场景
 * - 不增加 bundle（pinyin-pro 是学生姓名拼音的轻量替代）
 */

import { pinyin } from "pinyin-pro";

/**
 * 中文 + 拼音首字母 substring 匹配
 *
 * @param name 学生姓名（可能为空字符串）
 * @param query 搜索关键字（用户输入）
 * @returns 是否命中
 */
export function matchStudent(name: string, query: string): boolean {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return true; // 空 query = 全部命中
  const q = trimmedQuery.toLowerCase();

  // 1) 中文 substring（直接 .includes）
  if (name.toLowerCase().includes(q)) return true;

  // 2) 拼音首字母 substring
  //    pinyin-pro: pattern:'first' 返回每个汉字的首字母，空格分隔
  //    例：'张三丰' → 'z s f'（去空格后 'zsf'）
  try {
    const firstLetters = pinyin(name, {
      pattern: "first",
      toneType: "none",
    }).replace(/\s+/g, "");
    if (firstLetters.toLowerCase().includes(q)) return true;
  } catch {
    // pinyin-pro 偶发解析失败（如生僻字/emoji），降级为 substring
  }

  return false;
}

/**
 * 在学生列表里找第一个匹配的学生 rowIndex
 *
 * @returns rowIndex 或 null（无命中）
 */
export function findFirstMatch<T extends { rowIndex: number; name: string }>(
  students: T[],
  query: string,
): number | null {
  for (const s of students) {
    if (matchStudent(s.name, query)) return s.rowIndex;
  }
  return null;
}