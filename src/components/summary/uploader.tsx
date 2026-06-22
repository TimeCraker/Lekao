"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { compressImages } from "@/lib/image-compress";
import {
  UploadIcon,
  ResetIcon,
  CloseIcon,
} from "@/components/icons";

const ACCEPT = "image/png,image/jpeg,image/webp";
const MAX_IMAGES = 5;

export type ImageItem = {
  id: string;
  dataUrl: string;
  fileName: string;
  sizeBytes: number;
};

type Props = {
  images: ImageItem[];
  onChange: (imgs: ImageItem[]) => void;
  disabled?: boolean;
  maxImages?: number;
};

export function Uploader({
  images,
  onChange,
  disabled,
  maxImages = MAX_IMAGES,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      setErr(null);
      const arr = Array.from(files);
      if (images.length + arr.length > maxImages) {
        setErr(`最多 ${maxImages} 张图片，当前已选 ${images.length} 张`);
        return;
      }

      // 过滤非图片
      const imageFiles = arr.filter((f) => f.type.startsWith("image/"));
      const nonImageCount = arr.length - imageFiles.length;
      if (imageFiles.length === 0) {
        setErr(`不支持的文件类型（共 ${arr.length} 个文件）`);
        return;
      }
      if (nonImageCount > 0) {
        console.warn(`[Uploader] 跳过 ${nonImageCount} 个非图片文件`);
      }
      // 上限校验（压缩前）
      if (images.length + imageFiles.length > maxImages) {
        setErr(
          `最多 ${maxImages} 张图片，当前已选 ${images.length} 张，本次最多再加 ${maxImages - images.length} 张`,
        );
        return;
      }

      setIsProcessing(true);
      setProgress({ current: 0, total: imageFiles.length });
      try {
        // ⭐ 2026-06-22：改用共享压缩工具（并发 2 + 移动端降级 + 进度回调 + iOS fallback）
        const compressedBlobs = await compressImages(imageFiles, {
          onProgress: (current, total) => setProgress({ current, total }),
        });

        // 转 dataUrl
        const processed: ImageItem[] = [];
        for (let i = 0; i < compressedBlobs.length; i++) {
          const dataUrl = await fileToDataUrl(compressedBlobs[i]);
          processed.push({
            id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
            dataUrl,
            fileName: imageFiles[i].name,
            sizeBytes: compressedBlobs[i].size,
          });
        }
        onChange([...images, ...processed]);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "图片处理失败");
      } finally {
        setIsProcessing(false);
        setProgress(null);
      }
    },
    [images, maxImages, onChange],
  );

  const remove = (id: string) => {
    onChange(images.filter((i) => i.id !== id));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    if (e.dataTransfer.files.length) {
      void addFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          // ⭐ 2026-06-22 收尾：移动端 padding 减小 + 触控目标 ≥ 44px
          "relative cursor-pointer rounded-2xl border-2 border-dashed p-6 sm:p-10 text-center transition-all",
          disabled && "opacity-50 cursor-not-allowed",
          isDragging
            ? "border-accent bg-accent-soft/50"
            : "border-hairline bg-white hover:border-accent/50 hover:bg-accent-soft/20",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            if (e.target.files?.length) void addFiles(e.target.files);
            e.target.value = "";
          }}
        />

        <div className="mb-3 inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-accent-soft text-accent-text">
          {isProcessing ? (
            <ResetIcon className="w-6 h-6 sm:w-7 sm:h-7 animate-spin" />
          ) : (
            <UploadIcon className="w-6 h-6 sm:w-7 sm:h-7" />
          )}
        </div>
        <div className="text-sm sm:text-base font-semibold text-ink mb-1 px-2">
          {isProcessing
            ? progress
              ? `正在压缩 ${progress.current} / ${progress.total}…`
              : "正在压缩图片…"
            : isDragging
              ? "松开鼠标即可上传"
              : "拖拽讲义图片到这里"}
        </div>
        <div className="text-xs sm:text-sm text-ink-muted px-2">
          {isProcessing
            ? "大图自动降级，低配手机也不会卡"
            : "或点击选择 · 支持 PNG / JPG / JPEG / WebP"}
        </div>
        <div className="text-xs text-ink-subtle mt-2">
          最多 {maxImages} 张 · 当前已选 {images.length} 张
        </div>
        {/* ⭐ 压缩进度条 */}
        {isProcessing && progress && progress.total > 0 && (
          <div className="mt-3 mx-auto max-w-xs h-1.5 rounded-full bg-hairline overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{
                width: `${Math.round((progress.current / progress.total) * 100)}%`,
              }}
            />
          </div>
        )}
      </div>

      {err && (
        <div className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-lg px-3 py-2">
          {err}
        </div>
      )}

      {images.length > 0 && (
        // ⭐ 2026-06-22：移动端 grid-cols-2, sm:grid-cols-3, md:grid-cols-5 (渐进)
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
          <AnimatePresence mode="popLayout">
            {images.map((img, idx) => (
              <motion.div
                key={img.id}
                layout
                initial={{ opacity: 0, scale: 0.85, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, x: -40, scale: 0.9 }}
                transition={{
                  duration: 0.3,
                  delay: idx * 0.04,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="relative group rounded-lg overflow-hidden border border-hairline bg-white aspect-square"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.dataUrl}
                  alt={img.fileName}
                  className="w-full h-full object-cover"
                />
                {/* ⭐ 触屏设备：删除按钮永远显示（不能 hover） */}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => remove(img.id)}
                  className="absolute top-1 right-1 w-7 h-7 sm:w-6 sm:h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition disabled:opacity-0"
                  aria-label="删除图片"
                >
                  <CloseIcon className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
                  <div className="text-[10px] text-white truncate">
                    {img.fileName}
                  </div>
                  <div className="text-[10px] text-white/70">
                    {(img.sizeBytes / 1024).toFixed(0)} KB
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });
}