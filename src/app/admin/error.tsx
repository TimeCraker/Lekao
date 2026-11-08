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
    console.error("[admin] 路由错误:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-danger-text mb-5">
          加载失败
        </p>
        <h1 className="font-serif text-4xl font-semibold text-ink leading-tight mb-4">
          出了点问题
        </h1>
        <p className="text-ink-muted leading-relaxed">
          后台数据加载出错了，点重试再试一次。
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
