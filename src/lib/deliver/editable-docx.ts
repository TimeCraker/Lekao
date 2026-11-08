import {
  type MistakeCollection,
  type QNumberSlot,
  MAX_IMAGES_PER_SLOT,
  getImageIds,
} from "@/lib/mistake/types";

/**
 * S04 T-402 · 错题集「预览即编辑」的可编辑模型
 *
 * 原则：所有编辑都发生在**源模型**上（MistakeCollection + 槽位表），
 * 再由既有 `generateStudentDocx` 重新产出 —— 渲染层不允许直接拼装文件字节。
 * 这样「预览 = 导出件」可以用模型与产物字节做 parity 断言（见 mistake-export-parity.test.ts）。
 */

export type SlotMap = Record<string, QNumberSlot>; // key = `${qType}:${qNumber}`

export function slotKey(qType: QNumberSlot["qType"], qNumber: string): string {
  return `${qType}:${qNumber}`;
}

/** 改学生姓名（同步更新该学生在集合里的名字，保持一条记录） */
export function renameStudent(
  collection: MistakeCollection,
  from: string,
  to: string,
): MistakeCollection {
  const name = to.trim();
  if (!name) throw new Error("学生姓名不能为空");
  let hit = false;
  const students = collection.students.map((s) => {
    if (s.name !== from) return s;
    hit = true;
    return { ...s, name };
  });
  if (!hit) throw new Error(`未找到学生：${from}`);
  return { ...collection, students };
}

/** 改某学生某类型（堂测/作业）的错题号列表（去重、去空、保持输入顺序） */
export function setStudentQNumbers(
  collection: MistakeCollection,
  studentName: string,
  qType: QNumberSlot["qType"],
  qNumbers: string[],
): MistakeCollection {
  const cleaned = [...new Set(qNumbers.map((q) => q.trim()).filter(Boolean))];
  const field =
    qType === "classroom" ? "classroomQNumbers" : "homeworkQNumbers";
  const students = collection.students.map((s) =>
    s.name === studentName
      ? { ...s, [field]: cleaned, isAllCorrect: false }
      : s,
  );
  return { ...collection, students };
}

/** 写槽位文本（新建槽位或覆盖） */
export function updateSlotText(
  slots: SlotMap,
  qType: QNumberSlot["qType"],
  qNumber: string,
  textContent: string,
): SlotMap {
  const key = slotKey(qType, qNumber);
  const current = slots[key] ?? emptySlot(qType, qNumber);
  return { ...slots, [key]: { ...current, textContent } };
}

/** 追加图片（受 MAX_IMAGES_PER_SLOT 限制；返回新的槽位表与是否成功） */
export function addSlotImage(
  slots: SlotMap,
  qType: QNumberSlot["qType"],
  qNumber: string,
  imageId: string,
): { slots: SlotMap; ok: boolean; reason?: "limit" | "duplicate" } {
  const key = slotKey(qType, qNumber);
  const current = slots[key] ?? emptySlot(qType, qNumber);
  const ids = getImageIds(current);
  if (ids.includes(imageId)) {
    return { slots, ok: false, reason: "duplicate" };
  }
  if (ids.length >= MAX_IMAGES_PER_SLOT) {
    return { slots, ok: false, reason: "limit" };
  }
  const next = [...ids, imageId];
  return {
    slots: {
      ...slots,
      [key]: { ...current, imageBlobIds: next, imageBlobId: undefined },
    },
    ok: true,
  };
}

/** 删除图片 */
export function removeSlotImage(
  slots: SlotMap,
  qType: QNumberSlot["qType"],
  qNumber: string,
  imageId: string,
): SlotMap {
  const key = slotKey(qType, qNumber);
  const current = slots[key];
  if (!current) return slots;
  const next = getImageIds(current).filter((id) => id !== imageId);
  return {
    ...slots,
    [key]: {
      ...current,
      imageBlobIds: next.length ? next : undefined,
      imageBlobId: undefined,
    },
  };
}

/** 调整图片顺序（direction: -1 前移 / 1 后移） */
export function moveSlotImage(
  slots: SlotMap,
  qType: QNumberSlot["qType"],
  qNumber: string,
  imageId: string,
  direction: -1 | 1,
): SlotMap {
  const key = slotKey(qType, qNumber);
  const current = slots[key];
  if (!current) return slots;
  const ids = getImageIds(current);
  const from = ids.indexOf(imageId);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= ids.length) return slots;
  const next = [...ids];
  [next[from], next[to]] = [next[to], next[from]];
  return { ...slots, [key]: { ...current, imageBlobIds: next } };
}

/** 按学生过滤出该学生的槽位（与预览/导出使用同一过滤口径） */
export function slotsForStudent(
  collection: MistakeCollection,
  slots: SlotMap,
  studentName: string,
): { classroomSlots: QNumberSlot[]; homeworkSlots: QNumberSlot[] } {
  const student = collection.students.find((s) => s.name === studentName);
  if (!student) return { classroomSlots: [], homeworkSlots: [] };
  const pick = (qType: QNumberSlot["qType"], qNumbers: string[]) =>
    qNumbers
      .map((q) => slots[slotKey(qType, q)])
      .filter((s): s is QNumberSlot => Boolean(s))
      .filter(
        (s) => getImageIds(s).length > 0 || Boolean(s.textContent?.trim()),
      );
  return {
    classroomSlots: pick("classroom", student.classroomQNumbers),
    homeworkSlots: pick("homework", student.homeworkQNumbers),
  };
}

/**
 * 交付契约（模型侧）：预览与导出必须一致的那些事实
 * 用于 parity 断言 —— 与产物字节里读出的内容逐项比对。
 */
export interface ArtifactContract {
  studentName: string;
  sheetName: string;
  date: string;
  imageIds: string[];
  textContents: string[];
}

export function artifactContract(
  collection: MistakeCollection,
  slots: SlotMap,
  studentName: string,
): ArtifactContract {
  const { classroomSlots, homeworkSlots } = slotsForStudent(
    collection,
    slots,
    studentName,
  );
  const all = [...classroomSlots, ...homeworkSlots];
  return {
    studentName,
    sheetName: collection.sheetName,
    date: collection.date,
    imageIds: all.flatMap((s) => getImageIds(s)),
    textContents: all
      .map((s) => s.textContent?.trim())
      .filter((t): t is string => Boolean(t)),
  };
}

function emptySlot(qType: QNumberSlot["qType"], qNumber: string): QNumberSlot {
  return { qType, qNumber, textContent: "", isMarkedAllCorrect: false };
}
