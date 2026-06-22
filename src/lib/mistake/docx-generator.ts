/**
 * docx 生成器 v2（T22 + 真实场景样式升级）
 * 来源：STAGE spec §7 + PRD §3.5.5
 *
 * 设计（参考真实场景 docs/贺梓晗逻辑思维错题集.doc）：
 * - 累积模式：每次生成把今天 section 存 IndexedDB，下一次读全部历史 sections
 *   重组成完整 docx 写回（覆盖模式，避免 XML 操作复杂性）
 * - 文档结构 = [封面 section] + [内容 section]
 *   - 封面：错题集 + 姓名 + 班级（独立第一页）
 *   - 内容：页眉（科目/学生姓名）+ 页脚（页码）+ 累积 sections
 * - 关键样式：
 *   - 封面大标题 36pt 加粗黑色居中
 *   - 日期段标题 16pt 加粗红色
 *   - 题号 12pt 加粗
 *   - 题内容 11pt 黑色
 * - 失败兜底：file-saver 直接下载 blob
 */

import {
  AlignmentType,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph,
  TabStopPosition,
  TabStopType,
  TextRun,
} from "docx";
import { loadImage } from "./image-store";
import { type QNumberSlot, getImageIds, hasImages } from "./types";
import {
  hasSection,
  loadSections,
  saveSection,
  type SavedSection,
} from "./section-store";

// ============== 样式常量（与 gen-word-template.ts 保持一致）==============

const COLOR = {
  black: "000000",
  red: "DC2626", // 真实场景日期标题用红
  slate: "64748b", // 页眉页脚
  ink: "1e293b", // 正文
  muted: "94a3b8", // 占位提示
  hairline: "cbd5e1",
};

const FONT = {
  cnTitle: "宋体",
  cnBody: "宋体",
};

// ============== 主入口 ==============

export interface GenerateArgs {
  studentName: string;
  sheetName: string; // 学科（用作页眉"科目"和文件夹名）
  classroomName?: string; // 班级（用作封面"班级：xxx"），不传则降级到 sheetName
  date: string;
  classroomSlots: QNumberSlot[];
  homeworkSlots: QNumberSlot[];
  /** 该学生当天的堂测错题号（用于 section QNumbers 存储 + 构建时过滤旧 section）*/
  classroomQNumbers?: string[];
  /** 该学生当天的作业错题号 */
  homeworkQNumbers?: string[];
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
 *
 * 文档结构：
 * - Section 1: 封面（错题集 + 姓名 + 班级）
 * - Section 2: 内容（带页眉页脚 + 累积 sections）
 */
export async function generateStudentDocx(args: GenerateArgs): Promise<Blob> {
  const {
    studentName,
    sheetName,
    date,
    classroomSlots,
    homeworkSlots,
  } = args;
  const cumulative = args.cumulative ?? true;
  const classroomName = args.classroomName || sheetName; // 班级 fallback 到 Sheet 名

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

  // 3. 持久化今日 section（含 QNumbers 用于构建时过滤）
  const newSection: SavedSection = {
    id: `${sheetName}:${studentName}:${date}`,
    studentName,
    sheetName,
    date,
    classroomSlotsJson: JSON.stringify(classroomSlots),
    homeworkSlotsJson: JSON.stringify(homeworkSlots),
    classroomQNumbers: args.classroomQNumbers,
    homeworkQNumbers: args.homeworkQNumbers,
    sectionVersion: 1,
    imageIds: [
      ...classroomSlots.flatMap((s) => getImageIds(s)),
      ...homeworkSlots.flatMap((s) => getImageIds(s)),
    ],
    createdAt: Date.now(),
  };
  await saveSection(newSection);
  historySections = [...historySections, newSection].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  // 4. 加载所有图片到内存 + 测真实宽高（docx ImageRun 不能 height:0）
  // 支持多图：每张图独立 record，遍历 getImageIds() 加载所有
  const imageCache = new Map<
    string,
    { blob: Blob; buffer: Uint8Array; width: number; height: number }
  >();
  for (const section of historySections) {
    for (const slotJson of [section.classroomSlotsJson, section.homeworkSlotsJson]) {
      const slots: QNumberSlot[] = JSON.parse(slotJson);
      for (const slot of slots) {
        const ids = getImageIds(slot);
        for (const imageId of ids) {
          if (!imageCache.has(imageId)) {
            const record = await loadImage(imageId);
            if (record) {
              const buffer = new Uint8Array(await record.blob.arrayBuffer());
              // 测真实宽高（fallback 800x600 防 createImageBitmap 失败）
              let width = 800;
              let height = 600;
              try {
                const bitmap = await createImageBitmap(record.blob);
                width = bitmap.width;
                height = bitmap.height;
                bitmap.close();
              } catch {
                // HEIC 等异常格式走 fallback
              }
              imageCache.set(imageId, {
                blob: record.blob,
                buffer,
                width,
                height,
              });
            } else {
              console.warn(
                `[docx] 图片未找到: ${imageId} (section ${section.id})`,
              );
            }
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
      // ========== Section 1: 封面 ==========
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        children: buildCoverChildren({
          studentName,
          classroomName,
        }),
      },
      // ========== Section 2: 内容（带页眉页脚）==========
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
        headers: {
          default: new Header({
            children: [buildHeaderParagraph(sheetName, studentName)],
          }),
        },
        footers: {
          default: new Footer({
            children: [buildFooterParagraph()],
          }),
        },
        children: await buildContentChildren({
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

// ============== 封面 Section ==============

function buildCoverChildren({
  studentName,
  classroomName,
}: {
  studentName: string;
  classroomName: string;
}): Paragraph[] {
  return [
    // 上方留白
    emptyLine(),
    emptyLine(),
    emptyLine(),
    emptyLine(),
    emptyLine(),

    // 大字"错题集"（36pt 加粗居中）
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
      children: [
        new TextRun({
          text: "错题集",
          bold: true,
          size: 72, // 36pt
          color: COLOR.black,
          font: FONT.cnTitle,
        }),
      ],
    }),

    emptyLine(),
    emptyLine(),
    emptyLine(),
    emptyLine(),

    // 姓名（14pt 居中）
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
      children: [
        new TextRun({
          text: `姓名：${studentName}`,
          size: 28, // 14pt
          color: COLOR.black,
          font: FONT.cnBody,
        }),
      ],
    }),

    emptyLine(),
    emptyLine(),

    // 班级（14pt 居中）
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
      children: [
        new TextRun({
          text: `班级：${classroomName}`,
          size: 28,
          color: COLOR.black,
          font: FONT.cnBody,
        }),
      ],
    }),

    // 下方留白 + 强制分页
    emptyLine(),
    emptyLine(),
    emptyLine(),
    emptyLine(),
    emptyLine(),
    emptyLine(),
    new Paragraph({ children: [new TextRun({ break: 1 })] }),
  ];
}

// ============== 页眉页脚 ==============

function buildHeaderParagraph(
  subject: string,
  studentName: string,
): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: `科目：${subject}`,
        size: 20, // 10pt
        color: COLOR.slate,
        font: FONT.cnBody,
      }),
      new TextRun({ text: "\t\t" }),
      new TextRun({
        text: `学生姓名：${studentName}`,
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
        color: COLOR.hairline,
        space: 1,
        style: "single",
        size: 6,
      },
    },
  });
}

