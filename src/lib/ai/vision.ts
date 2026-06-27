// ============================================
// Lekao · 视觉模型封装（硅基流动 Qwen3-VL-8B-Instruct）
// ============================================
// 用户 2026-06-20 决策：
// - Provider：硅基流动（国内快 + 便宜）
// - 模型：Qwen3-VL-8B-Instruct（8B 轻量 + 快 + 非旗舰热门）
// - 备选：Qwen3-VL-32B-Instruct（如果 8B 公式/几何识别率不够再升）
//
// 用途：讲义图片 → 提取文字 + 判断学科/章节/知识点
// 调用方式：OpenAI-compatible SDK（与 DeepSeek 统一封装）

import OpenAI from "openai";
import { VISION_PROMPT } from "./prompts";

// ⭐ Lazy init（避免 build time 缺 SILICONFLOW_API_KEY 报错）
let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) {
    if (!process.env.SILICONFLOW_API_KEY) {
      throw new Error(
        "SILICONFLOW_API_KEY 未配置。请在 .env 中添加（密钥不 commit 到 git）。",
      );
    }
    _client = new OpenAI({
      apiKey: process.env.SILICONFLOW_API_KEY,
      baseURL: "https://api.siliconflow.cn/v1",
    });
  }
  return _client;
}

export type VisionResult = {
  subject: string;
  topic: string;
  keyPoints: string[];
  rawText: string;
};

/**
 * 视觉模型读图
 *
 * @param imageDataUrls - data URL 数组（data:image/png;base64,...），支持多图
 * @returns VisionResult - {subject, topic, keyPoints[], rawText}
 *
 * ⭐ 安全加固（2026-06-20 commit review）：
 * - subject 必须在 9 个学科 allowlist 内（防 prompt injection）
 * - topic/keyPoints/rawText 长度截断 + 控制字符过滤
 * - keyPoints 数量上限 + 总长度上限
 */
