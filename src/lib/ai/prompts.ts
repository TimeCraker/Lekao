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
export function buildSummaryPrompt({
  subject,
  topic,
  keyPoints,
  className = "超火1班",
  date,
}: {
  subject: string;
  topic: string;
  keyPoints: string[];
  className?: string;
  date: string;
}): string {
  const kp = keyPoints.length > 0 ? keyPoints.join("、") : "本节课内容";
  return `你是一位经验丰富的培训机构助教。请根据以下信息，生成一份专业、清晰的【课堂小结】。

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
① ${kp}

2⃣ 学习要求
① （写出第一点学习要求）
② （写出第二点学习要求）
③ （写出第三点学习要求）

3⃣ 作业反馈:如下表所示👇👇

注意：
- "1⃣" "2⃣" 等符号使用 emoji 风格的数字符号
- "①" "②" 等使用带圈数字符号
- 学习要求写 3 条，每条针对一个关键能力
- 语气专业、清晰，像备课组存档文档`;
}

/**
 * 生成作业/堂测反馈的完整 prompt（用户可见 + 可复制到 DeepSeek）
 */
export function buildFeedbackPrompt({
  subject,
  topic,
  keyPoints,
  className = "超火1班",
  date,
  feedbackCount = 20,
}: {
  subject: string;
  topic: string;
  keyPoints: string[];
  className?: string;
  date: string;
  feedbackCount?: number;
}): string {
  const kp = keyPoints.length > 0 ? keyPoints.join("、") : "本节课内容";
  return `你是一位经验丰富的培训机构助教。请根据以下信息，生成一份具体、可执行的【作业/堂测反馈】。

# 本节课信息
- 班级：${className}
- 学科：${subject}
- 章节/板块：${topic}
- 知识点：${kp}
- 日期：${date}

# 输出格式要求

请严格按照以下模板输出，不要添加额外解释：

【${className}${subject}反馈${date}】

1⃣ 测试概况
① （总体得分情况简述）
② （典型共性问题 1-2 个）

2⃣ 典型错误分析
① （写出第1个典型错误及原因）
② （写出第2个典型错误及原因）
③ （写出第3个典型错误及原因）
④ （写出第4个典型错误及原因）
⑤ （写出第5个典型错误及原因）
...

3⃣ 订正建议
① （订正方法一）
② （订正方法二）

注意：
- "1⃣" "2⃣" 等符号使用 emoji 风格的数字符号
- "①" "②" 等使用带圈数字符号
- 典型错误分析列出 ${feedbackCount} 条左右，覆盖不同学生的各类错误
- 语气具体、可执行，像老师在批改作业后给的反馈`;
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
}: {
  subject: string;
  topic: string;
  keyPoints: string[];
  template: "summary" | "feedback";
  className?: string;
  date: string;
  feedbackCount?: number;
}) => {
  return template === "summary"
    ? buildSummaryPrompt({ subject, topic, keyPoints, className, date })
    : buildFeedbackPrompt({ subject, topic, keyPoints, className, date, feedbackCount });
};