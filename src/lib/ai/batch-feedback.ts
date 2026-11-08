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
import {
  classifyCellValue,
  shouldSkipAiFeedback,
} from "@/lib/mistake/weekend-types";
import type { TemplateStyle } from "@/lib/templates";
import {
  extraBody,
  missingKeyError,
  resolveTextProvider,
} from "./provider-config";

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
  feedback: string; // AI 生成的反馈 / 模板话术 / 空
  fromAi: boolean; // true = AI 生成 | false = 模板/跳过
  isSkipped: boolean; // true = 特殊情况跳过
  isSummarySlot: boolean; // true = 填"本次作业总体小结"的位置
};

export type BatchFeedbackResult = {
  students: BatchStudentOutput[];
  summary: string; // "本次作业总体小结"全文
  subject: string;
  topic: string;
  keyPoints: string[];
  totalTokens: number;
};

// ============================================
// 常量
// ============================================

const MAX_STUDENTS_PER_BATCH = 40;

// ⭐ Lazy init（避免 build time 缺 key 报错）
// ⭐ provider/baseURL/model 走环境变量（默认＝DeepSeek 官方 + deepseek-v4-flash）；
//    超时与 SDK 重试上限见 provider-config（阶段3 诊断 S1/S2）
let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) {
    const provider = resolveTextProvider();
    if (!provider.apiKey) {
      throw missingKeyError(provider);
    }
    _client = new OpenAI({
      apiKey: provider.apiKey,
      baseURL: provider.baseURL,
      timeout: provider.timeoutMs,
      maxRetries: provider.maxRetries,
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
  style?: TemplateStyle,
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

  // 4. 生成反馈
  const aiResults: { index?: number; studentName: string; feedback: string }[] =
    [];
  let totalTokens = 0;
  let summary = "";

  // 分批处理：需要 AI 生成的学生 ≤ 40/批
  // ⭐ 记录每个 aiStudent 在 categorized 的索引，供后续按位置回填 feedback
  const aiStudentCatIdx: number[] = [];
  const aiStudents = categorized.filter((s, i) => {
    if (!s.skip && !s.isAllCorrect) {
      aiStudentCatIdx.push(i);
      return true;
    }
    return false;
  });

  // 分批调 AI
  const aiBatches: (typeof aiStudents)[] = [];
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
      style,
    });
    summary = result.summary; // 取最后一次的小结
    totalTokens += result.tokens;
    aiResults.push(...result.feedbacks);
  }

  // 5. 为每个 AI 学生匹配 feedback
  //    ⭐ 彻底修根因 + 避免错位：
  //    - 第一轮按 index 匹配（AI 回写的序号，1-based，对应传入顺序）-- 不依赖姓名、不依赖顺序假设
  //    - 第二轮按姓名(trim)匹配 -- index 缺失/无效时兜底
  //    - 都没匹配上的留空（不做顺序兜底，避免把别人的反馈错配给学生）
  const catIdxToFeedback = new Map<number, string>();
  const usedResultIdx = new Set<number>();

  // 第一轮：按 index 匹配（AI 返回的序号，1-based -> aiStudents[index-1]）
  aiResults.forEach((r, i) => {
    if (
      typeof r.index === "number" &&
      r.index >= 1 &&
      r.index <= aiStudents.length
    ) {
      const aiIdx = r.index - 1;
      if (!catIdxToFeedback.has(aiStudentCatIdx[aiIdx])) {
        catIdxToFeedback.set(aiStudentCatIdx[aiIdx], r.feedback);
        usedResultIdx.add(i);
      }
    }
  });

  // 第二轮：按姓名匹配（index 缺失或无效时兜底，trim 后精确相等）
  aiStudents.forEach((s, aiIdx) => {
    if (catIdxToFeedback.has(aiStudentCatIdx[aiIdx])) return;
    const sName = s.name.trim();
    if (!sName) return;
    const matchIdx = aiResults.findIndex(
      (r, i) => !usedResultIdx.has(i) && r.studentName === sName,
    );
    if (matchIdx >= 0) {
      catIdxToFeedback.set(
        aiStudentCatIdx[aiIdx],
        aiResults[matchIdx].feedback,
      );
      usedResultIdx.add(matchIdx);
    }
  });

  const matchedCount = catIdxToFeedback.size;
  // ⭐ console.error：next.config removeConsole 只保留 error，warn 生产被移除
  console.error(
    `[lekao-batch] 匹配 ${matchedCount}/${aiStudents.length} 学生（AI 返回 ${aiResults.length} 条）`,
  );

  // ⭐ 完全没回填（AI 空 content 重试上限后仍空，或格式完全不对）-> 抛错，上层不扣币
  if (aiStudents.length > 0 && matchedCount === 0) {
    throw new Error("AI 多次重试未返回有效反馈，请稍后重试");
  }

  // 6. 组装最终学生列表
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
      const template = ALL_CORRECT_TEMPLATES[i % ALL_CORRECT_TEMPLATES.length];
      return {
        name: s.name,
        qNumbersInput: s.qNumbersInput,
        feedback: template,
        fromAi: false,
        isSkipped: false,
        isSummarySlot: false,
      } satisfies BatchStudentOutput;
    }

    // AI 生成反馈（姓名匹配 + 顺序兜底，上面已算好）
    const aiFeedback = catIdxToFeedback.get(i) ?? "";
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
  style,
}: {
  subject: string;
  topic: string;
  keyPoints: string[];
  students: { name: string; qNumbers: string }[];
  sheetName: string;
  date: string;
  summaryLength?: SummaryLength;
  style?: TemplateStyle;
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
    style,
  });

  type RawFeedback = {
    index?: number;
    studentName?: string;
    name?: string;
    feedback?: string;
  };
  let parsed: {
    feedbacks?: RawFeedback[];
    results?: RawFeedback[];
    items?: RawFeedback[];
    data?: RawFeedback[];
    list?: RawFeedback[];
    summary?: string;
  } = {};

  // ⭐ 空 content 重试：DeepSeek V4 Flash 偶发返回空 content（reasoning token 烧完，message.content 为 {}）
  // 上限 MAX_AI_RETRIES 次防 token 烧光，拿到有效 feedbacks 立即跳出
  const MAX_AI_RETRIES = 3;
  let attempt = 0;
  let tokens = 0;

  while (attempt < MAX_AI_RETRIES) {
    attempt++;
    const response = await getClient().chat.completions.create({
      model: resolveTextProvider().model,
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
      ...extraBody(),
    });

    const content = response.choices[0]?.message?.content || "{}";
    tokens += response.usage?.total_tokens ?? 0;

    try {
      parsed = JSON.parse(content);
    } catch {
      // 防万一模型输出 markdown 包裹
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          parsed = {};
        }
      } else {
        parsed = {};
      }
    }

    // 检查是否拿到有效 feedbacks 数组
    const rawCheck =
      parsed.feedbacks ||
      parsed.results ||
      parsed.items ||
      parsed.data ||
      parsed.list ||
      [];
    if (Array.isArray(rawCheck) && rawCheck.length > 0) {
      break; // 成功
    }
    console.error(
      `[lekao-batch] AI 返回空 content (attempt ${attempt}/${MAX_AI_RETRIES}, tokens=${tokens})，${attempt < MAX_AI_RETRIES ? "重试" : "已达上限，放弃"}`,
    );
  }

  // ⭐ 字段名兼容：AI 可能用 feedbacks/results/items/data/list 任一字段名返回数组
  const rawFeedbacks: RawFeedback[] =
    parsed.feedbacks ||
    parsed.results ||
    parsed.items ||
    parsed.data ||
    parsed.list ||
    [];

  // ⭐ index 兼容：AI 可能返回字符串 "1" 而非数字 1
  const toIndex = (v: unknown): number | undefined => {
    if (typeof v === "number") return v;
    if (typeof v === "string" && /^\d+$/.test(v)) return Number(v);
    return undefined;
  };

  // ⭐ 字段名兼容：DeepSeek 可能用 name 而非 studentName（实测 bug 根因之一）
  // ⭐ trim：姓名/反馈两侧可能有不可见空白
  const feedbacks = rawFeedbacks.map((f) => ({
    index: toIndex(f.index),
    studentName: (f.studentName || f.name || "").trim(),
    feedback: (f.feedback || "").trim(),
  }));

  const summary = (parsed.summary || "").trim();

  // ⭐ 脱敏诊断日志：console.error（next.config removeConsole 只保留 error，log/warn 生产被移除）
  // 只记结构信息（顶层字段名/数组长度/首条字段名/index 类型），不记学生姓名与原文（PII 保护）
  const _topKeys = Object.keys(parsed);
  const _firstRaw = rawFeedbacks[0];
  const _firstKeys = _firstRaw ? Object.keys(_firstRaw) : [];
  const _firstIdxType = _firstRaw ? typeof _firstRaw.index : "n/a";
  console.error(
    `[lekao-batch] AI 返回解析: topKeys=${JSON.stringify(_topKeys)} rawLen=${rawFeedbacks.length} first.keys=${JSON.stringify(_firstKeys)} first.index.type=${_firstIdxType} | 解析后 ${feedbacks.length} 条 (tokens=${tokens}, summaryLen=${summary.length})`,
  );

  return { feedbacks, summary, tokens };
}
