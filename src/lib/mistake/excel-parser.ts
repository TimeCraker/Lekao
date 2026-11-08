/**
 * Excel 解析器 v2 (T16 + 兼容性升级)
 * 来源：STAGE spec §2 + §4
 *
 * 功能：
 * - SheetJS 解析 .xlsx/.xls（GBK 编码 SheetJS 自动处理）
 * - 列名模糊识别（姓名 / 堂测错题 / 作业错题）· 兼容 5/6/7+ 列
 * - 多 Sheet 列表
 * - 合并单元格 SheetJS 自动读左上角值
 *
 * 关键反模式（§9.7）：不强依赖标准模板列名
 *
 * v2 修复：
 * - ⚠️ 堂测分数误识 bug：CLASSROOM_KEYWORDS 不再含"堂测"裸词
 *   （5 列真实场景有"堂测分数"列，会被误识为"堂测错题"列）
 * - 班级名精确提取：标题"XX班《YY》反馈表" 优先用 regex 取"《》前"+"班"结尾
 */

import * as XLSX from "xlsx";
import type { StudentMistakes } from "./types";

// ============== 列名模糊识别 ==============

/** 匹配姓名列的关键词（含空格变体） */
const NAME_KEYWORDS = ["姓名", "名字", "学生姓名", "学生", "name", "name"];

/**
 * 匹配堂测错题列的关键词
 *
 * ⚠️ 不要加"堂测"裸词！真实场景 5 列结构有"堂测分数"列，会被误识
 * v2 修复：移除"堂测"裸词，只保留含"错题"或"quiz"等明确指向错题列的关键词
 */
const CLASSROOM_KEYWORDS = [
  "堂测错题",
  "堂测错题号",
  "课堂测验错题",
  "课堂测试错题",
  "课堂错题",
  "测验错题",
  "quiz",
];

/** 匹配作业错题列的关键词（v3 扩展：课后练习错题 / 练习错题 / 课后练习 / 作业） */
const HOMEWORK_KEYWORDS = [
  "作业错题",
  "课后作业错题",
  "课后练习错题",
  "作业错题号",
  "课后作业",
  "课后练习",
  "练习错题",
  "homework",
  "作业题号",
  "作业",
];

/** 匹配班级标题行的关键词（精确提取失败时降级用） */
const CLASSROOM_TITLE_KEYWORDS = ["班", "冲刺班", "火箭班", "课堂"];

/**
 * 检查表头是否匹配某个关键词组（任一匹配即返回 true）
 */
function matchAnyKeyword(header: string, keywords: string[]): boolean {
  const normalized = header.trim().toLowerCase();
  return keywords.some((kw) => normalized.includes(kw.toLowerCase()));
}

/**
 * 从表头行中识别姓名 / 堂测 / 作业列的索引
 *
 * 策略：找到首个匹配的列名就返回，避免多重匹配
 */
export function detectColumns(headers: string[]): {
  nameCol: number;
  classroomCol: number;
  homeworkCol: number;
} {
  let nameCol = -1;
  let classroomCol = -1;
  let homeworkCol = -1;

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i] || "";

    // 姓名列（优先级最高，最先识别）
    if (nameCol === -1 && matchAnyKeyword(h, NAME_KEYWORDS)) {
      nameCol = i;
      continue;
    }

    // 堂测错题列（识别时排除作业关键词，避免冲突）
    if (
      classroomCol === -1 &&
      matchAnyKeyword(h, CLASSROOM_KEYWORDS) &&
      !matchAnyKeyword(h, HOMEWORK_KEYWORDS)
    ) {
      classroomCol = i;
      continue;
    }

    // 作业错题列
    if (homeworkCol === -1 && matchAnyKeyword(h, HOMEWORK_KEYWORDS)) {
      homeworkCol = i;
      continue;
    }
  }

  return { nameCol, classroomCol, homeworkCol };
}

// ============== 表头扫描（v3 新增：先扫描表头，交给 UI 确认映射后再解析）==============

/**
 * 表头扫描结果：仅扫描表头，不解析全量数据
 */