function buildFooterParagraph(): Paragraph {
  return new Paragraph({
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
  });
}

// ============== 内容 Section ==============

async function buildContentChildren({
  historySections,
  imageCache,
}: {
  historySections: SavedSection[];
  imageCache: Map<string, { blob: Blob; buffer: Uint8Array; width: number; height: number }>;
}): Promise<Paragraph[]> {
  const children: Paragraph[] = [];

  // === 每个累积 section ===
  for (let i = 0; i < historySections.length; i++) {
    const section = historySections[i];
    if (i > 0) {
      // section 之间的空行
      children.push(new Paragraph({ children: [new TextRun({ text: "" })] }));
    }

    const classroomSlots: QNumberSlot[] = JSON.parse(section.classroomSlotsJson);
    const homeworkSlots: QNumberSlot[] = JSON.parse(section.homeworkSlotsJson);

    // v2: 按 section 内存储的 QNumbers 过滤（旧版 section 无 QNumbers 时全量保留）
    const filteredClassroom = section.classroomQNumbers
      ? classroomSlots.filter((s) => section.classroomQNumbers!.includes(s.qNumber))
      : classroomSlots;
    const filteredHomework = section.homeworkQNumbers
      ? homeworkSlots.filter((s) => section.homeworkQNumbers!.includes(s.qNumber))
      : homeworkSlots;

    const sectionChildren = await buildSectionChildren({
      section,
      classroomSlots: filteredClassroom,
      homeworkSlots: filteredHomework,
      imageCache,
    });
    children.push(...sectionChildren);
  }

  return children;
}

