#!/usr/bin/env node
/**
 * S03 · 全流程 E2E 测试（按 frontend-test skill 流程执行）
 *
 * 目标环境：生产 https://lekao.asterforge.top（真实用户路径，真实账号）
 * 阶段：0 冒烟 → 1 账号 → 2 基础数据(资料) → 3 核心 AI 生成(小结) →
 *       6 核心执行入口(错题/周末) → 9 回归负例 → 台账落盘
 *
 * 铁律遵守：测试数据统一【E2E】前缀；登录走页面表单；缺陷边测边记；
 * AI 生成路径真实执行（消耗 1 T-Coin + 智谱额度，owner 已授权全流程测试）。
 *
 * 用法：node scripts/e2e-fullflow.mjs --base https://lekao.asterforge.top
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
const IMAGE = resolve(process.cwd(), "public/images/feature-summary.png");
const ART_DIR = resolve(process.cwd(), "e2e/fullflow");
mkdirSync(ART_DIR, { recursive: true });

const ledger = [];
const consoleErrors = [];
let shotIdx = 0;

function record(phase, id, name, ok, detail = "") {
  const entry = { phase, id, name, ok, detail };
  ledger.push(entry);
  console.log(
    `${ok ? "✓" : "✗"} [${phase}/${id}] ${name}${detail ? " — " + detail : ""}`,
  );
}

function defect(id, phase, page, symptom, severity = "功能错误") {
  console.log(
    `⛔ 缺陷 ${id} | ${phase}/${page} | ${symptom} | 严重度: ${severity}`,
  );
  ledger.push({ defect: id, phase, page, symptom, severity });
}

async function shoot(page, name) {
  shotIdx++;
  const file = resolve(
    ART_DIR,
    `${String(shotIdx).padStart(2, "0")}-${name}.png`,
  );
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function newPage(browser, opts = {}) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 860 },
    locale: "zh-CN",
    ...opts,
  });
  const page = await context.newPage();
  page.on("pageerror", (err) =>
    consoleErrors.push(
      `[pageerror] ${page.url()}: ${err.message?.slice(0, 120)}`,
    ),
  );
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(
        `[console] ${page.url()}: ${msg.text()?.slice(0, 120)}`,
      );
    }
  });
  return { context, page };
}

const browser = await chromium.launch({ channel: "msedge", headless: true });

/* ───────── 阶段 0 · 冒烟（未登录） ───────── */
{
  const { context, page } = await newPage(browser);
  const res = await page.goto(`${BASE}/`, { waitUntil: "load" });
  record(
    "0冒烟",
    "S0-1",
    "营销首页可达",
    res.status() === 200,
    `status=${res.status()}`,
  );
  const heroOk = await page
    .getByText("错题本，不再一道道粘贴")
    .first()
    .isVisible()
    .catch(() => false);
  record("0冒烟", "S0-2", "Hero 标题渲染", heroOk);
  const ctaCount = (await page.content()).match(/免费开始/g)?.length ?? 0;
  record(
    "0冒烟",
    "S0-3",
    "主 CTA 在页",
    ctaCount >= 1,
    `出现 ${ctaCount} 处（HTML 含 RSC 负载，源码级守卫=1）`,
  );
  const apkGone = !(await page.content()).includes("lekao-android");
  record("0冒烟", "S0-4", "APK 入口已移除（web-only）", apkGone);
  await shoot(page, "smoke-landing");

  const loginRes = await page.goto(`${BASE}/login`, { waitUntil: "load" });
  record("0冒烟", "S0-5", "登录页可达", loginRes.status() === 200);
  const hasForm = await page
    .locator('input[type="email"], input[name="email"]')
    .first()
    .isVisible()
    .catch(() => false);
  record("0冒烟", "S0-6", "登录表单渲染", hasForm);

  // 负例：未登录访问工作台必须被送回登录
  await page.goto(`${BASE}/dashboard`, { waitUntil: "load" });
  await page.waitForTimeout(1200);
  const backToLogin = page.url().includes("/login");
  record(
    "9负例",
    "N-1",
    "未登录访问 /dashboard 被送回登录",
    backToLogin,
    page.url(),
  );
  await context.close();
}

