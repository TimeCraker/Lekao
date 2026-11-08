/**
 * 生成 Word 错题集 starter 模板 v2
 * 用户下载后可填：学生姓名 / 科目 / 班级 / 错题内容
 *
 * 设计（参考真实讲义/错题集样例，样本含学生 PII，已脱敏不入仓）：
 * - 独立封面 section（第 1 页）：
 *   - 大字"错题集" 36pt 居中
 *   - 空行
 *   - "姓名：{学生姓名}" 14pt 居中
 *   - "班级：{班级}" 14pt 居中
 *   - 强制分页
 * - 内容 section（第 2 页起）：
 *   - 页眉：左 "科目：{科目}" + tab + 右 "学生姓名：{学生姓名}"
 *   - 页脚：居中 "第 X 页 / 共 Y 页"
 *   - 红色日期段标题（占位 YYYY-MM-DD）
 *   - 【堂测错题】+ 2 道占位
 *   - 【作业错题】+ 1 道占位
 * - 颜色：标题用红色 #DC2626（错题集大标题用黑色）
 */

import {
  AlignmentType,
  Document,
  Footer,
  Header,
  HeadingLevel,
  Packer,
  PageNumber,
  Paragraph,
  TabStopPosition,
  TabStopType,
  TextRun,
} from "docx";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(
  __dirname,
  "..",
  "public",
  "templates",
  "lekao-mistake-word-template-v1.docx",
);

// ============== 样式常量 ==============

const COLOR = {
  black: "000000",
  red: "DC2626", // 真实场景日期标题用红
  slate: "64748b", // 页眉页脚
  ink: "1e293b", // 正文
  muted: "94a3b8", // 占位提示
};

const FONT = {
  cnTitle: "宋体", // 中文用宋体
  cnBody: "宋体",
};

// ============== 段落构造器 ==============

/** 普通段落（正文用） */
function STU(
  text: string,
  opts: { bold?: boolean; size?: number; color?: string } = {},
) {
  return new TextRun({
    text,
    bold: opts.bold,
    size: opts.size ?? 22, // 默认 11pt
    color: opts.color ?? COLOR.ink,
    font: FONT.cnBody,
  });
}

/** 居中段落（封面/标题用） */
function centerText(
  text: string,
  opts: { bold?: boolean; size?: number; color?: string } = {},
) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 0 },
    children: [
      new TextRun({
        text,
        bold: opts.bold,
        size: opts.size ?? 22,
        color: opts.color ?? COLOR.black,
        font: FONT.cnTitle,
      }),
    ],
  });
}

/** 空行 */
function emptyLine() {
  return new Paragraph({ children: [new TextRun({ text: "" })] });
}

