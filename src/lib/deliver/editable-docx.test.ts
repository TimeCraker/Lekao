import { describe, expect, it, vi } from "vitest";
import type { MistakeCollection } from "@/lib/mistake/types";
import { generateStudentDocx } from "@/lib/mistake/docx-generator";
import { summarizeDocx } from "./docx-render";
import {
  addSlotImage,
  artifactContract,
  moveSlotImage,
  removeSlotImage,
  renameStudent,
  setStudentQNumbers,
  slotKey,
  slotsForStudent,
  updateSlotText,
  type SlotMap,
} from "./editable-docx";

/**
 * S04 T-402 · 「预览即编辑」模型层 + 导出 parity
 *
 * 编辑只改源模型，随后由既有 `generateStudentDocx` 重新产出；
 * 这里用模型侧契约（图片 id 集合 / 文本集合 / 姓名 / 学科）与**真实产物字节**读出的
 * 事实做比对，避免「预览是一套、导出是另一套」。
 */
const ONE_PX_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAAwAB/AF/9v0ZAAAAAElFTkSuQmCC";

// 生成器会读写 IndexedDB（历史 section 与图片）；测试用最小替身，不 mock 业务逻辑
vi.mock("@/lib/mistake/section-store", () => ({
  loadSections: async () => [],
  saveSection: async () => undefined,
}));

vi.mock("@/lib/mistake/image-store", () => ({
  loadImage: async (id: string) => ({
    id,
    blob: new Blob([new Uint8Array(Buffer.from(ONE_PX_PNG_BASE64, "base64"))]),
    qNumber: "1",
    qType: "classroom",
    createdAt: 0,
  }),
}));

function makeCollection(): MistakeCollection {
  return {
    sheetName: "数学",
    classroomName: "2026超火1班",
    date: "2026-10-02",
    students: [
      {
        rowIndex: 3,
        name: "张三",
        classroomQNumbers: ["1", "针2"],
        homeworkQNumbers: ["3"],
        isAllCorrect: false,
      },
      {
        rowIndex: 4,
        name: "李四",
        classroomQNumbers: ["2"],
        homeworkQNumbers: [],
        isAllCorrect: false,
      },
    ],
    rawSheetData: [],
    columns: { nameCol: 2, classroomCol: 3, homeworkCol: 4 },
  };
}

function makeSlots(): SlotMap {
  return {
    [slotKey("classroom", "1")]: {
      qType: "classroom",
      qNumber: "1",
      textContent: "第 1 题计算有误",
      imageBlobIds: ["img-a", "img-b"],
      isMarkedAllCorrect: false,
    },
    [slotKey("classroom", "针2")]: {
      qType: "classroom",
      qNumber: "针2",
      textContent: "",
      imageBlobIds: ["img-c"],
      isMarkedAllCorrect: false,
    },
    [slotKey("homework", "3")]: {
      qType: "homework",
      qNumber: "3",
      textContent: "作业第 3 题漏写单位",
      isMarkedAllCorrect: false,
    },
  };
}

