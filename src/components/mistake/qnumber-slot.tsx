"use client";

/**
 * 单个题号槽位 (Step 3 · T18)
 * 来源：STAGE spec §6.2 + PRD §3.5.5 题号槽位详情
 *
 * 4 种输入方式（PRD §8.3.2 决策 8 + Round 2026-06-20 拖拽升级）：
 * - 点击上传图片
 * - Ctrl+V 粘贴图片（监听 paste 事件）
 * - 拖拽图片到槽位上传（dragenter/dragover/drop 事件）
 * - 纯文字输入
 *
 * v2 升级（2026-06-22）：每道题最多支持 3 张图片
 * - 上传第 N 张后仍可继续上传（直到 3 张上限）
 * - 拖入多张时按顺序追加
 * - 单张可独立删除
 * - 满 3 张时隐藏上传区 + 拖拽禁用
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  blobToObjectURL,
  compressImage,
  genImageId,
  saveImage,
  slotKey,
} from "@/lib/mistake/image-store";
import {
  type QNumberSlot as QNumberSlotData,
  MAX_IMAGES_PER_SLOT,
  getImageIds,
  hasImages,
} from "@/lib/mistake/types";
import {
  CheckIcon,
  ResetIcon,
  UploadIcon,
  LightbulbIcon,
} from "@/components/icons";

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
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [pasteHint, setPasteHint] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const dragCounter = useRef(0); // 避免 dragenter/dragleave 闪烁
  const fileInputRef = useRef<HTMLInputElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);

  // 当前已上传图片数
  const imageIds = getImageIds(slot);
  const imageCount = imageIds.length;
  const canUploadMore = imageCount < MAX_IMAGES_PER_SLOT;
  const remainingSlots = MAX_IMAGES_PER_SLOT - imageCount;

  // 加载已有图片的预览 URL
  useEffect(() => {
    let mounted = true;
    const urlsToRevoke: string[] = [];

    async function loadPreviews() {
      const ids = getImageIds(slot);
      if (ids.length === 0) {
        if (mounted) setPreviewUrls([]);
        return;
      }

      const { loadImage } = await import("@/lib/mistake/image-store");
      const urls: string[] = [];
      for (const id of ids) {
        const record = await loadImage(id);
        if (mounted && record) {
          const url = blobToObjectURL(record.blob);
          urls.push(url);
          urlsToRevoke.push(url);
        }
      }
      if (mounted) setPreviewUrls(urls);
    }

    loadPreviews();

    return () => {
      mounted = false;
      urlsToRevoke.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot.imageBlobIds, slot.imageBlobId]);

  // 监听 Ctrl+V 粘贴
  useEffect(() => {
    const el = slotRef.current;
    if (!el) return;

    function handlePaste(e: ClipboardEvent) {
      if (slot.isMarkedAllCorrect) return;
      if (!canUploadMore) {
        e.preventDefault();
        alert(`已达上限 ${MAX_IMAGES_PER_SLOT} 张，无法继续粘贴`);
        return;
      }
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            void handleImageFile(file);
            return;
          }
        }
      }
    }

    el.addEventListener("paste", handlePaste);
    return () => el.removeEventListener("paste", handlePaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot.isMarkedAllCorrect, canUploadMore]);

  // 监听拖拽上传
  useEffect(() => {
    const el = slotRef.current;
    if (!el) return;

    function handleDragEnter(e: DragEvent) {
      if (slot.isMarkedAllCorrect) return;
      if (!canUploadMore) return;
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current += 1;
      if (e.dataTransfer?.types.includes("Files")) {
        setDragOver(true);
      }
    }

    function handleDragOver(e: DragEvent) {
      if (!canUploadMore) return;
      // 必须 preventDefault 才能触发 drop
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "copy";
      }
    }

    function handleDragLeave(e: DragEvent) {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = Math.max(0, dragCounter.current - 1);
      if (dragCounter.current === 0) {
        setDragOver(false);
      }
    }

    function handleDrop(e: DragEvent) {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setDragOver(false);

      if (slot.isMarkedAllCorrect) return;
      if (!canUploadMore) {
        alert(`已达上限 ${MAX_IMAGES_PER_SLOT} 张，无法继续添加`);
        return;
      }

      const files = Array.from(e.dataTransfer?.files ?? []);
      const imageFiles = files.filter((f) => f.type.startsWith("image/"));
      const nonImageCount = files.length - imageFiles.length;

      if (imageFiles.length === 0) {
        if (nonImageCount > 0) {
          alert(
            `拖入了 ${nonImageCount} 个非图片文件。请拖入 PNG / JPG / JPEG / WebP 格式的图片。`,
          );
        }
        return;
      }

      // 取最多 remainingSlots 张
      const accepted = imageFiles.slice(0, remainingSlots);
      const droppedTooMany = imageFiles.length > remainingSlots;

      // 串行上传，避免并发问题
      void (async () => {
        for (const file of accepted) {
          await handleImageFile(file);
        }
        if (droppedTooMany) {
          alert(
            `已达上限 ${MAX_IMAGES_PER_SLOT} 张，仅添加了前 ${accepted.length} 张`,
          );
        }
      })();
    }

    el.addEventListener("dragenter", handleDragEnter);
    el.addEventListener("dragover", handleDragOver);
    el.addEventListener("dragleave", handleDragLeave);
    el.addEventListener("drop", handleDrop);

    return () => {
      el.removeEventListener("dragenter", handleDragEnter);
      el.removeEventListener("dragover", handleDragOver);
      el.removeEventListener("dragleave", handleDragLeave);
      el.removeEventListener("drop", handleDrop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot.isMarkedAllCorrect, canUploadMore, remainingSlots]);

  // 槽位聚焦时显示粘贴提示
  const handleFocus = useCallback(() => {
    setPasteHint(true);
    setTimeout(() => setPasteHint(false), 2500);
  }, []);

  // 处理图片文件（上传/粘贴/拖拽共用）
  // append 模式：添加到现有列表（而非替换）
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

        // 追加到现有列表
        const currentIds = getImageIds(slot);
        const newIds = [...currentIds, id];
        const newUrl = blobToObjectURL(compressed);
        setPreviewUrls((prev) => [...prev, newUrl]);

        const newSlot: QNumberSlotData = {
          ...slot,
          imageBlobIds: newIds,
          // 兼容旧字段：如果之前是旧字段，迁移到新字段
          imageBlobId: newIds.length === 1 ? newIds[0] : slot.imageBlobId,
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
    [qType, qNumber, slot, onChange],
  );

  // 文件选择（支持多选）
  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      const imageFiles = files.filter((f) => f.type.startsWith("image/"));
      const accepted = imageFiles.slice(0, remainingSlots);
      const droppedTooMany = imageFiles.length > remainingSlots;

      void (async () => {
        for (const file of accepted) {
          await handleImageFile(file);
        }
        if (droppedTooMany) {
          alert(
            `已达上限 ${MAX_IMAGES_PER_SLOT} 张，仅添加了前 ${accepted.length} 张`,
          );
        }
      })();

      e.target.value = "";
    },
    [handleImageFile, remainingSlots],
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

  // 删除单张图片
  const removeImageAt = useCallback(
    async (index: number) => {
      const currentIds = getImageIds(slot);
      const targetId = currentIds[index];
      if (!targetId) return;

      if (targetId) {
        const { deleteImage } = await import("@/lib/mistake/image-store");
        await deleteImage(targetId);
      }

      // 释放该位置的 preview URL
      setPreviewUrls((prev) => {
        const urlToRevoke = prev[index];
        if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
        return prev.filter((_, i) => i !== index);
      });

      const newIds = currentIds.filter((_, i) => i !== index);
      const newSlot: QNumberSlotData = {
        ...slot,
        imageBlobIds: newIds,
        // 同步旧字段：单图时同步，0 图时清空
        imageBlobId: newIds.length === 1 ? newIds[0] : newIds.length === 0 ? undefined : slot.imageBlobId,
      };
      setSlot(newSlot);
      onChange(newSlot);
    },
    [slot, onChange],
  );

  // 一键清空所有图片
  const removeAllImages = useCallback(async () => {
    const currentIds = getImageIds(slot);
    if (currentIds.length === 0) return;

    const { deleteImage } = await import("@/lib/mistake/image-store");
    for (const id of currentIds) {
      await deleteImage(id);
    }
    previewUrls.forEach((u) => URL.revokeObjectURL(u));
    setPreviewUrls([]);

    const newSlot: QNumberSlotData = {
      ...slot,
      imageBlobIds: [],
      imageBlobId: undefined,
    };
    setSlot(newSlot);
    onChange(newSlot);
  }, [slot, previewUrls, onChange]);

  return (
    <div
      ref={slotRef}
      tabIndex={0}
      onFocus={handleFocus}
      className={`
        rounded-xl border p-5 transition outline-none
        focus:border-accent focus:ring-2 focus:ring-accent/20
        bg-white border-hairline
        ${dragOver ? "border-accent ring-2 ring-accent/30 bg-accent-soft/30" : ""}
      `}
      data-slot-key={slotKey(qType, qNumber)}
    >
      {/* 标题 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg font-semibold text-ink font-mono">
          {qNumber}
        </span>
        <span className="text-xs text-ink-muted">
          {errorCount} 人错
        </span>
        {hasImages(slot) && (
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-accent-soft text-accent-ink font-medium">
            {imageCount} / {MAX_IMAGES_PER_SLOT} 张图
          </span>
        )}
      </div>

      {/* 图片预览区（grid · 最多 3 张） */}
      {hasImages(slot) && (
        <div className="grid grid-cols-3 gap-2 mb-2">
          {previewUrls.map((url, idx) => (
            <div
              key={url}
              className="relative group rounded-lg overflow-hidden bg-canvas-alt aspect-square"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`题号 ${qNumber} 第 ${idx + 1} 张图`}
                className="w-full h-full object-contain"
              />
              <button
                type="button"
                onClick={() => removeImageAt(idx)}
                aria-label={`删除第 ${idx + 1} 张图`}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-danger text-white text-xs leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-danger/90"
              >
                ✕
              </button>
              <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px]">
                {idx + 1}
              </span>
            </div>
          ))}

          {/* 还可继续上传时显示"+"占位 */}
          {canUploadMore && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              aria-label="再添加一张图"
              className="aspect-square rounded-lg border-2 border-dashed border-hairline hover:border-accent hover:bg-accent-soft/20 transition flex items-center justify-center text-ink-subtle hover:text-accent-ink disabled:opacity-50"
            >
              {uploading ? (
                <ResetIcon className="w-5 h-5 animate-spin" />
              ) : (
                <span className="text-2xl leading-none">+</span>
              )}
            </button>
          )}
        </div>
      )}

      {/* 操作栏（删除全部 + 上传） */}
      {hasImages(slot) && (
        <div className="flex items-center justify-between mb-2 text-xs">
          <span className="text-ink-subtle">
            {canUploadMore
              ? `还可上传 ${remainingSlots} 张`
              : `已达上限 ${MAX_IMAGES_PER_SLOT} 张`}
          </span>
          <button
            type="button"
            onClick={removeAllImages}
            className="text-ink-muted hover:text-danger transition"
          >
            全部删除
          </button>
        </div>
      )}

      {/* 上传区（无图时显示大区域，有图但还能上传时由上方"+"按钮触发） */}
      {!hasImages(slot) && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`w-full rounded-lg border-2 border-dashed transition p-8 text-center ${
            dragOver
              ? "border-accent bg-accent-soft/40 scale-[0.98]"
              : "border-hairline hover:border-accent hover:bg-accent-soft/20"
          }`}
        >
          <div className="mb-1 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent-soft text-accent-text">
            {uploading ? (
              <ResetIcon className="w-6 h-6 animate-spin" />
            ) : (
              <UploadIcon className="w-6 h-6" />
            )}
          </div>
          <div className="text-sm text-ink-mute">
            {uploading
              ? "压缩中…"
              : dragOver
              ? "松开即可上传"
              : "点击上传 · Ctrl+V 粘贴 · 拖拽图片"}
          </div>
          <div className="text-xs text-ink-subtle mt-1">
            PNG / JPG / JPEG / WebP · 最多 {MAX_IMAGES_PER_SLOT} 张 · 单张自动压到 500KB
          </div>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        multiple
        onChange={onFileChange}
        className="hidden"
        aria-label={`上传题号 ${qNumber} 的图片`}
      />

      {/* 分割线 + 文字输入 */}
      {!hasImages(slot) && (
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
          hasImages(slot)
            ? "（可选）补充文字描述…"
            : "输入纯文字题目（不粘图片时）"
        }
        className="mt-3 w-full bg-canvas-alt border border-hairline rounded-lg px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent focus:bg-white transition resize-none"
        rows={hasImages(slot) ? 2 : 4}
      />

      {/* 粘贴提示 */}
      {pasteHint && canUploadMore && (
        <div className="mt-2 text-xs text-accent animate-pulse inline-flex items-center gap-1">
          <LightbulbIcon className="w-3 h-3" />
          已激活 Ctrl+V 粘贴，截图后可直接粘贴
        </div>
      )}
    </div>
  );
}