async function buildSectionChildren({
  section,
  classroomSlots,
  homeworkSlots,
  imageCache,
}: {
  section: SavedSection;
  classroomSlots: QNumberSlot[];
  homeworkSlots: QNumberSlot[];
  imageCache: Map<string, { blob: Blob; buffer: Uint8Array; width: number; height: number }>;
}): Promise<Paragraph[]> {
  const children: Paragraph[] = [];

  // 日期段标题（16pt 加粗 红色）
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 200 },
      children: [
        new TextRun({
          text: `${section.date}（第 ${await getSectionIndex(section)} 次）`,
          bold: true,
          size: 32, // 16pt
          color: COLOR.red, // 红色
          font: FONT.cnTitle,
        }),
      ],
    }),
  );

  // 堂测错题
  if (classroomSlots.length > 0) {
    children.push(
      new Paragraph({
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({
            text: "【堂测错题】",
            bold: true,
            size: 24, // 12pt
            color: COLOR.black,
            font: FONT.cnBody,
          }),
        ],
      }),
    );

    const numberedSlots = classroomSlots
      .map((slot, idx) => ({ slot, idx: idx + 1 }))
      .filter(({ slot }) => hasSlotContent(slot));

    for (const { slot } of numberedSlots) {
      children.push(...(await buildSlotParagraphs(slot, imageCache)));
    }
  }

  // 作业错题
  if (homeworkSlots.length > 0) {
    children.push(
      new Paragraph({
        spacing: { before: 300, after: 100 },
        children: [
          new TextRun({
            text: "【作业错题】",
            bold: true,
            size: 24,
            color: COLOR.black,
            font: FONT.cnBody,
          }),
        ],
      }),
    );

    const numberedSlots = homeworkSlots
      .map((slot, idx) => ({ slot, idx: idx + 1 }))
      .filter(({ slot }) => hasSlotContent(slot));

    for (const { slot } of numberedSlots) {
      children.push(...(await buildSlotParagraphs(slot, imageCache)));
    }
  }

  return children;
}

function emptyLine(): Paragraph {
  return new Paragraph({ children: [new TextRun({ text: "" })] });
}

function hasSlotContent(slot: QNumberSlot): boolean {
  return Boolean(
    hasImages(slot) || (slot.textContent && slot.textContent.trim()),
  );
}

async function buildSlotParagraphs(
  slot: QNumberSlot,
  imageCache: Map<string, { blob: Blob; buffer: Uint8Array; width: number; height: number }>,
): Promise<Paragraph[]> {
  const paragraphs: Paragraph[] = [];

  // 题号行：只显示题号本身（不加 idx. 列表编号，Round 2026-06-20 修）
  paragraphs.push(
    new Paragraph({
      spacing: { before: 200, after: 80 },
      children: [
        new TextRun({
          text: slot.qNumber,
          bold: true,
          size: 24,
          color: COLOR.black,
          font: FONT.cnBody,
        }),
      ],
    }),
  );

  // 图片（支持多图：v2 升级 2026-06-22，每题最多 3 张）
  // Round 2026-06-20 修：transformation.height 必须 > 0，否则 docx 忽略整张图
  const imageIds = getImageIds(slot);
  for (const imageId of imageIds) {
    const cached = imageCache.get(imageId);
    if (cached) {
      try {
        const MAX_WIDTH = 500;
        const scale = Math.min(1, MAX_WIDTH / cached.width);
        const width = Math.round(cached.width * scale);
        const height = Math.round(cached.height * scale);
        const imageType: "jpg" | "png" = cached.blob.type.includes("png")
          ? "png"
          : "jpg";
        paragraphs.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 100 },
            children: [
              new ImageRun({
                data: cached.buffer,
                transformation: { width, height },
                type: imageType,
                fallback: { type: imageType, data: cached.buffer },
              } as never),
            ],
          }),
        );
      } catch (e) {
        console.warn("[docx] 图片嵌入失败", e);
      }
    } else {
      console.warn(
        `[docx] 题号 ${slot.qNumber} 的图片未找到（imageId=${imageId}），跳过图片`,
      );
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
            color: COLOR.ink,
            font: FONT.cnBody,
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
 * @param studentNames 要导出的学生姓名列表
 * @param baseArgs 基础参数 + students 数组（用于按学生过滤各自的错题）
 *
 * 关键修复（v3）：过滤 slots，每个学生只拿自己确实做错的题
 * 学生全对时跳过导出（不给空文档）
 */
export async function generateBatchDocx(
  studentNames: string[],
  baseArgs: Omit<GenerateArgs, "studentName"> & {
    students: Array<{ name: string; classroomQNumbers: string[]; homeworkQNumbers: string[] }>;
  },
): Promise<
  Array<{
    studentName: string;
    blob: Blob;
    filename: string;
  }>
> {
  const results: Array<{ studentName: string; blob: Blob; filename: string }> = [];

  for (const name of studentNames) {
    const student = baseArgs.students.find((s) => s.name === name);
    // 找不到学生或全对 → 跳过（不生成空文档）
    if (!student) continue;
    if (student.classroomQNumbers.length === 0 && student.homeworkQNumbers.length === 0) continue;

    // 只保留该学生确实做错的题号对应的 slots
    const filteredClassroom = baseArgs.classroomSlots.filter((s) =>
      student.classroomQNumbers.includes(s.qNumber),
    );
    const filteredHomework = baseArgs.homeworkSlots.filter((s) =>
      student.homeworkQNumbers.includes(s.qNumber),
    );

    const blob = await generateStudentDocx({
      ...baseArgs,
      studentName: name,
      classroomSlots: filteredClassroom,
      homeworkSlots: filteredHomework,
      classroomQNumbers: student.classroomQNumbers,
      homeworkQNumbers: student.homeworkQNumbers,
    });
    results.push({
      studentName: name,
      blob,
      filename: `${name}.docx`,
    });
  }

  return results;
}
