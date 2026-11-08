#!/usr/bin/env node
/**
 * S01 阶段3 · AI 链路延迟诊断（只读、可重复）
 *
 * 用途：量两阶段流水线的真实耗时构成 —— vision（Qwen3-VL-8B，非流式）
 *      与文本生成（deepseek-v4-flash，SSE 流式，测首 token 与总时长）。
 *
 * 用法：
 *   node scripts/diagnose-ai-latency.mjs [图片路径...] [--runs=2]
 *   默认取 public/images 下最大的 PNG 作为载荷代理（真实讲义为 PDF/照片，
 *   请把真实脱敏讲义截图放进 references/ 后显式传路径以获得可信数字）。
 *
 * 纪律：
 * - 密钥只从 .env 读取，绝不打印；只报 SET/UNSET。
 * - 不打印教学原文或模型输出正文，只打印长度、token 数与耗时。
 * - 单次运行按 --runs 限制，避免重复产生付费副作用。
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";

const ROOT = process.cwd();

function loadEnv() {
  const env = {};
  try {
    for (const line of readFileSync(resolve(ROOT, ".env"), "utf8").split(
      /\r?\n/,
    )) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* 无 .env 时靠真实环境变量 */
  }
  return { ...env, ...process.env };
}

const env = loadEnv();
// 与 src/lib/ai/provider-config.ts 保持同一套变量与默认值：
// 换 provider/模型只改 .env，脚本与运行时行为一致
const VISION_API_KEY = env.VISION_API_KEY || env.SILICONFLOW_API_KEY;
const VISION_BASE_URL = env.VISION_BASE_URL || "https://api.siliconflow.cn/v1";
const VISION_MODEL = env.VISION_MODEL || "Qwen/Qwen3-VL-8B-Instruct";
const TEXT_API_KEY = env.TEXT_API_KEY || env.DEEPSEEK_API_KEY;
const TEXT_BASE_URL = env.TEXT_BASE_URL || "https://api.deepseek.com/v1";
const TEXT_MODEL = env.TEXT_MODEL || "deepseek-v4-flash";
/** 与运行时同一套附加请求体（例如关闭推理模型的思考） */
const EXTRA_BODY = (() => {
  try {
    return JSON.parse(env.AI_EXTRA_BODY_JSON || "{}");
  } catch {
    return {};
  }
})();

function requireKeys() {
  const missing = [];
  if (!VISION_API_KEY) missing.push("VISION_API_KEY / SILICONFLOW_API_KEY");
  if (!TEXT_API_KEY) missing.push("TEXT_API_KEY / DEEPSEEK_API_KEY");
  if (missing.length) {
    console.error(`缺少密钥（SET/UNSET 检查）：${missing.join(", ")} = UNSET`);
    process.exit(2);
  }
}

const args = process.argv.slice(2);
const runs = Number(
  (args.find((a) => a.startsWith("--runs=")) || "--runs=2").split("=")[1],
);
const images = args.filter((a) => !a.startsWith("--"));

function defaultImage() {
  const dir = resolve(ROOT, "public/images");
  const files = readdirSync(dir)
    .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
    .map((f) => ({ f, size: statSync(resolve(dir, f)).size }))
    .sort((a, b) => b.size - a.size);
  return resolve(dir, files[0].f);
}

function dataUrl(path) {
  const buf = readFileSync(path);
  const ext = path.toLowerCase().endsWith(".png") ? "png" : "jpeg";
  return {
    url: `data:image/${ext};base64,${buf.toString("base64")}`,
    bytes: buf.length,
  };
}

const VISION_PROMPT =
  '你是教培助教。请阅读这张讲义图片，只输出 JSON：{"subject":"学科","topic":"专题","keyPoints":["知识点"],"rawText":"正文摘录"}';

async function runVision(imageUrl) {
  const started = Date.now();
  const res = await fetch(`${VISION_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${VISION_API_KEY}`,
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageUrl } },
            { type: "text", text: VISION_PROMPT },
          ],
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 4096,
      ...EXTRA_BODY,
    }),
  });
  const ms = Date.now() - started;
  const text = await res.text();
  let ok = res.ok;
  let usage = null;
  let finish = null;
  let parsedOk = false;
  let contentLen = 0;
  try {
    const json = JSON.parse(text);
    usage = json.usage ?? null;
    finish = json.choices?.[0]?.finish_reason ?? null;
    const content = json.choices?.[0]?.message?.content ?? "";
    contentLen = content.length;
    if (content) JSON.parse(content);
    parsedOk = Boolean(content);
  } catch {
    ok = false;
  }
  return { ms, ok, usage, finish, parsedOk, contentLen, status: res.status };
}

