import { describe, expect, it } from "vitest";
import { findFirstMatch, matchStudent } from "./student-search";

describe("matchStudent（中文 + 拼音首字母 substring）", () => {
  it("空 query 全部命中", () => {
    expect(matchStudent("张三", "")).toBe(true);
    expect(matchStudent("张三", "   ")).toBe(true);
  });

  it("中文姓名 substring 匹配（姓或名片段）", () => {
    expect(matchStudent("张三丰", "张")).toBe(true);
    expect(matchStudent("张三丰", "三丰")).toBe(true);
    expect(matchStudent("张三丰", "丰")).toBe(true);
    expect(matchStudent("张三丰", "李")).toBe(false);
  });

  it("拼音首字母 substring 匹配", () => {
    expect(matchStudent("张三丰", "z")).toBe(true);
    expect(matchStudent("张三丰", "zsf")).toBe(true);
    expect(matchStudent("欧阳锋", "oyf")).toBe(true);
    expect(matchStudent("张三丰", "zsff")).toBe(false);
  });

  it("query 大小写不敏感", () => {
    expect(matchStudent("张三丰", "ZSF")).toBe(true);
  });

  it("空姓名：空 query 命中、非空 query 不命中且不抛错", () => {
    expect(matchStudent("", "")).toBe(true);
    expect(matchStudent("", "z")).toBe(false);
  });

  it("生僻字 / 特殊字符不抛错（pinyin 失败降级 substring）", () => {
    expect(() => matchStudent("🐉", "z")).not.toThrow();
    expect(matchStudent("🐉", "🐉")).toBe(true);
  });
});

describe("findFirstMatch（列表首个命中 rowIndex）", () => {
  const students = [
    { rowIndex: 2, name: "李四" },
    { rowIndex: 5, name: "张三" },
    { rowIndex: 9, name: "张三丰" },
  ];

  it("返回首个命中的 rowIndex", () => {
    expect(findFirstMatch(students, "张三")).toBe(5);
    expect(findFirstMatch(students, "张三丰")).toBe(9);
  });

  it("无命中 / 空列表 → null", () => {
    expect(findFirstMatch(students, "王五")).toBeNull();
    expect(findFirstMatch([], "张")).toBeNull();
  });
});
