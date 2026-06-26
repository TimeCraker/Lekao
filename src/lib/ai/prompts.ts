// ============================================
// Lekao · AI Prompt 模板（视觉 + 文本）
// ============================================
// 用户 2026-06-21 最新意图：
// - 视觉模型读图自动判断学科 + 章节 + 提取知识点
// - 文本模型按模板生成课堂小结/作业堂测反馈
// - 输出格式：【班级 + 学科 + 类型 + 日期】
//   1⃣ 授课内容 / 2⃣ 学习要求 / 3⃣ 作业反馈
// - Prompt 全量公开在页面下方，支持一键复制到 DeepSeek

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
 * 生成课堂小结的完整 prompt（用户可见 + 可复制到 DeepSeek）
 */
const CIRCLED = ["①", "②", "③", "④", "⑤"];

export function buildSummaryPrompt({
  subject,
  topic,
  keyPoints,
  className = "超火1班",
  date,
  contentSections = 1,
  requirementCount = 3,
  showFeedback = false,
}: {
  subject: string;
  topic: string;
  keyPoints: string[];
  className?: string;
  date: string;
  contentSections?: number;
  requirementCount?: number;
  showFeedback?: boolean;
}): string {
  const kp = keyPoints.length > 0 ? keyPoints.join("、") : "本节课内容";

  // 授课内容行
  const contentLines = [CIRCLED[0] + " " + kp];
  for (let i = 1; i < contentSections; i++) {
    contentLines.push(CIRCLED[i] + " （写出第" + (i + 1) + "点授课内容）");
  }

  // 学习要求行
  const reqLines: string[] = [];
  for (let i = 0; i < requirementCount; i++) {
    reqLines.push(CIRCLED[i] + " （写出第" + (i + 1) + "点学习要求）");
  }

  return `你是一位经验丰富的助教。请根据以下信息，生成一份专业、清晰的【课堂小结】。

# 本节课信息
- 班级：${className}
- 学科：${subject}
- 章节/板块：${topic}
- 知识点：${kp}
- 日期：${date}

# 输出格式要求

请严格按照以下模板输出，不要添加额外解释：

【${className}${subject}小结${date}】

1⃣ 授课内容
${contentLines.join("\n")}

2⃣ 学习要求
${reqLines.join("\n")}

3⃣ 作业反馈如下👇👇${showFeedback ? `
撰写一段作业情况总结，涵盖整体表现和典型问题，简洁清晰。` : ""}

注意：
- "1⃣" "2⃣" 等符号使用 emoji 风格的数字符号
- "①" "②" 等使用带圈数字符号
- 学习要求写 ${requirementCount} 条，每条针对一个关键能力
- 语气专业、清晰，像备课组存档文档
${!showFeedback ? "- ⚠️ 第 3 部分（作业反馈）只保留标题行，不要输出任何内容" : ""}`;
}

/**
 * 生成作业/堂测反馈的完整 prompt（用户可见 + 可复制到 DeepSeek）
 *
 * 输出格式参考用户真实模板：
 *   本次{学科}作业反馈（{专题}）
 *
 *   巩固xxx的概念理解，继续加油
 *   加强xxx的灵活运用，再接再厉
 *   掌握xxx的解题技巧，继续努力
 *   ...
 *
 *   本次{学科}作业总体小结
 *   一段 3-5 句总结
 */
export function buildFeedbackPrompt({
  subject,
  topic,
  keyPoints,
  className = "超火1班",
  date,
  feedbackCount = 20,
  summaryLength = "standard",
}: {
  subject: string;
  topic: string;
  keyPoints: string[];
  className?: string;
  date: string;
  feedbackCount?: number;
  /**
   * 作业总体小结字数挡位（2026-06-22 用户决策 4 挡）
   * 只控制"作业总体小结"段落的字数，反馈条目（一条条的）固定 25-55 字/条
   */
  summaryLength?: "standard" | "1.5x" | "2x" | "3x";
}): string {
  const kp = keyPoints.length > 0 ? keyPoints.join("、") : "本节课内容";

  // ⭐ 2026-06-22：4 挡字数 — 只控"作业总体小结"
  // 反馈条目（一条条的）固定 25-55 字（不按挡位变）
  const summaryLengthGuide =
    summaryLength === "1.5x"
      ? "225-450 字"
      : summaryLength === "2x"
        ? "300-600 字"
        : summaryLength === "3x"
          ? "450-900 字"
          : "150-300 字";

  const summaryLengthLabel =
    summaryLength === "1.5x"
      ? "×1.5"
      : summaryLength === "2x"
        ? "×2"
        : summaryLength === "3x"
          ? "×3"
          : "标准";

  return `你是一位助教。根据以下信息，生成作业/堂测反馈（作业总体小结字数：${summaryLengthLabel}）。

班级：${className}
学科：${subject}
章节：${topic}
知识点：${kp}
日期：${date}

要求：
1. 第一行输出：本次${subject}作业反馈（${topic}）
2. 接下来 ${feedbackCount} 行，每行一条反馈。每条 25-55 字，只讲一个具体知识点，不能把全部知识点列在同一条里。
3. 每条开头用"巩固/加强/掌握/熟练/注意/理解/强化"之一，结尾用"继续加油/再接再厉/继续努力/继续保持/多总结方法"之一，不要连续两条用一样的开头或结尾。
4. 不同条目的角度要不同：概念理解、方法运用、易错提醒、解题技巧等交替来。
5. 空一行后输出：本次${subject}作业总体小结，然后写一段 ${summaryLengthGuide} 的总结（包含核心考点、解题关键、鼓励），最后一句写"作业未交的同学请课后及时补做，下次要记得交作业哦！"
6. 不要任何序号、数字、符号前缀。每条就是纯文字一行。
7. 语气像老师批改作业后的真实评语。`;
}

