"use client";

/**
 * HTML 实时预览（T23）
 * 来源：STAGE spec §3 T23
 *
 * 用途：导出前预览 Word 大致排版（学生名/日期/题号/图片/文字）
 * 注意：HTML 预览 ≠ 100% Word 还原，但格式（字号/居中/单栏）一致
 */

import { useEffect, useState } from "react";
import { loadImage } from "@/lib/mistake/image-store";
import { type MistakeCollection, type QNumberSlot, getImageIds } from "@/lib/mistake/types";
import { CloseIcon } from "@/components/icons";

export interface HtmlPreviewProps {
  collection: MistakeCollection;
  classroomSlots: QNumberSlot[];
  homeworkSlots: QNumberSlot[];
  studentName: string;
  open: boolean;
  onClose: () => void;
}

export function HtmlPreview({
  collection,
  classroomSlots,
  homeworkSlots,
  studentName,
  open,
  onClose,
}: HtmlPreviewProps) {
  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  // body scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Word 预览"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
          <h2 className="text-lg font-semibold text-ink">Word 预览</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-muted hover:text-ink transition w-8 h-8 flex items-center justify-center rounded-md hover:bg-canvas-alt"
            aria-label="关闭预览"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* 内容（模拟 Word 排版） */}
        <div className="flex-1 overflow-y-auto px-8 md:px-12 py-10 bg-canvas-alt/30">
          <article className="bg-white shadow-md rounded-lg p-10 md:p-16 max-w-2xl mx-auto">
            <PreviewBody
              studentName={studentName}
              collection={collection}
              classroomSlots={classroomSlots}
              homeworkSlots={homeworkSlots}
            />
          </article>
        </div>

        {/* 底部 */}
        <div className="px-6 py-3 border-t border-hairline bg-canvas-alt/30 flex items-center justify-between">
          <span className="text-xs text-ink-subtle">
            预览仅供参考，实际 Word 排版以 docx 库输出为准
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-sm px-4 py-1.5 rounded-md bg-canvas-alt hover:bg-accent-soft hover:text-accent-ink transition"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

function PreviewBody({
  studentName,
  collection,
  classroomSlots,
  homeworkSlots,
}: {
  studentName: string;
  collection: MistakeCollection;
  classroomSlots: QNumberSlot[];
  homeworkSlots: QNumberSlot[];
}) {
  // 找到该学生，过滤只显示他做错的题
  const student = collection.students.find((s) => s.name === studentName);
  const studentClassroom = student
    ? classroomSlots.filter((s) => student.classroomQNumbers.includes(s.qNumber))
    : [];
  const studentHomework = student
    ? homeworkSlots.filter((s) => student.homeworkQNumbers.includes(s.qNumber))
    : [];

  // 全对或没有错题 → 显示提示
  if (student && student.isAllCorrect) {
    return (
      <div className="space-y-6 text-ink">
        <h1 className="text-[22pt] font-bold text-center leading-tight">
          {studentName}
        </h1>
        <div className="text-center text-[11pt] text-ink-muted">
          学科：{collection.sheetName}
        </div>
        <hr className="border-divider" />
        <div className="text-center text-[14pt] text-success-text py-12">
          本次全对，无错题
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-ink">
      {/* 学生姓名 22pt 居中 */}
      <h1 className="text-[22pt] font-bold text-center leading-tight">
        {studentName}
      </h1>

      {/* 学科 */}
      <div className="text-center text-[11pt] text-ink-muted">
        学科：{collection.sheetName}
      </div>

      {/* 分隔线 */}
      <hr className="border-divider" />

      {/* 日期段 */}
      <div className="space-y-4">
        <h2 className="text-[16pt] font-bold text-accent-ink">
          {collection.date}（第 1 次）
        </h2>

        {/* 堂测错题 */}
        {studentClassroom.filter(hasSlotContent).length > 0 && (
          <PreviewSlotGroup title="堂测错题" slots={studentClassroom} />
        )}

        {/* 作业错题 */}
        {studentHomework.filter(hasSlotContent).length > 0 && (
          <PreviewSlotGroup title="作业错题" slots={studentHomework} />
        )}
      </div>
    </div>
  );
}

function PreviewSlotGroup({
  title,
  slots,
}: {
  title: string;
  slots: QNumberSlot[];
}) {
  const validSlots = slots.filter(hasSlotContent);
  if (validSlots.length === 0) return null;

  return (
    <section className="space-y-3">
      <h3 className="text-[12pt] font-semibold">{title}</h3>
      <ol className="space-y-4 list-none">
        {validSlots.map((slot, idx) => (
          <li key={`${slot.qType}-${slot.qNumber}`} className="space-y-2">
            <div className="text-[12pt]">
              <span className="text-ink-muted mr-1">{idx + 1}.</span>
              <span className="font-bold">{slot.qNumber}</span>
            </div>
            <PreviewSlotContent slot={slot} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function PreviewSlotContent({ slot }: { slot: QNumberSlot }) {
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    const urlsToRevoke: string[] = [];

    async function load() {
      const ids = getImageIds(slot);
      if (ids.length === 0) {
        if (mounted) setImageUrls([]);
        return;
      }
      const urls: string[] = [];
      for (const id of ids) {
        const record = await loadImage(id);
        if (mounted && record) {
          const url = URL.createObjectURL(record.blob);
          urls.push(url);
          urlsToRevoke.push(url);
        }
      }
      if (mounted) setImageUrls(urls);
    }

    load();

    return () => {
      mounted = false;
      urlsToRevoke.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot.imageBlobIds, slot.imageBlobId]);

  return (
    <div className="pl-4 space-y-2">
      {imageUrls.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {imageUrls.map((url, idx) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt={`题号 ${slot.qNumber} 第 ${idx + 1} 张图`}
              className="w-full max-h-48 object-contain rounded-md bg-canvas-alt"
            />
          ))}
        </div>
      )}
      {slot.textContent?.trim() && (
        <p className="text-[11pt] text-ink-mute whitespace-pre-wrap">
          {slot.textContent.trim()}
        </p>
      )}
    </div>
  );
}

function hasSlotContent(slot: QNumberSlot): boolean {
  return Boolean(
    getImageIds(slot).length > 0 || (slot.textContent && slot.textContent.trim()),
  );
}