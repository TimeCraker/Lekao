import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";
import {
  detectColumns,
  extractHeaderInfo,
  listSheets,
  parseSheet,
  scanHeaders,
  splitQNumbers,
} from "./excel-parser";

// 用 SheetJS 纯 JS API 构造 workbook（不依赖 fs / File）
function makeWorkbook(rows: unknown[][], sheetName = "Sheet1"): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), sheetName);
  return wb;
}

// extractHeaderInfo 找不到日期时回退「今天」——固定系统时间保证断言确定
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-29T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("splitQNumbers（大题粒度切分）", () => {
  it.each([
    ["英文逗号 + 空格", "1, 2, 7", ["1", "2", "7"]],
    ["中文逗号", "1，2，5，6", ["1", "2", "5", "6"]],
    ["空格 / Tab / 换行混用", "1\t2\n3", ["1", "2", "3"]],
    ["括号内空格不切分（大题粒度）", "1（2 8）", ["1（2 8）"]],
    [
      "括号闭合后紧跟题号字符强制切分（v2）",
      "1（2 8）2（7）",
      ["1（2 8）", "2（7）"],
    ],
    ["状态词原样保留不规范化", "针2 全对", ["针2", "全对"]],
    ["分号分隔", "1；2；3", ["1", "2", "3"]],
  ])("%s", (_name, raw, expected) => {
    expect(splitQNumbers(raw)).toEqual(expected);
  });

  it("空输入 → 空数组", () => {
    expect(splitQNumbers("")).toEqual([]);
    expect(splitQNumbers("   ")).toEqual([]);
  });
});

describe("detectColumns（列名模糊识别）", () => {
  it("标准三列识别", () => {
    expect(detectColumns(["姓名", "堂测错题", "作业错题"])).toEqual({
      nameCol: 0,
      classroomCol: 1,
      homeworkCol: 2,
    });
  });

  it("「堂测分数」不误识为堂测错题列（v2 修复）", () => {
    const r = detectColumns(["姓名", "堂测分数", "作业错题"]);
    expect(r.classroomCol).toBe(-1);
    expect(r.homeworkCol).toBe(2);
  });

  it("堂测列含作业关键词时排除冲突；别名变体可识别", () => {
    expect(detectColumns(["学生", "测验错题", "课后练习"])).toEqual({
      nameCol: 0,
      classroomCol: 1,
      homeworkCol: 2,
    });
    expect(detectColumns(["Name", "quiz", "homework"]).nameCol).toBe(0);
  });

  it("无匹配列 → -1", () => {
    expect(detectColumns(["序号", "备注"])).toEqual({
      nameCol: -1,
      classroomCol: -1,
      homeworkCol: -1,
    });
  });
});

describe("extractHeaderInfo（班级名 + 日期提取）", () => {
  it("「XX班《YY》反馈表」精确取班级；YYYY-MM-DD 日期", () => {
    const wb = makeWorkbook(
      [["化学冲刺班《有机化学》反馈表 2026-08-20"]],
      "s1",
    );
    expect(extractHeaderInfo(wb, "s1")).toEqual({
      classroomName: "化学冲刺班",
      date: "2026-08-20",
    });
  });

  it("「M月D日」格式按当前年份补全", () => {
    const wb = makeWorkbook([["理科精品班", "8月12日"]], "s1");
    const { date } = extractHeaderInfo(wb, "s1");
    expect(date).toBe("2026-08-12");
  });

  it("无标题行 → 班级名回退 Sheet 名、日期回退今天", () => {
    const wb = makeWorkbook([["姓名", "作业错题"]], "Sheet1");
    expect(extractHeaderInfo(wb, "Sheet1")).toEqual({
      classroomName: "Sheet1",
      date: "2026-08-29",
    });
  });

  it("sheet 不存在 → Sheet 名 + 今天（不抛错）", () => {
    const wb = makeWorkbook([["x"]], "other");
    expect(extractHeaderInfo(wb, "missing")).toEqual({
      classroomName: "missing",
      date: "2026-08-29",
    });
  });
});