/** 用于 AI 调用的低层级 prompt 生成（不含模板样式，保留纯指令） */
export const TEXT_PROMPT = ({
  subject,
  topic,
  keyPoints,
  template,
  className = "超火1班",
  date,
  feedbackCount = 20,
  summaryLength,
  contentSections,
  requirementCount,
  showFeedback,
}: {
  subject: string;
  topic: string;
  keyPoints: string[];
  template: "summary" | "feedback";
  className?: string;
  date: string;
  feedbackCount?: number;
  summaryLength?: "standard" | "1.5x" | "2x" | "3x";
  contentSections?: number;
  requirementCount?: number;
  showFeedback?: boolean;
}) => {
  return template === "summary"
    ? buildSummaryPrompt({ subject, topic, keyPoints, className, date, contentSections, requirementCount, showFeedback })
    : buildFeedbackPrompt({ subject, topic, keyPoints, className, date, feedbackCount, summaryLength });
};
// ============================================
// 周末错题反馈表 · 批量 AI 反馈 prompt（Stage 3）
// ============================================

/**
 * 全对学生的模板话术（随机选取，不用 AI 生成）
 */
export const ALL_CORRECT_TEMPLATES = [
  "作业完成的非常好，继续保持！",
  "全部正确，再接再厉！",
  "这节课内容掌握得很好，继续保持！",
  "作业质量很高，非常棒！",
  "全对！作业完成认真，值得表扬！",
  "思路清晰，解题规范，表现优秀！",
  "本次作业零失误，课堂效率高！",
];

/**
 * 生成批量学生反馈的 prompt（DeepSeek 非流式）
 *
 * 输入：讲义关键知识点 + 所有需要 AI 生成反馈的学生列表（含姓名 + 错题号）
 * 输出：JSON {feedbacks: [{studentName, feedback}], summary}
 */
export function buildBatchFeedbackPrompt({
  subject,
  topic,
  keyPoints,
  students,
  sheetName,
  date,
}: {
  subject: string;
  topic: string;
  keyPoints: string[];
  students: { name: string; qNumbers: string }[];
  sheetName: string;
  date: string;
}): string {
  const kp = keyPoints.length > 0 ? keyPoints.join("\n- ") : "本节课内容";

  const studentList = students
    .map((s) => `  ${s.name}：${s.qNumbers}`)
    .join("\n");

  return `你是一位经验丰富的助教。请根据以下讲义知识点和每个学生的错题，生成个性化的课后反馈。

【班级-学科】${sheetName}
【日期】${date}
【讲义知识点】
- ${kp}

【学生错题列表（仅含需要生成反馈的学生）】
${studentList}

要求：
1. 对每个学生，根据其错题号生成对应的课后反馈。
   - 如果错题只写了一个题号（如"3"），详细写改题涉及的知识点 + 改进建议
   - 如果错题写了多个题号（如"3，6，9"），选前 2-3 个重点题详细说明，其余简略带过
   - 每条反馈 25-55 字，语气像老师批改后的真实评语
2. 每条反馈以"巩固/加强/掌握/熟练/注意/理解/强化"开头
3. 不同学生之间开头不要重复
4. 另外生成一段「本次${ subject }作业总体小结」（3-5 句，包含整体表现 + 典型问题 + 鼓励）

输出格式（严格 JSON，不要 Markdown 代码块标记）：
{
  "feedbacks": [
    { "studentName": "学生姓名", "feedback": "巩固xxx的理解，注意xxx" },
    { "studentName": "姓名", "feedback": "加强xxx的运用，xxx" }
  ],
  "summary": "本次数学作业总体小结：xxx"
}`;
}
