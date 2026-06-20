// ============================================
// Lekao · AI 输出切分器（feedback / summary 两段）
// ============================================
// 按 PRD §4.1 + BRD §4.3 + 用户 2026-06-20 决策：
// - 模板输出 = feedback 段（10 条建议）+ summary 段（一段小结）
// - 段标题：本次XX课堂反馈/学习反馈（XX专题）/ 本次XX课堂总体小结/总体反馈
// - 前端按"分流复制"按钮切分 → 贴 Excel / 发家长群

export type ParsedOutput = {
  /** 第一段：10 条建议（每条独占一行，无 Markdown 符号） */
  feedback: string;
  /** 第二段：一段小结（紧凑段落 + 三段式 + 催交尾注） */
  summary: string;
  /** 第一段标题（用于展示） */
  feedbackTitle: string;
  /** 第二段标题（用于展示） */
  summaryTitle: string;
};

/**
 * 解析 AI 输出，按 marker 切分两段
 *
 * @param rawText - 完整流式累积文本（包含两段）
 * @param template - 'summary' (小结) | 'feedback' (反馈)
 */
export function parseSummaryOutput(
  rawText: string,
  template: "summary" | "feedback",
): ParsedOutput {
  if (!rawText.trim()) {
    return {
      feedback: "",
      summary: "",
      feedbackTitle: "",
      summaryTitle: "",
    };
  }

  // summary 模板：feedback 段 = "本次XX课堂反馈（XX专题）"，summary 段 = "本次XX课堂总体小结"
  // feedback 模板：feedback 段 = "本次XX学习反馈（XX专题）"，summary 段 = "本次XX总体反馈"
  const summaryMarker =
    template === "summary" ? "课堂总体小结" : "总体反馈";

  const lines = rawText.split("\n");
  const summaryStartIdx = lines.findIndex((line) =>
    line.includes(summaryMarker),
  );

  if (summaryStartIdx === -1) {
    // 没找到 marker：把整段作为 feedback
    return {
      feedback: rawText.trim(),
      summary: "",
      feedbackTitle: extractTitle(lines[0] || "") || "反馈",
      summaryTitle: "",
    };
  }

  // 提取两段标题
  const feedbackTitle = extractTitle(lines[0] || "");
  const summaryTitle = extractTitle(lines[summaryStartIdx] || "");

  const feedback = lines.slice(0, summaryStartIdx).join("\n").trim();
  const summary = lines.slice(summaryStartIdx).join("\n").trim();

  return {
    feedback,
    summary,
    feedbackTitle,
    summaryTitle,
  };
}

/**
 * 提取段标题（去掉"本次XX"前缀简化展示）
 */
function extractTitle(line: string): string {
  // 匹配 "本次XX反馈（XX专题）" / "本次XX总体小结"
  const m = line.match(/^本次(.+?)(?:反馈|总体小结|总体反馈)(?:（(.+?)）)?$/);
  if (m) {
    const type = m[1];
    const topic = m[2];
    if (topic) return `${type}（${topic}）`;
    return type;
  }
  return line.trim();
}

/**
 * 去除 Markdown 符号（防御性 · 万一 AI 输出有）
 *
 * 处理：
 * - 移除每行开头的数字+点（如 "1. "）
 * - 移除 Markdown 列表符号（* - +）
 * - 保留换行
 */
export function stripMarkdown(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/^\s*(\d+[\.\)、]|[*\-+])\s+/, ""))
    .join("\n")
    .trim();
}