import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

/**
 * frontend-test 全流程回归 · 2026-10-03（依赖修复后）· rev2
 * 路线文档：docs/testing/2026-10-03-deps-regression-fullrun.md
 * 阶段：S0 冒烟 → S1 账号 → S2 基础数据 → S3 错题集(xlsx+docx+历史) → S4 周末表(exceljs) → S6 负例
 * 数据前缀【E2E】，全部落在隔离库（5433/lekao_e2e）。
 */

const HERE = __dirname;
const MISTAKE_XLSX = resolve(HERE, "fixtures", "e2e-mistake.xlsx");
const WEEKEND_XLSX = resolve(HERE, "fixtures", "e2e-weekend.xlsx");
const INVALID_TXT = resolve(HERE, "fixtures", "e2e-invalid.txt");
const UNAUTH = { cookies: [], origins: [] };

function attachDiagnostics(page: Page) {
  const consoleErrors: string[] = [];
  const badResponses: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
  page.on("response", (r) => {
    if (r.status() >= 500) badResponses.push(`${r.status()} ${r.url()}`);
  });
  return { consoleErrors, badResponses };
}

// ================= S0 冒烟 =================

test.describe("S0 冒烟", () => {
  test("登录页渲染 + 无 console 错误", async ({ page }) => {
    const d = attachDiagnostics(page);
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "邮箱密码" })).toBeVisible();
    await expect(page.getByLabel("邮箱")).toBeVisible();
    expect(d.consoleErrors, d.consoleErrors.join("\n")).toEqual([]);
  });

  test("已登录 dashboard 渲染：Features 先于 Balance", async ({ page }) => {
    const d = attachDiagnostics(page);
    await page.goto("/dashboard");
    const features = page.getByText("#01 — Features").first();
    const balance = page.getByText("#02 — Balance").first();
    await expect(features).toBeVisible();
    const featuresTop = await features.evaluate(
      (el) => el.getBoundingClientRect().top,
    );
    const balanceTop = await balance.evaluate(
      (el) => el.getBoundingClientRect().top,
    );
    expect(featuresTop).toBeLessThan(balanceTop);
    expect(d.consoleErrors, d.consoleErrors.join("\n")).toEqual([]);
  });
});

// ================= S1 账号 =================

test.describe("S1 账号", () => {
  test.use({ storageState: UNAUTH });

  test("负例：错误密码被拒", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "邮箱密码" }).click();
    await page.getByLabel("邮箱").fill("e2e@lekao.test");
    await page.getByLabel("密码").fill("wrong-password!");
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await expect(page.getByText("邮箱或密码错误")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("UI 表单登录成功 → 落 dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "邮箱密码" }).click();
    await page.getByLabel("邮箱").fill("e2e@lekao.test");
    await page.getByLabel("密码").fill("LekaoE2E!2026");
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
    await expect(page.getByText("#01 — Features").first()).toBeVisible();
  });
});

// ================= S2 基础数据 =================

test.describe("S2 基础数据", () => {
  test("每日签到：成功或幂等提示，不崩溃", async ({ page }) => {
    const d = attachDiagnostics(page);
    await page.goto("/dashboard");
    const checkinBtn = page
      .getByRole("button", { name: /签到 \+\d+|^签到|已签到/ })
      .first();
    await expect(checkinBtn).toBeVisible();
    await checkinBtn.click();
    await expect(
      page.getByText(/已签到|已签|签到成功|明日再来|签到失败/).first(),
    ).toBeVisible({ timeout: 10_000 });
    expect(d.consoleErrors, d.consoleErrors.join("\n")).toEqual([]);
  });

  test("灵感墙：新建 → 当日重复标题被拒 → 删除", async ({ page }) => {
    const d = attachDiagnostics(page);
    const title = `【E2E】回归测试灵感 ${Date.now().toString(36)}`;
    const submitIdea = async (t: string, desc: string) => {
      await page.getByRole("button", { name: /提个建议/ }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 10_000 });
      await page.getByPlaceholder("一句话说清楚你想要啥功能").fill(t);
      await page
        .getByPlaceholder("详细说说使用场景、为什么想要这个功能…")
        .fill(desc);
      const respPromise = page.waitForResponse(
        (r) =>
          r.url().includes("/api/lekao/ideas") &&
          r.request().method() === "POST",
        { timeout: 20_000 },
      );
      await dialog.getByRole("button", { name: /发布|提交/ }).click();
      return respPromise;
    };
    const closeDialog = async () => {
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "关闭" })
        .click()
        .catch(async () => page.keyboard.press("Escape"));
      await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 5_000 });
    };

    await page.goto("/dashboard/ideas");

    // 首次提交（成功；若撞上上一轮负例留下的 60s IP 限频窗口，分段等待后重试一次）
    let resp1 = await submitIdea(title, "frontend-test 全流程回归 · 首次提交");
    if (resp1.status() === 429) {
      const t = (await resp1.text()) as string;
      if (t.includes("请求过于频繁")) {
        await page.waitForTimeout(61_000);
        resp1 = await submitIdea(title, "frontend-test 全流程回归 · 首次提交");
      }
    }
    expect(resp1.status(), await resp1.text()).toBeLessThan(400);
    await expect(page.getByText(title).first()).toBeVisible({
      timeout: 20_000,
    });
    await closeDialog();

    // 负例：当天第二次提交 → 必须被拦（每日 1 次 / 重复标题 / 60s IP 限频均为产品定义的守卫，
    // 断言「429 + 前端可见友好提示」，不预设具体命中哪条规则）
    const resp2P = submitIdea(title, "frontend-test 负例：超限提交");
    const resp2 = await resp2P;
    expect(resp2.status()).toBe(429);
    const errBody = (await resp2.json()) as { error?: string };
    expect(errBody.error).toBeTruthy();
    await expect(
      page.getByText(errBody.error!.slice(0, 12)).first(),
    ).toBeVisible({ timeout: 15_000 });
    await closeDialog();

    // 清理：删除（二次确认弹窗）
    await page.getByTitle("删除灵感").first().click();
    await expect(page.getByText("删除这条灵感？")).toBeVisible();
    await page.getByRole("button", { name: "删除", exact: true }).click();
    await expect(page.getByText(title)).toHaveCount(0, { timeout: 20_000 });
    // 负例的 429 是预期行为，过滤浏览器自动记录的 429 资源日志
    const realErrors = d.consoleErrors.filter((e) => !e.includes("429"));
    expect(realErrors, realErrors.join("\n")).toEqual([]);
    expect(d.badResponses, d.badResponses.join("\n")).toEqual([]);
  });
});

