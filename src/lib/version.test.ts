import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_VERSION } from "./version";

/**
 * S01 T-006 · 版本真值回归
 *
 * 1. package.json 是唯一真值，且格式为 x.y.z
 * 2. next.config.ts 在构建期把它注入 NEXT_PUBLIC_APP_VERSION（页面不得手写）
 * 3. src 下不存在硬编码的产品版本号（剔除注释后扫描）
 */
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(full)) out.push(full);
  }
  return out;
}

describe("产品版本真值", () => {
  it("package.json 的 version 是 x.y.z 且被 next.config.ts 注入", () => {
    const pkg = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { version: string };
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);

    const configSrc = readFileSync(
      resolve(process.cwd(), "next.config.ts"),
      "utf8",
    );
    expect(configSrc).toContain("NEXT_PUBLIC_APP_VERSION");
    expect(configSrc).toContain("package.json");
  });

  it("APP_VERSION 可被消费（构建注入或占位），不是 undefined", () => {
    expect(typeof APP_VERSION).toBe("string");
    expect(APP_VERSION.length).toBeGreaterThan(0);
  });

  it("src 下没有硬编码的 Web 产品版本号（注释 / SVG 坐标 / 发版 URL 不算）", () => {
    // 图标文件的 SVG path 数据里会出现形如 x.y.z 的坐标串，与产品版本无关
    const SKIP_PATHS = [join("src", "components", "icons")];
    // Android APK 的 GitHub Releases tag 属另一版本域（由 S02 管理），不是 Web 产品版本
    const URL_HINTS = ["http", "releases/download", "github.com"];

    const offenders: string[] = [];
    for (const file of walk(resolve(process.cwd(), "src"))) {
      const rel = file.replace(process.cwd(), "");
      if (SKIP_PATHS.some((p) => rel.includes(p))) continue;

      const lines = readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        // 注意：CRLF 下必须去掉 \r，否则 .*$ 匹配不到行尾，注释不会被剥离
        .split(/\r?\n/);

      lines.forEach((rawLine, index) => {
        const code = rawLine.replace(/(^|[^:])\/\/.*$/, "$1"); // 去掉行注释
        if (URL_HINTS.some((hint) => code.includes(hint))) return;
        const hit = code.match(/(^|[\s"'`>(=])v?(\d+\.\d+\.\d+)(?![\d.])/);
        if (hit) offenders.push(`${rel}:${index + 1} → ${hit[2]}`);
      });
    }

    expect(
      offenders,
      `发现硬编码 Web 产品版本号，请改用 APP_VERSION:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});
