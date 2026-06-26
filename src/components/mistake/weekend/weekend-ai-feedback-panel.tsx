"use client";

/**
 * 错题反馈表 · AI 反馈生成面板（Stage 3）
 *
 * - 上传 1 张讲义图 → 点击"AI 生成反馈" → 调 batch API
 * - 每个学生 D 列填入反馈（AI / 全对模板 / 特殊情况跳过）
 * - 第一个特殊情况学生位置填"本次作业总体小结"
 * - 复制按钮可逐条复制
 */

import { useState, useCallback } from "react";
import {
  UploadIcon,
  ExcelIcon,
  CopyIcon,
  CheckIcon,
} from "@/components/icons";

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
  const [status, setStatus] = useState<AiFeedbackStatus>({ type: "idle" });
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

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

  // 处理图片上传
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageName(file.name);
    setStatus({ type: "idle" });

    const reader = new FileReader();
    reader.onload = () => {
      setImageDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, []);

  // 生成反馈
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

  // 复制反馈
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

  return (
    <div className="rounded-xl border border-accent-line/60 bg-accent-soft/10 p-5 space-y-4">
      {/* 标题 */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-white text-xs font-semibold">
          Stage 3
        </span>
        <h4 className="text-sm font-semibold text-ink">AI 生成反馈</h4>
        <span className="text-xs text-ink-muted">
          · 上传讲义图 → 自动生成每位学生 D 列反馈
        </span>
      </div>

      {/* 图片上传 */}
      {!imageDataUrl ? (
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-hairline rounded-xl py-6 px-4 cursor-pointer hover:border-accent/50 transition bg-white">
          <UploadIcon className="w-8 h-8 text-accent-text mb-2" />
          <span className="text-sm text-ink-muted">
            点击上传讲义图片
          </span>
          <span className="text-[10px] text-ink-subtle mt-1">
            支持 JPG/PNG/WebP，建议 ≤ 4MB
          </span>
          <input
            type="file"
            accept="image/*"
            disabled={isLoading}
            onChange={handleImageUpload}
            className="hidden"
          />
        </label>
      ) : (
        <div className="flex items-center gap-3 bg-white rounded-lg border border-hairline px-3 py-2">
          <div className="w-10 h-10 rounded-lg bg-accent-soft flex items-center justify-center shrink-0">
            <ExcelIcon className="w-5 h-5 text-accent-text" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-ink truncate">{imageName}</div>
            <div className="text-[10px] text-ink-subtle">
              已上传 · 生成前可点下方按钮替换
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setImageDataUrl(null);
              setImageName("");
              setStatus({ type: "idle" });
            }}
            disabled={isLoading}
            className="text-xs text-ink-muted hover:text-danger transition disabled:opacity-50"
          >
            替换
          </button>
        </div>
      )}

      {/* 统计预览 + 生成按钮 */}
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