export interface HeaderScanResult {
  sheetName: string;
  headers: string[]; // 表头行中各列的原始名称
  headerRowIndex: number; // 表头行在 aoa 中的索引
  detected: {
    nameCol: number; // -1 表示未识别
    classroomCol: number;
    homeworkCol: number;
  };
  classroomName: string;
  date: string;
}

/**
 * 扫描表头行 + 提取班级名和日期
 * 不同于 parseSheet：不会解析全量学生数据，只返回表头和列映射
 */
export function scanHeaders(
  workbook: XLSX.WorkBook,
  sheetName: string,
): HeaderScanResult {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Sheet "${sheetName}" 不存在`);

  const { classroomName, date } = extractHeaderInfo(workbook, sheetName);

  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  // 寻找含"姓名"的表头行（前 5 行）
  let headerRowIndex = -1;
  let headers: string[] = [];

  for (let i = 0; i < Math.min(5, aoa.length); i++) {
    const row = aoa[i] || [];
    const candidates = row.map((c) => String(c ?? "").trim());
    if (candidates.some((c) => matchAnyKeyword(c, NAME_KEYWORDS))) {
      headerRowIndex = i;
      headers = candidates;
      break;
    }
  }

  // 没找到含"姓名"的行 → 强行拿第 1 行
  if (headerRowIndex === -1 && aoa.length > 0) {
    headerRowIndex = 0;
    headers = (aoa[0] || []).map((c) => String(c ?? "").trim());
  }

  const detected = detectColumns(headers);

  return {
    sheetName,
    headers,
    headerRowIndex,
    detected: {
      nameCol: detected.nameCol,
      classroomCol: detected.classroomCol,
      homeworkCol: detected.homeworkCol,
    },
    classroomName,
    date,
  };
}

// ============== Sheet 读取 ==============

/**
 * 解析 Excel 文件为 Workbook
 */
export async function parseWorkbook(file: File): Promise<XLSX.WorkBook> {
  const buffer = await file.arrayBuffer();
  // SheetJS 自动处理编码（GBK / UTF-8）
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  return workbook;
}

/**
 * 列出 Workbook 中所有 Sheet 的元数据
 */
export interface SheetMetadata {
  name: string;
  rowCount: number; // 数据行数（不含表头）
  preview: string[][]; // 前 3 行数据预览
}

export function listSheets(workbook: XLSX.WorkBook): SheetMetadata[] {
  return workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      return { name: sheetName, rowCount: 0, preview: [] };
    }

    // aoa = array of arrays，二维数组形式读取
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      raw: false, // 转为格式化字符串（避免日期变成时间戳）
    });

    // 过滤完全空的行
    const nonEmptyRows = aoa.filter(
      (row) => row && row.some((cell) => String(cell).trim() !== ""),
    );

    const preview = nonEmptyRows.slice(0, 3).map((row) =>
      row.map((cell) =>
        String(cell ?? "")
          .trim()
          .slice(0, 30),
      ),
    );

    return {
      name: sheetName,
      rowCount: Math.max(0, nonEmptyRows.length - 1), // 减去表头
      preview,
    };
  });
}

// ============== 单 Sheet 解析 ==============

/**
 * 从 Sheet 头部提取班级名 + 日期
 *
 * 班级提取优先级（v2 升级）：
 * 1. 精确 regex：`XX班《YY》反馈表` → 取"《》前"+"班"结尾（→ "XX班"）
 * 2. 降级模糊：含"班"字且字符串长度 ≤ 30
 * 3. 最后降级：Sheet 名
 */
export function extractHeaderInfo(
  workbook: XLSX.WorkBook,
  sheetName: string,
): { classroomName: string; date: string } {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet)
    return {
      classroomName: sheetName,
      date: new Date().toISOString().slice(0, 10),
    };

  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  let classroomName = sheetName;
  let dateStr = new Date().toISOString().slice(0, 10);
  let classroomExtracted = false; // 标记是否已提取到班级

  // 前 5 行内寻找班级名 / 日期
  for (let i = 0; i < Math.min(5, aoa.length); i++) {
    const row = aoa[i] || [];
    for (const cell of row) {
      const str = String(cell ?? "").trim();
      if (!str) continue;

      // 提取日期（YYYY-MM-DD 或 YYYY/M/D 或 M月D日）
      const dateMatch =
        str.match(/(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})/) ||
        str.match(/(\d{1,2})月(\d{1,2})日?/);
      if (dateMatch && dateStr === new Date().toISOString().slice(0, 10)) {
        if (dateMatch.length === 4) {
          // YYYY-MM-DD 格式
          const [, y, m, d] = dateMatch;
          dateStr = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
        } else if (dateMatch.length === 3) {
          // M月D日 格式（用今年）
          const year = new Date().getFullYear();
          const [, m, d] = dateMatch;
          dateStr = `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
        }
      }

      // 提取班级名（v2 精确优先 + 降级）
      if (!classroomExtracted) {
        // 优先：标题行格式 "XX班《YY》反馈表" → 取"《》前"+"班"结尾
        // 例："理科精品班《物质材料》反馈表  8月12日" → "理科精品班"
        const preciseMatch = str.match(/^([^《》]{1,20}?)班(?=[《\s]|$)/);
        if (preciseMatch) {
          classroomName = preciseMatch[0];
          classroomExtracted = true;
          continue;
        }

        // 降级：模糊匹配含"班"等（仅当字符串较短时，避免误抓长文本）
        if (
          matchAnyKeyword(str, CLASSROOM_TITLE_KEYWORDS) &&
          str.length <= 30
        ) {
          classroomName = str;
          classroomExtracted = true;
        }
      }
    }
  }

  return { classroomName, date: dateStr };
}

