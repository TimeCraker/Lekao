import { describe, expect, it } from "vitest";

/**
 * S03 T-302 · 设计 token 守卫
 *
 * 锁定两件事：
 * 1. 语义 token 齐全：四种状态各三件套（base/text/soft，text 达 WCAG AA 注释在列）
 * 2. 组件不散写色值：src/components + src/app 的 TSX 里不允许出现原始 hex
 *    （豁免：OG/图标生成文件——ImageResponse/SVG 拿不到 CSS 变量，必须字面量；
 *     layout 的 theme-color meta 同理）
 */

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..");
const GLOBALS = resolve(ROOT, "src/app/globals.css");

/** 语义状态 → 三件套 CSS 变量名 */
const STATUS_TOKENS = [
  ["success", "--success", "--success-text", "--success-soft"],
  ["warning", "--warning", "--warning-text", "--warning-soft"],
  ["danger", "--danger", "--danger-text", "--danger-soft"],
  ["annotation", "--annotation", "--annotation-text", "--annotation-soft"],
] as const;

const HEX_IN_TSX = /#[0-9a-fA-F]{6}\b/;
/** 无法使用 CSS 变量的合法例外（构建期产物 / SVG 品牌资产 / meta） */
const HEX_EXEMPT = [
  /opengraph-image\.tsx$/,
  /apple-icon\.tsx$/,
  /icon\.tsx$/,
  /icons[/\\]index\.tsx$/,
  /layout\.tsx$/,
];

function walkTsx(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) walkTsx(full, out);
    else if (/\.tsx$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe("语义 token 齐全性", () => {
  const css = readFileSync(GLOBALS, "utf8");

  it.each(STATUS_TOKENS.map(([name, ...vars]) => [name, vars]))(
    "%s 状态三件套（base/text/soft）都在 globals.css 定义",
    (_name, vars) => {
      for (const v of vars) {
        expect(css).toContain(`${v}:`);
      }
    },
  );

  it("text 变体带 WCAG AA 对比度注释（人工核过的证据留在源头）", () => {
    for (const v of ["--success-text", "--warning-text", "--danger-text"]) {
      const line = css
        .split(/\r?\n/)
        .find((l) =>
          new RegExp(`^\\s*${v.replace("--", "--")}\\s*:`, "m").test(l),
        );
      expect(line, `${v} 定义应存在`).toBeTruthy();
      expect(line, `${v} 应带对比度注释`).toMatch(/WCAG|对比度|:\d\.\d+/);
    }
  });

  it("motion 有统一缓动 token（ease-editorial）", () => {
    expect(css).toContain("--ease-editorial:");
  });
});

describe("组件不散写色值", () => {
  const files = walkTsx(resolve(ROOT, "src/components")).concat(
    walkTsx(resolve(ROOT, "src/app")),
  );
  const offenders: string[] = [];

  for (const file of files) {
    const rel = file.slice(ROOT.length + 1);
    if (HEX_EXEMPT.some((re) => re.test(rel))) continue;
    const content = readFileSync(file, "utf8");
    const match = content.match(HEX_IN_TSX);
    if (match) offenders.push(`${rel}: ${match[0]}`);
  }

  it("TSX 里没有原始 hex（一律走语义 token 类名）", () => {
    expect(offenders).toEqual([]);
  });
});
