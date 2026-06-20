// ============================================
// Lekao · AI Prompt 模板（视觉 + 文本）
// ============================================
// 用户 2026-06-20 最新意图：
// - 视觉模型读图自动判断学科 + 章节 + 提取知识点
// - 文本模型拿知识点按模板生成（不锁死 7 动词 8 鼓励语）
// - 输出 10 条建议 + 一段小结（助教贴 Excel 一列方便）
//
// 模板类型（2026-06-20 重构）：
// - "summary"：课堂小结（备课组存档风 · 专业）
// - "feedback"：堂测反馈（堂测批改风 · 具体可执行 · 给老师看）

/**
 * 视觉模型读图 prompt（Qwen3-VL-8B-Instruct）
 *
 * 输入：讲义图片（1-N 张）
 * 输出：JSON {subject, topic, keyPoints[], rawText}
 */
export const VISION_PROMPT = `你是一位资深高中教师，正在分析一份讲义图片。请仔细阅读图片内容，提取以下信息：

1. **学科**：数学、物理、化学、生物、英语、语文、地理、历史、政治中的哪一种？（必须严格从这 9 个里选一个，不要编造）
2. **章节/板块**：根据内容判断属于高中该学科的哪个板块（如数学的"平面向量/立体几何/函数与导数"，化学的"氧化还原反应/元素周期律"等）
3. **知识点**：列出 5-10 个本节课涉及的核心知识点（用简短短语，每个 ≤ 15 字）
4. **原始文字**：保留图片中的关键题目文字（如果是题目）或关键讲解内容（如果是讲义）

**输出格式**：必须严格返回 JSON 对象，不要有 Markdown 代码块标记。
{
  "subject": "学科",
  "topic": "章节/板块",
  "keyPoints": ["知识点1", "知识点2", "..."],
  "rawText": "图片中的关键文字内容"
}

如果图片内容模糊无法判断学科，subject 填 "未知"，topic 填 "未知"，keyPoints 为空数组，rawText 留空。`;

/**
 * 文本模型生成 prompt（DeepSeek V4 Flash）
 *
 * 输入：{subject, topic, keyPoints, template, feedbackCount}
 * 输出：{feedback: string, summary: string}
 *
 * 模板：
 * - "summary"：课堂小结（备课组存档风 · 专业）
 * - "feedback"：堂测反馈（堂测批改风 · 具体可执行 · 给老师看）
 */
export const TEXT_PROMPT = ({
  subject,
  topic,
  keyPoints,
  template,
  feedbackCount = 10,
}: {
  subject: string;
  topic: string;
  keyPoints: string[];
  template: "summary" | "feedback";
  feedbackCount?: number;
}) => {
  const isSummary = template === "summary";
  const audience = isSummary ? "备课组存档" : "堂测批改";
  const docType = isSummary ? "课堂小结" : "堂测反馈";
  const feedbackTerm = isSummary ? "课堂反馈" : "堂测反馈";
  const summaryTerm = isSummary ? "课堂总体小结" : "堂测总体反馈";
  const keyPointsText = keyPoints.length > 0 ? keyPoints.join("、") : "本节课内容";

  return `你是一位经验丰富的培训机构助教，正在为${audience}写${docType}。

# 本节课信息
- 学科：${subject}
- 章节/板块：${topic}
- 知识点：${keyPointsText}

# 写作要求

## 第一部分：${feedbackTerm}（${feedbackCount} 条）
围绕上述知识点，列出 ${feedbackCount} 条${isSummary ? "课堂反馈建议" : "堂测批改建议"}。
- 每条建议独占一行，不要数字序号（不要写 "1. " "2. "）
- 不要 Markdown 列表符号（不要写 "*" "-" "+"）
- 内容可以相近但不要完全重复
- 第一段以 "本次${subject}${feedbackTerm}（${topic}专题）" 开头（独占一行）

## 第二部分：${summaryTerm}
写一段紧凑的总结文字（不换行成多段），包含：
- 考查重点（简要说明本节课核心目标）
- 解题关键（用"解题的关键在于：第一，...；第二，...；第三，..."的三段式）
- 订正建议（1-2 句）
- ${isSummary ? "作业未交的同学请课后及时补做，遇到疑问欢迎随时来问老师，下次记得按时交作业哦！" : "请相关同学课后订正错题并重做同类练习，下次堂测重点关注类似题型～"}

第一段和第二段之间空一行作为分隔。

# 语气风格
- ${isSummary ? "专业、清晰、像备课笔记" : "具体、可执行、像老师在批改作业"}
- 用词贴近中国高中教学场景
- 不要用 AI 套话（如"在当今社会"）

# 输出格式
直接输出两段文字，不要任何额外解释。第一段标题用 "本次${subject}${feedbackTerm}（${topic}专题）"，第二段标题用 "本次${subject}${summaryTerm}"。`;
};

/**
 * 流式输出分段切分 marker
 * 用于前端解析 feedback / summary 两段
 */
export const SECTION_MARKERS = {
  feedback: /^本次.+反馈.+专题/m,
  summary: /^本次.+总体小结|^本次.+总体反馈/m,
};