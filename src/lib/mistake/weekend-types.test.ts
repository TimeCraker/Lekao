import { describe, expect, it } from "vitest";
import {
  QUICK_FILL_OPTIONS,
  classifyCellValue,
  shouldSkipAiFeedback,
  sortStudentsByCellValue,
  type WeekendStudent,
} from "./weekend-types";

const student = (over: Partial<WeekendStudent>): WeekendStudent => ({
  rowIndex: 1,
  serialNumber: "1",
  name: "张三",
  qNumbersInput: "",
  feedback: "",
  ...over,
});

describe("classifyCellValue（C 列运行时分类）", () => {
  it("空字符串 / 全空白 → blank", () => {
    expect(classifyCellValue("")).toBe("blank");
    expect(classifyCellValue("   ")).toBe("blank");
  });

  it("精确匹配特殊值", () => {
    expect(classifyCellValue("全对")).toBe("allCorrect");
    expect(classifyCellValue("网课")).toBe("onlineCourse");
    expect(classifyCellValue("网课回放")).toBe("onlineReview");
    expect(classifyCellValue("上次课网课")).toBe("onlineLast");
    expect(classifyCellValue("作业未交")).toBe("notSubmitted");
  });

  it("含数字 → qnumber（含顿号分隔与「针2」类原文）", () => {
    expect(classifyCellValue("3，6")).toBe("qnumber");
    expect(classifyCellValue("1，2，5，6")).toBe("qnumber");
    expect(classifyCellValue("针2")).toBe("qnumber");
  });

  it("非精确特殊值 / 纯文本 → other（避免「上网课」误判网课）", () => {
    expect(classifyCellValue("不想上网课")).toBe("other");
    expect(classifyCellValue("转学")).toBe("other");
    expect(classifyCellValue("全对了吗")).toBe("other"); // 非精确匹配不算 allCorrect
  });
});

describe("shouldSkipAiFeedback", () => {
  it.each(["qnumber", "allCorrect"] as const)(
    "特殊值 %s 不跳过 AI 反馈",
    (cat) => {
      expect(shouldSkipAiFeedback(cat)).toBe(false);
    },
  );

  it.each([
    "onlineCourse",
    "onlineReview",
    "onlineLast",
    "notSubmitted",
    "other",
    "blank",
  ] as const)("%s 跳过 AI 反馈", (cat) => {
    expect(shouldSkipAiFeedback(cat)).toBe(true);
  });
});

describe("QUICK_FILL_OPTIONS（UI 快捷按钮）", () => {
  it("5 个快捷值与分类一一对应", () => {
    expect(QUICK_FILL_OPTIONS).toEqual([
      { value: "全对", category: "allCorrect", label: "全对" },
      { value: "网课", category: "onlineCourse", label: "网课" },
      { value: "网课回放", category: "onlineReview", label: "网课回放" },
      { value: "上次课网课", category: "onlineLast", label: "上次课网课" },
      { value: "作业未交", category: "notSubmitted", label: "作业未交" },
    ]);
    // 快捷值必须能被 classifyCellValue 识别回对应分类（UI 插入后状态一致）
    for (const opt of QUICK_FILL_OPTIONS) {
      expect(classifyCellValue(opt.value)).toBe(opt.category);
    }
  });
});

describe("sortStudentsByCellValue（不修改原数组）", () => {
  it("类别优先级：题号 → 全对 → 网课 → 回放 → 上次课 → 未交 → 其他 → 留空", () => {
    const input = [
      student({ name: "留空", qNumbersInput: "" }),
      student({ name: "其他", qNumbersInput: "转学" }),
      student({ name: "未交", qNumbersInput: "作业未交" }),
      student({ name: "全对", qNumbersInput: "全对" }),
      student({ name: "题号", qNumbersInput: "3，6" }),
      student({ name: "回放", qNumbersInput: "网课回放" }),
      student({ name: "上次课", qNumbersInput: "上次课网课" }),
      student({ name: "网课", qNumbersInput: "网课" }),
    ];
    const sorted = sortStudentsByCellValue(input);
    expect(sorted.map((s) => s.name)).toEqual([
      "题号",
      "全对",
      "网课",
      "回放",
      "上次课",
      "未交",
      "其他",
      "留空",
    ]);
    expect(input[0].name).toBe("留空"); // 原数组不被修改
  });

  it("同类 qnumber 按首个数字升序（2 先于 10，非字典序）", () => {
    const sorted = sortStudentsByCellValue([
      student({ name: "乙", qNumbersInput: "10" }),
      student({ name: "甲", qNumbersInput: "2" }),
      student({ name: "丙", qNumbersInput: "1，5" }),
    ]);
    expect(sorted.map((s) => s.qNumbersInput)).toEqual(["1，5", "2", "10"]);
  });

  it("同类别非题号按姓名拼音升序（zh-CN localeCompare）", () => {
    const sorted = sortStudentsByCellValue([
      student({ name: "李四", qNumbersInput: "全对" }),
      student({ name: "白雪", qNumbersInput: "全对" }),
      student({ name: "陈六", qNumbersInput: "全对" }),
    ]);
    expect(sorted.map((s) => s.name)).toEqual(["白雪", "陈六", "李四"]);
  });

  it("isNew 学生排到同类别最末（Stage 15 稳定显示）", () => {
    const sorted = sortStudentsByCellValue([
      student({ name: "王新", qNumbersInput: "5", isNew: true }),
      student({ name: "赵一", qNumbersInput: "2" }),
      student({ name: "钱旧", qNumbersInput: "全对", isNew: true }),
      student({ name: "孙旧", qNumbersInput: "全对" }),
    ]);
    expect(sorted.map((s) => s.name)).toEqual(["赵一", "王新", "孙旧", "钱旧"]);
  });
});