describe("parseSheet（单 Sheet 解析）", () => {
  const rows = [
    ["化学冲刺班《有机化学》反馈表 2026-08-20"],
    ["姓名", "堂测错题", "作业错题"],
    ["张三", "1, 2", "3"],
    ["李四", "全对", ""],
    ["", "", ""], // 空行被过滤
    ["王五", "", ""],
  ];

  it("表头行模糊识别（标题行之后），解析学生数据", () => {
    const wb = makeWorkbook(rows, "s1");
    const r = parseSheet(wb, "s1");
    expect(r.classroomName).toBe("化学冲刺班");
    expect(r.date).toBe("2026-08-20");
    expect(r.columns).toEqual({ nameCol: 0, classroomCol: 1, homeworkCol: 2 });
    expect(r.students).toHaveLength(3);
    expect(r.students[0]).toMatchObject({
      name: "张三",
      classroomQNumbers: ["1", "2"],
      homeworkQNumbers: ["3"],
      isAllCorrect: false,
    });
  });

  it("「全对」作为题号槽保留，isAllCorrect 只认两列全空（现状行为）", () => {
    const wb = makeWorkbook(rows, "s1");
    const [liSi, wangWu] = parseSheet(wb, "s1").students.slice(1);
    expect(liSi.classroomQNumbers).toEqual(["全对"]);
    expect(liSi.isAllCorrect).toBe(false);
    expect(wangWu.classroomQNumbers).toEqual([]);
    expect(wangWu.homeworkQNumbers).toEqual([]);
    expect(wangWu.isAllCorrect).toBe(true); // 两列全空 = 全对
  });

  it("姓名像表头（姓名/序号）或超 20 字的行跳过；rowIndex 按过滤后行号", () => {
    const wb = makeWorkbook(
      [
        ["姓名", "作业错题"],
        ["姓名", "1"],
        ["序号", "2"],
        ["重复表头一样很长很长的名字超过二十个字以上的无效行吧", "3"],
        ["赵六", "4"],
      ],
      "s1",
    );
    const r = parseSheet(wb, "s1");
    expect(r.students.map((s) => s.name)).toEqual(["赵六"]);
    expect(r.students[0].rowIndex).toBe(4);
  });

  it("explicitMapping 跳过自动检测", () => {
    const wb = makeWorkbook(
      [
        ["姓名", "作业错题"],
        ["张三", "5"],
      ],
      "s1",
    );
    const r = parseSheet(wb, "s1", {
      nameCol: 0,
      classroomCol: -1,
      homeworkCol: 1,
    });
    expect(r.students[0].homeworkQNumbers).toEqual(["5"]);
    expect(r.students[0].classroomQNumbers).toEqual([]);
  });

  it("空 Sheet → 空集合；找不到姓名列 → 抛错；Sheet 不存在 → 抛错", () => {
    const empty = makeWorkbook([["", ""]], "empty");
    const r = parseSheet(empty, "empty");
    expect(r.students).toEqual([]);

    const noName = makeWorkbook([["序号", "备注"]], "noName");
    expect(() => parseSheet(noName, "noName")).toThrow(/找不到"姓名"列/);

    expect(() => parseSheet(makeWorkbook([["x"]], "a"), "b")).toThrow(/不存在/);
  });
});

describe("scanHeaders（表头扫描，不解析全量）", () => {
  it("返回表头行索引、原始列名与列映射", () => {
    const wb = makeWorkbook(
      [
        ["化学冲刺班《有机化学》反馈表 2026-08-20"],
        ["姓名", "堂测错题", "作业错题"],
        ["张三", "1", "2"],
      ],
      "s1",
    );
    const r = scanHeaders(wb, "s1");
    expect(r.sheetName).toBe("s1");
    expect(r.headerRowIndex).toBe(1);
    expect(r.headers).toEqual(["姓名", "堂测错题", "作业错题"]);
    expect(r.detected).toEqual({ nameCol: 0, classroomCol: 1, homeworkCol: 2 });
    expect(r.classroomName).toBe("化学冲刺班");
    expect(r.date).toBe("2026-08-20");
  });

  it("前 5 行无「姓名」→ 强取第 1 行为表头", () => {
    const wb = makeWorkbook([["序号", "备注"]], "s1");
    const r = scanHeaders(wb, "s1");
    expect(r.headerRowIndex).toBe(0);
    expect(r.detected.nameCol).toBe(-1);
  });
});

describe("listSheets（Sheet 元数据）", () => {
  it("rowCount = 非空行数 - 表头；preview 截 30 字", () => {
    const wb = makeWorkbook(
      [
        ["姓名", "作业错题"],
        ["张三", "1"],
        ["李四", "2"],
        ["王五", "3"],
      ],
      "s1",
    );
    const r = listSheets(wb);
    expect(r).toHaveLength(1);
    expect(r[0].name).toBe("s1");
    expect(r[0].rowCount).toBe(3);
    expect(r[0].preview[0]).toEqual(["姓名", "作业错题"]);
  });

  it("多 Sheet 各自统计", () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([["姓名"], ["张三"]]),
      "A",
    );
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["备注"]]), "B");
    const r = listSheets(wb);
    expect(r.map((s) => s.name)).toEqual(["A", "B"]);
    expect(r[0].rowCount).toBe(1);
    expect(r[1].rowCount).toBe(0);
  });
});
