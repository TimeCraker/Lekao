"use client";

import { useEffect, useState } from "react";
import { generateStudentDocx } from "@/lib/mistake/docx-generator";
import type { MistakeCollection, QNumberSlot } from "@/lib/mistake/types";
import { getImageIds, MAX_IMAGES_PER_SLOT } from "@/lib/mistake/types";
import { slotKey } from "@/lib/mistake/image-store";
import {
  moveSlotImage,
  removeSlotImage,
  updateSlotText,
  type SlotMap,
} from "@/lib/deliver/editable-docx";
import { DeliveryPanel } from "@/components/deliver/delivery-panel";

/**
 * S04 T-402 · 错题集「预览即编辑」
 *
 * 关键约束：编辑只改**源模型**（MistakeCollection + 槽位表），
 * 然后由既有 `generateStudentDocx` 重建产物，预览渲染的就是这份产物字节。
 * 因此「预览 = 导出件」不是靠自觉，而是同一份字节。
 *
 * 预览用 `persistSections: false`：反复编辑重建不会污染 IndexedDB 历史，
 * 但仍会读取历史 sections，保证内容的累积语义与导出一致。
 */
export interface PreviewEditorProps {
  collection: MistakeCollection;
  slots: SlotMap;
  studentName: string;
  open: boolean;
  onClose: () => void;
  onRenameStudent: (from: string, to: string) => void;
  onSlotsChange: (next: SlotMap) => void;
}

type BlobState =
  | { status: "building" }
  | { status: "ready"; blob: Blob }
  | { status: "failed"; message: string };

/** 该学生当天全部题号槽位（不过滤空槽，便于在预览里补内容） */
function studentSlotRows(
  collection: MistakeCollection,
  slots: SlotMap,
  studentName: string,
): { qType: QNumberSlot["qType"]; qNumber: string; slot?: QNumberSlot }[] {
  const student = collection.students.find((s) => s.name === studentName);
  if (!student) return [];
  return [
    ...student.classroomQNumbers.map((qNumber) => ({
      qType: "classroom" as const,
      qNumber,
      slot: slots[slotKey("classroom", qNumber)],
    })),
    ...student.homeworkQNumbers.map((qNumber) => ({
      qType: "homework" as const,
      qNumber,
      slot: slots[slotKey("homework", qNumber)],
    })),
  ];
}

