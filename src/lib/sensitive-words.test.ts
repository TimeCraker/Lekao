import { describe, expect, it } from "vitest";
import {
  containsSensitiveWords,
  findSensitiveWords,
  validateSensitiveWords,
} from "./sensitive-words";

describe("containsSensitiveWords", () => {
  it("命中各类别敏感词 → true", () => {
    expect(containsSensitiveWords("加微信领资料")).toBe(true); // 广告引流
    expect(containsSensitiveWords("这是色情内容")).toBe(true); // 色情
    expect(containsSensitiveWords("废话 shit")).toBe(true); // 侮辱（词表内无空格词）
  });

  it("正常文本 → false", () => {
    expect(
      containsSensitiveWords("今天讲评了三次函数作业，整体进步明显。"),
    ).toBe(false);
    expect(containsSensitiveWords("同学们要按时交作业")).toBe(false);
  });

  it("大小写不敏感（防大小写绕过）", () => {
    expect(containsSensitiveWords("SHIT")).toBe(true);
  });

  it("中间插空格不绕过（匹配前去空格）", () => {
    expect(containsSensitiveWords("加 微 信")).toBe(true);
  });

  it("空输入 → false", () => {
    expect(containsSensitiveWords("")).toBe(false);
  });

  it("误报防线：普通含数字/日常词不受影响", () => {
    expect(containsSensitiveWords("代理服务器")).toBe(true); // 词表含「代理」——按词表现状如实断言
    expect(containsSensitiveWords("数学 100 分")).toBe(false);
  });

  it("英文侮辱词命中（词表无空格形态，任意变体）", () => {
    expect(containsSensitiveWords("fuck you")).toBe(true);
    expect(containsSensitiveWords("FUCK YOU")).toBe(true);
    expect(containsSensitiveWords("f u c k you")).toBe(true);
  });
});

describe("findSensitiveWords", () => {
  it("返回命中词数组且去重", () => {
    const hits = findSensitiveWords("加微信 加微信 shit");
    expect(hits).toContain("加微信");
    expect(hits).toContain("shit");
    expect(hits.filter((w) => w === "加微信")).toHaveLength(1);
  });

  it("前缀词与完整词同时命中（「加微」与「加微信」并存）", () => {
    expect(findSensitiveWords("加微信领资料")).toEqual(["加微", "加微信"]);
  });

  it("大小写命中时返回词表原词", () => {
    expect(findSensitiveWords("SHIT")).toEqual(["shit"]);
  });

  it("无命中 → 空数组；空输入 → 空数组", () => {
    expect(findSensitiveWords("正常内容")).toEqual([]);
    expect(findSensitiveWords("")).toEqual([]);
  });
});

describe("validateSensitiveWords（API 层快捷校验）", () => {
  it("通过 → null", () => {
    expect(validateSensitiveWords("标题", "正常标题内容")).toBeNull();
    expect(validateSensitiveWords("标题", "")).toBeNull();
  });

  it("不通过 → 带字段名与命中词的原因", () => {
    const msg = validateSensitiveWords("灵感标题", "加微信送资料");
    expect(msg).toContain("灵感标题");
    expect(msg).toContain("加微信");
    expect(msg).toContain("请修改后重试");
  });

  it("多命中词以顿号并列", () => {
    const msg = validateSensitiveWords("内容", "加微信 私聊我");
    expect(msg).toMatch(/加微信、私聊我/);
  });
});
