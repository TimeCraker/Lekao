// ============================================
// Lekao · 灵感墙基础敏感词过滤 (v2.2.0)
// ============================================
// 词表覆盖：政治 + 色情 + 暴力 + 严重侮辱 + 广告引流
// 范围：基础 30-50 词（不深做 AI 识别）
// 维护：纯常量数组，后续增量添加单独 commit
//
// 用法：
//   if (containsSensitiveWords(title)) return 422;
//   const hits = findSensitiveWords(content); // 前端实时提示

/**
 * 敏感词基础词表（小写匹配）
 *
 * Why 用小写：输入文本会先 toLowerCase，避免"大小写绕过"。
 * Why 移除空格：防"中间插空格"绕过（如 f u c k）。
 */
const SENSITIVE_WORDS: readonly string[] = [
  // 政治敏感
  "法轮", "法轮功", "反动", "颠覆国家", "台独", "港独", "疆独",
  "藏独", "六四", "天安门事件", "反华",

  // 色情
  "色情", "黄片", "黄色", "裸聊", "约炮", "一夜情", "做爱", "性交",

  // 暴力 / 恐怖
  "恐怖袭击", "炸弹制作", "杀人方法", "自杀方法",

  // 严重侮辱
  "傻逼", "操你妈", "草泥马", "fuck you", "shit",

  // 广告引流
  "加微", "加微信", "私聊我", "私聊有", "代理", "代刷",
] as const;

/**
 * 检查文本是否含敏感词（大小写不敏感、忽略空格）
 */
export function containsSensitiveWords(text: string): boolean {
  if (!text) return false;
  const normalized = text.toLowerCase().replace(/\s+/g, "");
  return SENSITIVE_WORDS.some((w) => normalized.includes(w.toLowerCase()));
}

/**
 * 找出文本中所有命中的敏感词（用于前端实时提示）
 *
 * Returns: 命中的敏感词数组（去重）
 */
export function findSensitiveWords(text: string): string[] {
  if (!text) return [];
  const normalized = text.toLowerCase().replace(/\s+/g, "");
  const hits = new Set<string>();
  for (const word of SENSITIVE_WORDS) {
    if (normalized.includes(word.toLowerCase())) {
      hits.add(word);
    }
  }
  return Array.from(hits);
}

/**
 * 用于 API 层校验的快捷工具
 * - 返回 null = 通过
 * - 返回 string = 不通过的原因
 */
export function validateSensitiveWords(
  fieldName: string,
  text: string,
): string | null {
  const hits = findSensitiveWords(text);
  if (hits.length === 0) return null;
  return `${fieldName}含敏感词：${hits.join("、")}，请修改后重试`;
}