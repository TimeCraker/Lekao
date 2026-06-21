"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { stripMarkdown } from "@/lib/summary/parser";
import {
  SummaryIcon,
  FeedbackIcon,
  DocumentIcon,
  CheckIcon,
} from "@/components/icons";

type Props = {
  feedback: string;
  summary: string;
  feedbackTitle?: string;
  summaryTitle?: string;
  template: "summary" | "feedback";
};

/**
 * 输出卡片（Apple-style 高亮）
 *
 * 两段：
 * - feedback 段（10 条建议）
 * - summary 段（一段小结 + 催交尾注）
 */
export function OutputCard({
  feedback,
  summary,
  feedbackTitle,
  summaryTitle,
  template,
}: Props) {
  const [copiedKey, setCopiedKey] = useState<"feedback" | "summary" | null>(
    null,
  );

  const copyToClipboard = async (text: string, key: "feedback" | "summary") => {
    const cleaned = stripMarkdown(text);
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(cleaned);
      } else {
        // 降级
        const ta = document.createElement("textarea");
        ta.value = cleaned;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error("复制失败:", err);
    }
  };

  if (!feedback && !summary) {
    return null;
  }

  return (
    <div className="space-y-4">
      {feedback && (
        <SectionBlock
          Icon={template === "summary" ? SummaryIcon : FeedbackIcon}
          title={feedbackTitle || (template === "summary" ? "课堂反馈" : "作业/堂测反馈")}
          content={feedback}
          isCopied={copiedKey === "feedback"}
          onCopy={() => copyToClipboard(feedback, "feedback")}
          copyLabel="贴 Excel 用"
          variant="feedback"
        />
      )}

      {summary && (
        <SectionBlock
          Icon={DocumentIcon}
          title={summaryTitle || (template === "summary" ? "课堂总体小结" : "堂测总体反馈")}
          content={summary}
          isCopied={copiedKey === "summary"}
          onCopy={() => copyToClipboard(summary, "summary")}
          copyLabel="贴群里用"
          variant="summary"
        />
      )}
    </div>
  );
}

function SectionBlock({
  Icon,
  title,
  content,
  isCopied,
  onCopy,
  copyLabel,
  variant,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  content: string;
  isCopied: boolean;
  onCopy: () => void;
  copyLabel: string;
  variant: "feedback" | "summary";
}) {
  const cleaned = stripMarkdown(content);
  const isMultiLine = variant === "feedback";

  return (
    <div
      className={cn(
        "rounded-2xl border bg-white overflow-hidden",
        variant === "feedback"
          ? "border-accent/30"
          : "border-success/30",
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between px-5 py-3 border-b",
          variant === "feedback"
            ? "bg-accent-soft/40 border-accent/20"
            : "bg-success-soft/40 border-success/20",
        )}
      >
        <div className="flex items-center gap-2">
          <Icon
            className={cn(
              "w-[18px] h-[18px]",
              variant === "feedback" ? "text-accent-text" : "text-success-text",
            )}
          />
          <span
            className={cn(
              "font-semibold text-sm",
              variant === "feedback" ? "text-accent-ink" : "text-success-text",
            )}
          >
            {title}
          </span>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
            isCopied
              ? "bg-success text-white"
              : variant === "feedback"
                ? "bg-accent text-white hover:bg-accent-hover"
                : "bg-success-text text-white hover:opacity-90",
          )}
        >
          {isCopied ? (
            <>
              <CheckIcon className="w-3 h-3" />
              已复制
            </>
          ) : (
            <>
              复制（{copyLabel}）
            </>
          )}
        </button>
      </div>

      {/* Body */}
      <div className="p-5">
        {isMultiLine ? (
          // feedback 段：每条建议独立成段（去掉 Markdown 符号后）
          <div className="space-y-2 text-sm text-ink leading-relaxed">
            {cleaned
              .split("\n")
              .filter((line) => line.trim())
              .map((line, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-accent-text shrink-0 select-none">·</span>
                  <span className="flex-1">{line.trim()}</span>
                </div>
              ))}
          </div>
        ) : (
          // summary 段：紧凑段落
          <div className="text-sm text-ink leading-relaxed whitespace-pre-wrap">
            {cleaned}
          </div>
        )}
      </div>
    </div>
  );
}