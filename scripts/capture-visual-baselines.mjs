#!/usr/bin/env node
/**
 * S03 T-307 · 全路由视觉基线捕获（四档宽度 × 关键路由）
 *
 * 产出：
 * - e2e/visual-baselines/<宽度>/<路由名>.png（登录态：复用 e2e/.auth/state.json）
 * - e2e/visual-baselines/manifest.json（每张图的 SHA256 + 尺寸 + 时间，评审证据锚点）
 *
 * 前置：keeper（node scripts/e2e-env.mjs up --hold）+ 生产服务器
 * （DATABASE_URL=lekao_e2e next start），与 perf:audit 登录态测量同一套环境。
 *
 * 用法：node scripts/capture-visual-baselines.mjs --base http://127.0.0.1:3123
 */

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { chromium } from "@playwright/test";

function argOf(name, fallback) {
  const argv = process.argv;
  const inline = argv.find((a) => a.startsWith(`--${name}=`));
  if (inline) return inline.split("=").slice(1).join("=");
  const index = argv.indexOf(`--${name}`);
  if (index >= 0 && argv[index + 1] && !argv[index + 1].startsWith("--")) {
    return argv[index + 1];
  }
  return fallback;
}

const BASE = argOf("base", "http://127.0.0.1:3123");
const STATE = argOf("state", "e2e/.auth/state.json");
const OUT_DIR = resolve(process.cwd(), "e2e/visual-baselines");

const VIEWPORTS = [
  { name: "320", width: 320, height: 690 },
  { name: "390", width: 390, height: 844 },
  { name: "768", width: 768, height: 1024 },
  { name: "1440", width: 1440, height: 900 },
];

// 关键路由（登录态可达；公开页另加 / 与 /login）
const ROUTES = [
  { path: "/", name: "landing" },
  { path: "/login", name: "login" },
  { path: "/dashboard", name: "dashboard" },
  { path: "/dashboard/mistake", name: "mistake" },
  { path: "/dashboard/weekend-mistake", name: "weekend" },
  { path: "/dashboard/summary", name: "summary" },
  { path: "/dashboard/feedback", name: "feedback" },
  { path: "/dashboard/profile", name: "profile" },
];

const manifest = {
  generatedAt: new Date().toISOString(),
  base: BASE,
  shots: [],
};
const browser = await chromium.launch({ channel: "msedge", headless: true });

try {
  for (const vp of VIEWPORTS) {
    const dir = resolve(OUT_DIR, vp.name);
    mkdirSync(dir, { recursive: true });
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      storageState: STATE,
      locale: "zh-CN",
      timezoneId: "Asia/Shanghai",
    });
    const page = await context.newPage();

    for (const route of ROUTES) {
      try {
        await page.goto(`${BASE}${route.path}`, {
          waitUntil: "load",
          timeout: 45_000,
        });
        await page.waitForTimeout(600);
        const file = resolve(dir, `${route.name}.png`);
        const shot = await page.screenshot({ path: file, fullPage: true });
        const hash = createHash("sha256")
          .update(shot)
          .digest("hex")
          .slice(0, 16);
        manifest.shots.push({
          viewport: vp.name,
          route: route.path,
          file: `e2e/visual-baselines/${vp.name}/${route.name}.png`,
          sha256_16: hash,
          bytes: shot.length,
        });
        console.log(`[${vp.name}] ${route.path} → ${hash} (${route.name}.png)`);
      } catch (err) {
        console.log(
          `[${vp.name}] ${route.path} 失败: ${err.message?.slice(0, 80)}`,
        );
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}

writeFileSync(
  resolve(OUT_DIR, "manifest.json"),
  JSON.stringify(manifest, null, 2),
);
console.log(
  `\n== 完成：${manifest.shots.length} 张基线图，清单写入 e2e/visual-baselines/manifest.json ==`,
);
