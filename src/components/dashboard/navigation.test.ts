import { describe, expect, it } from "vitest";
import {
  ADMIN_NAV_ITEM,
  MOBILE_LOGOUT_ITEM,
  MOBILE_MORE_ITEMS,
  MOBILE_PRIMARY_HREFS,
  MOBILE_PRIMARY_ITEMS,
  NAV_ITEMS,
} from "./navigation";

/**
 * S01 T-005 / AC-004 · 工作台导航模型（无需登录即可断言的部分）
 *
 * AC-004：390×844 下「最多两次点击」到达任一核心功能、历史和个人中心。
 * 登录态 E2E 受隔离测试库阻塞，这里先锁定模型层不变量：
 * 四条核心流程常驻底部（1 击），历史/个人中心/灵感墙/控制台在 More sheet（展开 1 击 + 选择 1 击 = 2 击）。
 */
const CORE_FLOWS = [
  "/dashboard/mistake",
  "/dashboard/weekend-mistake",
  "/dashboard/summary",
  "/dashboard/feedback",
];

describe("dashboard navigation model", () => {
  it("底部导航恰好 4 个高频入口，且就是四条核心生成流程", () => {
    expect(MOBILE_PRIMARY_ITEMS).toHaveLength(4);
    expect(MOBILE_PRIMARY_ITEMS.map((i) => i.href)).toEqual(CORE_FLOWS);
    expect([...MOBILE_PRIMARY_HREFS]).toEqual(CORE_FLOWS);
  });

  it("More sheet 覆盖控制台主页、全部记录、社区与个人中心", () => {
    const hrefs = MOBILE_MORE_ITEMS.map((i) => i.href);
    for (const expected of [
      "/dashboard",
      "/dashboard/history",
      "/dashboard/history-mgmt",
      "/dashboard/profile",
      "/dashboard/ideas",
    ]) {
      expect(hrefs, `More sheet 缺少 ${expected}`).toContain(expected);
    }
  });

  it("底部与 More 无重叠，且两者合起来覆盖全部普通入口", () => {
    const overlap = MOBILE_PRIMARY_HREFS.filter((h) =>
      MOBILE_MORE_ITEMS.some((i) => i.href === h),
    );
    expect(overlap).toEqual([]);

    const covered = new Set<string>([
      ...MOBILE_PRIMARY_HREFS,
      ...MOBILE_MORE_ITEMS.map((i) => i.href),
    ]);
    for (const item of NAV_ITEMS) {
      expect(covered.has(item.href), `${item.href} 不可达`).toBe(true);
    }
  });

  it("入口数据结构完整且无重复 href", () => {
    const hrefs = NAV_ITEMS.map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const item of [...NAV_ITEMS, ADMIN_NAV_ITEM]) {
      expect(item.href.startsWith("/")).toBe(true);
      expect(item.label.length).toBeGreaterThan(0);
      expect(typeof item.Icon).toBe("function");
    }
  });

  it("管理入口仅 admin 使用，退出登录不混入普通入口列表", () => {
    expect(NAV_ITEMS.some((i) => i.href.startsWith("/admin"))).toBe(false);
    expect(ADMIN_NAV_ITEM.href).toBe("/admin");
    expect(MOBILE_LOGOUT_ITEM.label).toBe("退出登录");
    expect(NAV_ITEMS.some((i) => i.label === MOBILE_LOGOUT_ITEM.label)).toBe(
      false,
    );
  });
});
