import { expect, test } from "@playwright/test";

/**
 * S01 AC-002（资料持久化）与 AC-004（移动工作台导航）
 *
 * 2026-10-03 解禁：隔离 E2E 数据库已就绪（嵌入式 PG + e2e/.auth，
 * 由 playwright.config globalSetup 建立、走真实 credentials 登录），
 * 不再依赖共享生产库，也不 mock 会话。见 scripts/e2e-env.mjs。
 */

test("AC-002 profile persists：保存后刷新与重登仍显示新值", async ({
  page,
}) => {
  await page.goto("/dashboard/profile");
  await page.getByRole("button", { name: /修改用户名/ }).click();
  const input = page.getByLabel("新用户名");
  await input.fill("测试助教");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByText("已保存", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /修改用户名/ }).click();
  await expect(page.getByLabel("新用户名")).toHaveValue("测试助教");
});

test("AC-004 mobile dashboard navigation：390×844 最多两次交互到达规定入口", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");

  // 目标形态（S01 Spec §3.4）：底部导航 4 个高频入口（1 击直达核心能力）
  const bottomNav = page.getByRole("navigation", { name: "移动端底部导航" });
  await expect(bottomNav).toBeVisible();
  const primary = bottomNav.getByRole("link");
  await expect(primary).toHaveCount(4);
  for (const href of [
    "/dashboard/mistake",
    "/dashboard/weekend-mistake",
    "/dashboard/summary",
    "/dashboard/feedback",
  ]) {
    await expect(bottomNav.locator(`a[href="${href}"]`)).toBeVisible();
  }

  // 触点 ≥44px（NFR-003）
  for (const el of [
    bottomNav.getByRole("link").first(),
    bottomNav.getByRole("button", { name: "更多" }),
  ]) {
    const box = await el.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }

  // More sheet：历史 / 灵感墙 / 个人中心 / 退出登录（展开 1 击 + 选择 1 击 = 2 击）
  await bottomNav.getByRole("button", { name: "更多" }).click();
  const sheet = page.getByRole("dialog", { name: "更多入口" });
  await expect(sheet).toBeVisible();
  for (const label of [
    "生成历史",
    "错题集历史",
    "灵感墙",
    "个人中心",
    "退出登录",
  ]) {
    await expect(sheet.getByText(label, { exact: true })).toBeVisible();
  }

  // 版本真值（S03 T-304）：build metadata 显示（来源 package.json 单一真值）
  await expect(sheet.getByText(/Lekao Agent v\d+\.\d+\.\d+/)).toBeVisible();

  // T-304 任务优先级：回到主页，任务入口（Features）先于资产区（Balance）
  await page.goto("/dashboard");
  const featuresIdx = await page
    .getByText("#01 — Features")
    .first()
    .evaluate((el) => el.getBoundingClientRect().top);
  const balanceIdx = await page
    .getByText("#02 — Balance")
    .first()
    .evaluate((el) => el.getBoundingClientRect().top);
  expect(featuresIdx).toBeLessThan(balanceIdx);
});
