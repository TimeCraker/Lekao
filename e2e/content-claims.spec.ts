import { expect, test } from "@playwright/test";

/**
 * S01 AC-010 / T-007 · 产品声明真值（无需登录的部分）
 *
 * 2026-10-02 复核：internal 术语（BRD/硬约束）与无证据评分（aggregateRating）已不在源码中，
 * 因此这两条是回归锁定；真正的能力真值一致性由 T-007 的 registry + copy tests 承担。
 */
test.describe("content claims", () => {
  test("首页不出现内部术语与无证据评分字段", async ({ page }) => {
    await page.goto("/");
    const text = await page.locator("body").innerText();
    for (const forbidden of [
      "BRD",
      "硬约束",
      "aggregateRating",
      "ratingValue",
    ]) {
      expect(text, `首页不应出现「${forbidden}」`).not.toContain(forbidden);
    }
  });

  test("首页主 CTA 指向注册或登录", async ({ page }) => {
    await page.goto("/");
    const cta = page
      .locator('a[href="/register"], a[href="/login"]')
      .filter({ hasText: /免费|创建|开始|登录/ })
      .first();
    await expect(cta).toBeVisible();
  });
});
