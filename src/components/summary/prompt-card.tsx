"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CheckIcon, CopyIcon } from "@/components/icons";

type Props = {
  prompt: string;
  label: string;
};

/**
 * Prompt 展示卡片 — 显示完整 prompt 内容 + 一键复制
 * 用户可复制后粘贴到 DeepSeek 直接使用
 */
export function PromptCard({ prompt, label }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(prompt);
      } else {
        const ta = document.createElement("textarea");
        ta.value = prompt;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 静默失败
    }
  };

  return (
    <div className="rounded-2xl border border-accent/30 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-accent/20 bg-accent-soft/40">
        <div className="flex items-center gap-2">
          <span className="text-accent-text font-semibold text-sm">{label}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
            copied
              ? "bg-success text-white"
              : "bg-accent text-white hover:bg-accent-hover",
          )}
        >
          {copied ? (
            <>
              <CheckIcon className="w-3 h-3" />
              已复制
            </>
          ) : (
            <>
              <CopyIcon className="w-3 h-3" />
              一键复制
            </>
          )}
        </button>
      </div>

      {/* Body */}
      <div className="p-5">
        <pre className="text-sm text-ink leading-relaxed whitespace-pre-wrap font-sans bg-canvas-alt rounded-xl p-4 border border-hairline">
          {prompt}
        </pre>
      </div>
    </div>
  );
}
