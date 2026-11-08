import { describe, expect, it, vi } from "vitest";

/**
 * S04 T-402 · 预览不得污染历史（DoD：草稿/IndexedDB/history 不被破坏）
 *
 * 预览要能反复重建产物，所以走 `persistSections: false`；
 * 但仍必须**读取**历史 sections，保证「预览内容 == 导出内容」。
 */
const { saveSectionSpy, loadSectionsSpy } = vi.hoisted(() => ({
  saveSectionSpy: vi.fn(async () => undefined),
  loadSectionsSpy: vi.fn(async () => []),
}));

vi.mock("@/lib/mistake/section-store", () => ({
  loadSections: loadSectionsSpy,
  saveSection: saveSectionSpy,
}));

vi.mock("@/lib/mistake/image-store", () => ({
  loadImage: async () => null,
}));

const { generateStudentDocx } = await import("@/lib/mistake/docx-generator");

function args(persistSections?: boolean) {
  return {
    studentName: "张三",
    sheetName: "数学",
    classroomName: "2026超火1班",
    date: "2026-10-02",
    classroomSlots: [
      {
        qType: "classroom" as const,
        qNumber: "1",
        textContent: "第 1 题计算有误",
        isMarkedAllCorrect: false,
      },
    ],
    homeworkSlots: [],
    classroomQNumbers: ["1"],
    homeworkQNumbers: [],
    ...(persistSections === undefined ? {} : { persistSections }),
  };
}

describe("generateStudentDocx 的持久化语义", () => {
  it("预览（persistSections:false）：读取历史但不写入", async () => {
    loadSectionsSpy.mockClear();
    saveSectionSpy.mockClear();

    const blob = await generateStudentDocx(args(false));

    expect(blob.size).toBeGreaterThan(0);
    expect(loadSectionsSpy).toHaveBeenCalled();
    expect(saveSectionSpy).not.toHaveBeenCalled();
  });

  it("导出（默认）：写入历史 section", async () => {
    saveSectionSpy.mockClear();

    await generateStudentDocx(args());

    expect(saveSectionSpy).toHaveBeenCalledTimes(1);
  });
});
