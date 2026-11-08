import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buttonClass, type ButtonVariant, type ButtonSize } from "./primitives";

/**
 * S03 T-302 · primitives 状态矩阵与 Server Component 兼容性
 */
const VARIANTS: ButtonVariant[] = ["primary", "secondary", "ghost"];
const SIZES: ButtonSize[] = ["sm", "md"];

describe("buttonClass 状态矩阵", () => {
  it("3 变体 × 2 尺寸 = 6 个互不相同的类名组合", () => {
    const all = new Set(
      VARIANTS.flatMap((v) => SIZES.map((s) => buttonClass(v, s))),
    );
    expect(all.size).toBe(6);
  });

  it("所有组合都带 focus-visible ring 与最小触点（NFR-003）", () => {
    for (const v of VARIANTS) {
      for (const s of SIZES) {
        const cls = buttonClass(v, s);
        expect(cls).toContain("focus-visible:ring-2");
        expect(cls).toMatch(/min-h-(9|11)/);
      }
    }
  });

  it("primary 用实底、secondary/ghost 用软底（状态可辨识不只靠颜色）", () => {
    expect(buttonClass("primary")).toContain("bg-accent-text");
    expect(buttonClass("secondary")).toContain("bg-canvas-alt");
    expect(buttonClass("ghost")).toContain("hover:bg-canvas-alt");
  });

  it("禁用态 opacity 由基类统一承担", () => {
    expect(buttonClass("primary")).toContain("disabled:opacity-50");
  });
});

describe("Server Component 兼容", () => {
  it('primitives.tsx 不含 "use client"（可在服务端渲染）', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, "primitives.tsx"),
      "utf8",
    );
    expect(source).not.toMatch(/["']use client["']/);
  });
});
