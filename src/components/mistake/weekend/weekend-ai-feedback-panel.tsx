"use client";

/**
 * 错题反馈表 · AI 反馈生成面板（Stage 3.3）
 *
 * - 上传 1 张讲义图 → 点击"AI 生成反馈" → 调 batch API
 * - 每个学生 D 列填入反馈（AI / 全对模板 / 特殊情况跳过）
 * - 第一个特殊情况学生位置填"本次作业总体小结"
 * - 复制按钮可逐条复制
 *
 * ⭐ Stage 3.3：图片上传支持 3 种方式（对齐 summary/uploader.tsx + mistake/qnumber-slot.tsx）：
 * - 点击上传（input[type=file] + label）
 * - 拖拽上传（dragover/drop 事件）
 * - 粘贴上传（paste 事件 + clipboardData）
 *
 * 大小限制：
 * - ≤ 4 MB（与服务端 MAX_IMAGE_BYTES 一致）
 * - 自动 base64 编码
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  UploadIcon,
  ExcelIcon,
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

// ============================================
// 组件
// ============================================

export function WeekendAiFeedbackPanel({
  sheetName,
  students,
  date,
  onFeedbackReady,
}: Props) {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>("");
  const [imageSize, setImageSize] = useState<number>(0);
  const [status, setStatus] = useState<AiFeedbackStatus>({ type: "idle" });
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pasteHint, setPasteHint] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
  const handleFile = useCallback(async (file: File | Blob) => {
    setErr(null);
    setPasteHint(false);

    if (!file.type.startsWith("image/")) {
      setErr("仅支持图片格式（PNG / JPG / JPEG / WebP）");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setErr(`图片超过 ${MAX_IMAGE_BYTES / 1024 / 1024} MB 上限`);
      return;
    }

    setIsProcessing(true);
    try {
      const dataUrl = await blobToDataUrl(file);
      const name = file instanceof File ? file.name : `讲义图片-${Date.now()}.png`;
      setImageDataUrl(dataUrl);
      setImageName(name);
      setImageSize(file.size);
      setStatus({ type: "idle" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "图片读取失败");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // ============================================
  // 点击上传
  // ============================================
  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleFile(file);
      e.target.value = "";
    },
    [handleFile],
  );

  // ============================================
  // 拖拽上传
  // ============================================
  useEffect(() => {
    const el = dropZoneRef.current;
    if (!el || imageDataUrl) return;

    function handleDragEnter(e: DragEvent) {
      e.preventDefault();
      e.stopPropagation();
      if (status.type === "generating") return;
      if (!e.dataTransfer?.types.includes("Files")) return;
      dragCounter.current += 1;
      setIsDragging(true);
    }

    function handleDragOver(e: DragEvent) {
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
      if (dragCounter.current === 0) setIsDragging(false);
    }

    function handleDrop(e: DragEvent) {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragging(false);
      if (status.type === "generating") return;

      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length === 0) return;

      const imageFile = files.find((f) => f.type.startsWith("image/"));
      if (!imageFile) {
        setErr("拖入的不是图片，请拖入 PNG / JPG / JPEG / WebP 格式");
        return;
      }
      void handleFile(imageFile);
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
  }, [handleFile, imageDataUrl, status.type]);

  // ============================================
  // 粘贴上传
  // ============================================
  useEffect(() => {
    if (imageDataUrl) return;

    function handlePaste(e: ClipboardEvent) {
      if (status.type === "generating") return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            void handleFile(file);
            return;
          }
        }
      }
    }

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handleFile, imageDataUrl, status.type]);

  // 聚焦时显示粘贴提示（仅在未上传图时显示 2.5s）
  const handleFocus = useCallback(() => {
    if (!imageDataUrl && status.type !== "generating") {
      setPasteHint(true);
      setTimeout(() => setPasteHint(false), 2500);
    }
  }, [imageDataUrl, status.type]);

  // ============================================
  // 清除图片
  // ============================================
  const clearImage = useCallback(() => {
    setImageDataUrl(null);
    setImageName("");
    setImageSize(0);
    setStatus({ type: "idle" });
    setErr(null);
  }, []);

  // ============================================
  // 生成反馈
  // ============================================
  const handleGenerate = useCallback(async () => {
    if (!imageDataUrl) return;
    if (students.length === 0) return;

    setStatus({ type: "generating" });

    try {
      const res = await fetch("/api/lekao/feedback/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lectureImage: imageDataUrl,
          sheetName,
          date,
          students: students.map((s) => ({
            name: s.name,
            qNumbersInput: s.qNumbersInput,
          })),
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
  }, [imageDataUrl, students, sheetName, date, onFeedbackReady]);

  // ============================================
  // 复制反馈
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

  return (
    <div className="rounded-xl border border-accent-line/60 bg-accent-soft/10 p-5 space-y-4">
      {/* 标题 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-white text-xs font-semibold">
          Stage 3
        </span>
        <h4 className="text-sm font-semibold text-ink">AI 生成反馈</h4>
        <span className="text-xs text-ink-muted">
          · 上传讲义图 → 自动生成每位学生 D 列反馈
        </span>
      </div>

      {/* ============================================
          图片上传区（点击 + 拖拽 + 粘贴 三合一）
          ============================================ */}
      {!imageDataUrl ? (
        <div className="space-y-2">
          <div
            ref={dropZoneRef}
            tabIndex={0}
            onFocus={handleFocus}
            onClick={() => !isReadonly && inputRef.current?.click()}
            className={cn(
              "relative cursor-pointer rounded-xl border-2 border-dashed p-6 sm:p-8 text-center transition-all outline-none",
              "focus:border-accent focus:ring-2 focus:ring-accent/20",
              isReadonly && "opacity-50 cursor-not-allowed",
              isDragging
                ? "border-accent bg-accent-soft/40 scale-[0.99]"
                : "border-hairline bg-white hover:border-accent/60 hover:bg-accent-soft/15",
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              disabled={isReadonly}
              onChange={onFileChange}
              className="hidden"
              aria-label="上传讲义图片"
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
              {isProcessing
                ? "处理图片中…"
                : isDragging
                  ? "松开鼠标即可上传"
                  : "点击 / 拖拽 / Ctrl+V 粘贴讲义图"}
            </div>
            <div className="text-xs sm:text-sm text-ink-muted">
              支持 PNG / JPG / JPEG / WebP · ≤ 4 MB · 仅上传到 AI 服务识别
            </div>
          </div>

          {/* 粘贴提示气泡（聚焦后 2.5s 自动消失） */}
          <AnimatePresence>
            {pasteHint && !isReadonly && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="text-xs text-accent-text inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-soft/50"
              >
                <LightbulbIcon className="w-3.5 h-3.5" />
                已激活 Ctrl+V 粘贴，截图后可直接粘贴
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* 已上传：图片预览 */
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-3"
        >
          <div className="relative rounded-xl overflow-hidden border border-hairline bg-canvas-alt">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageDataUrl}
              alt={imageName}
              className="w-full max-h-72 object-contain mx-auto"
            />
            <button
              type="button"
              onClick={clearImage}
              disabled={isReadonly}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/65 text-white flex items-center justify-center hover:bg-danger transition disabled:opacity-50"
              aria-label="移除图片"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3 bg-white rounded-lg border border-hairline px-3 py-2">
            <div className="w-9 h-9 rounded-lg bg-accent-soft flex items-center justify-center shrink-0">
              <ExcelIcon className="w-4 h-4 text-accent-text" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-ink truncate">{imageName}</div>
              <div className="text-[10px] text-ink-subtle">
                已上传 · {(imageSize / 1024).toFixed(0)} KB · 生成前可点 ✕ 重新上传
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 错误提示 */}
      {err && (
        <div className="rounded-lg bg-danger/10 text-danger text-xs px-3 py-2">
          ⚠️ {err}
        </div>
      )}

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
          disabled={!imageDataUrl || isLoading}
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
        💡 有题号的学生 AI 生成个性化反馈；"全对"用模板话术；网课/未交等跳过（第一个位置填总体小结）；
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