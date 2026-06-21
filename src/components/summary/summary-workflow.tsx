"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { parseSummaryOutput } from "@/lib/summary/parser";
import { buildSummaryPrompt, buildFeedbackPrompt } from "@/lib/ai/prompts";
import { Uploader, type ImageItem } from "./uploader";
import { OutputCard } from "./output-card";
import { PromptCard } from "./prompt-card";
import {
  SparkleIcon,
  ResetIcon,
  CheckIcon,
  CoinIcon,
} from "@/components/icons";

type TemplateType = "summary" | "feedback";

type Meta = {
  subject: string;
  topic: string;
  keyPoints: string[];
  rawText: string;
};

type Status = "idle" | "vision" | "generating" | "done" | "error";

type Props = {
  template: TemplateType;
};

function todayStr(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1);
  const day = String(d.getDate());
  return `${m}.${day}`;
}

const TEMPLATE_LABEL: Record<TemplateType, { title: string; desc: string }> = {
  summary: {
    title: "课堂小结",
    desc: "上传讲义图片 → AI 自动识别学科、章节、知识点 → 生成课堂小结。",
  },
  feedback: {
    title: "堂测反馈",
    desc: "上传讲义图片 → AI 自动识别学科、章节、知识点 → 生成堂测反馈。",
  },
};

export function SummaryWorkflow({ template }: Props) {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [streamedText, setStreamedText] = useState("");

  const [className, setClassName] = useState("超火1班");
  const [date, setDate] = useState(todayStr);

  const isWorking = status === "vision" || status === "generating";

  // 实时切分
  const parsed = useMemo(
    () => parseSummaryOutput(streamedText, template),
    [streamedText, template],
  );

  // 构建可见 prompt（始终可用，无 meta 时用通用占位）
  const visiblePrompt = useMemo(() => {
    const builder = template === "summary" ? buildSummaryPrompt : buildFeedbackPrompt;
    return builder({
      subject: meta?.subject || "数学",
      topic: meta?.topic || "本节课内容",
      keyPoints: meta?.keyPoints || ["知识点1", "知识点2", "知识点3"],
      className,
      date,
    });
  }, [meta, template, className, date]);

  const handleGenerate = async () => {
    if (images.length === 0) return;

    setStatus("vision");
    setError(null);
    setMeta(null);
    setStreamedText("");

    try {
      const res = await fetch("/api/lekao/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: images.map((i) => i.dataUrl),
          template,
          className,
          date,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }

      if (!res.body) {
        throw new Error("响应为空");
      }

      setStatus("generating");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffered = "";
      let metaParsed = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffered += decoder.decode(value, { stream: true });

        // 解析 __META__ 块（一次性）
        if (!metaParsed) {
          const metaStart = buffered.indexOf("__META__");
          if (metaStart >= 0) {
            const metaEnd = buffered.indexOf("\n\n", metaStart);
            if (metaEnd > 0) {
              const metaLine = buffered.slice(
                metaStart + "__META__".length,
                metaEnd,
              );
              try {
                const parsedMeta = JSON.parse(metaLine);
                setMeta(parsedMeta);
              } catch {
                // meta JSON 解析失败（不影响后续流）
              }
              metaParsed = true;
              buffered = buffered.slice(metaEnd + 2);
            }
          }
        }

        if (metaParsed) {
          setStreamedText(buffered);
        }
      }

      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败");
      setStatus("error");
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setError(null);
    setMeta(null);
    setStreamedText("");
  };

  const hasOutput = parsed.feedback || parsed.summary;
  const label = TEMPLATE_LABEL[template];

  return (
    <div className="space-y-6">
      <Uploader
        images={images}
        onChange={setImages}
        disabled={isWorking}
      />

      {/* 班级 + 日期 */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-ink-muted font-medium">班级</label>
          <input
            type="text"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            disabled={isWorking}
            placeholder="超火1班"
            className="w-32 px-3 py-2 border border-hairline rounded-lg text-sm text-ink bg-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition disabled:opacity-50"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-ink-muted font-medium">日期</label>
          <input
            type="text"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={isWorking}
            placeholder="6.14"
            className="w-24 px-3 py-2 border border-hairline rounded-lg text-sm text-ink bg-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition disabled:opacity-50"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={images.length === 0 || isWorking}
          className={cn(
            "inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-base transition-all",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "bg-accent text-white hover:bg-accent-hover shadow-sm hover:shadow-md",
          )}
        >
          {isWorking ? (
            <>
              <span className="inline-block w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              {status === "vision" ? "识别讲义中..." : "生成内容中..."}
            </>
          ) : (
            <>
              <SparkleIcon className="w-[18px] h-[18px]" />
              一键生成
            </>
          )}
        </button>

        {!isWorking && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-accent-soft text-accent-ink text-xs font-semibold rounded-full border border-accent/20">
            <CoinIcon className="w-3 h-3" />
            扣 1 T-Coin
          </span>
        )}

        {(status === "done" || hasOutput) && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm text-ink-muted hover:text-ink hover:bg-canvas-alt transition"
          >
            <ResetIcon className="w-[14px] h-[14px]" />
            清空
          </button>
        )}
      </div>

      {error && (
        <div className="bg-danger/5 border border-danger/20 rounded-xl p-4 text-sm text-danger">
          {error}
        </div>
      )}

      {meta && (
        <div className="bg-accent-soft rounded-xl p-5 border border-accent/20">
          <div className="text-xs font-semibold text-accent-ink uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <CheckIcon className="w-3.5 h-3.5" />
            视觉识别结果
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-ink-subtle text-xs mb-0.5">学科</div>
              <div className="font-semibold text-ink">{meta.subject}</div>
            </div>
            <div>
              <div className="text-ink-subtle text-xs mb-0.5">章节</div>
              <div className="font-semibold text-ink">{meta.topic}</div>
            </div>
          </div>
          {meta.keyPoints.length > 0 && (
            <div className="mt-3">
              <div className="text-ink-subtle text-xs mb-1.5">知识点</div>
              <div className="flex flex-wrap gap-1.5">
                {meta.keyPoints.map((kp, i) => (
                  <span
                    key={i}
                    className="inline-block px-2.5 py-1 bg-white text-ink-mute rounded-md text-xs border border-accent/20"
                  >
                    {kp}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {hasOutput && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-ink-mute">生成结果</div>
            {status === "generating" && (
              <span className="inline-flex items-center gap-1.5 text-xs text-accent-text">
                <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse" />
                流式输出中
              </span>
            )}
          </div>
          <OutputCard
            feedback={parsed.feedback}
            summary={parsed.summary}
            feedbackTitle={parsed.feedbackTitle}
            summaryTitle={parsed.summaryTitle}
            template={template}
          />
        </div>
      )}

      {/* ⭐ Prompt 展示卡片 — 始终可见 */}
      {visiblePrompt && (
        <div className="pt-4">
          <PromptCard
            prompt={visiblePrompt}
            label={template === "summary" ? "课堂小结提示词（可复制到 DeepSeek 使用）" : "堂测反馈提示词（可复制到 DeepSeek 使用）"}
          />
        </div>
      )}
    </div>
  );
}

export type { TemplateType };
