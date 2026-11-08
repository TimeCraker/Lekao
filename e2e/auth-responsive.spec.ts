import { expect, test } from "@playwright/test";

/**
 * S01 AC-003 / T-004 · 认证表单与窄屏布局
 *
 * 三个断言分属不同状态，注意区分：
 * 1. 窄屏无横向滚动 —— 回归锁定（条款链接与布局在 2026-10 前已修）
 * 2. 条款/隐私链接指向真实路由 —— 回归锁定
 * 3. 表单 autocomplete/name —— **当前红灯**，全站零 autocomplete 属性（T-004 待补）
 */
const WIDTHS = [320, 390, 430] as const;

test.describe("auth responsive", () => {
  for (const width of WIDTHS) {
    test(`注册与登录页在 ${width}px 无横向滚动`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      for (const path of ["/register", "/login"]) {
        await page.goto(path);
        const { scrollWidth, clientWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        expect(
          scrollWidth,
          `${path} @${width}px 横向溢出：scrollWidth=${scrollWidth} clientWidth=${clientWidth}`,
        ).toBeLessThanOrEqual(clientWidth + 1);
      }
    });
  }

  test("条款与隐私链接指向真实路由", async ({ page }) => {
    for (const path of ["/register", "/login"]) {
      await page.goto(path);
      await expect(page.locator('a[href="/terms"]').first()).toBeVisible();
      await expect(page.locator('a[href="/privacy"]').first()).toBeVisible();
    }
  });

  test("认证表单可被密码管理器识别（autocomplete + name）", async ({
    page,
  }) => {
    await page.goto("/register");
    const email = page.locator("#reg-email");
    await expect(email).toHaveAttribute("name", /.+/);
    await expect(email).toHaveAttribute("autocomplete", "email");
    const newPassword = page.locator("#reg-password");
    await expect(newPassword).toHaveAttribute("name", /.+/);
    await expect(newPassword).toHaveAttribute("autocomplete", "new-password");

    await page.goto("/login");
    const loginPassword = page.locator('input[type="password"]').first();
    await expect(loginPassword).toHaveAttribute("name", /.+/);
    await expect(loginPassword).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
  });

  test("认证主交互触点 ≥44px（NFR-003）", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ["/register", "/login"]) {
      await page.goto(path);
      const submit = page.locator('button[type="submit"]').first();
      const submitBox = await submit.boundingBox();
      expect(submitBox, `${path} 未找到提交按钮`).not.toBeNull();
      expect(
        submitBox!.height,
        `${path} 提交按钮高度 ${submitBox!.height}px < 44px`,
      ).toBeGreaterThanOrEqual(44);

      // 发送验证码按钮（登录验证码模式 / 注册页）
      const resend = page
        .getByRole("button", { name: /发送验证码|重新发送/ })
        .first();
      if ((await resend.count()) > 0) {
        const resendBox = await resend.boundingBox();
        expect(
          resendBox!.height,
          `${path} 发送验证码按钮高度 ${resendBox!.height}px < 44px`,
        ).toBeGreaterThanOrEqual(44);
      }
    }
  });
});
