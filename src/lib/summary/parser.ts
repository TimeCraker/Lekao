// ============================================
// Lekao · AI 输出切分器
// ============================================
// 2026-06-21 更新：
// 课堂小结 -> 单一结构化文档【班级学科小结日期】
// 作业反馈 -> 按 "本次...总体小结" 标记拆分为 feedback 项 + 总体小结

export type ParsedOutput = {
  /** feedback 项（每条独立一行，贴 Excel 用） */
  feedback: string;
  /** 总体小结段落 */
  summary: string;
  /** feedback 板块标题 */
  feedbackTitle: string;
  /** 小结板块标题 */
  summaryTitle: string;
};

/**
 * 解析 AI 输出
 *
 * - summary 模板：整段作为 summary 输出（兼容旧格式）
 * - feedback 模板：按 "本次...总体小结" 标记拆分为 feedback + summary
 */
export function parseSummaryOutput(
  rawText: string,
  _template: "summary" | "feedback",
): ParsedOutput {
  const text = rawText.trim();
  if (!text) {
    return { feedback: "", summary: "", feedbackTitle: "", summaryTitle: "" };
  }

  const lines = text.split("\n");
  const firstLine = lines[0] || "";

  // feedback 模板：按 "本次...总体小结" 标记拆分
  if (_template === "feedback") {
    // 用正则匹配 "本次{学科}作业总体小结" 或 "本次{学科}堂测总体小结"
    const summaryMarkerMatch = text.match(/本次.+?(?:作业|堂测)总体小结/);
    if (summaryMarkerMatch) {
      const markerFull = summaryMarkerMatch[0];
      const markerIndex = summaryMarkerMatch.index!;
      // feedback 正文 = 第一行标题之后、标记之前的全部内容
      let feedbackBody = "";
      if (markerIndex > firstLine.length) {
        // 跨越多行：feedbackBody = 第一行之后、标记之前
        const afterTitle = text.slice(firstLine.length, markerIndex).trim();
        feedbackBody = afterTitle;
      }
      // summary = 标记行 + 标记后的内容
      const summaryBody = text.slice(markerIndex).trim();

      return {
        feedback: feedbackBody,
        summary: summaryBody,
        feedbackTitle: firstLine || "本次作业反馈",
        summaryTitle: markerFull,
      };
    }

    // 没找到标记：把第一行当标题，其余当 feedback 项
    const rest = lines.slice(1).join("\n").trim();
    return {
      feedback: rest,
      summary: "",
      feedbackTitle: firstLine || "本次作业反馈",
      summaryTitle: "",
    };
  }

  // summary 模板：整段作为 summary 输出
  const summaryTitle = firstLine.match(/^【(.+?)】/)?.[1] || "生成结果";
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
