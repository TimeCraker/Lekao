"use client";

import { useEffect } from "react";
import { PressableButton } from "@/components/ui/pressable-button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard] 路由错误:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-canvas px-6 py-20">
      <div className="text-center max-w-md">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-danger-text mb-5">
          加载失败
        </p>
        <h1 className="font-serif text-4xl md:text-5xl font-semibold text-ink leading-tight mb-4">
          出了点问题
        </h1>
        <p className="text-ink-muted leading-relaxed">
          页面加载出错了，你的内容还在，可以重试。
        </p>
        {error?.digest && (
          <p className="font-mono text-xs text-ink-subtle mt-3 mb-8">
            错误码：{error.digest}
          </p>
        )}
        <div className="mt-8">
          <PressableButton onClick={reset}>重试</PressableButton>
        </div>
      </div>
    </div>
  );
}
