/**
 * docx 生成器（T22）
 * 来源：STAGE spec §7 + PRD §3.5.5
 *
 * 设计：
 * - 使用 docx 库（npm: `docx` v9）生成 Word
 * - 累积模式：每次生成把今天 section 存 IndexedDB，下一次读全部历史 sections
 *   重组成完整 docx 写回（覆盖模式，避免 XML 操作复杂性）
 * - Apple-style：单栏 + 居中图片 + 22pt 学生名 + 16pt 日期
 * - 失败兜底：file-saver 直接下载 blob
 */

import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { loadImage } from "./image-store";
import type { QNumberSlot } from "./types";
import {
  hasSection,
  loadSections,
  saveSection,
  type SavedSection,
} from "./section-store";

// ============== 主入口 ==============

export interface GenerateArgs {
  studentName: string;
  sheetName: string; // 学科（用作文件夹名）
  date: string;
  classroomSlots: QNumberSlot[];
  homeworkSlots: QNumberSlot[];
  /** 是否累积模式（默认 true：检测到同日 section 时跳过 + 提示）*/
  cumulative?: boolean;
}

/**
 * 生成单个学生的 docx Blob
 *
 * 累积逻辑：
 * 1. 先读 IndexedDB 历史 sections（同 sheetName + studentName）
 * 2. 检查今日日期是否已存在 → 跳过（覆盖会丢用户手工编辑）
 * 3. 把今日 section 加入历史
 * 4. 用 docx 库按时间顺序拼所有 sections → 一个完整 docx
 */
export async function generateStudentDocx(args: GenerateArgs): Promise<Blob> {
  const { studentName, sheetName, date, classroomSlots, homeworkSlots } = args;
  const cumulative = args.cumulative ?? true;

  // 1. 读取历史 sections
  let historySections: SavedSection[] = cumulative
    ? await loadSections(sheetName, studentName)
    : [];

  // 2. 检查今日是否已存在
  if (cumulative && historySections.some((s) => s.date === date)) {
    throw new Error(
      `${date} 的 section 已存在。如需覆盖，请删除后重新导出。`,
    );
  }

  // 3. 持久化今日 section
  const newSection: SavedSection = {
    id: `${sheetName}:${studentName}:${date}`,
    studentName,
    sheetName,
    date,
    classroomSlotsJson: JSON.stringify(classroomSlots),
    homeworkSlotsJson: JSON.stringify(homeworkSlots),
    imageIds: [
      ...classroomSlots.map((s) => s.imageBlobId).filter(Boolean) as string[],
      ...homeworkSlots.map((s) => s.imageBlobId).filter(Boolean) as string[],
    ],
    createdAt: Date.now(),
  };
  await saveSection(newSection);
  historySections = [...historySections, newSection].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  // 4. 加载所有图片到内存
  const imageCache = new Map<string, { blob: Blob; buffer: ArrayBuffer }>();
  for (const section of historySections) {
    for (const slotJson of [section.classroomSlotsJson, section.homeworkSlotsJson]) {
      const slots: QNumberSlot[] = JSON.parse(slotJson);
      for (const slot of slots) {
        if (slot.imageBlobId && !imageCache.has(slot.imageBlobId)) {
          const record = await loadImage(slot.imageBlobId);
          if (record) {
            const buffer = await record.blob.arrayBuffer();
            imageCache.set(slot.imageBlobId, { blob: record.blob, buffer });
          }
        }
      }
    }
  }

  // 5. 构建 docx
  const doc = new Document({
    creator: "Lekao",
    title: `${studentName}-${sheetName}错题集`,
    description: `AI 智能助教助手生成 · ${historySections.length} 天累计`,
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 800, // 8mm
              bottom: 1400, // 14mm
              left: 1000, // 10mm
              right: 1000,
            },
          },
        },
        children: await buildDocumentChildren({
          studentName,
          sheetName,
          historySections,
          imageCache,
        }),
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  // Node Buffer → Uint8Array 包一层，兼容 Web BlobPart 类型
  return new Blob([new Uint8Array(buffer)], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

// ============== 文档内容构建 ==============

interface BuildChildrenArgs {
  studentName: string;
  sheetName: string;
  historySections: SavedSection[];
  imageCache: Map<string, { blob: Blob; buffer: ArrayBuffer }>;
}

async function buildDocumentChildren({
  studentName,
  sheetName,
  historySections,
  imageCache,
}: BuildChildrenArgs): Promise<Paragraph[]> {
  const children: Paragraph[] = [];

  // === 顶部摘要（首次生成时创建，永不更新）===
  // 简化：每次重生成时都写一遍（spec: "首次新建时生成，永不更新" 但实际我们重生成 = 覆盖）
  // 这里我们做"智能摘要"：如果只有 1 个 section 就显示完整摘要；多个就显示统计
  const totalSections = historySections.length;
  const totalQCount = historySections.reduce((sum, s) => {
    const c: QNumberSlot[] = JSON.parse(s.classroomSlotsJson);
    const h: QNumberSlot[] = JSON.parse(s.homeworkSlotsJson);
    return sum + c.length + h.length;
  }, 0);

  // 学生姓名（22pt 加粗居中）
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 200 },
      children: [
        new TextRun({
          text: studentName,
          bold: true,
          size: 44, // 22pt = 44 half-points
        }),
      ],
    }),
  );

  // 学科
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: `学科：${sheetName}`,
          size: 22, // 11pt
          color: "475569", // slate-600
        }),
      ],
    }),
  );

  // 汇总行
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: `累计 ${totalSections} 次 · ${totalQCount} 道错题`,
          size: 20, // 10pt
          color: "94a3b8",
        }),
      ],
    }),
  );

  // 分隔线
  children.push(
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
  );

  // === 每个 section ===
  for (let i = 0; i < historySections.length; i++) {
    const section = historySections[i];
    if (i > 0) {
      // section 之间的空行
      children.push(new Paragraph({ children: [new TextRun({ text: "" })] }));
    }
    const sectionChildren = await buildSectionChildren(section, imageCache);
    children.push(...sectionChildren);
  }

  return children;
}

