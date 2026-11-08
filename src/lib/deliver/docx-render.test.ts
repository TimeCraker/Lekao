import {
  Document,
  ImageRun,
  Packer,
  PageBreak,
  Paragraph,
  TextRun,
} from "docx";
import { describe, expect, it } from "vitest";
import { describeDocxSummary, summarizeDocx } from "./docx-render";

/**
 * S04 T-401 · docx 产物摘要（真实 docx 字节，不 mock）
 *
 * 用仓库同款 `docx` 库生成真实产物再解析，覆盖：
 * 段落数、图片数、显式分页、正文字数与降级文案。
 * 这组断言也是 T-402「预览 = 导出件」的基础设施。
 */
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAAwAB/AF/9v0ZAAAAAElFTkSuQmCC",
  "base64",
);

async function buildDocx(): Promise<Blob> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ children: [new TextRun("张三")] }),
          new Paragraph({ children: [new TextRun("学科：数学")] }),
          new Paragraph({
            children: [
              new ImageRun({
                data: TINY_PNG,
                transformation: { width: 32, height: 32 },
                type: "png",
              }),
            ],
          }),
          new Paragraph({ children: [new PageBreak()] }),
          new Paragraph({ children: [new TextRun("第二页内容")] }),
        ],
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  return new Blob([new Uint8Array(buffer)]);
}

describe("summarizeDocx", () => {
  it("从真实 docx 里读出段落数、图片数、分页与正文字数", async () => {
    const blob = await buildDocx();
    const summary = await summarizeDocx(blob);

    expect(summary.paragraphs).toBeGreaterThanOrEqual(5);
    expect(summary.images).toBe(1);
    expect(summary.pageBreaks).toBeGreaterThanOrEqual(1);
    expect(summary.pages).toBe(summary.pageBreaks + 1);
    expect(summary.textChars).toBeGreaterThan(0);
    expect(summary.firstLine.length).toBeGreaterThan(0);
  });

  it("支持 ArrayBuffer / Uint8Array 输入（前端与测试同一路径）", async () => {
    const blob = await buildDocx();
    const buf = await blob.arrayBuffer();
    const fromBuffer = await summarizeDocx(buf);
    const fromBytes = await summarizeDocx(new Uint8Array(buf));
    expect(fromBytes.paragraphs).toBe(fromBuffer.paragraphs);
    expect(fromBytes.images).toBe(fromBuffer.images);
  });

  it("非 docx 字节给出明确错误（供 UI 走降级）", async () => {
    const notDocx = new Blob([new TextEncoder().encode("hello")]);
    await expect(summarizeDocx(notDocx)).rejects.toThrow(/不是合法的 docx/);
  });

  it("降级文案包含页数/段落/图片/字数，不留空白", async () => {
    const summary = await summarizeDocx(await buildDocx());
    const text = describeDocxSummary(summary, "张三-错题集.docx");
    expect(text).toContain("张三-错题集.docx");
    expect(text).toContain("页");
    expect(text).toContain("段落");
    expect(text).toContain("张图片");
    expect(text).toContain("字");
  });
});