export function MistakePreviewEditor({
  collection,
  slots,
  studentName,
  open,
  onClose,
  onRenameStudent,
  onSlotsChange,
}: PreviewEditorProps) {
  const [state, setState] = useState<BlobState>({ status: "building" });
  const [name, setName] = useState(studentName);

  // 学生切换时同步输入框：用渲染期比较替代 effect（React 官方
  // "adjusting state when props change" 模式；避免 react-hooks/set-state-in-effect）
  const [syncedName, setSyncedName] = useState(studentName);
  if (syncedName !== studentName) {
    setSyncedName(studentName);
    setName(studentName);
  }

  // 源模型变化 → 重建产物（0ms 调度把会 setState 的异步建件移出 effect 同步路径）
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        setState({ status: "building" });
        const student = collection.students.find((s) => s.name === studentName);
        if (!student) {
          if (!cancelled)
            setState({
              status: "failed",
              message: `未找到学生 ${studentName}`,
            });
          return;
        }
        const pick = (qType: QNumberSlot["qType"], qNumbers: string[]) =>
          qNumbers
            .map((q) => slots[slotKey(qType, q)])
            .filter((s): s is QNumberSlot => Boolean(s));

        try {
          const blob = await generateStudentDocx({
            studentName,
            sheetName: collection.sheetName,
            classroomName: collection.classroomName,
            date: collection.date,
            classroomSlots: pick("classroom", student.classroomQNumbers),
            homeworkSlots: pick("homework", student.homeworkQNumbers),
            classroomQNumbers: student.classroomQNumbers,
            homeworkQNumbers: student.homeworkQNumbers,
            persistSections: false,
          });
          if (!cancelled) setState({ status: "ready", blob });
        } catch (err) {
          if (!cancelled) {
            setState({
              status: "failed",
              message: err instanceof Error ? err.message : "生成失败",
            });
          }
        }
      })();
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, collection, slots, studentName]);

  if (!open) return null;

  const rows = studentSlotRows(collection, slots, studentName);
  const fileName = `${studentName}-错题集-${collection.date}.docx`;

  const editor = (
    <div className="p-4 space-y-4 text-sm">
      <div>
        <label
          htmlFor="preview-student-name"
          className="block text-xs font-medium text-ink-muted mb-1"
        >
          学生姓名（改完立即重排产物）
        </label>
        <input
          id="preview-student-name"
          name="studentName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            const next = name.trim();
            if (next && next !== studentName)
              onRenameStudent(studentName, next);
          }}
          className="w-full px-3 py-2 border border-hairline rounded-lg focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium text-ink-muted">
          题号内容（{rows.length} 项）
        </p>
        {rows.map(({ qType, qNumber, slot }) => {
          const ids = slot ? getImageIds(slot) : [];
          return (
            <div
              key={`${qType}:${qNumber}`}
              className="rounded-lg border border-hairline p-3 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-ink">
                  {qType === "classroom" ? "堂测" : "作业"} · {qNumber}
                </span>
                <span className="text-xs text-ink-subtle">
                  图片 {ids.length}/{MAX_IMAGES_PER_SLOT}
                </span>
              </div>

              <textarea
                value={slot?.textContent ?? ""}
                onChange={(e) =>
                  onSlotsChange(
                    updateSlotText(slots, qType, qNumber, e.target.value),
                  )
                }
                rows={2}
                placeholder="该题的文字说明（可留空，只放图片）"
                className="w-full px-3 py-2 border border-hairline rounded-lg text-xs focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />

              {ids.length > 0 && (
                <ul className="space-y-1">
                  {ids.map((id, index) => (
                    <li
                      key={id}
                      className="flex items-center gap-2 text-xs text-ink-muted"
                    >
                      <span className="truncate flex-1">图片 {index + 1}</span>
                      <button
                        type="button"
                        aria-label={`前移图片 ${index + 1}`}
                        disabled={index === 0}
                        onClick={() =>
                          onSlotsChange(
                            moveSlotImage(slots, qType, qNumber, id, -1),
                          )
                        }
                        className="min-h-9 px-2 rounded border border-hairline disabled:opacity-40"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label={`后移图片 ${index + 1}`}
                        disabled={index === ids.length - 1}
                        onClick={() =>
                          onSlotsChange(
                            moveSlotImage(slots, qType, qNumber, id, 1),
                          )
                        }
                        className="min-h-9 px-2 rounded border border-hairline disabled:opacity-40"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        aria-label={`删除图片 ${index + 1}`}
                        onClick={() =>
                          onSlotsChange(
                            removeSlotImage(slots, qType, qNumber, id),
                          )
                        }
                        className="min-h-9 px-2 rounded border border-hairline text-danger-text"
                      >
                        删除
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
        <p className="text-xs text-ink-subtle">
          新增图片请在「填题号」步骤上传；预览里可改文字、删图与调序。
        </p>
      </div>
    </div>
  );

  if (state.status === "failed") {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Word 预览"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60"
      >
        <div className="bg-white rounded-2xl p-6 max-w-md space-y-3">
          <p className="text-sm font-medium text-danger-text">
            生成预览失败：{state.message}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 px-4 rounded-lg bg-canvas-alt text-sm"
          >
            关闭
          </button>
        </div>
      </div>
    );
  }

  if (state.status === "building") {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Word 预览"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60"
      >
        <div className="bg-white rounded-2xl px-6 py-10 text-sm text-ink-subtle">
          正在按当前内容生成 Word 产物…
        </div>
      </div>
    );
  }

  // 统一交付面（S04 T-406）：下载走 DeliveryPanel 缺省实现（blob + fileName）
  return (
    <DeliveryPanel
      kind="docx"
      open={open}
      onClose={onClose}
      blob={state.blob}
      fileName={fileName}
      title="Word 预览与编辑"
      editor={editor}
      summary="预览与下载是同一份文件"
      labels={{ download: "下载这份 Word" }}
    />
  );
}
