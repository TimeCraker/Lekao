"use client";

/**
 * 单个题号槽位 (Step 3 · T18)
 * 来源：STAGE spec §6.2 + PRD §3.5.5 题号槽位详情
 *
 * 3 种输入方式（PRD §8.3.2 决策 8）：
 * - 点击上传图片
 * - Ctrl+V 粘贴图片（监听 paste 事件）
 * - 纯文字输入
 *
 * 全对槽：标记后跳过图片/文字（PRD §8.3.2 决策 13）
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  blobToObjectURL,
  compressImage,
  genImageId,
  saveImage,
  slotKey,
} from "@/lib/mistake/image-store";
import type { QNumberSlot as QNumberSlotData } from "@/lib/mistake/types";

export interface QNumberSlotProps {
  qNumber: string;
  qType: "classroom" | "homework";
  errorCount: number;
  initialSlot?: QNumberSlotData;
  onChange: (slot: QNumberSlotData) => void;
}

export function QNumberSlot({
  qNumber,
  qType,
  errorCount,
  initialSlot,
  onChange,
}: QNumberSlotProps) {
  const [slot, setSlot] = useState<QNumberSlotData>(
    initialSlot ?? {
      qNumber,
      qType,
      textContent: "",
      isMarkedAllCorrect: false,
    },
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pasteHint, setPasteHint] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);

  // 加载已有图片的预览 URL
  useEffect(() => {
    let mounted = true;
    let currentUrl: string | null = null;

    async function loadPreview() {
      if (slot.imageBlobId) {
        const { loadImage } = await import("@/lib/mistake/image-store");
        const record = await loadImage(slot.imageBlobId!);
        if (mounted && record) {
          currentUrl = blobToObjectURL(record.blob);
          setPreviewUrl(currentUrl);
        }
      }
    }

    loadPreview();

    return () => {
      mounted = false;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [slot.imageBlobId]);

  // 释放 preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // 监听 Ctrl+V 粘贴
  useEffect(() => {
    const el = slotRef.current;
    if (!el) return;

    function handlePaste(e: ClipboardEvent) {
      if (slot.isMarkedAllCorrect) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            handleImageFile(file);
            return;
          }
        }
      }
    }

    el.addEventListener("paste", handlePaste);
    return () => el.removeEventListener("paste", handlePaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot.isMarkedAllCorrect]);

  // 槽位聚焦时显示粘贴提示
  const handleFocus = useCallback(() => {
    setPasteHint(true);
    setTimeout(() => setPasteHint(false), 2500);
  }, []);

  // 处理图片文件（上传/粘贴共用）
  const handleImageFile = useCallback(
    async (file: File | Blob) => {
      if (!file.type.startsWith("image/")) {
        alert("仅支持图片格式（PNG/JPG/JPEG/WebP）");
        return;
      }

      setUploading(true);
      try {
        const compressed = await compressImage(file);
        const id = genImageId(qType, qNumber);

        await saveImage({
          id,
          blob: compressed,
          qNumber,
          qType,
          createdAt: Date.now(),
        });

        // 释放旧 URL
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        const newUrl = blobToObjectURL(compressed);
        setPreviewUrl(newUrl);

        const newSlot: QNumberSlotData = {
          ...slot,
          imageBlobId: id,
        };
        setSlot(newSlot);
        onChange(newSlot);
      } catch (e) {
        console.error(e);
        alert(`图片处理失败：${e instanceof Error ? e.message : "未知错误"}`);
      } finally {
        setUploading(false);
      }
    },
    [qType, qNumber, previewUrl, slot, onChange],
  );

  // 文件选择
  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleImageFile(file);
      e.target.value = "";
    },
    [handleImageFile],
  );

  // 文字输入
  const onTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newSlot: QNumberSlotData = {
        ...slot,
        textContent: e.target.value,
      };
      setSlot(newSlot);
      onChange(newSlot);
    },
    [slot, onChange],
  );

  // 删除图片
  const removeImage = useCallback(async () => {
    if (slot.imageBlobId) {
      const { deleteImage } = await import("@/lib/mistake/image-store");
      await deleteImage(slot.imageBlobId);
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);

    const newSlot: QNumberSlotData = {
      ...slot,
      imageBlobId: undefined,
    };
    setSlot(newSlot);
    onChange(newSlot);
  }, [slot, previewUrl, onChange]);

  // 切换全对
  const toggleAllCorrect = useCallback(() => {
    const newSlot: QNumberSlotData = {
      ...slot,
      isMarkedAllCorrect: !slot.isMarkedAllCorrect,
    };
    setSlot(newSlot);
    onChange(newSlot);
  }, [slot, onChange]);

  const isAllCorrectLabel = qNumber === "全对";
  const isMarked = slot.isMarkedAllCorrect || isAllCorrectLabel;

  return (
    <div
      ref={slotRef}
      tabIndex={0}
      onFocus={handleFocus}
      className={`
        rounded-xl border p-5 transition outline-none
        focus:border-accent focus:ring-2 focus:ring-accent/20
        ${isMarked ? "bg-success-soft/30 border-success/30" : "bg-white border-hairline"}
      `}
      data-slot-key={slotKey(qType, qNumber)}
    >
      {/* 标题 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-ink font-mono">
            {qNumber}
          </span>
          <span className="text-xs text-ink-muted">
            {errorCount} 人错
          </span>
        </div>
        <button
          type="button"
          onClick={toggleAllCorrect}
          className={`
            text-xs px-2.5 py-1 rounded-full transition
            ${
              isMarked
                ? "bg-success text-white"
                : "bg-canvas-alt text-ink-muted hover:bg-success-soft hover:text-success-text"
            }
          `}
          aria-pressed={isMarked}
        >
          ✓ 全对
        </button>
      </div>

      {isMarked ? (
        <div className="rounded-lg bg-white/60 px-3 py-2 text-sm text-ink-muted">
          {isAllCorrectLabel ? "该题全对，已标记" : "已标记全对（可选：填写评语）"}
          {!isAllCorrectLabel && (
            <textarea
              value={slot.textContent ?? ""}
              onChange={onTextChange}
              placeholder="（可选）填写评语…"
              className="mt-2 w-full bg-white border border-hairline rounded-lg px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent resize-none"
              rows={2}
            />
          )}
        </div>
      ) : (
        <>
          {/* 图片区域 */}
          {previewUrl ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt={`题号 ${qNumber} 图片`}
                className="w-full max-h-72 object-contain rounded-lg bg-canvas-alt"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 px-2.5 py-1 rounded-md bg-danger text-white text-xs hover:bg-danger/90 transition"
              >
                删除
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full rounded-lg border-2 border-dashed border-hairline hover:border-accent hover:bg-accent-soft/20 transition p-8 text-center"
            >
              <div className="text-3xl mb-1" aria-hidden>
                {uploading ? "⏳" : "📷"}
              </div>
              <div className="text-sm text-ink-mute">
                {uploading ? "压缩中…" : "点击上传 或 Ctrl+V 粘贴"}
              </div>
              <div className="text-xs text-ink-subtle mt-1">
                PNG / JPG / JPEG · 自动压到 500KB
              </div>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={onFileChange}
            className="hidden"
            aria-label={`上传题号 ${qNumber} 的图片`}
          />

          {/* 分割线 + 文字输入 */}
          {!previewUrl && (
            <div className="mt-3 flex items-center gap-3 text-xs text-ink-subtle">
              <div className="flex-1 h-px bg-hairline" />
              <span>或</span>
              <div className="flex-1 h-px bg-hairline" />
            </div>
          )}

          <textarea
            value={slot.textContent ?? ""}
            onChange={onTextChange}
            placeholder={
              previewUrl
                ? "（可选）补充文字描述…"
                : "输入纯文字题目（不粘图片时）"
            }
            className="mt-3 w-full bg-canvas-alt border border-hairline rounded-lg px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent focus:bg-white transition resize-none"
            rows={previewUrl ? 2 : 4}
          />

          {/* 粘贴提示 */}
          {pasteHint && (
            <div className="mt-2 text-xs text-accent animate-pulse">
              💡 已激活 Ctrl+V 粘贴，截图后可直接粘贴
            </div>
          )}
        </>
      )}
    </div>
  );
}