async function main() {
  const doc = new Document({
    creator: "Lekao",
    title: "Lekao 错题集模板 v2",
    description: "AI 教学编辑台生成的错题集 starter 模板（封面 + 页眉页脚）",
    sections: [
      // ============================================
      // Section 1: 封面（独立第一页）
      // ============================================
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch = 25.4mm
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        children: [
          // 上方留白
          emptyLine(),
          emptyLine(),
          emptyLine(),
          emptyLine(),
          emptyLine(),

          // 大字"错题集"（36pt 加粗居中）
          centerText("错题集", { bold: true, size: 72, color: COLOR.black }),

          emptyLine(),
          emptyLine(),
          emptyLine(),
          emptyLine(),

          // 姓名（14pt 居中）
          centerText("姓名：{学生姓名}", { size: 28, color: COLOR.black }),

          emptyLine(),
          emptyLine(),

          // 班级（14pt 居中）
          centerText("班级：{班级}", { size: 28, color: COLOR.black }),

          emptyLine(),
          emptyLine(),
          emptyLine(),
          emptyLine(),
          emptyLine(),
          emptyLine(),

          // 强制分页到下一 section（也可以不写，docx 自动分页，但显式更稳）
          new Paragraph({ children: [new TextRun({ break: 1 })] }),
        ],
      },

      // ============================================
      // Section 2: 内容（带页眉页脚）
      // ============================================
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        // 页眉：左 科目 + tab + 右 学生姓名
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "科目：{科目}",
                    size: 20, // 10pt
                    color: COLOR.slate,
                    font: FONT.cnBody,
                  }),
                  new TextRun({ text: "\t\t" }),
                  new TextRun({
                    text: "学生姓名：{学生姓名}",
                    size: 20,
                    color: COLOR.slate,
                    font: FONT.cnBody,
                  }),
                ],
                tabStops: [
                  {
                    type: TabStopType.RIGHT,
                    position: TabStopPosition.MAX,
                  },
                ],
                border: {
                  bottom: {
                    color: "cbd5e1",
                    space: 1,
                    style: "single",
                    size: 6,
                  },
                },
              }),
            ],
          }),
        },
        // 页脚：第 X 页 / 共 Y 页（居中）
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "第 ",
                    size: 20,
                    color: COLOR.slate,
                    font: FONT.cnBody,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 20,
                    color: COLOR.slate,
                    font: FONT.cnBody,
                  }),
                  new TextRun({
                    text: " 页 / 共 ",
                    size: 20,
                    color: COLOR.slate,
                    font: FONT.cnBody,
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 20,
                    color: COLOR.slate,
                    font: FONT.cnBody,
                  }),
                  new TextRun({
                    text: " 页",
                    size: 20,
                    color: COLOR.slate,
                    font: FONT.cnBody,
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          // 日期段标题（红色 16pt 加粗 · 占位）
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 200 },
            children: [
              new TextRun({
                text: "{YYYY-MM-DD}（第 N 次）",
                bold: true,
                size: 32, // 16pt
                color: COLOR.red, // 红色
                font: FONT.cnTitle,
              }),
            ],
          }),

          // 【堂测错题】section
          new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
              STU("【堂测错题】", { bold: true, size: 24, color: COLOR.black }),
            ],
          }),

          // 堂测占位 1
          new Paragraph({
            spacing: { before: 200, after: 80 },
            children: [
              STU("1. ", { size: 24, color: COLOR.black }),
              STU("{题号 1}", { bold: true, size: 24, color: COLOR.black }),
            ],
          }),
          new Paragraph({
            spacing: { before: 80, after: 100 },
            children: [
              STU("{在此粘贴题目图片 或 输入文字描述}", {
                size: 22,
                color: COLOR.muted,
              }),
            ],
          }),

          // 堂测占位 2
          new Paragraph({
            spacing: { before: 200, after: 80 },
            children: [
              STU("2. ", { size: 24, color: COLOR.black }),
              STU("{题号 2}", { bold: true, size: 24, color: COLOR.black }),
            ],
          }),
          new Paragraph({
            spacing: { before: 80, after: 100 },
            children: [STU("{题目内容}", { size: 22, color: COLOR.muted })],
          }),

          // 【作业错题】section
          new Paragraph({
            spacing: { before: 300, after: 100 },
            children: [
              STU("【作业错题】", { bold: true, size: 24, color: COLOR.black }),
            ],
          }),

          // 作业占位 1
          new Paragraph({
            spacing: { before: 200, after: 80 },
            children: [
              STU("1. ", { size: 24, color: COLOR.black }),
              STU("{题号 1}", { bold: true, size: 24, color: COLOR.black }),
            ],
          }),
          new Paragraph({
            spacing: { before: 80, after: 100 },
            children: [STU("{题目内容}", { size: 22, color: COLOR.muted })],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  writeFileSync(OUTPUT_PATH, Buffer.from(buffer));
  console.log(`✅ Word 模板 v2 已生成: ${OUTPUT_PATH}`);
  console.log(`📊 大小: ${(buffer.length / 1024).toFixed(1)} KB`);
  console.log(`📄 Section 数: 2 (封面 + 内容)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
