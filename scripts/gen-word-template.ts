/**
 * 生成 Word 错题集 starter 模板
 * 用户下载后可填：学生姓名 / 学科 / 错题内容
 *
 * 设计：
 * - 22pt 学生姓名（居中）
 * - 学科 + 累计 N 次
 * - 2 个 section 占位：【堂测错题】+【作业错题】
 * - 每个 section 内 3 道占位（用户可删可加）
 * - Apple-style 排版（同 docx-generator.ts 一致）
 */

import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from "docx";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(
  __dirname,
  "..",
  "public",
  "templates",
  "lekao-mistake-word-template-v1.docx"
);

const STU = (text: string, opts: { bold?: boolean; size?: number; color?: string } = {}) =>
  new TextRun({
    text,
    bold: opts.bold,
    size: opts.size ?? 22,
    color: opts.color ?? "0a0f1a",
  });

async function main() {
  const doc = new Document({
    creator: "Lekao",
    title: "Lekao 错题集模板",
    description: "AI 智能助教助手生成的错题集 starter 模板",
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 800,
              bottom: 1400,
              left: 1000,
              right: 1000,
            },
          },
        },
        children: [
          // === 学生姓名（22pt 居中）===
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 200 },
            children: [
              new TextRun({
                text: "{学生姓名}",
                bold: true,
                size: 44, // 22pt
                color: "0a0f1a",
              }),
            ],
          }),

          // === 学科 + 占位 ===
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "学科：{化学/物理/数学等}",
                size: 22,
                color: "475569",
              }),
            ],
          }),

          // === 累计统计占位 ===
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: "累计 N 次 · M 道错题",
                size: 20,
                color: "94a3b8",
              }),
            ],
          }),

          // === 分隔线 ===
          new Paragraph({
            border: {
              bottom: {
                color: "cbd5e1",
                size: 6,
                space: 1,
                style: "single",
              },
            },
            spacing: { after: 300 },
            children: [new TextRun({ text: "" })],
          }),

          // === 日期段标题（占位）===
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 200 },
            children: [
              new TextRun({
                text: "{YYYY-MM-DD}（第 N 次）",
                bold: true,
                size: 32, // 16pt
                color: "1e40af",
              }),
            ],
          }),

          // === 堂测错题 section ===
          new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [STU("【堂测错题】", { bold: true, size: 24 })],
          }),

          // 堂测占位 1
          new Paragraph({
            spacing: { before: 200, after: 80 },
            children: [
              STU("1. ", { size: 24 }),
              STU("{题号 1}", { bold: true, size: 24 }),
            ],
          }),
          new Paragraph({
            spacing: { before: 80, after: 100 },
            children: [
              STU("{在此粘贴题目图片 或 输入文字描述}", { size: 22, color: "94a3b8" }),
            ],
          }),

          // 堂测占位 2
          new Paragraph({
            spacing: { before: 200, after: 80 },
            children: [
              STU("2. ", { size: 24 }),
              STU("{题号 2}", { bold: true, size: 24 }),
            ],
          }),
          new Paragraph({
            spacing: { before: 80, after: 100 },
            children: [
              STU("{题目内容}", { size: 22, color: "94a3b8" }),
            ],
          }),

          // === 作业错题 section ===
          new Paragraph({
            spacing: { before: 300, after: 100 },
            children: [STU("【作业错题】", { bold: true, size: 24 })],
          }),

          // 作业占位 1
          new Paragraph({
            spacing: { before: 200, after: 80 },
            children: [
              STU("1. ", { size: 24 }),
              STU("{题号 1}", { bold: true, size: 24 }),
            ],
          }),
          new Paragraph({
            spacing: { before: 80, after: 100 },
            children: [
              STU("{题目内容}", { size: 22, color: "94a3b8" }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  writeFileSync(OUTPUT_PATH, Buffer.from(buffer));
  console.log(`✅ Word 模板已生成: ${OUTPUT_PATH}`);
  console.log(`📊 大小: ${(buffer.length / 1024).toFixed(1)} KB`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});