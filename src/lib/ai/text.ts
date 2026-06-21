// ============================================
// Lekao · 文本模型封装（DeepSeek V4 Flash 官方）
// ============================================
// 用户 2026-06-20 决策：
// - Provider：DeepSeek 官方（用户原话"快一点，标准一点"）
// - 模型：DeepSeek-V4-Flash（低延迟 + 标准输出）
//
// 用途：拿视觉模型提取的知识点，按模板生成 10 条建议 + 一段小结
// 调用方式：OpenAI-compatible SDK（与硅基流动统一封装）

import OpenAI from "openai";
import { TEXT_PROMPT } from "./prompts";

// ⭐ Lazy init（避免 build time 缺 DEEPSEEK_API_KEY 报错）
let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) {
    if (!process.env.DEEPSEEK_API_KEY) {
      throw new Error(
        "DEEPSEEK_API_KEY 未配置。请在 .env 中添加（密钥不 commit 到 git）。",
      );
    }
    _client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com/v1",
    });
  }
  return _client;
}

export type TemplateType = "summary" | "feedback";

export type GenerationInput = {
  subject: string;
  topic: string;
  keyPoints: string[];
  template: TemplateType;
  className?: string;
  date: string;
  feedbackCount?: number;
  feedbackLength?: "short" | "standard" | "long";
  contentSections?: number;
  requirementCount?: number;
  showFeedback?: boolean;
};

export type GenerationResult = {
  feedback: string; // 10 条建议（每条独占一行，无 Markdown 符号）
  summary: string; // 一段小结（三段式 + 催交尾注）
  rawText: string; // 完整原始输出（前端可备用）
};

/**
 * 文本模型生成（流式）
 *
 * @param input - {subject, topic, keyPoints, template}
 * @returns ReadableStream<Uint8Array> - SSE 流式输出
 */
export function generateStream(
  input: GenerationInput,
): ReadableStream<Uint8Array> {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error(
      "DEEPSEEK_API_KEY 未配置。请在 .env 中添加（密钥不 commit 到 git）。",
    );
  }

  const prompt = TEXT_PROMPT({
    subject: input.subject,
    topic: input.topic,
    keyPoints: input.keyPoints,
    template: input.template,
    className: input.className,
    date: input.date,
    feedbackCount: input.feedbackCount,
    feedbackLength: input.feedbackLength,
    contentSections: input.contentSections,
    requirementCount: input.requirementCount,
	    showFeedback: input.showFeedback,
  });

  const encoder = new TextEncoder();

  // 返回一个 TransformStream，包装 OpenAI 的流式响应
  return new ReadableStream({
    async start(controller) {
      try {
        const stream = await getClient().chat.completions.create({
          model: "deepseek-v4-flash",
          messages: [
            {
              role: "system",
              content:
                "你是一位经验丰富的助教，专业、亲切，擅长用老师易懂的语言总结课堂内容。",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 4096,
          stream: true,
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            controller.enqueue(encoder.encode(content));
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

/**
 * 文本模型生成（非流式 · 用于 E2E 测试）
 *
 * @param input - {subject, topic, keyPoints, template}
 * @returns GenerationResult - {feedback, summary, rawText}
 */
export async function generate(input: GenerationInput): Promise<GenerationResult> {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY 未配置。");
  }

  const prompt = TEXT_PROMPT({
    subject: input.subject,
    topic: input.topic,
    keyPoints: input.keyPoints,
    template: input.template,
    className: input.className,
    date: input.date,
    feedbackCount: input.feedbackCount,
    feedbackLength: input.feedbackLength,
    contentSections: input.contentSections,
    requirementCount: input.requirementCount,
    showFeedback: input.showFeedback,
  });

  const response = await getClient().chat.completions.create({
    model: "deepseek-v4-flash",
    messages: [
      {
        role: "system",
        content:
          "你是一位经验丰富的助教，专业、亲切，擅长用老师易懂的语言总结课堂内容。",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 4096,
  });

  const rawText = response.choices[0]?.message?.content || "";

  // 按 SECTION_MARKERS 切分 feedback / summary 两段
  const { feedback, summary } = parseOutput(rawText, input.template);

  return { feedback, summary, rawText };
}

/**
 * 按 marker 切分输出为 feedback + summary
 */
function parseOutput(
  rawText: string,
  template: TemplateType,
): { feedback: string; summary: string } {
  // summary 模板：第一段标题 = "本次XX课堂反馈"，第二段 = "本次XX课堂总体小结"
  // feedback 模板：第一段标题 = "反馈" 各条，第二段 = "本次XX作业总体小结"（见 prompts.ts buildFeedbackPrompt）
  // ⚠️ 标记必须与 prompts.ts 中实际告诉 AI 输出的文本一致
  const summaryMarker = template === "summary" ? "课堂总体小结" : "总体小结";

  const lines = rawText.split("\n");
  const summaryStartIdx = lines.findIndex((line) =>
    line.includes(summaryMarker),
  );

  if (summaryStartIdx === -1) {
    // 没找到 marker：整段作为 feedback，summary 留空
    return { feedback: rawText.trim(), summary: "" };
  }

  const feedback = lines.slice(0, summaryStartIdx).join("\n").trim();
  const summary = lines.slice(summaryStartIdx).join("\n").trim();

  return { feedback, summary };
}