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
import type { MistakeCollection, QNumberSlot } from "@/lib/mistake/types";
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
        {classroomSlots.filter(hasSlotContent).length > 0 && (
          <PreviewSlotGroup
            title="堂测错题"
            slots={classroomSlots}
          />
        )}

        {/* 作业错题 */}
        {homeworkSlots.filter(hasSlotContent).length > 0 && (
          <PreviewSlotGroup
            title="作业错题"
            slots={homeworkSlots}
          />
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
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let mounted = true;

    async function load() {
      if (slot.imageBlobId) {
        const record = await loadImage(slot.imageBlobId!);
        if (mounted && record) {
          url = URL.createObjectURL(record.blob);
          setImageUrl(url);
        }
      }
    }

    load();

    return () => {
      mounted = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [slot.imageBlobId]);

  return (
    <div className="pl-4 space-y-2">
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={`题号 ${slot.qNumber}`}
          className="max-w-full max-h-72 mx-auto rounded-md"
        />
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
    slot.imageBlobId || (slot.textContent && slot.textContent.trim()),
  );
}