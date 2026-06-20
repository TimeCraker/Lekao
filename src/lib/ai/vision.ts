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

const siliconflow = new OpenAI({
  apiKey: process.env.SILICONFLOW_API_KEY,
  baseURL: "https://api.siliconflow.cn/v1",
});

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

  const response = await siliconflow.chat.completions.create({
    model: "Qwen/Qwen3-VL-8B-Instruct",
    messages: [
      {
        role: "user",
        content: contentBlocks,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2, // 低温度让输出稳定
    max_tokens: 2048,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("视觉模型未返回内容");
  }

  // 解析 JSON（Qwen-VL 在 response_format=json_object 下应该返回纯 JSON）
  let parsed: VisionResult;
  try {
    parsed = JSON.parse(content);
  } catch {
    // 防御：万一模型返回了 markdown 代码块包裹的 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`视觉模型返回无法解析: ${content.slice(0, 200)}`);
    }
    parsed = JSON.parse(jsonMatch[0]);
  }

  // 字段兜底（防止模型漏字段）
  return {
    subject: parsed.subject || "未知",
    topic: parsed.topic || "未知",
    keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
    rawText: parsed.rawText || "",
  };
}