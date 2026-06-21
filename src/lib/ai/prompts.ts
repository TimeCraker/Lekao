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
 *
 * 输出格式（参考用户提供的真实模板）：
 *   本次{学科}作业反馈（{专题}）
 *
 *   巩固对xx概念的理解，做到熟练辨析，继续加油
 *   加强xx方法的灵活运用，注意与类似题型的区分，再接再厉
 *   掌握xx问题的解题技巧，注意审题中的关键条件，继续努力
 *   熟练运用xx公式进行计算，提升准确率，继续保持
 *   ...
 *
 *   本次{学科}作业总体小结
 *   ...
 *
 * 关键要求：
 *   - 每条只讲 ONE 个知识点/角度，不要罗列所有知识点
 *   - 每条控制在 20-50 字（短）、30-70 字（标准）、50-100 字（长）
 *   - 每条以"巩固/加强/掌握/熟练/..."开头，以"继续加油/再接再厉/继续努力/继续保持/多总结方法"结尾
 *   - 不同条目从不同角度切入：概念理解、方法运用、易错提醒、解题技巧等
 *   - 条数由 feedbackCount 控制
 */
export function buildFeedbackPrompt({
  subject,
  topic,
  keyPoints,
  className = "超火1班",
  date,
  feedbackCount = 20,
  feedbackLength = "standard",
}: {
  subject: string;
  topic: string;
  keyPoints: string[];
  className?: string;
  date: string;
  feedbackCount?: number;
  feedbackLength?: "short" | "standard" | "long";
}): string {
  const kp = keyPoints.length > 0 ? keyPoints.join("、") : "本节课内容";

  // 根据长度档位设置不同的字数和详尽度约束
  const lengthGuide =
    feedbackLength === "short"
      ? "每条控制在 15-35 字，极其精简，只点出知识点名称和关键动作，不展开解释。"
      : feedbackLength === "long"
        ? "每条控制在 50-90 字，可适当展开解释方法或易错点，比标准版多一个层级的说明。"
        : "每条控制在 25-55 字，简洁地点出知识点的掌握要点和提升方向。";

  return `你是一位经验丰富的培训机构助教。请根据以下信息，生成一份具体、可执行的【作业/堂测反馈】。

# 本节课信息
- 班级：${className}
- 学科：${subject}
- 章节/板块：${topic}
- 知识点：${kp}
- 日期：${date}

# 输出格式要求（极其重要，必须严格遵守）

请严格按照以下模板输出，不要添加额外解释。不要输出任何序号、数字符号、列表符号。

## 第一行：标题
本次${subject}作业反馈（${topic}）

## 第二行开始：反馈项（共 ${feedbackCount} 条）

每条独立一行，不加任何序号或符号前缀（不要①、②、1.、-、·等）。

每条格式：以"巩固/加强/掌握/熟练/注意/理解/强化"等中的一个开头，以"继续加油/再接再厉/继续努力/继续保持/多总结方法"等中的一个结尾。

${lengthGuide}

注意以下规则：
1. 每条只聚焦一个知识点或一个角度，不能把全部知识点塞进同一条里
2. 不同条目的角度要不同，交替使用这些角度：概念理解、方法运用、易错提醒、解题技巧、公式记忆、思路分析、题型识别、规范书写
3. 鼓励语轮流使用"继续加油、再接再厉、继续努力、继续保持、多总结方法"，不要全部一样
4. 示例对比——👇好的写法：
   "巩固圆台内切球半径的推导思路，注意母线、高与半径的垂直关系，继续加油"
   "加强概率独立事件与互斥事件的区分，避免混淆概念，再接再厉"
   "掌握正方体中点体积分割的辅助线构造方法，继续努力"
   而不是👇坏的写法：
   "巩固圆台内切球半径、圆柱与圆台间隙最大球、概率独立事件计算...的相关概念..."
5. 每条开头用不同的动词，不要连续两条都用"巩固"

## 最后：总体小结
空一行后输出：
本次${subject}作业总体小结

（一段 150-300 字的总结：包含本次作业的核心考点、解题关键点、易错提醒、鼓励语气）
（最后一句：作业未交的同学请课后及时补做，下次要记得交作业哦！）

注意：
- 整个输出不能出现任何序号（① ② ③ 1. 2. 3. - · 等均不允许）
- 每条反馈都是纯文字句子，没有前缀符号
- 总体小结段落要完整、通顺，至少 3-5 句话
- 语气专业、亲切，像老师批改作业后的真实评语`;
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
  feedbackLength,
}: {
  subject: string;
  topic: string;
  keyPoints: string[];
  template: "summary" | "feedback";
  className?: string;
  date: string;
  feedbackCount?: number;
  feedbackLength?: "short" | "standard" | "long";
}) => {
  return template === "summary"
    ? buildSummaryPrompt({ subject, topic, keyPoints, className, date })
    : buildFeedbackPrompt({ subject, topic, keyPoints, className, date, feedbackCount, feedbackLength });
};