/**
 * 解析单个 Sheet 为 MistakeCollection
 *
 * 关键点：
 * - 表头行模糊识别（不强制第 1 行是表头，会扫描前 5 行找含"姓名"的那行）
 * - 合并单元格 SheetJS 自动读左上角值，无需特殊处理
 * - 空行自动跳过
 *
 * @param explicitMapping 可选：传入显式列映射（来自列映射面板），跳过自动检测
 */
export function parseSheet(
  workbook: XLSX.WorkBook,
  sheetName: string,
  explicitMapping?: {
    nameCol: number;
    classroomCol: number;
    homeworkCol: number;
  },
): import("./types").MistakeCollection {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" 不存在`);
  }

  const { classroomName, date } = extractHeaderInfo(workbook, sheetName);

  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  // 过滤完全空的行
  const nonEmptyRows = aoa.filter(
    (row) => row && row.some((cell) => String(cell).trim() !== ""),
  );

  if (nonEmptyRows.length === 0) {
    return {
      sheetName,
      classroomName,
      date,
      students: [],
      rawSheetData: [],
      columns: { nameCol: -1, classroomCol: -1, homeworkCol: -1 },
    };
  }

  // 扫描前 5 行找表头（找首个含"姓名"的行）
  let headerRowIdx = -1;
  let columns = { nameCol: -1, classroomCol: -1, homeworkCol: -1 };

  // 如果传入了显式映射，直接用它，跳过自动检测
  if (explicitMapping) {
    columns = explicitMapping;
    // 找匹配的表头行（作为数据起始索引）
    for (let i = 0; i < Math.min(5, nonEmptyRows.length); i++) {
      const row = nonEmptyRows[i] || [];
      const headers = row.map((c) => String(c ?? "").trim());
      if (headers.some((h) => matchAnyKeyword(h, NAME_KEYWORDS))) {
        headerRowIdx = i;
        break;
      }
    }
    // 没找到含"姓名"的行 → 表头在第 1 行
    if (headerRowIdx === -1) headerRowIdx = 0;
  } else {
    // 自动检测：扫描前 5 行找含"姓名"的行
    for (let i = 0; i < Math.min(5, nonEmptyRows.length); i++) {
      const row = nonEmptyRows[i] || [];
      const headers = row.map((c) => String(c ?? "").trim());
      const detected = detectColumns(headers);

      if (detected.nameCol !== -1) {
        headerRowIdx = i;
        columns = detected;
        break;
      }
    }
  }

  if (headerRowIdx === -1 || columns.nameCol === -1) {
    throw new Error(
      `Sheet "${sheetName}" 找不到"姓名"列。请确认表头包含「姓名」「堂测错题」「作业错题」字段。`,
    );
  }

  // 解析学生数据行（表头之后的行）
  const students: StudentMistakes[] = [];

  for (let i = headerRowIdx + 1; i < nonEmptyRows.length; i++) {
    const row = nonEmptyRows[i] || [];
    const name = String(row[columns.nameCol] ?? "").trim();

    // 跳过无效行：空姓名、或姓名像表头（"姓名"/"序号"）
    if (!name || name === "姓名" || name === "序号" || name.length > 20) {
      continue;
    }

    const classroomRaw =
      columns.classroomCol !== -1
        ? String(row[columns.classroomCol] ?? "").trim()
        : "";
    const homeworkRaw =
      columns.homeworkCol !== -1
        ? String(row[columns.homeworkCol] ?? "").trim()
        : "";

    const classroomQNumbers = splitQNumbers(classroomRaw);
    const homeworkQNumbers = splitQNumbers(homeworkRaw);

    students.push({
      rowIndex: i,
      name,
      classroomQNumbers,
      homeworkQNumbers,
      isAllCorrect:
        classroomQNumbers.length === 0 && homeworkQNumbers.length === 0,
    });
  }

  return {
    sheetName,
    classroomName,
    date,
    students,
    rawSheetData: nonEmptyRows,
    columns,
  };
}

