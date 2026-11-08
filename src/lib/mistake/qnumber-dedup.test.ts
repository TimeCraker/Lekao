import { describe, expect, it } from "vitest";
import {
  dedupQNumbers,
  getErrorCount,
  naturalCompare,
  summarizeCollection,
} from "./qnumber-dedup";
import type { StudentMistakes } from "./types";

const student = (over: Partial<StudentMistakes>): StudentMistakes => ({
  rowIndex: 1,
  name: "张三",
  classroomQNumbers: [],
  homeworkQNumbers: [],
  isAllCorrect: false,
  ...over,
});

describe("naturalCompare（自然排序：数字优先）", () => {
  it("数字按数值比较，不是字典序（2 < 7 < 10）", () => {
    const sorted = ["10", "2", "7", "1"].sort(naturalCompare);
    expect(sorted).toEqual(["1", "2", "7", "10"]);
  });

  it("含括号小题的大题号按首位数字比较", () => {
    expect(naturalCompare("1（2 8）", "2（7）")).toBeLessThan(0);
  });

  it("数字段先于文本段（「针2」排在纯数字之后）", () => {
    const sorted = ["针2", "10", "2"].sort(naturalCompare);
    expect(sorted).toEqual(["2", "10", "针2"]);
  });

  it("同为文本段用 zh-CN 比较", () => {
    expect(naturalCompare("甲", "乙")).toBeLessThan(0);
  });
});

describe("dedupQNumbers（去重 + 计数 + 排序）", () => {
  it("输出按自然排序（人数不影响主排序，仅作为返回字段）", () => {
    const students = [
      student({ classroomQNumbers: ["1", "2"] }),
      student({ classroomQNumbers: ["2", "10"] }),
      student({ classroomQNumbers: ["2"] }),
    ];
    expect(dedupQNumbers(students, "classroom")).toEqual([
      { qNumber: "1", errorCount: 1 },
      { qNumber: "2", errorCount: 3 },
      { qNumber: "10", errorCount: 1 },
    ]);
  });

  // 副排序（errorCount 倒序）只在 naturalCompare === 0 时触发；
  // Map 键唯一 ⇒ 每个题号仅一条 ⇒ 副排序实际不可达（冗余逻辑，见报告 §5 观察项）。
  it("3 号 1 人仍排末尾（仅自然序决定次序）", () => {
    const students = [
      student({ homeworkQNumbers: ["1", "2"] }),
      student({ homeworkQNumbers: ["2", "1"] }),
      student({ homeworkQNumbers: ["3"] }),
    ];
    const r = dedupQNumbers(students, "homework");
    expect(r.map((q) => q.qNumber)).toEqual(["1", "2", "3"]);
    expect(r[0].errorCount).toBe(2);
    expect(r[2].errorCount).toBe(1);
  });

  it("「全对」不是题号，聚合阶段过滤", () => {
    const students = [
      student({ homeworkQNumbers: ["全对"] }),
      student({ homeworkQNumbers: ["全对", "3"] }),
    ];
    expect(dedupQNumbers(students, "homework")).toEqual([
      { qNumber: "3", errorCount: 1 },
    ]);
  });

  it("堂测 / 作业分别去重，互不合并", () => {
    const students = [
      student({ classroomQNumbers: ["1"], homeworkQNumbers: ["1"] }),
    ];
    expect(dedupQNumbers(students, "classroom")).toHaveLength(1);
    expect(dedupQNumbers(students, "homework")).toHaveLength(1);
  });

  // 计数语义 = 题号出现次数；上游 parseSheet 保证每生每题一条 ⇒ 次数 = 人数。
  // 若同一学生重复列出同题会重复计数（输入契约，见报告 §5 观察项）。
  it("跨学生聚合计数；重复条目按次数累计（不做学生级去重）", () => {
    const twoStudents = [
      student({ homeworkQNumbers: ["1"] }),
      student({ homeworkQNumbers: ["1", "2"] }),
    ];
    expect(dedupQNumbers(twoStudents, "homework")).toEqual([
      { qNumber: "1", errorCount: 2 },
      { qNumber: "2", errorCount: 1 },
    ]);

    const duplicateEntry = [student({ homeworkQNumbers: ["1", "1"] })];
    expect(dedupQNumbers(duplicateEntry, "homework")).toEqual([
      { qNumber: "1", errorCount: 2 },
    ]);
  });
});

describe("getErrorCount（某题号在多少学生中出现）", () => {
  const students = [
    student({ classroomQNumbers: ["1", "2"], homeworkQNumbers: ["5"] }),
    student({ classroomQNumbers: ["1"], homeworkQNumbers: [] }),
  ];

  it("按类型分别统计", () => {
    expect(getErrorCount(students, "1", "classroom")).toBe(2);
    expect(getErrorCount(students, "5", "homework")).toBe(1);
    expect(getErrorCount(students, "9", "classroom")).toBe(0);
  });
});

describe("summarizeCollection（全班概况）", () => {
  it("总人数 / 全对人数 / 两类去重题号数", () => {
    const students = [
      student({
        classroomQNumbers: ["1", "2"],
        homeworkQNumbers: ["1", "2"],
        isAllCorrect: false,
      }),
      student({
        classroomQNumbers: ["1"],
        homeworkQNumbers: [],
        isAllCorrect: false,
      }),
      student({
        classroomQNumbers: ["全对"],
        homeworkQNumbers: ["全对"],
        isAllCorrect: true,
      }),
    ];
    expect(summarizeCollection(students)).toEqual({
      totalStudents: 3,
      allCorrectCount: 1,
      classroomQCount: 3, // {1, 2, 全对} —— 「全对」计入集合（现状行为）
      homeworkQCount: 3,
    });
  });
});
