import { describe, expect, it, vi } from "vitest";
import { runBatch, yieldToBrowser } from "./batch-export";
import { buildPrintDocument, buildPrintStyles } from "./print-view";

/**
 * S04 T-405 · 批量队列与打印文档（纯逻辑部分）
 */
describe("runBatch 串行队列", () => {
  const immediate = () => Promise.resolve();

  it("按输入顺序串行执行并保留结果", async () => {
    const seen: number[] = [];
    const results = await runBatch(
      [1, 2, 3],
      async (n) => {
        seen.push(n);
        return n * 10;
      },
      { yieldFn: immediate },
    );

    expect(seen).toEqual([1, 2, 3]);
    expect(results.map((r) => r.value)).toEqual([10, 20, 30]);
    expect(results.every((r) => r.ok)).toBe(true);
  });

  it("一份失败不中止整批（错误隔离）", async () => {
    const results = await runBatch(
      ["a", "b", "c"],
      async (s) => {
        if (s === "b") throw new Error("这一份生成失败");
        return s.toUpperCase();
      },
      { yieldFn: immediate },
    );

    expect(results).toHaveLength(3);
    expect(results[0]).toMatchObject({ ok: true, value: "A" });
    expect(results[1]).toMatchObject({ ok: false, error: "这一份生成失败" });
    expect(results[2]).toMatchObject({ ok: true, value: "C" });
  });

  it("每份之间让出主线程，进度回调逐项上报（含失败项）", async () => {
    const yieldSpy = vi.fn(() => Promise.resolve());
    const progress: number[] = [];
    await runBatch(["x", "y"], async () => undefined, {
      yieldFn: yieldSpy,
      onProgress: (done) => progress.push(done),
    });

    expect(progress).toEqual([1, 2]);
    expect(yieldSpy).toHaveBeenCalledTimes(1); // 最后一份之后不再让出
  });

  it("空批次直接返回空结果", async () => {
    const results = await runBatch([], async () => 1, {
      yieldFn: immediate,
    });
    expect(results).toEqual([]);
  });

  it("worker 收到的是 index 与元素本身", async () => {
    const pairs: Array<[number, string]> = [];
    await runBatch(["p", "q"], async (s, i) => void pairs.push([i, s]), {
      yieldFn: immediate,
    });
    expect(pairs).toEqual([
      [0, "p"],
      [1, "q"],
    ]);
  });

  it("默认让出用的是 0ms 定时器（真实定时器可跑通）", async () => {
    await expect(yieldToBrowser()).resolves.toBeUndefined();
  });
});

describe("print-view 打印文档", () => {
  it("@page 为 A4、页边距 14mm", () => {
    const css = buildPrintStyles();
    expect(css).toContain("@page { size: A4; margin: 14mm; }");
  });

  it("长表格跨页保护：表头每页重复、行不拦腰截断", () => {
    const css = buildPrintStyles();
    expect(css).toContain("thead { display: table-header-group; }");
    expect(css).toContain("page-break-inside: avoid");
    expect(css).toContain("break-inside: avoid");
  });

  it("iframe 里没有 Tailwind，表格边框用元素选择器兜底", () => {
    const css = buildPrintStyles();
    expect(css).toContain("table { border-collapse: collapse; }");
    expect(css).toContain("td, th { border: 1px solid");
  });

  it("文档结构：标题转义 + 样式 + 产物内容", () => {
    const html = buildPrintDocument(
      "<table><tr><td>张三</td></tr></table>",
      "错题集<a>&预览",
    );
    expect(html).toContain("<title>错题集&lt;a&gt;&amp;预览</title>");
    expect(html).toContain("@page");
    expect(html).toContain("<td>张三</td>");
    expect(html.startsWith("<!doctype html>")).toBe(true);
  });
});