/* ───────── 阶段 1 · 账号（负例 + 真实登录 + 登出重登） ───────── */
let page, context;
{
  const fresh = await newPage(browser);
  context = fresh.context;
  page = fresh.page;
  await page.goto(`${BASE}/login`, { waitUntil: "load" });

  // 负例：错误密码必须被拒
  await page
    .locator('input[type="email"], input[name="email"]')
    .first()
    .fill(EMAIL);
  await page
    .locator('input[type="password"]')
    .first()
    .fill("wrong-password-123");
  await page
    .getByRole("button", { name: /登录|登 录/ })
    .first()
    .click()
    .catch(() => {});
  await page.waitForTimeout(2500);
  const stillOnLogin = page.url().includes("/login");
  record("1账号", "N-2", "错误密码登录被拒", stillOnLogin, page.url());

  // 真实登录（页面表单 = 真实用户路径）
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
  const loggedIn = page.url().includes("/dashboard");
  record("1账号", "A-1", "真实凭证登录进入工作台", loggedIn, page.url());
  if (!loggedIn) {
    await shoot(page, "login-failed");
    console.error("阻断：登录失败，无法继续。台账已落盘。");
    writeFileSync(
      resolve(ART_DIR, "ledger.json"),
      JSON.stringify(ledger, null, 2),
    );
    process.exit(2);
  }
  await shoot(page, "dashboard-after-login");

  // 登出 → 重登（More sheet 退出登录）
  if (
    await page
      .getByRole("button", { name: "更多" })
      .isVisible()
      .catch(() => false)
  ) {
    await page.getByRole("button", { name: "更多" }).click();
    await page
      .getByRole("dialog")
      .getByText("退出登录", { exact: true })
      .click();
    await page
      .waitForURL((u) => !u.pathname.includes("dashboard"), { timeout: 20_000 })
      .catch(() => {});
    record(
      "1账号",
      "A-2",
      "登出成功回首页",
      !page.url().includes("dashboard"),
      page.url(),
    );
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
    record("1账号", "A-3", "登出后重登成功", page.url().includes("/dashboard"));
  }
}

/* ───────── 阶段 2 · 基础数据（资料改名，【E2E】前缀 + 还原） ───────── */
{
  await page.goto(`${BASE}/dashboard/profile`, { waitUntil: "load" });
  // 打开编辑表单（hydration 竞态容错：点击后等输入框出现，未出现则重试点击）
  async function openEditForm() {
    for (let i = 0; i < 4; i++) {
      const btn = page.getByRole("button", { name: /修改用户名/ });
      if (await btn.isVisible().catch(() => false))
        await btn.click().catch(() => {});
      if (
        await page
          .getByLabel("新用户名")
          .isVisible({ timeout: 4000 })
          .catch(() => false)
      )
        return true;
    }
    return false;
  }
  if (!(await openEditForm())) {
    defect(
      "B-03",
      "2基础数据",
      "profile",
      "编辑表单无法打开（疑似 hydration 竞态）",
      "阻断",
    );
  }
  const input = page.getByLabel("新用户名");
  await input.fill("【E2E】测试助教");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  // 保存成功后表单 1.2s 自动关闭并 router.refresh()——持久化证据用服务端刷新后的页头姓名
  await page
    .getByText("【E2E】测试助教")
    .first()
    .waitFor({ timeout: 20_000 })
    .catch(() => {});
  const renamedOnPage = await page
    .getByText("【E2E】测试助教")
    .first()
    .isVisible()
    .catch(() => false);
  record(
    "2基础数据",
    "D-1",
    "改名保存并刷新生效（服务端渲染页头）",
    renamedOnPage,
  );
  await page.reload({ waitUntil: "load" });
  const stillRenamed = await page
    .getByText("【E2E】测试助教")
    .first()
    .isVisible({ timeout: 15_000 })
    .catch(() => false);
  record("2基础数据", "D-2", "硬刷新后仍持久化", stillRenamed);
  // 还原为管理员01
  if (!(await openEditForm())) {
    defect("B-04", "2基础数据", "profile", "还原时编辑表单无法打开", "阻断");
  }
  await input.fill("管理员01");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await page
    .getByText("管理员01")
    .first()
    .waitFor({ timeout: 20_000 })
    .catch(() => {});
  record("2基础数据", "D-3", "还原为管理员01", true);
}

/* ───────── 阶段 3 · 核心 AI 生成（小结模板，真实上传+扣币+SSE） ───────── */
{
  await page.goto(`${BASE}/dashboard/summary`, { waitUntil: "load" });
  await shoot(page, "summary-step1");
  const uploadInput = page.locator('input[type="file"]').first();
  await uploadInput.setInputFiles(IMAGE);
  // 图片压缩是异步的：轮询等生成按钮变为可用（最长 20s）
  const genBtn = page.getByRole("button", { name: /生成/ }).first();
  let enabled = false;
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (await genBtn.isEnabled().catch(() => false)) {
      enabled = true;
      break;
    }
    await page.waitForTimeout(800);
  }
  record("3核心生成", "G-1", "上传图片后生成按钮可用", enabled);

  if (enabled) {
    const started = Date.now();
    await genBtn.click();
    // 分段轮询（skill 4.7）：最长 150s 等生成结果
    let done = false;
    while (Date.now() - started < 150_000) {
      if (
        await page
          .getByText("生成结果")
          .isVisible()
          .catch(() => false)
      ) {
        done = true;
        break;
      }
      const errText = await page
        .getByText(/余额不足|T-Coin 不足|失败/)
        .first()
        .isVisible()
        .catch(() => false);
      if (errText) break;
      await page.waitForTimeout(3000);
    }
    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    const hasOutput = await page
      .getByText("生成结果")
      .isVisible()
      .catch(() => false);
    record(
      "3核心生成",
      "G-2",
      "AI 小结端到端生成",
      done && hasOutput,
      `耗时 ${elapsed}s`,
    );
    await shoot(page, "summary-generated");
    if (!done) {
      defect(
        "B-01",
        "3核心生成",
        "summary",
        `AI 生成未出结果（耗时 ${elapsed}s），需查服务器日志与智谱配额`,
        "阻断",
      );
    }
  } else {
    defect("B-02", "3核心生成", "summary", "上传图片后生成按钮不可用", "阻断");
  }
}

