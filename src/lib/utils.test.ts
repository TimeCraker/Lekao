import { describe, expect, it } from "vitest";
import { cn, formatBytes } from "./utils";

describe("cn（className 合并）", () => {
  it("多个字符串原样拼接", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("false / null / undefined 跳过", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
    expect(cn(false)).toBe("");
  });

  it("对象取 truthy key，falsy value 跳过", () => {
    expect(cn({ active: true, hidden: false, open: 1, off: 0 })).toBe(
      "active open",
    );
  });

  it("空对象 / 全 falsy 输入 → 空字符串", () => {
    expect(cn({})).toBe("");
    expect(cn()).toBe("");
    expect(cn(false, { a: false }, null)).toBe("");
  });

  it("字符串与对象混合", () => {
    const cond = false;
    expect(cn("btn", cond && "primary", { "is-lg": true })).toBe("btn is-lg");
  });
});

describe("formatBytes（文件大小格式化）", () => {
  it("小于 1KB 直接展示 B", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1)).toBe("1 B");
    expect(formatBytes(1023)).toBe("1023 B");
  });

  it("1KB ~ 1MB 展示 KB（一位小数）", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(100 * 1024)).toBe("100.0 KB");
  });

  it("1MB 及以上展示 MB（两位小数）", () => {
    expect(formatBytes(1024 * 1024)).toBe("1.00 MB");
    expect(formatBytes(1.5 * 1024 * 1024)).toBe("1.50 MB");
  });

  it("边界：恰好差 1B 进位", () => {
    expect(formatBytes(1024 * 1024 - 1)).toBe("1024.0 KB");
    expect(formatBytes(1024 * 1024)).toBe("1.00 MB");
  });
});
