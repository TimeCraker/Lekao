#!/usr/bin/env node
/**
 * B-03/B-04 根因探针 · 资料改名后硬刷新回退
 *
 * 流程：UI 登录 → 进 profile → 改名保存 → 硬刷新 →
 * 记录：最终 URL / 响应状态码 / 响应头 / Cookie 状态 / 页面标题 / 截图
 * 同时打印每一步的网络响应（过滤 dashboard/profile 与 auth），
 * 供与服务器 journalctl 对照。
 *
 * 用法：node scripts/diagnose-profile-reload.mjs --base https://lekao.asterforge.top
 */

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

const BASE = argOf("base", "https://lekao.asterforge.top");
const EMAIL = argOf("email", "admin@example.com");
const PASSWORD = argOf("password", "#jIN1L4bw%NB");
const ART = resolve(process.cwd(), "e2e/fullflow");
mkdirSync(ART, { recursive: true });

const findings = [];
const netLog = [];
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 860 },
  locale: "zh-CN",
});
const page = await context.newPage();

page.on("response", (res) => {
  const u = res.url();
  if (u.includes("/dashboard/profile") || u.includes("/api/auth")) {
    netLog.push(`${res.status()}  ${res.request().method()}  ${u}`);
  }
});
page.on("console", (msg) => {
  if (msg.type() === "error")
    netLog.push(`[console.error] ${msg.text().slice(0, 140)}`);
});

function step(msg) {
  console.log(`\n── ${msg}`);
  findings.push(`── ${msg}`);
}
function fact(key, value) {
  console.log(`   ${key}: ${value}`);
  findings.push(`   ${key}: ${value}`);
}

// 1) UI 登录
step("1. UI 登录");
await page.goto(`${BASE}/login`, { waitUntil: "load" });
await page
  .locator('input[type="email"], input[name="email"]')
  .first()
  .fill(EMAIL);
await page.locator('input[type="password"]').first().fill(PASSWORD);
await page
  .getByRole("button", { name: /登录|登 录/ })
  .first()
  .click();
await page.waitForURL(/dashboard/, { timeout: 30_000 }).catch(() => {});
fact("登录后 URL", page.url());

// 2) 登录后的会话 Cookie 状态
const cookies = await context.cookies();
const sessionCookies = cookies.filter((c) => c.name.includes("session-token"));
for (const c of sessionCookies) {
  fact(
    `Cookie ${c.name}`,
    `domain=${c.domain} path=${c.path} expires=${c.expires === -1 ? "会话级" : new Date(c.expires * 1000).toISOString()} httpOnly=${c.httpOnly} secure=${c.secure}`,
  );
}
if (sessionCookies.length === 0) fact("Cookie", "⚠️ 无 session-token Cookie！");

// 3) 进 profile，确认表单可开
step("2. 打开 profile + 编辑表单");
await page.goto(`${BASE}/dashboard/profile`, { waitUntil: "load" });
fact("URL", page.url());
for (let i = 0; i < 3; i++) {
  const btn = page.getByRole("button", { name: /修改用户名/ });
  if (await btn.isVisible().catch(() => false))
    await btn.click().catch(() => {});
  if (
    await page
      .getByLabel("新用户名")
      .isVisible({ timeout: 4000 })
      .catch(() => false)
  )
    break;
}
const formOpen = await page
  .getByLabel("新用户名")
  .isVisible()
  .catch(() => false);
fact("编辑表单可开", formOpen);

// 4) 改名保存
step("3. 改名为【探针】硬刷新测试 并保存");
const input = page.getByLabel("新用户名");
await input.fill("【探针】硬刷新测试");
await page.getByRole("button", { name: "保存", exact: true }).click();
await page.waitForTimeout(2500);
fact("保存后 URL", page.url());
fact(
  "保存后页面含新名",
  await page
    .getByText("【探针】硬刷新测试")
    .first()
    .isVisible()
    .catch(() => false),
);

// 5) 硬刷新（reload）并逐项捕获
step("4. page.reload() 硬刷新");
const responses = [];
page.on("response", (res) => responses.push(`${res.status()}  ${res.url()}`));
await page.reload({ waitUntil: "load" });
await page.waitForTimeout(2500);
fact("硬刷新后 URL", page.url());
fact("硬刷新后标题", await page.title());
fact(
  "硬刷新后页面含新名",
  await page
    .getByText("【探针】硬刷新测试")
    .first()
    .isVisible()
    .catch(() => false),
);
fact(
  "硬刷新后页面含旧名(管理员01)",
  await page
    .getByText("管理员01")
    .first()
    .isVisible()
    .catch(() => false),
);
fact(
  "编辑按钮可见",
  await page
    .getByRole("button", { name: /修改用户名/ })
    .isVisible()
    .catch(() => false),
);
await page.screenshot({
  path: resolve(ART, "probe-after-reload.png"),
  fullPage: true,
});

// 6) 再硬刷新一次（二连，排除偶发）
step("5. 第二次硬刷新");
await page.reload({ waitUntil: "load" });
await page.waitForTimeout(2500);
fact("二次刷新后 URL", page.url());
fact(
  "二次刷新后页面含新名",
  await page
    .getByText("【探针】硬刷新测试")
    .first()
    .isVisible()
    .catch(() => false),
);

// 7) Cookie 最终状态
step("6. 硬刷新后的 Cookie 状态");
const cookiesAfter = await context.cookies();
for (const c of cookiesAfter.filter((c) => c.name.includes("session-token"))) {
  fact(
    `Cookie ${c.name}`,
    `domain=${c.domain} expires=${c.expires === -1 ? "会话级" : new Date(c.expires * 1000).toISOString()}`,
  );
}
if (!cookiesAfter.some((c) => c.name.includes("session-token"))) {
  fact("Cookie", "⚠️ 硬刷新后 session-token 丢失！");
}

console.log("\n── 网络（dashboard/profile + auth 相关）──");
for (const line of netLog.slice(0, 30)) console.log(`   ${line}`);
console.log("\n── 硬刷新瞬间的响应 ──");
for (const line of responses.slice(0, 20)) console.log(`   ${line}`);

findings.push("", "── 网络日志 ──", ...netLog.slice(0, 40));
writeFileSync(resolve(ART, "probe-findings.txt"), findings.join("\n"));
console.log(
  `\n探针证据: e2e/fullflow/probe-findings.txt + probe-after-reload.png`,
);

await browser.close();
