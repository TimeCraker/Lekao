"use client";

import { useCallback, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { cn } from "@/lib/utils";
import {
  UploadIcon,
  ResetIcon,
  CloseIcon,
} from "@/components/icons";

const ACCEPT = "image/png,image/jpeg,image/webp";
const MAX_IMAGES = 10;
// 安全裕度：服务端 4MB 上限（含 base64 编码后），压缩到 1.5MB 留余量
const COMPRESS_MAX_MB = 1.5;

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
  const [err, setErr] = useState<string | null>(null);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      setErr(null);
      const arr = Array.from(files);
      if (images.length + arr.length > maxImages) {
        setErr(`最多 ${maxImages} 张图片，当前已选 ${images.length} 张`);
        return;
      }

      setIsProcessing(true);
      try {
        const processed: ImageItem[] = [];
        for (const file of arr) {
          if (!file.type.startsWith("image/")) {
            throw new Error(`不支持的文件类型: ${file.type}`);
          }

          // 压缩到 ≤ 1.5MB（给 base64 编码留 ~33% 余量 → 2MB，远低于服务端 4MB 上限）
          const compressed = await imageCompression(file, {
            maxSizeMB: COMPRESS_MAX_MB,
            maxWidthOrHeight: 2048,
            useWebWorker: true,
            fileType: file.type.includes("png") ? "image/png" : "image/jpeg",
          });

          const dataUrl = await fileToDataUrl(compressed);
          processed.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            dataUrl,
            fileName: file.name,
            sizeBytes: compressed.size,
          });
        }
        onChange([...images, ...processed]);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "图片处理失败");
      } finally {
        setIsProcessing(false);
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
          "relative cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all",
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

        <div className="mb-3 inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-soft text-accent-text">
          {isProcessing ? (
            <ResetIcon className="w-7 h-7 animate-spin" />
          ) : (
            <UploadIcon className="w-7 h-7" />
          )}
        </div>
        <div className="text-base font-semibold text-ink mb-1">
          {isProcessing
            ? "正在压缩图片..."
            : isDragging
              ? "松开鼠标即可上传"
              : "拖拽讲义图片到这里"}
        </div>
        <div className="text-sm text-ink-muted">
          或点击选择 · 支持 PNG / JPG / JPEG / WebP · 单张自动压缩到 1.5MB
        </div>
        <div className="text-xs text-ink-subtle mt-2">
          最多 {maxImages} 张 · 当前已选 {images.length} 张
        </div>
      </div>

      {err && (
        <div className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-lg px-3 py-2">
          {err}
        </div>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {images.map((img) => (
            <div
              key={img.id}
              className="relative group rounded-lg overflow-hidden border border-hairline bg-white aspect-square"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.dataUrl}
                alt={img.fileName}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                disabled={disabled}
                onClick={() => remove(img.id)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition disabled:opacity-0"
                aria-label="删除图片"
              >
                <CloseIcon className="w-3 h-3" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
                <div className="text-[10px] text-white truncate">
                  {img.fileName}
                </div>
                <div className="text-[10px] text-white/70">
                  {(img.sizeBytes / 1024).toFixed(0)} KB
                </div>
              </div>
            </div>
          ))}
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