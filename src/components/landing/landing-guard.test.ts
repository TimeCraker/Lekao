import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * S03 T-303 · 落地页首屏守卫
 *
 * - 主 CTA 唯一：hero 实底强调色 CTA（bg-accent-text）只允许 1 个
 * - 2026-10-03 owner 决策：保留电影感入场动画（原「禁首屏延迟入场」条目废止——
 *   视觉质感优先于入场延迟，LCP 实测 204ms 仍有充足余量）
 *   滚动驱动的视差/淡出（useScroll）不受限
 */
const HERO = resolve(import.meta.dirname, "hero.tsx");
const hero = readFileSync(HERO, "utf8");

describe("落地页首屏守卫", () => {
  it("主 CTA 唯一：实底强调色 CTA 恰好 1 个", () => {
    const solidCtas = hero.match(/bg-accent-text/g) ?? [];
    expect(solidCtas).toHaveLength(1);
    expect(hero).toContain("免费开始");
  });

  it("首屏允许电影感入场（owner 决策保留），且保留滚动叙事", () => {
    // 2026-10-03 owner 决策：入场动画恢复（原禁用条目废止）
    expect(hero).toContain("useScroll");
  });
});

describe("营销页 IA 构成（T-303 板块核对）", () => {
  const page = readFileSync(
    resolve(import.meta.dirname, "../../app/(marketing)/page.tsx"),
    "utf8",
  );

  it("五大板块全部在位（Hero/能力/证据/工作流/FAQ + JSON-LD + 进度条）", () => {
    expect(page).toContain("<Hero />");
    expect(page).toContain("<FeatureCards />");
    expect(page).toContain("<Stats />");
    expect(page).toContain("<Workflow />");
    expect(page).toContain("<FAQ />");
    expect(page).toContain("application/ld+json");
    expect(page).toContain("<ScrollProgress />");
  });

  it("板块顺序符合现行 IA（Hero → 能力 → 证据 → 工作流 → FAQ）", () => {
    const order = [
      "<Hero />",
      "<FeatureCards />",
      "<Stats />",
      "<Workflow />",
      "<FAQ />",
    ].map((token) => page.indexOf(token));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("会话客户端边界隔离：服务端首页不直接取 session（navbar 孤岛负责）", () => {
    expect(page).not.toMatch(/getServerSession|useSession/);
  });
});
