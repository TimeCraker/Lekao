import { describe, expect, it } from "vitest";
import {
  DEFAULT_FIELD_COLUMNS,
  matchField,
  parseR2Headers,
  readCell,
} from "./weekend-headers";

describe("matchField（列头 → 字段类型，feedback 最优先）", () => {
  it("「课后作业反馈」识别为 feedback 而非 qHomework（防止反馈列被当成错题）", () => {
    expect(matchField("课后作业反馈")).toBe("feedback");
  });

  it.each([
    ["作业错题", "qHomework"],
    ["课后练习", "qHomework"],
    ["堂测错题", "qClass"],
    ["课堂小测", "qClass"],
    ["姓名", "name"],
    ["学员名单", "name"],
    ["序号", "serial"],
    ["编号", "serial"],
    ["#", "serial"],
    ["No", "serial"],
  ] as const)("%s → %s", (header, field) => {
    expect(matchField(header)).toBe(field);
  });

  it("学科变体反馈列名（练习评价 / 课堂点评 / 总评）→ feedback", () => {
    expect(matchField("练习评价")).toBe("feedback");
    expect(matchField("课堂点评")).toBe("feedback");
    expect(matchField("总评")).toBe("feedback");
  });

  it("无匹配 / 空输入 → null", () => {
    expect(matchField("备注栏")).toBeNull();
    expect(matchField("")).toBeNull();
    expect(matchField(null)).toBeNull();
    expect(matchField(undefined)).toBeNull();
    expect(matchField("   ")).toBeNull();
  });
});

describe("parseR2Headers（R2 表头数组 → 列布局）", () => {
  it("标准 5 列：作业错题在前、堂测错题在后", () => {
    const m = parseR2Headers(["序号", "姓名", "作业错题", "堂测错题", "反馈"]);
    expect(m).toEqual({
      serial: 1,
      name: 2,
      qNumbersCols: [3, 4],
      feedback: 5,
    });
  });

  it("qHomework 恒排 qClass 前（R2 出现顺序相反时也归一）", () => {
    const m = parseR2Headers(["姓名", "堂测错题", "作业错题"]);
    expect(m.qNumbersCols).toEqual([3, 2]);
    expect(m.name).toBe(1);
    expect(m.serial).toBeNull();
    expect(m.feedback).toBeNull();
  });

  it("反馈列即便含「作业」关键词也归 feedback", () => {
    const m = parseR2Headers(["姓名", "作业错题", "课后作业反馈"]);
    expect(m.feedback).toBe(3);
    expect(m.qNumbersCols).toEqual([2]);
  });

  it("找不到姓名列 → 整体降级默认 4 列布局", () => {
    const m = parseR2Headers(["序号", "作业错题", "反馈"]);
    expect(m).toEqual(DEFAULT_FIELD_COLUMNS);
  });

  it("无任何错题列 → 至少给 C 列默认", () => {
    const m = parseR2Headers(["序号", "姓名", "反馈"]);
    expect(m.qNumbersCols).toEqual([DEFAULT_FIELD_COLUMNS.qNumbersCols[0]]);
    expect(m.feedback).toBe(3);
  });

  it("空行 / null 单元格不抛错", () => {
    const m = parseR2Headers([null, undefined, "姓名"]);
    expect(m.name).toBe(3);
  });
});

describe("readCell（1-based 列号读取）", () => {
  it("按 1-based 列号取值并转字符串 trim", () => {
    expect(readCell(["张三 ", "3，6"], 1)).toBe("张三");
    expect(readCell(["张三", "3，6"], 2)).toBe("3，6");
  });

  it("数字单元格转字符串", () => {
    expect(readCell([12], 1)).toBe("12");
  });

  it("null 列号 / 越界 / 空值 → 空字符串", () => {
    expect(readCell(["a"], null)).toBe("");
    expect(readCell(["a"], 5)).toBe("");
    expect(readCell([null, undefined], 1)).toBe("");
    expect(readCell([], 0)).toBe("");
  });
});