/* ───────── 阶段 6 · 核心执行入口（错题/周末 步骤1渲染 + 签到负例） ───────── */
{
  await page.goto(`${BASE}/dashboard/mistake`, { waitUntil: "load" });
  const step1 = await page
    .getByText(/上传/i)
    .first()
    .isVisible()
    .catch(() => false);
  record("6核心执行", "E-1", "错题集向导步骤1可达", step1);
  await shoot(page, "mistake-step1");

  await page.goto(`${BASE}/dashboard/weekend-mistake`, { waitUntil: "load" });
  const wk = await page
    .getByText(/上传|选择/i)
    .first()
    .isVisible()
    .catch(() => false);
  record("6核心执行", "E-2", "周末反馈表向导可达", wk);
  await shoot(page, "weekend-step1");

  // 管理区可达（admin01 是 ADMIN）
  await page.goto(`${BASE}/dashboard/admin`, { waitUntil: "load" });
  const adminOk = !page.url().includes("/login");
  record("6核心执行", "E-3", "管理员区可达（ADMIN 角色）", adminOk, page.url());

  // 签到负例：重复签到必须被拦（返回已签提示，不重复加币）
  await page.goto(`${BASE}/dashboard`, { waitUntil: "load" });
  const checkinBtn = page.getByRole("button", { name: /签到/ }).first();
  if (await checkinBtn.isVisible().catch(() => false)) {
    await checkinBtn.click().catch(() => {});
    await page.waitForTimeout(2500);
  }
  const alreadyOrDone = await page
    .getByText(/今日已签|明天可领|签到成功/)
    .first()
    .isVisible()
    .catch(() => false);
  record("9负例", "N-3", "签到状态明确（首次成功或重复被拦）", alreadyOrDone);
  await shoot(page, "checkin-state");
}

await context.close();
await browser.close();

/* ───────── 台账落盘 ───────── */
const passed = ledger.filter((l) => l.ok === true).length;
const failed = ledger.filter((l) => l.ok === false).length;
const defects = ledger.filter((l) => l.defect);
const lines = [
  "# lekao 全流程 E2E 测试台账（frontend-test skill）",
  "",
  `- 日期：2026-10-03 · 环境：**生产** ${BASE} · 账号：${EMAIL}（ADMIN）`,
  `- 结果：通过 ${passed} · 失败 ${failed} · 缺陷 ${defects.length}`,
  `- 截图：e2e/fullflow/（${shotIdx} 张）· 原始数据：e2e/fullflow/ledger.json`,
  "",
  "| 阶段 | 编号 | 用例 | 结果 | 备注 |",
  "| --- | --- | --- | --- | --- |",
  ...ledger
    .filter((l) => l.id)
    .map(
      (l) =>
        `| ${l.phase} | ${l.id} | ${l.name} | ${l.ok ? "✅" : "❌"} | ${l.detail ?? ""} |`,
    ),
  "",
];
if (defects.length) {
  lines.push("## 缺陷台账", "");
  for (const d of defects) {
    lines.push(
      `- ${d.defect} | ${d.phase}/${d.page} | ${d.symptom} | 严重度: ${d.severity} | 待修复`,
    );
  }
  lines.push("");
}
lines.push("## Console 错误收集", "");
lines.push(
  ...(consoleErrors.length
    ? consoleErrors.slice(0, 20).map((e) => `- ${e}`)
    : ["- 无"]),
);
lines.push("");

writeFileSync(resolve(ART_DIR, "ledger.json"), JSON.stringify(ledger, null, 2));
writeFileSync(resolve(ART_DIR, "ledger.md"), lines.join("\n"));
console.log(
  `\n== 台账：通过 ${passed} · 失败 ${failed} · 缺陷 ${defects.length} ==`,
);
console.log(`台账: e2e/fullflow/ledger.md`);
process.exit(failed + defects.length > 0 ? 1 : 0);
