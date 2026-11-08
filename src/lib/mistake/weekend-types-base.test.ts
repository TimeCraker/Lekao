import { describe, expect, it } from "vitest";
import {
  WEEKEND_DRAFT_SCHEMA_VERSION,
  WEEKEND_STUDENT_LIMIT,
  getQNumberLabels,
  type FieldColumnMap,
} from "./weekend-types-base";

const map = (over: Partial<FieldColumnMap> = {}): FieldColumnMap => ({
  serial: 1,
  name: 2,
  qNumbersCols: [3],
  feedback: 4,
  ...over,
});

describe("常量", () => {
  it("单 Sheet 60 人上限；草稿 schema 版本 1", () => {
    expect(WEEKEND_STUDENT_LIMIT).toBe(60);
    expect(WEEKEND_DRAFT_SCHEMA_VERSION).toBe(1);
  });
});

describe("getQNumberLabels（R2 原文生成 UI 列标签）", () => {
  it("单错题列用 R2 原文", () => {
    expect(
      getQNumberLabels(map(), ["序号", "姓名", "作业错题", "反馈"]),
    ).toEqual(["作业错题"]);
  });

  it("双错题列按 R2 原文顺序输出", () => {
    const cols = map({ qNumbersCols: [3, 4] });
    expect(
      getQNumberLabels(cols, ["序号", "姓名", "作业错题", "堂测错题"]),
    ).toEqual(["作业错题", "堂测错题"]);
  });

  it("R2 缺失 / 文本为空 → 兜底「错题」/「错题 2」", () => {
    expect(getQNumberLabels(map(), undefined)).toEqual(["错题"]);
    expect(
      getQNumberLabels(map({ qNumbersCols: [3, 4] }), [null, "", null, null]),
    ).toEqual(["错题", "错题 2"]);
  });

  it("越界列号安全兜底（不抛错）", () => {
    const cols = map({ qNumbersCols: [9] });
    expect(getQNumberLabels(cols, ["序号", "姓名", "作业错题"])).toEqual([
      "错题",
    ]);
  });
});