// ================= S3 错题集核心链（xlsx + docx + 历史） =================

test.describe("S3 错题集核心链", () => {
  test("负例：上传非法文件不进入解析步骤", async ({ page }) => {
    await page.goto("/dashboard/mistake");
    const input = page
      .locator('input[type="file"][accept=".xlsx,.xls"]')
      .first();
    await input.setInputFiles(INVALID_TXT);
    // 核心：非法文件不得进入 Step 2（是否弹错误提示依实现，5s 内二选一）
    await page.waitForTimeout(5_000);
    await expect(page.getByText(/Step 2 ·/)).toHaveCount(0);
    await expect(
      page.getByText(/失败|错误|无法|不支持|格式|请上传/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("正例：上传 → 选学科 → 封面 → 填题号 → 导出 Word → 历史面板", async ({
    page,
  }) => {
    const d = attachDiagnostics(page);
    await page.goto("/dashboard/mistake");

    // Step 1 · 上传（等上传区就绪，避免竞态）
    await expect(page.getByText(/Step 1 ·/).first()).toBeVisible({
      timeout: 10_000,
    });
    await page
      .locator('input[type="file"][accept=".xlsx,.xls"]')
      .first()
      .setInputFiles(MISTAKE_XLSX);

    // Step 2 · 选学科（Sheet 名三年二班）
    const sheetBtn = page.getByRole("button", { name: /三年二班/ }).first();
    await expect(sheetBtn).toBeVisible({ timeout: 30_000 });
    await sheetBtn.click();

    // Step 2.5 · 确认封面
    const coverConfirm = page
      .getByRole("button")
      .filter({ hasText: /^(确认|下一步|开始|生成)/ })
      .first();
    await expect(coverConfirm).toBeVisible({ timeout: 10_000 });
    await coverConfirm.click();

    // Step 3 · 填题号（首位学生文本输入）
    await expect(page.getByText(/Step 3 ·/)).toBeVisible({ timeout: 10_000 });
    const qInput = page
      .locator('input[placeholder*="题"], textarea[placeholder*="题"]')
      .first();
    if (await qInput.count()) {
      await qInput.fill("1, 2");
    }

    // Step 4 · 全选 + 直接下载
    await expect(page.getByText(/Step 4 ·/)).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "全选", exact: true }).click();
    const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
    await page.getByRole("button", { name: /直接下载 \d+ 份 docx/ }).click();
    const download = await downloadPromise;

    // 断言：docx = ZIP 容器 → PK 魔数 + 体积合理
    const path = await download.path();
    const buf = readFileSync(path!);
    expect(buf.length).toBeGreaterThan(5_000);
    expect(buf.subarray(0, 2).toString("latin1")).toBe("PK");
    expect(await download.suggestedFilename()).toMatch(/张小明|李小红|错题集/);

    // 历史面板（同 context：错题历史存浏览器本地）
    await expect(page.getByText(/三年二班|历史/).first()).toBeVisible({
      timeout: 10_000,
    });

    // 5xx 零容忍；4xx 记录不阻断
    expect(d.badResponses, d.badResponses.join("\n")).toEqual([]);
    if (d.consoleErrors.length) {
      console.log("[S3 console]", d.consoleErrors.join("\n"));
    }
  });
});

// ================= S4 周末反馈表（exceljs 链） =================

test.describe("S4 周末反馈表", () => {
  test("上传周末 Excel → 日期改写 → 下一步 → 学生就绪（AI 豁免）", async ({
    page,
  }) => {
    const d = attachDiagnostics(page);
    await page.goto("/dashboard/weekend-mistake");
    await page
      .locator('input[type="file"][accept=".xlsx,.xls"]')
      .first()
      .setInputFiles(WEEKEND_XLSX);

    // 日期自动改写为今日
    const today = new Date();
    const cn = `${today.getMonth() + 1}月${today.getDate()}日`;
    await expect(
      page
        .getByText(new RegExp(`${cn}|${today.toISOString().slice(0, 10)}`))
        .first(),
    ).toBeVisible({ timeout: 15_000 });

    // 进入填错题步骤
    await page.getByRole("button", { name: /下一步：填错题/ }).click();

    // 学生名单就绪（姓名渲染在输入框 value 中，经删除按钮的可访问名断言）
    await expect(
      page.getByRole("button", { name: "删除 【E2E】张小明" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("button", { name: "删除 【E2E】李小红" }),
    ).toBeVisible();
    expect(d.consoleErrors, d.consoleErrors.join("\n")).toEqual([]);
    expect(d.badResponses, d.badResponses.join("\n")).toEqual([]);
  });
});

// ================= S6 回归负例 =================

test.describe("S6 回归负例", () => {
  test.use({ storageState: UNAUTH });

  test("未登录访问 /dashboard 必须重定向 /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/(login|auth)/, { timeout: 15_000 });
  });
});