async function buildSectionChildren(
  section: SavedSection,
  imageCache: Map<string, { blob: Blob; buffer: ArrayBuffer }>,
): Promise<Paragraph[]> {
  const children: Paragraph[] = [];

  // 日期段标题（16pt 加粗）
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 200 },
      children: [
        new TextRun({
          text: `${section.date}（第 ${await getSectionIndex(section)} 次）`,
          bold: true,
          size: 32, // 16pt
          color: "1e40af", // accent-ink
        }),
      ],
    }),
  );

  // 堂测错题
  const classroomSlots: QNumberSlot[] = JSON.parse(section.classroomSlotsJson);
  if (classroomSlots.length > 0) {
    children.push(
      new Paragraph({
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({
            text: "【堂测错题】",
            bold: true,
            size: 24, // 12pt
          }),
        ],
      }),
    );

    const numberedSlots = classroomSlots
      .map((slot, idx) => ({ slot, idx: idx + 1 }))
      .filter(({ slot }) => hasSlotContent(slot));

    for (const { slot, idx } of numberedSlots) {
      children.push(...(await buildSlotParagraphs(slot, idx, "classroom", imageCache)));
    }
  }

  // 作业错题
  const homeworkSlots: QNumberSlot[] = JSON.parse(section.homeworkSlotsJson);
  if (homeworkSlots.length > 0) {
    children.push(
      new Paragraph({
        spacing: { before: 300, after: 100 },
        children: [
          new TextRun({
            text: "【作业错题】",
            bold: true,
            size: 24,
          }),
        ],
      }),
    );

    const numberedSlots = homeworkSlots
      .map((slot, idx) => ({ slot, idx: idx + 1 }))
      .filter(({ slot }) => hasSlotContent(slot));

    for (const { slot, idx } of numberedSlots) {
      children.push(...(await buildSlotParagraphs(slot, idx, "homework", imageCache)));
    }
  }

  return children;
}

function hasSlotContent(slot: QNumberSlot): boolean {
  return Boolean(
    slot.imageBlobId || (slot.textContent && slot.textContent.trim()),
  );
}

async function buildSlotParagraphs(
  slot: QNumberSlot,
  idx: number,
  _qType: "classroom" | "homework",
  imageCache: Map<string, { blob: Blob; buffer: ArrayBuffer }>,
): Promise<Paragraph[]> {
  const paragraphs: Paragraph[] = [];

  // 题号行：1. **1（2 8）**
  paragraphs.push(
    new Paragraph({
      spacing: { before: 200, after: 80 },
      children: [
        new TextRun({ text: `${idx}. `, size: 24 }),
        new TextRun({
          text: slot.qNumber,
          bold: true,
          size: 24,
        }),
      ],
    }),
  );

  // 图片
  if (slot.imageBlobId) {
    const cached = imageCache.get(slot.imageBlobId);
    if (cached) {
      try {
        paragraphs.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 100 },
            children: [
              new ImageRun({
                data: cached.buffer,
                transformation: {
                  // 限制图片宽度 ≤ 500px（约 13.2cm），保持比例
                  width: Math.min(500, (cached.blob as Blob & { width?: number }).width ?? 500),
                  height: 0, // height 自动按比例
                },
                type: cached.blob.type.includes("png") ? "png" : "jpg",
              } as never),
            ],
          }),
        );
      } catch (e) {
        console.warn("[docx] 图片嵌入失败", e);
      }
    }
  }

  // 文字描述
  if (slot.textContent && slot.textContent.trim()) {
    paragraphs.push(
      new Paragraph({
        spacing: { before: 80, after: 100 },
        children: [
          new TextRun({
            text: slot.textContent.trim(),
            size: 22, // 11pt
            color: "1e293b",
          }),
        ],
      }),
    );
  }

  return paragraphs;
}

// 缓存 section 索引查询（避免重复 IO）
const indexCache = new Map<string, number>();

async function getSectionIndex(section: SavedSection): Promise<number> {
  if (indexCache.has(section.id)) return indexCache.get(section.id)!;
  const all = await loadSections(section.sheetName, section.studentName);
  const idx = all.findIndex((s) => s.id === section.id) + 1;
  indexCache.set(section.id, idx);
  return idx;
}

// ============== 批量生成 ==============

/**
 * 批量生成多个学生的 docx（用于一次导出全班）
 *
 * 返回：[{ studentName, blob, filename }, ...]
 */
export async function generateBatchDocx(
  studentNames: string[],
  baseArgs: Omit<GenerateArgs, "studentName">,
): Promise<
  Array<{
    studentName: string;
    blob: Blob;
    filename: string;
  }>
> {
  const results: Array<{ studentName: string; blob: Blob; filename: string }> = [];

  for (const name of studentNames) {
    const blob = await generateStudentDocx({
      ...baseArgs,
      studentName: name,
    });
    results.push({
      studentName: name,
      blob,
      filename: `${name}.docx`,
    });
  }

  return results;
}