// ============== 题号切分（v0.4 大题粒度） ==============

/**
 * 把单元格字符串切分为题号数组
 *
 * 关键决策（PRD §8.3.2 决策 5 + 6）：
 * - 大题粒度：不拆括号内小题（"1（2 8）" 整体作为一个题号）
 * - 原样保留：'针2' / '全对' / '未交' 不规范化
 * - 状态词不过滤：'全对' '未交' '请假' 都作为题号槽
 *
 * 切分规则（实测反馈：逗号 / 空格 / 中文逗号 / Tab / 换行 都作为分隔符）：
 * - "1, 2, 7" → ["1", "2", "7"]
 * - "1（2 8）2（7）" → ["1（2 8）", "2（7）"]   ← v2 修复：括号闭合后紧跟题号字符也要切分
 * - "针2 全对" → ["针2", "全对"]
 */
export function splitQNumbers(raw: string): string[] {
  if (!raw || !raw.trim()) return [];

  // 按多种分隔符切分（中文逗号、英文逗号、空格、Tab、换行、分号）
  // 注意：括号内的空格不切分（关键）
  const tokens: string[] = [];
  let buffer = "";
  let parenDepth = 0;
  let prevWasClosingParen = false; // v2 修复：记录上一个字符是否是 ）

  for (const ch of raw) {
    if (ch === "（" || ch === "(") {
      parenDepth++;
      buffer += ch;
      prevWasClosingParen = false;
    } else if (ch === "）" || ch === ")") {
      parenDepth = Math.max(0, parenDepth - 1);
      buffer += ch;
      prevWasClosingParen = true; // 标记，准备切分下一个题号
    } else if (parenDepth === 0 && /[,，;；\s\t\n\r]+/.test(ch)) {
      if (buffer.trim()) {
        tokens.push(buffer.trim());
        buffer = "";
      }
      prevWasClosingParen = false;
    } else {
      // v2 修复：） 后紧跟题号字符（数字/中文/字母）→ 强制切分前一个 token
      if (prevWasClosingParen && /[0-9一-龥a-zA-Z]/.test(ch) && buffer.trim()) {
        tokens.push(buffer.trim());
        buffer = "";
      }
      buffer += ch;
      prevWasClosingParen = false;
    }
  }

  if (buffer.trim()) {
    tokens.push(buffer.trim());
  }

  return tokens.filter((t) => t.length > 0);
}
