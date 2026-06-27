// ============================================
// Lekao · 周末错题反馈表 · 批量 AI 反馈（Stage 3）
// ============================================
// 流程：
// 1. 视觉模型（Qwen3-VL-8B）读讲义图 → 提取 subject/topic/keyPoints
// 2. 过滤学生：全对 → 模板话术；网课等 → 跳过；
//    有错题号 → AI 生成反馈
// 3. 第一个特殊情况学生填"本次作业总体小结"
// 4. 返回带反馈的学生列表
//
// ⭐ 不走流式（批量 JSON 输出，一次返回所有反馈）
// ⭐ 每次调用扣 1 币/Sheet（调用方负责扣费）
// ⭐ 超 40 学生/Sheet → 拆成 2 批调 AI

import OpenAI from "openai";
import { recognizeHandout } from "./vision";
import { buildBatchFeedbackPrompt, ALL_CORRECT_TEMPLATES } from "./prompts";
import { classifyCellValue, shouldSkipAiFeedback } from "@/lib/mistake/weekend-types";

/** Stage 18：作业总体小结字数挡位（与 prompts.ts 保持一致） */
export type SummaryLength = "0.5x" | "1x" | "1.5x" | "2x" | "3x";
export const DEFAULT_SUMMARY_LENGTH: SummaryLength = "1x";

// ============================================
// 类型
// ============================================

export type BatchStudentInput = {
  name: string;
  qNumbersInput: string;
};

export type BatchStudentOutput = BatchStudentInput & {
  feedback: string;             // AI 生成的反馈 / 模板话术 / 空
  fromAi: boolean;              // true = AI 生成 | false = 模板/跳过
  isSkipped: boolean;           // true = 特殊情况跳过
  isSummarySlot: boolean;       // true = 填"本次作业总体小结"的位置
};

export type BatchFeedbackResult = {
  students: BatchStudentOutput[];
  summary: string;              // "本次作业总体小结"全文
  subject: string;
  topic: string;
  keyPoints: string[];
  totalTokens: number;
};

// ============================================
// 常量
// ============================================

const MAX_STUDENTS_PER_BATCH = 40;

// ⭐ Lazy init（避免 build time 缺 DEEPSEEK_API_KEY 报错）
let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) {
    if (!process.env.DEEPSEEK_API_KEY) {
      throw new Error("DEEPSEEK_API_KEY 未配置。");
    }
    _client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com/v1",
    });
  }
  return _client;
}

// ============================================
// 主入口
// ============================================