describe("editable-docx 模型编辑", () => {
  it("改学生姓名并保持记录唯一（去除首尾空格）", () => {
    const next = renameStudent(makeCollection(), "张三", " 张三丰 ");
    expect(next.students.find((s) => s.name === "张三丰")).toBeTruthy();
    expect(next.students.some((s) => s.name === "张三")).toBe(false);
    expect(next.students).toHaveLength(2);
  });

  it("空姓名或未知学生被拒绝（不静默丢数据）", () => {
    expect(() => renameStudent(makeCollection(), "张三", "   ")).toThrow();
    expect(() => renameStudent(makeCollection(), "不存在", "x")).toThrow();
  });

  it("改题号：去重、去空、保留顺序，并清掉 isAllCorrect", () => {
    const next = setStudentQNumbers(makeCollection(), "张三", "classroom", [
      " 3 ",
      "1",
      "3",
      "",
    ]);
    const s = next.students.find((x) => x.name === "张三")!;
    expect(s.classroomQNumbers).toEqual(["3", "1"]);
    expect(s.isAllCorrect).toBe(false);
  });

  it("写文本会为缺失的槽位建新槽（预览里可直接补内容）", () => {
    const slots = updateSlotText(makeSlots(), "homework", "9", "新增题目说明");
    expect(slots[slotKey("homework", "9")]).toMatchObject({
      qType: "homework",
      qNumber: "9",
      textContent: "新增题目说明",
    });
  });

  it("加图片：正常追加、重复拒绝、超过 3 张拒绝", () => {
    const first = addSlotImage(makeSlots(), "homework", "3", "img-d");
    expect(first.ok).toBe(true);
    expect(first.slots[slotKey("homework", "3")].imageBlobIds).toEqual([
      "img-d",
    ]);

    expect(addSlotImage(first.slots, "homework", "3", "img-d")).toMatchObject({
      ok: false,
      reason: "duplicate",
    });

    const full = ["x1", "x2", "x3"].reduce<SlotMap>(
      (acc, id) => addSlotImage(acc, "classroom", "9", id).slots,
      first.slots,
    );
    expect(addSlotImage(full, "classroom", "9", "x4")).toMatchObject({
      ok: false,
      reason: "limit",
    });
  });

  it("删图片与移图片（越界保持原样）", () => {
    const removed = removeSlotImage(makeSlots(), "classroom", "1", "img-a");
    expect(removed[slotKey("classroom", "1")].imageBlobIds).toEqual(["img-b"]);

    const moved = moveSlotImage(makeSlots(), "classroom", "1", "img-a", 1);
    expect(moved[slotKey("classroom", "1")].imageBlobIds).toEqual([
      "img-b",
      "img-a",
    ]);

    const noop = moveSlotImage(moved, "classroom", "1", "img-a", 1);
    expect(noop[slotKey("classroom", "1")].imageBlobIds).toEqual([
      "img-b",
      "img-a",
    ]);
  });

  it("按学生过滤：只取该学生的题号，且只保留有内容的槽位", () => {
    const { classroomSlots, homeworkSlots } = slotsForStudent(
      makeCollection(),
      makeSlots(),
      "张三",
    );
    expect(classroomSlots.map((s) => s.qNumber)).toEqual(["1", "针2"]);
    expect(homeworkSlots.map((s) => s.qNumber)).toEqual(["3"]);

    const other = slotsForStudent(makeCollection(), makeSlots(), "李四");
    expect(other.classroomSlots).toEqual([]);
    expect(other.homeworkSlots).toEqual([]);
  });

  it("交付契约汇总模型侧真值（图片顺序与文本集合）", () => {
    const contract = artifactContract(makeCollection(), makeSlots(), "张三");
    expect(contract).toMatchObject({
      studentName: "张三",
      sheetName: "数学",
      date: "2026-10-02",
    });
    expect(contract.imageIds).toEqual(["img-a", "img-b", "img-c"]);
    expect(contract.textContents).toEqual([
      "第 1 题计算有误",
      "作业第 3 题漏写单位",
    ]);
  });
});

describe("导出 parity（模型 → 真实 docx 字节）", () => {
  it("在模型上改 3 处后重新导出，产物图片数与模型契约一致且正文非空", async () => {
    // 1. 起点
    let collection = makeCollection();
    let slots = makeSlots();

    // 2. 模拟「预览内直接改」的三处编辑
    collection = renameStudent(collection, "张三", "张三丰");
    slots = updateSlotText(
      slots,
      "homework",
      "3",
      "作业第 3 题漏写单位（已复核）",
    );
    slots = addSlotImage(slots, "homework", "3", "img-e").slots;

    // 3. 模型侧契约（预览要展示的就是它）
    const contract = artifactContract(collection, slots, "张三丰");
    expect(contract.imageIds).toHaveLength(4);

    // 4. 用既有生成器重新产出（渲染层不拼字节）
    const { classroomSlots, homeworkSlots } = slotsForStudent(
      collection,
      slots,
      "张三丰",
    );
    const blob = await generateStudentDocx({
      studentName: "张三丰",
      sheetName: collection.sheetName,
      classroomName: collection.classroomName,
      date: collection.date,
      classroomSlots,
      homeworkSlots,
      classroomQNumbers: ["1", "针2"],
      homeworkQNumbers: ["3"],
      cumulative: false,
    });

    // 5. 产物字节侧事实与模型侧契约对齐
    //    注意用 imageRefs（放置次数）而不是 images（去重后的媒体文件数）：
    //    测试里 4 张图字节相同，docx 库会按哈希去重成 1 个 media 文件。
    const summary = await summarizeDocx(blob);
    expect(summary.imageRefs).toBe(contract.imageIds.length);
    expect(summary.textChars).toBeGreaterThan(0);
    expect(summary.pages).toBeGreaterThanOrEqual(1);
  });
});