async function runText(seed) {
  const started = Date.now();
  const res = await fetch(`${TEXT_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TEXT_API_KEY}`,
    },
    body: JSON.stringify({
      model: TEXT_MODEL,
      messages: [
        {
          role: "user",
          content: `为「${seed}」这一节课写一段 150 字课堂小结，直接输出正文。`,
        },
      ],
      temperature: 0.7,
      max_tokens: 4096,
      stream: true,
      ...EXTRA_BODY,
    }),
  });
  if (!res.ok || !res.body) {
    return {
      ttftMs: null,
      totalMs: Date.now() - started,
      ok: false,
      status: res.status,
    };
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let ttftMs = null;
  let chars = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (ttftMs === null) ttftMs = Date.now() - started;
    const chunk = decoder.decode(value, { stream: true });
    const matches = chunk.match(/"content":"/g);
    chars += matches ? matches.length : 0;
  }
  return {
    ttftMs,
    totalMs: Date.now() - started,
    ok: true,
    status: res.status,
    chunks: chars,
  };
}

async function main() {
  requireKeys();
  const targets = images.length
    ? images.map((p) => resolve(ROOT, p))
    : [defaultImage()];

  console.log("== AI 链路延迟诊断 ==");
  console.log(`运行次数/样本: ${runs}`);
  console.log(`vision: ${VISION_MODEL} @ ${VISION_BASE_URL}`);
  console.log(`text  : ${TEXT_MODEL} @ ${TEXT_BASE_URL}`);
  console.log(
    `图片样本: ${targets.map((t) => `${basename(t)}`).join(", ")}` +
      (images.length
        ? ""
        : "（默认最大营销图，仅作载荷代理；真实讲义请显式传路径）"),
  );

  const vision = [];
  let seed = "函数与导数";

  for (const target of targets) {
    const { url, bytes } = dataUrl(target);
    for (let i = 1; i <= runs; i++) {
      const r = await runVision(url);
      vision.push({ ...r, bytes });
      console.log(
        `[vision] ${basename(target)} #${i} 载荷=${(bytes / 1024).toFixed(0)}KB 耗时=${r.ms}ms ` +
          `status=${r.status} finish=${r.finish ?? "-"} promptTok=${r.usage?.prompt_tokens ?? "-"} ` +
          `completionTok=${r.usage?.completion_tokens ?? "-"} ok=${r.ok}`,
      );
      if (i === 1 && r.ok) seed = "函数与导数";
    }
  }

  const text = [];
  for (let i = 1; i <= runs; i++) {
    const r = await runText(seed);
    text.push(r);
    console.log(
      `[text]   #${i} 首token=${r.ttftMs ?? "-"}ms 总时长=${r.totalMs}ms status=${r.status} ok=${r.ok}`,
    );
  }

  const median = (xs) => {
    const arr = xs.filter((x) => typeof x === "number").sort((a, b) => a - b);
    if (!arr.length) return null;
    return arr[Math.floor(arr.length / 2)];
  };

  console.log("\n== 中位汇总 ==");
  console.log(`vision 端到端中位: ${median(vision.map((v) => v.ms)) ?? "-"}ms`);
  console.log(
    `text 首 token 中位: ${median(text.map((t) => t.ttftMs)) ?? "-"}ms`,
  );
  console.log(
    `text 总时长中位: ${median(text.map((t) => t.totalMs)) ?? "-"}ms`,
  );
  console.log(
    `两阶段合计（vision 中位 + text 总时长中位）: ` +
      `${(median(vision.map((v) => v.ms)) ?? 0) + (median(text.map((t) => t.totalMs)) ?? 0)}ms`,
  );
  console.log(
    "\n说明：token 数用于按 provider 账单核对费用；本脚本不打印任何教学内容或密钥。",
  );

  const allFailed = [...vision, ...text].every((r) => !r.ok);
  if (allFailed) {
    console.log(
      "\n⚠️ 全部调用失败：status=402 说明 vision provider 余额/额度不足，" +
        "status=401 说明文本 provider 密钥无效 —— 属凭据问题，不是代码问题；" +
        "换有效凭据后重跑本脚本即可得到基线。",
    );
  }
}

main().catch((err) => {
  console.error("诊断失败:", err.message);
  process.exit(1);
});