export async function generateBatchFeedbacks(
  lectureImages: string[],
  students: BatchStudentInput[],
  sheetName: string,
  date: string,
  summaryLength: SummaryLength = DEFAULT_SUMMARY_LENGTH,
): Promise<BatchFeedbackResult> {
  if (lectureImages.length === 0) {
    throw new Error("至少需要 1 张讲义图");
  }
  for (const img of lectureImages) {
    if (!img.startsWith("data:image/")) {
      throw new Error("讲义图片必须是 data URL 格式");
    }
  }

  // 1. 视觉识别：读讲义图（支持多张） → 学科/章节/知识点
  const visionResult = await recognizeHandout(lectureImages);

  // 2. 预处理学生：分类 + 判定处理策略
  const categorized = students.map((s) => {
    const category = classifyCellValue(s.qNumbersInput);
    const skip = shouldSkipAiFeedback(category);
    const isAllCorrect = category === "allCorrect";
    return { ...s, category, skip, isAllCorrect };
  });

  // 3. 找到第一个特殊情况学生的索引（用于填总体小结）
  const firstSkipIdx = categorized.findIndex((s) => s.skip);

  // 4. 生成反馈
  const aiResults: { studentName: string; feedback: string }[] = [];
  let totalTokens = 0;
  let summary = "";

  // 分批处理：需要 AI 生成的学生 ≤ 40/批
  const aiStudents = categorized.filter(
    (s) => !s.skip && !s.isAllCorrect,
  );

  // 分批调 AI
  const aiBatches: typeof aiStudents[] = [];
  for (let i = 0; i < aiStudents.length; i += MAX_STUDENTS_PER_BATCH) {
    aiBatches.push(aiStudents.slice(i, i + MAX_STUDENTS_PER_BATCH));
  }

  for (const batch of aiBatches) {
    const result = await callBatchAI({
      subject: visionResult.subject,
      topic: visionResult.topic,
      keyPoints: visionResult.keyPoints,
      students: batch.map((s) => ({ name: s.name, qNumbers: s.qNumbersInput })),
      sheetName,
      date,
      summaryLength,
    });
    summary = result.summary; // 取最后一次的小结
    totalTokens += result.tokens;
    aiResults.push(...result.feedbacks);
  }

  // 5. 组装最终学生列表
  const aiResultMap = new Map<string, string>();
  for (const r of aiResults) {
    aiResultMap.set(r.studentName, r.feedback);
  }
  let summarySlotUsed = false;
  const outputStudents = categorized.map((s, i) => {
    if (s.skip) {
      // 特殊情况：第一个填小结，其余留空
      const isSummarySlot = !summarySlotUsed;
      if (isSummarySlot) summarySlotUsed = true;
      return {
        name: s.name,
        qNumbersInput: s.qNumbersInput,
        feedback: isSummarySlot ? summary : "",
        fromAi: false,
        isSkipped: true,
        isSummarySlot,
      } satisfies BatchStudentOutput;
    }

    if (s.isAllCorrect) {
      // 全对 → 模板话术
      const template =
        ALL_CORRECT_TEMPLATES[i % ALL_CORRECT_TEMPLATES.length];
      return {
        name: s.name,
        qNumbersInput: s.qNumbersInput,
        feedback: template,
        fromAi: false,
        isSkipped: false,
        isSummarySlot: false,
      } satisfies BatchStudentOutput;
    }

    // AI 生成反馈
    const aiFeedback = aiResultMap.get(s.name) ?? "";
    return {
      name: s.name,
      qNumbersInput: s.qNumbersInput,
      feedback: aiFeedback,
      fromAi: true,
      isSkipped: false,
      isSummarySlot: false,
    } satisfies BatchStudentOutput;
  });

  return {
    students: outputStudents,
    summary,
    subject: visionResult.subject,
    topic: visionResult.topic,
    keyPoints: visionResult.keyPoints,
    totalTokens,
  };
}

// ============================================
// 单次 AI 调用（非流式 · JSON 输出）
// ============================================

async function callBatchAI({
  subject,
  topic,
  keyPoints,
  students,
  sheetName,
  date,
  summaryLength = DEFAULT_SUMMARY_LENGTH,
}: {
  subject: string;
  topic: string;
  keyPoints: string[];
  students: { name: string; qNumbers: string }[];
  sheetName: string;
  date: string;
  summaryLength?: SummaryLength;
}): Promise<{
  feedbacks: { studentName: string; feedback: string }[];
  summary: string;
  tokens: number;
}> {
  if (students.length === 0) {
    return { feedbacks: [], summary: "", tokens: 0 };
  }

  const prompt = buildBatchFeedbackPrompt({
    subject,
    topic,
    keyPoints,
    students,
    sheetName,
    date,
    summaryLength,
  });

  const response = await getClient().chat.completions.create({
    model: "deepseek-v4-flash",
    messages: [
      {
        role: "system",
        content:
          "你是一位经验丰富的助教，专业、亲切，擅长用老师易懂的语言总结课堂内容。输出严格 JSON，不要 Markdown 代码块。",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.5,
    max_tokens: 4096,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content || "{}";
  const tokens = response.usage?.total_tokens ?? 0;

  let parsed: { feedbacks?: { studentName?: string; feedback?: string }[]; summary?: string };
  try {
    parsed = JSON.parse(content);
  } catch {
    // 防万一模型输出 markdown 包裹
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error(`AI 返回无法解析的 JSON: ${content.slice(0, 200)}`);
    }
  }

  const feedbacks = (parsed.feedbacks || []).map((f) => ({
    studentName: f.studentName || "",
    feedback: f.feedback || "",
  }));

  const summary = parsed.summary || "";

  return { feedbacks, summary, tokens };
}
