"use client";

/**
 * 错题反馈表 · AI 反馈生成面板（Stage 3.4）
 *
 * - 上传 1-5 张讲义图 → 点击"AI 生成反馈" → 调 batch API
 * - 每个学生 D 列填入反馈（AI / 全对模板 / 特殊情况跳过）
 * - 第一个特殊情况学生位置填"本次作业总体小结"
 *
 * ⭐ Stage 3.3：图片上传支持 3 种方式（对齐 summary/uploader.tsx + mistake/qnumber-slot.tsx）：
 * - 点击上传（input[type=file] + label）
 * - 拖拽上传（dragover/drop 事件）
 * - 粘贴上传（paste 事件 + clipboardData）
 *
 * ⭐ Stage 3.4：支持多张讲义图（1-5 张）
 * - 多图视觉识别：recognizeHandout 原生支持数组，AI 会综合多张图提取知识点
 * - 多图预览：grid 排版，✕ 单独删除
 * - 拖入多张/粘贴多张时按上限自动截断
 *
 * 大小限制：
 * - ≤ 4 MB/张（与服务端 MAX_IMAGE_BYTES 一致）
 * - ≤ 5 张（与服务端 MAX_IMAGES_PER_REQUEST 一致）
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  UploadIcon,
  CheckIcon,
  LightbulbIcon,
  CloseIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils";

// ============================================
// 类型
// ============================================

export type BatchStudentResult = {
  name: string;
  qNumbersInput: string;
  feedback: string;
  fromAi: boolean;
  isSkipped: boolean;
  isSummarySlot: boolean;
};

export type AiFeedbackStatus =
  | { type: "idle" }
  | { type: "uploading" }
  | { type: "generating" }
  | { type: "done"; result: AiFeedbackDone }
  | { type: "error"; message: string };

export type AiFeedbackDone = {
  subject: string;
  topic: string;
  keyPoints: string[];
  summary: string;
  totalTokens: number;
};

type ImageItem = {
  id: string;
  dataUrl: string;
  fileName: string;
  sizeBytes: number;
};

// ============================================
// Props
// ============================================

type Props = {
  sheetName: string;
  students: { name: string; qNumbersInput: string }[];
  date: string;
  onFeedbackReady: (results: BatchStudentResult[]) => void;
};

// ============================================
// 常量
// ============================================

const ACCEPT = "image/png,image/jpeg,image/webp";
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 与服务端 MAX_IMAGE_BYTES 一致
const MAX_IMAGES = 5; // 与服务端 MAX_IMAGES_PER_REQUEST 一致

// ⭐ Stage 18：作业总体小结字数挡位（5 档 · 1x 默认 = 至少 2 倍旧基准）
const SUMMARY_LENGTH_OPTIONS = [
  { value: "0.5x", label: "0.5x", desc: "75-150 字", tag: "压缩" },
  { value: "1x", label: "1x", desc: "150-300 字", tag: "标准" },
  { value: "1.5x", label: "1.5x", desc: "225-450 字", tag: "" },
  { value: "2x", label: "2x", desc: "300-600 字", tag: "" },
  { value: "3x", label: "3x", desc: "450-900 字", tag: "" },
] as const;
type SummaryLengthValue = (typeof SUMMARY_LENGTH_OPTIONS)[number]["value"];

// ============================================
// 组件
// ============================================

export function WeekendAiFeedbackPanel({
  sheetName,
  students,
  date,
  onFeedbackReady,
}: Props) {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [status, setStatus] = useState<AiFeedbackStatus>({ type: "idle" });
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pasteHint, setPasteHint] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // ⭐ Stage 18：作业总体小结字数挡位（默认 1x 标准）
  const [summaryLength, setSummaryLength] = useState<SummaryLengthValue>("1x");

  const inputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const dragCounter = useRef(0);

  // 生成前统计
  const aiCount = students.filter((s) => {
    const v = s.qNumbersInput.trim();
    return v && v !== "全对" && v !== "网课" && v !== "网课回放" && v !== "上次课网课" && v !== "作业未交";
  }).length;
  const allCorrectCount = students.filter((s) => s.qNumbersInput.trim() === "全对").length;
  const skipCount = students.filter((s) => {
    const v = s.qNumbersInput.trim();
    return ["网课", "网课回放", "上次课网课", "作业未交"].includes(v);
  }).length;
  const blankCount = students.filter((s) => s.qNumbersInput.trim() === "").length;

  // ============================================
  // 共用文件处理（点击 / 拖拽 / 粘贴三路汇合）
  // ============================================
  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      setErr(null);
      const arr = Array.from(files);
      if (arr.length === 0) return;

      const imageFiles = arr.filter((f) => f.type.startsWith("image/"));
      const nonImageCount = arr.length - imageFiles.length;
      if (nonImageCount > 0) {
        console.warn(`[WeekendAiFeedbackPanel] 跳过 ${nonImageCount} 个非图片文件`);
      }
      if (imageFiles.length === 0) {
        setErr("仅支持图片格式（PNG / JPG / JPEG / WebP）");
        return;
      }

      // 上限校验
      const remaining = MAX_IMAGES - images.length;
      if (remaining <= 0) {
        setErr(`最多 ${MAX_IMAGES} 张讲义图，已达上限`);
        return;
      }
      const accepted = imageFiles.slice(0, remaining);
      const droppedTooMany = imageFiles.length > remaining;
      if (droppedTooMany) {
        setErr(
          `最多 ${MAX_IMAGES} 张讲义图，当前已选 ${images.length} 张，仅添加前 ${accepted.length} 张`,
        );
      }

      setIsProcessing(true);
      try {
        const newItems: ImageItem[] = [];
        for (let i = 0; i < accepted.length; i++) {
          const file = accepted[i];
          if (file.size > MAX_IMAGE_BYTES) {
            setErr(`"${file.name}" 超过 ${MAX_IMAGE_BYTES / 1024 / 1024} MB，已跳过`);
            continue;
          }
          const dataUrl = await blobToDataUrl(file);
          newItems.push({
            id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
            dataUrl,
            fileName: file.name,
            sizeBytes: file.size,
          });
        }
        if (newItems.length > 0) {
          setImages((prev) => [...prev, ...newItems]);
          setStatus({ type: "idle" });
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : "图片读取失败");
      } finally {
        setIsProcessing(false);
      }
    },
    [images.length],
  );

  // ============================================
  // 点击上传
  // ============================================
  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) void addFiles(e.target.files);
      e.target.value = "";
    },
    [addFiles],
  );

  // ============================================
  // 拖拽上传（始终可拖，未满 5 张时增加，满 5 张时禁用）
  // ============================================
  useEffect(() => {
    const el = dropZoneRef.current;
    if (!el) return;
    const atMax = images.length >= MAX_IMAGES;

    function handleDragEnter(e: DragEvent) {
      e.preventDefault();
      e.stopPropagation();
      if (status.type === "generating" || atMax) return;
      if (!e.dataTransfer?.types.includes("Files")) return;
      dragCounter.current += 1;
      setIsDragging(true);
    }

    function handleDragOver(e: DragEvent) {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = atMax ? "none" : "copy";
      }
    }

    function handleDragLeave(e: DragEvent) {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = Math.max(0, dragCounter.current - 1);
      if (dragCounter.current === 0) setIsDragging(false);
    }

    function handleDrop(e: DragEvent) {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragging(false);
      if (status.type === "generating" || atMax) return;

      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length === 0) return;
      void addFiles(files);
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
  }, [addFiles, images.length, status.type]);

  // ============================================
  // 粘贴上传（始终可粘贴，未满 5 张时增加，满 5 张时禁用）
  // ============================================
  useEffect(() => {
    const atMax = images.length >= MAX_IMAGES;

    function handlePaste(e: ClipboardEvent) {
      if (status.type === "generating" || atMax) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length === 0) return;
      e.preventDefault();
      void addFiles(files);
    }

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [addFiles, images.length, status.type]);

  // 聚焦时显示粘贴提示
  const handleFocus = useCallback(() => {
    if (images.length < MAX_IMAGES && status.type !== "generating") {
      setPasteHint(true);
      setTimeout(() => setPasteHint(false), 2500);
    }
  }, [images.length, status.type]);

  // ============================================
  // 删除单张图
  // ============================================
  const removeImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((i) => i.id !== id));
    setStatus({ type: "idle" });
  }, []);

  // ============================================
  // 清空全部
  // ============================================
  const clearAll = useCallback(() => {
    setImages([]);
    setStatus({ type: "idle" });
    setErr(null);
  }, []);

  // ============================================
  // 生成反馈
  // ============================================
  const handleGenerate = useCallback(async () => {
    if (images.length === 0) return;
    if (students.length === 0) return;

    setStatus({ type: "generating" });

    try {
      const res = await fetch("/api/lekao/feedback/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lectureImages: images.map((i) => i.dataUrl),
          sheetName,
          date,
          students: students.map((s) => ({
            name: s.name,
            qNumbersInput: s.qNumbersInput,
          })),
          summaryLength,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus({
          type: "error",
          message: data.error || `请求失败 (${res.status})`,
        });
        return;
      }

      // 成功
      const done: AiFeedbackDone = {
        subject: data.subject,
        topic: data.topic,
        keyPoints: data.keyPoints,
        summary: data.summary,
        totalTokens: data.totalTokens,
      };
      setStatus({ type: "done", result: done });

      // 将反馈传回父组件
      onFeedbackReady(data.students);
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "网络错误，请重试",
      });
    }
  }, [images, students, sheetName, date, summaryLength, onFeedbackReady]);

  // ============================================
  // 复制反馈（保留兼容，但本次组件内未用到）
  // ============================================
  const handleCopy = useCallback(async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {
      // 静默失败
    }
  }, []);

  const isLoading = status.type === "generating";
  const isReadonly = isLoading || isProcessing;
  const atMax = images.length >= MAX_IMAGES;
  const totalSize = images.reduce((sum, i) => sum + i.sizeBytes, 0);

  return (
    <div className="rounded-xl border border-accent-line/60 bg-accent-soft/10 p-5 space-y-4">
      {/* 标题 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-white text-xs font-semibold">
          Stage 3
        </span>
        <h4 className="text-sm font-semibold text-ink">AI 生成反馈</h4>
        <span className="text-xs text-ink-muted">
          · 上传讲义图（1-5 张） → AI 综合识别 → 自动生成每位学生 D 列反馈
        </span>
      </div>

      {/* ============================================
          上传区（点击 + 拖拽 + 粘贴 三合一）
          ============================================ */}
      <div
        ref={dropZoneRef}
        tabIndex={0}
        onFocus={handleFocus}
        onClick={() => !isReadonly && !atMax && inputRef.current?.click()}
        className={cn(
          "relative cursor-pointer rounded-xl border-2 border-dashed p-5 sm:p-7 text-center transition-all outline-none",
          "focus:border-accent focus:ring-2 focus:ring-accent/20",
          (isReadonly || atMax) && "opacity-50 cursor-not-allowed",
          isDragging
            ? "border-accent bg-accent-soft/40 scale-[0.99]"
            : "border-hairline bg-white hover:border-accent/60 hover:bg-accent-soft/15",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          disabled={isReadonly || atMax}
          onChange={onFileChange}
          className="hidden"
          aria-label="上传讲义图片（可多张）"
        />

        <div className="mb-3 inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent-soft text-accent-text">
          {isProcessing ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <UploadIcon className="w-6 h-6" />
            </motion.div>
          ) : (
            <UploadIcon className="w-6 h-6" />
          )}
        </div>

        <div className="text-sm sm:text-base font-semibold text-ink mb-1">
          {atMax
            ? `已达 ${MAX_IMAGES} 张上限`
            : isProcessing
              ? "处理图片中…"
              : isDragging
                ? "松开鼠标即可上传"
                : `点击 / 拖拽 / Ctrl+V 粘贴讲义图（${images.length}/${MAX_IMAGES}）`}
        </div>
        <div className="text-xs sm:text-sm text-ink-muted">
          支持 PNG / JPG / JPEG / WebP · 单张 ≤ 4 MB · AI 会综合多张提取知识点
        </div>
      </div>

      {/* 粘贴提示气泡（聚焦后 2.5s 自动消失） */}
      <AnimatePresence>
        {pasteHint && !isReadonly && images.length < MAX_IMAGES && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-xs text-accent-text inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-soft/50"
          >
            <LightbulbIcon className="w-3.5 h-3.5" />
            已激活 Ctrl+V 粘贴，可一次粘贴多张
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================
          已上传图片预览 grid（可独立删除）
          ============================================ */}
      <AnimatePresence>
        {images.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span>
                已上传 <span className="text-accent-text font-medium">{images.length}</span> / {MAX_IMAGES} 张
                · 总大小 {(totalSize / 1024).toFixed(0)} KB
              </span>
              <button
                type="button"
                onClick={clearAll}
                disabled={isReadonly}
                className="text-ink-subtle hover:text-danger transition disabled:opacity-50"
              >
                清空全部
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {images.map((img, idx) => (
                <motion.div
                  key={img.id}
                  layout
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="relative group rounded-lg overflow-hidden border border-hairline bg-canvas-alt aspect-square"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.dataUrl}
                    alt={img.fileName}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    disabled={isReadonly}
                    className="absolute top-1 right-1 w-7 h-7 sm:w-6 sm:h-6 rounded-full bg-black/65 text-white flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition disabled:opacity-0"
                    aria-label={`删除第 ${idx + 1} 张图`}
                  >
                    <CloseIcon className="w-3.5 h-3.5" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
                    <div className="text-[10px] text-white truncate">
                      第 {idx + 1} 张 · {(img.sizeBytes / 1024).toFixed(0)} KB
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 错误提示 */}
      {err && (
        <div className="rounded-lg bg-danger/10 text-danger text-xs px-3 py-2">
          ⚠️ {err}
        </div>
      )}

      {/* ============================================
          ⭐ Stage 18：作业总体小结字数挡位（5 档 · 1x 标准默认）
          ============================================ */}
      <div className="rounded-lg border border-hairline bg-canvas-alt/40 px-3 py-2.5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
            <LightbulbIcon className="w-3.5 h-3.5 text-accent-text" />
            作业总体小结字数
          </div>
          <span className="text-[10px] text-ink-subtle">
            反馈条目（25-55 字/条）不受影响
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SUMMARY_LENGTH_OPTIONS.map((opt) => {
            const active = summaryLength === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSummaryLength(opt.value)}
                disabled={isReadonly}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed",
                  active
                    ? "bg-accent-text text-white border-accent-text shadow-sm"
                    : "bg-white text-ink-muted border-hairline hover:border-accent/60 hover:text-accent-text",
                )}
                aria-pressed={active}
                aria-label={`作业总体小结 ${opt.label}（${opt.desc}）`}
              >
                <span>{opt.label}</span>
                <span className={cn("text-[10px]", active ? "text-white/80" : "text-ink-subtle")}>
                  {opt.desc}
                </span>
                {opt.tag && (
                  <span
                    className={cn(
                      "inline-flex items-center px-1 py-0.5 rounded text-[10px] font-semibold",
                      active
                        ? "bg-white/20 text-white"
                        : opt.value === "0.5x"
                          ? "bg-ink-subtle/15 text-ink-muted"
                          : "bg-accent-soft text-accent-text",
                    )}
                  >
                    {opt.tag}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================
          统计预览 + 生成按钮
          ============================================ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="text-xs text-ink-muted space-y-0.5">
          <div>
            {sheetName} · {students.length} 人
          </div>
          <div className="text-ink-subtle">
            <span className="text-accent-text font-medium">{aiCount}</span> AI 生成
            {allCorrectCount > 0 && (
              <> · <span className="text-success-text">{allCorrectCount}</span> 全对模板</>
            )}
            {skipCount > 0 && (
              <> · <span className="text-warning">{skipCount}</span> 跳过（网课/未交）</>
            )}
            {blankCount > 0 && (
              <> · <span className="text-ink-subtle">{blankCount}</span> 留空</>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={images.length === 0 || isLoading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-text text-white text-sm font-medium hover:bg-accent-hover transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {isLoading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              生成中（约 15-30s）...
            </>
          ) : (
            <>
              <CheckIcon className="w-4 h-4" />
              AI 生成反馈（1 币/Sheet）
            </>
          )}
        </button>
      </div>

      {/* 状态信息 */}
      {status.type === "error" && (
        <div className="rounded-lg bg-danger/10 text-danger text-xs px-3 py-2">
          ⚠️ {status.message}
        </div>
      )}

      {status.type === "done" && (
        <div className="rounded-lg bg-success-soft/30 text-success-text text-xs px-3 py-2 flex items-center gap-2">
          <CheckIcon className="w-3.5 h-3.5 shrink-0" />
          <span>
            AI 反馈已生成（{status.result.subject} · {status.result.topic} · 知识点数：{status.result.keyPoints.length}）
            {status.result.totalTokens > 0 && ` · token：${status.result.totalTokens}`}
          </span>
        </div>
      )}

      {/* 统计备注 */}
      <div className="text-[10px] text-ink-subtle leading-relaxed">
        💡 多张讲义图会被 AI 综合识别提取知识点；"全对"用模板话术；网课/未交等跳过（第一个位置填总体小结）；
        扣 1 币/Sheet。留空的 C 列无反馈。
      </div>
    </div>
  );
}

// ============================================
// 帮助函数
// ============================================

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsDataURL(blob);
  });
}