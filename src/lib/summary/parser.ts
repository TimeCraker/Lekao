// ============================================
// Lekao · AI 输出切分器
// ============================================
// 2026-06-21 更新：新格式为单一结构化文档
// 【班级 + 学科 + 类型 + 日期】
// 1⃣ 授课内容 / 2⃣ 学习要求 / 3⃣ 作业反馈
//
// 整段输出直接作为 summary 展示

export type ParsedOutput = {
  /** 整个文档（新格式）或 10 条建议段（旧格式兼容） */
  feedback: string;
  /** 整个文档（新格式）或 一段小结（旧格式兼容） */
  summary: string;
  /** 第一段标题 */
  feedbackTitle: string;
  /** 第二段标题 */
  summaryTitle: string;
};

/**
 * 解析 AI 输出
 *
 * @param rawText - 完整流式累积文本
 * @param _template - 模板类型（保留参数签名，不再按 marker 切分）
 */
export function parseSummaryOutput(
  rawText: string,
  _template: "summary" | "feedback",
): ParsedOutput {
  const text = rawText.trim();
  if (!text) {
    return { feedback: "", summary: "", feedbackTitle: "", summaryTitle: "" };
  }

  // 新格式：整段作为 summary 输出
  // 提取第一行作为标题（【...】）
  const firstLine = text.split("\n")[0] || "";
  const titleMatch = firstLine.match(/^【(.+?)】/);
  const summaryTitle = titleMatch ? titleMatch[1] : "生成结果";

  return {
    feedback: "",
    summary: text,
    feedbackTitle: "",
    summaryTitle,
  };
}

/**
 * 去除 Markdown 符号（防御性）
 */
export function stripMarkdown(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/^\s*(\d+[\.\)、]|[*\-+])\s+/, ""))
    .join("\n")
    .trim();
}
