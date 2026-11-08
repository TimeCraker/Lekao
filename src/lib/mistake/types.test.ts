import { describe, expect, it } from "vitest";
import {
  MAX_IMAGES_PER_SLOT,
  getImageIds,
  hasImages,
  type QNumberSlot,
} from "./types";

const slot = (over: Partial<QNumberSlot>): QNumberSlot => ({
  qNumber: "1",
  qType: "classroom",
  isMarkedAllCorrect: false,
  ...over,
});

describe("MAX_IMAGES_PER_SLOT", () => {
  it("每题最多 3 张图（2026-06-22 用户决策）", () => {
    expect(MAX_IMAGES_PER_SLOT).toBe(3);
  });
});

describe("getImageIds（v0 单图 → v2 多图向后兼容）", () => {
  it("新字段 imageBlobIds 优先原样返回", () => {
    expect(getImageIds(slot({ imageBlobIds: ["a", "b", "c"] }))).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("旧字段 imageBlobId 自动升级为单元素数组", () => {
    expect(getImageIds(slot({ imageBlobId: "legacy-id" }))).toEqual([
      "legacy-id",
    ]);
  });

  it("两字段并存 → 新字段优先，忽略旧字段", () => {
    expect(
      getImageIds(slot({ imageBlobId: "old", imageBlobIds: ["new1"] })),
    ).toEqual(["new1"]);
  });

  it("空数组新字段 → 回退旧字段；全空 → 空数组", () => {
    expect(getImageIds(slot({ imageBlobId: "old", imageBlobIds: [] }))).toEqual(
      ["old"],
    );
    expect(getImageIds(slot({}))).toEqual([]);
  });
});

describe("hasImages", () => {
  it("有图 true（含旧字段），无图 false", () => {
    expect(hasImages(slot({ imageBlobId: "x" }))).toBe(true);
    expect(hasImages(slot({ imageBlobIds: ["y"] }))).toBe(true);
    expect(hasImages(slot({}))).toBe(false);
  });
});