export async function recognizeHandout(
  imageDataUrls: string[],
): Promise<VisionResult> {
  if (!process.env.SILICONFLOW_API_KEY) {
    throw new Error(
      "SILICONFLOW_API_KEY 未配置。请在 .env 中添加（密钥不 commit 到 git）。",
    );
  }

  if (imageDataUrls.length === 0) {
    throw new Error("至少需要 1 张图片");
  }

  // 多图拼接：每张图作为一个 content block
  const contentBlocks: Array<
    | { type: "image_url"; image_url: { url: string } }
    | { type: "text"; text: string }
  > = imageDataUrls.map((url) => ({
    type: "image_url" as const,
    image_url: { url },
  }));
  contentBlocks.push({ type: "text", text: VISION_PROMPT });

  const response = await getClient().chat.completions.create({
    model: "Qwen/Qwen3-VL-8B-Instruct",
    messages: [
      {
        role: "user",
        content: contentBlocks,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2, // 低温度让输出稳定
    max_tokens: 4096, // ⭐ Stage 18.6：从 2048 提到 4096，避免多张图 JSON 被截断
  });

  // ⭐ 截断检测：finish_reason=length 表示输出被 max_tokens 截断，JSON 必然不完整
  const finishReason = response.choices[0]?.finish_reason;
  if (finishReason === "length") {
    console.warn(
      `[recognizeHandout] 视觉模型输出被 max_tokens 截断 · 图片数 ${imageDataUrls.length}`,
    );
  }

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("视觉模型未返回内容");
  }

  // 解析 JSON（Qwen-VL 在 response_format=json_object 下应该返回纯 JSON）
  let parsed: VisionResult;
  try {
    parsed = JSON.parse(content);
  } catch (parseErr) {
    // ⭐ Stage 18.6：把原始 content 截断打印到日志，便于排查 AI 层面 JSON 不合法问题
    const truncated = content.length > 500 ? content.slice(0, 500) + "...(truncated, total " + content.length + " chars)" : content;
    console.error(`[recognizeHandout] 视觉模型 JSON parse 失败 · position 信息 · 原内容前 500 字:`, truncated);
    console.error(`[recognizeHandout] parse error:`, (parseErr as Error).message);
    // ⭐ 防御：模型可能返回 markdown ```json ... ``` 包裹，或外层多了杂文本
    // 用 brace-matching 找最外层 {...} 而不是 regex 贪心（regex 会乱吃嵌套 / 跳过第一个 {）
    const jsonSlice = extractOutermostJson(content);
    if (!jsonSlice) {
      throw new Error(`视觉模型返回无法解析: ${content.slice(0, 200)}`);
    }
    try {
      parsed = JSON.parse(jsonSlice);
      console.warn(`[recognizeHandout] ⭐ markdown/杂文本容错后解析成功 · 提取长度 ${jsonSlice.length} chars`);
    } catch (parseErr2) {
      console.error(`[recognizeHandout] markdown 容错后仍 parse 失败:`, (parseErr2 as Error).message);
      throw parseErr2;
    }
  }

  // ⭐ 字段清洗（防 prompt injection）
  return sanitizeVisionResult(parsed);
}

// ============================================
// ⭐ 安全：视觉模型输出校验与清洗（防 prompt injection）
// ============================================

const ALLOWED_SUBJECTS = new Set([
  "数学",
  "物理",
  "化学",
  "生物",
  "英语",
  "语文",
  "地理",
  "历史",
  "政治",
]);

const MAX_SUBJECT_LEN = 10;
const MAX_TOPIC_LEN = 50;
const MAX_KEYPOINT_LEN = 50;
const MAX_RAW_TEXT_LEN = 500;
const MAX_KEYPOINTS_COUNT = 10;
const MAX_KEYPOINTS_TOTAL = 300;

/** 过滤控制字符 + 限制长度（保留中文/英文/数字/常见标点） */
function clamp(s: unknown, max: number): string {
  if (typeof s !== "string") return "";
  // 过滤控制字符（保留 \t \n \r）
  const cleaned = s.replace(/[\x00-\x08\x0B-\x1F\x7F]/g, "").trim();
  return cleaned.length > max ? cleaned.slice(0, max) : cleaned;
}

function sanitizeVisionResult(raw: Partial<VisionResult>): VisionResult {
  // subject: 必须在 9 个学科 allowlist 内
  const subjectRaw = clamp(raw.subject, MAX_SUBJECT_LEN);
  const subject = ALLOWED_SUBJECTS.has(subjectRaw) ? subjectRaw : "未知";

  // topic: 截断到 50 字符
  const topic = clamp(raw.topic, MAX_TOPIC_LEN) || "未知";

  // keyPoints: 数组过滤 + 每项截断 + 总长度截断
  const rawPoints = Array.isArray(raw.keyPoints) ? raw.keyPoints : [];
  const points: string[] = [];
  let totalLen = 0;
  for (const p of rawPoints) {
    if (points.length >= MAX_KEYPOINTS_COUNT) break;
    const c = clamp(p, MAX_KEYPOINT_LEN);
    if (!c) continue;
    if (totalLen + c.length > MAX_KEYPOINTS_TOTAL) break;
    points.push(c);
    totalLen += c.length;
  }

  // rawText: 截断到 500 字符
  const rawText = clamp(raw.rawText, MAX_RAW_TEXT_LEN);

  return { subject, topic, keyPoints: points, rawText };
}

// ============================================
// ⭐ Stage 18.6: brace-matching 提取最外层 JSON
//
// 比 regex /\{[\s\S]*\}/ 更稳:
// - 不会跳过 markdown ```json 后的第一个 { 去找后面的 }
// - 正确处理 JSON 内嵌套的 {...} 和 [...]
// - 正确处理字符串内的 { } （"hello { world }"）
// - 找到最外层配对的 {...} 就返回
// ============================================
function extractOutermostJson(text: string): string | null {
  // 先剥 markdown 代码块（如果存在）
  // 模式: ```json ... ```  或  ``` ... ```
  const mdMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (mdMatch) {
    text = mdMatch[1];
  }

  // 找第一个 {
  const firstBrace = text.indexOf("{");
  if (firstBrace === -1) return null;

  // 栈式 brace matching, 同时跳过字符串字面量内的 { 和 [
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = firstBrace; i < text.length; i++) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return text.slice(firstBrace, i + 1);
      }
    }
  }
  return null;
}