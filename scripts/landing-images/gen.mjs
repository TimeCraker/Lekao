// Lekao 主站配图生成脚本
// 调 MiniMax image-01 真实链路，复用 smart-product-publisher 的 .env 配置
// 用法：node scripts/landing-images/gen.mjs [index]   // 不传 = 全部，传 0-5 = 单张

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { IMAGES, OUTPUT_DIR } from "./config.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 1. 读 smart-publisher backend 的 .env（key 一致账号复用）
const ENV_PATH = resolve(
  __dirname,
  "../../../smart-product-publisher/backend/.env",
);

function loadEnv(path) {
  const text = readFileSync(path, "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // 去引号
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const env = loadEnv(ENV_PATH);
const API_KEY = env.MiniMax_API_KEY;
const BASE_URL = (
  env.MiniMax_BASE_URL || "https://api.minimaxi.com/v1"
).replace(/\/$/, "");
const MODEL = env.MINIMAX_IMAGE_MODEL || "image-01";

if (!API_KEY) {
  console.error(`[FAIL] MiniMax_API_KEY not found in ${ENV_PATH}`);
  process.exit(1);
}

console.log(`[OK] Loaded MiniMax config`);
console.log(`     BASE_URL = ${BASE_URL}`);
console.log(`     MODEL    = ${MODEL}`);
console.log(`     KEY prefix = ${API_KEY.slice(0, 12)}...`);

// 2. 准备输出目录
const outDir = fileURLToPath(OUTPUT_DIR);
mkdirSync(outDir, { recursive: true });
console.log(`[OK] Output dir = ${outDir}`);

// 3. 单张图生成
async function generateOne(img) {
  const url = `${BASE_URL}/image_generation`;
  const body = {
    model: MODEL,
    prompt: img.prompt,
    aspect_ratio: img.aspect_ratio,
    response_format: "base64",
    n: 1,
    prompt_optimizer: true,
  };

  console.log(`\n[GEN] ${img.file}  ratio=${img.aspect_ratio}`);
  const start = Date.now();
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90_000), // image-01 单图常见 30-60s，90s 留 1.5x buffer
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(
      `HTTP ${resp.status} ${resp.statusText}\n${errText.slice(0, 400)}`,
    );
  }

  const payload = await resp.json();
  const b64List = payload?.data?.image_base64 || payload?.image_base64 || [];

  if (!b64List.length) {
    throw new Error(
      `Empty image_base64 response: ${JSON.stringify(payload).slice(0, 400)}`,
    );
  }

  const buffer = Buffer.from(b64List[0], "base64");
  const outPath = resolve(outDir, img.file);
  writeFileSync(outPath, buffer);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `[DONE] ${img.file}  ${(buffer.length / 1024).toFixed(1)} KB  ${elapsed}s`,
  );
  return { file: img.file, bytes: buffer.length, elapsed };
}

// 4. 主流程
const arg = process.argv[2];
const targets = arg !== undefined ? [IMAGES[Number(arg)]] : IMAGES;

if (
  arg !== undefined &&
  (!Number.isInteger(Number(arg)) ||
    Number(arg) < 0 ||
    Number(arg) >= IMAGES.length)
) {
  console.error(`[FAIL] Invalid index ${arg}, expected 0-${IMAGES.length - 1}`);
  process.exit(1);
}

const results = [];
let totalBytes = 0;
for (const img of targets) {
  if (!img) continue;
  try {
    const r = await generateOne(img);
    results.push(r);
    totalBytes += r.bytes;
  } catch (e) {
    console.error(`[FAIL] ${img.file}: ${e.message}`);
    results.push({ file: img.file, error: e.message });
  }
}

console.log(`\n========== SUMMARY ==========`);
for (const r of results) {
  if (r.error) {
    console.log(`  ${r.file.padEnd(35)} FAIL  ${r.error}`);
  } else {
    console.log(
      `  ${r.file.padEnd(35)} OK    ${(r.bytes / 1024).toFixed(1)} KB  ${r.elapsed}s`,
    );
  }
}
console.log(
  `Total ${results.length} images, ${(totalBytes / 1024).toFixed(1)} KB`,
);
console.log(`Output: ${outDir}`);
