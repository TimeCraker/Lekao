"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "motion/react";
import { EASE_PUBLICATION } from "@/lib/motion-tokens";
import { useReducedMotion } from "@/lib/hooks/motion";
import { cn } from "@/lib/utils";
import { parseSummaryOutput } from "@/lib/summary/parser";
import { buildSummaryPrompt, buildFeedbackPrompt } from "@/lib/ai/prompts";
import { saveGeneration } from "@/lib/storage/local-history";
import { newIdempotencyKey } from "@/lib/idempotency";
import { Uploader, type ImageItem } from "./uploader";
import { OutputCard } from "./output-card";
import { ExcelSinkPanel } from "@/components/deliver/excel-sink-panel";
import { PromptCard } from "./prompt-card";
import { TemplatePicker } from "@/components/templates/template-picker";
import type { TemplateStyle } from "@/lib/templates";
import { PressableButton } from "@/components/ui/pressable-button";
import { SuccessBurst } from "@/components/ui/success-burst";
import { AiThinkingDots } from "@/components/ui/ai-thinking-dots";
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

export function SummaryWorkflow({ template }: Props) {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [streamedText, setStreamedText] = useState("");

  const [className, setClassName] = useState("超火1班");
  const [date, setDate] = useState(todayStr);
  const [feedbackCount, setFeedbackCount] = useState(20);
  const [summaryLength, setSummaryLength] = useState<
    "0.5x" | "1x" | "1.5x" | "2x" | "3x"
  >("1x");
  const [contentSections, setContentSections] = useState(1);
  const [requirementCount, setRequirementCount] = useState(3);
  const [showFeedback, setShowFeedback] = useState(false);
  /** S04 T-404：整段落版到教师自有表格 */
  const [sinkOpen, setSinkOpen] = useState(false);
  // 2026-08-18 Stage B：自定义模板（id 随请求提交；style 用于页面可见 prompt 一致展示）
  const [templateId, setTemplateId] = useState("standard");
  const [templateStyle, setTemplateStyle] = useState<TemplateStyle | undefined>(
    undefined,
  );
  const { data: session } = useSession();
  const reduced = useReducedMotion();

  const isWorking = status === "vision" || status === "generating";

  // 实时切分
  const parsed = useMemo(
    () => parseSummaryOutput(streamedText, template),
    [streamedText, template],
  );

  // 构建可见 prompt（始终可用，无 meta 时用通用占位）
  const visiblePrompt = useMemo(() => {
    const builder =
      template === "summary" ? buildSummaryPrompt : buildFeedbackPrompt;
    const common = {
      subject: meta?.subject || "数学",
      topic: meta?.topic || "本节课内容",
      keyPoints: meta?.keyPoints || ["知识点1", "知识点2", "知识点3"],
      className,
      date,
    };
    if (template === "summary")
      return builder({
        ...common,
        contentSections,
        requirementCount,
        showFeedback,
        style: templateStyle,
      });
    return builder({
      ...common,
      feedbackCount,
      summaryLength,
      style: templateStyle,
    });
  }, [
    meta,
    template,
    className,
    date,
    feedbackCount,
    summaryLength,
    contentSections,
    requirementCount,
    showFeedback,
    templateStyle,
  ]);

  const handleGenerate = async () => {
    if (images.length === 0) return;

    setStatus("vision");
    setError(null);
    setMeta(null);
    setStreamedText("");

    try {
      const res = await fetch("/api/lekao/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // S01 T-002：幂等键（同一次提交的重试复用，避免重复扣币）
          "Idempotency-Key": newIdempotencyKey(),
        },
        body: JSON.stringify({
          images: images.map((i) => i.dataUrl),
          template,
          className,
          date,
          templateId,
          ...(template === "feedback" ? { feedbackCount, summaryLength } : {}),
          ...(template === "summary"
            ? { contentSections, requirementCount, showFeedback }
            : {}),
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        // ⭐ 2026-06-22：使用后端 code 字段给用户更具体的提示
        // 例如 AI_INSUFFICIENT_BALANCE → "AI 服务余额不足"
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
      let metaResult: Meta | null = null;
      let errored = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffered += decoder.decode(value, { stream: true });

        // ⭐ 2026-06-22：检测 __ERROR__ SSE 事件
        // 后端把 AI 错误（余额不足 / 超时 / 限流等）转成友好提示通过 SSE 发送
        if (!errored) {
          const errorStart = buffered.indexOf("__ERROR__");
          if (errorStart >= 0) {
            const errorEnd = buffered.indexOf("\n\n", errorStart);
            if (errorEnd > 0) {
              const errorLine = buffered.slice(
                errorStart + "__ERROR__".length,
                errorEnd,
              );
              try {
                const parsedErr = JSON.parse(errorLine) as {
                  code: string;
                  message: string;
                  correlationId: string;
                  refunded?: boolean;
                };
                errored = true;
                // 2026-08-18：后端退款成功时告知用户本次未消耗 T-Coin
                throw new Error(
                  parsedErr.refunded
                    ? `${parsedErr.message}（本次未消耗 T-Coin）`
                    : parsedErr.message,
                );
              } catch (e) {
                // 重新抛出我们设置的错误，不要吞掉
                if (e instanceof Error && !e.message.startsWith("Unexpected")) {
                  throw e;
                }
                // JSON 解析失败时回退到原始错误
                throw new Error(`AI 生成失败，请重试`);
              }
            }
          }
        }

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
                const parsedMeta = JSON.parse(metaLine) as Meta;
                metaResult = parsedMeta;
                setMeta(parsedMeta);
              } catch {
                // meta JSON 解析失败（不影响后续流）
              }
              metaParsed = true;
              buffered = buffered.slice(metaEnd + 2);
            }
          }
        }

        if (metaParsed && !errored) {
          setStreamedText(buffered);
        }
      }

      // 保存到本地历史（IndexedDB）
      const userKey = session?.user?.email;
      if (userKey && metaResult && buffered) {
        const out = parseSummaryOutput(buffered, template);
        if (out.feedback || out.summary) {
          saveGeneration({
            id: crypto.randomUUID(),
            userKey,
            template,
            subject: metaResult.subject,
            topic: metaResult.topic,
            keyPoints: metaResult.keyPoints,
            className,
            date,
            feedback: out.feedback,
            summary: out.summary,
            rawText: buffered,
            createdAt: new Date().toISOString(),
          }).catch(() => {});
        }
      }

      setStatus("done");
    } catch (e) {
      let errorMsg = e instanceof Error ? e.message : "生成失败";

      // ⭐ 2026-06-22：浏览器原生 fetch 网络错误 → 友好提示
      // "Failed to fetch" / "NetworkError when attempting to fetch resource"
      // 之前用户看到 "network error" 不知道是网络断了还是服务端挂了
      if (e instanceof TypeError && /fetch|network/i.test(e.message)) {
        errorMsg = "网络连接失败，请检查网络后重试";
      }
      // 客户端主动 abort
      if (e instanceof DOMException && e.name === "AbortError") {
        errorMsg = "请求已取消";
      }

      setError(errorMsg);
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

  return (
    <div className="space-y-6">
      <Uploader images={images} onChange={setImages} disabled={isWorking} />

      {/* 班级 + 日期 */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label
            htmlFor="wf-classname"
            className="text-sm text-ink-muted font-medium"
          >
            班级
          </label>
          <input
            id="wf-classname"
            type="text"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            disabled={isWorking}
            placeholder="超火1班"
            className="w-32 px-3 py-2 border border-hairline rounded-lg text-sm text-ink bg-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition disabled:opacity-50"
          />
        </div>
        <div className="flex items-center gap-2">
          <label
            htmlFor="wf-date"
            className="text-sm text-ink-muted font-medium"
          >
            日期
          </label>
          <input
            id="wf-date"
            type="text"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={isWorking}
            placeholder="6.14"
            className="w-24 px-3 py-2 border border-hairline rounded-lg text-sm text-ink bg-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition disabled:opacity-50"
          />
        </div>
      </div>

      {/* 模板选择（2026-08-18 Stage B：标准/简洁预设 + 我的模板） */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-6">
        <TemplatePicker
          template={template}
          value={templateId}
          onChange={(id, style) => {
            setTemplateId(id);
            setTemplateStyle(style);
          }}
          disabled={isWorking}
        />
      </div>

      {/* 课堂小结选项：授课内容序号 + 学习要求条数（仅 summary 模式） */}
      {template === "summary" && (
        // ⭐ 2026-06-22：移动端选项栏间距 gap-3 sm:gap-6（移动端紧凑）
        <div className="flex flex-wrap items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-2">
            <label className="text-xs sm:text-sm text-ink-muted font-medium">
              授课内容
            </label>
            <div className="flex rounded-lg border border-hairline overflow-hidden">
              {[1, 2].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setContentSections(n)}
                  disabled={isWorking}
                  className={cn(
                    // ⭐ 移动端按钮更紧凑 + 触控目标 ≥ 36px
                    "relative px-2.5 sm:px-3 py-2 sm:py-1.5 text-xs sm:text-sm font-medium transition-colors disabled:opacity-50",
                    contentSections === n
                      ? "bg-accent text-white"
                      : "bg-white text-ink-muted hover:text-ink hover:bg-canvas-alt",
                    "border-r last:border-r-0 border-hairline",
                  )}
                >
                  {contentSections === n && (
                    <motion.span
                      layoutId="summary-content-indicator"
                      className="absolute inset-0 bg-accent -z-10"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}
                  {n} 个序号
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs sm:text-sm text-ink-muted font-medium">
              学习要求
            </label>
            <div className="flex rounded-lg border border-hairline overflow-hidden">
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRequirementCount(n)}
                  disabled={isWorking}
                  className={cn(
                    "relative px-2.5 sm:px-3 py-2 sm:py-1.5 text-xs sm:text-sm font-medium transition-colors disabled:opacity-50",
                    requirementCount === n
                      ? "bg-accent text-white"
                      : "bg-white text-ink-muted hover:text-ink hover:bg-canvas-alt",
                    "border-r last:border-r-0 border-hairline",
                  )}
                >
                  {requirementCount === n && (
                    <motion.span
                      layoutId="summary-req-indicator"
                      className="absolute inset-0 bg-accent -z-10"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}
                  {n} 条
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs sm:text-sm text-ink-muted font-medium">
              作业反馈
            </label>
            <button
              type="button"
              role="switch"
              aria-checked={showFeedback}
              aria-label="作业反馈开关"
              onClick={() => setShowFeedback(!showFeedback)}
              disabled={isWorking}
              className={cn(
                "relative inline-flex h-7 w-12 items-center rounded-full transition-colors disabled:opacity-50",
                showFeedback ? "bg-accent" : "bg-hairline",
              )}
            >
              <motion.span
                layout
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="inline-block h-5 w-5 rounded-full bg-white shadow-sm"
              />
            </button>
            <span className="text-xs text-ink-muted">
              {showFeedback ? "写反馈" : "仅占位"}
            </span>
          </div>
        </div>
      )}

      {/* 反馈条数 + 字数选择（仅 feedback 模式） */}
      {template === "feedback" && (
        <div className="flex flex-wrap items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-2">
            <label className="text-xs sm:text-sm text-ink-muted font-medium">
              反馈条数
            </label>
            <div className="flex rounded-lg border border-hairline overflow-hidden">
              {[10, 20, 30, 40, 50].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setFeedbackCount(n)}
                  disabled={isWorking}
                  className={cn(
                    "relative px-2.5 sm:px-3 py-2 sm:py-1.5 text-xs sm:text-sm font-medium transition-colors disabled:opacity-50",
                    feedbackCount === n
                      ? "bg-accent text-white"
                      : "bg-white text-ink-muted hover:text-ink hover:bg-canvas-alt",
                    "border-r last:border-r-0 border-hairline",
                  )}
                >
                  {feedbackCount === n && (
                    <motion.span
                      layoutId="feedback-count-indicator"
                      className="absolute inset-0 bg-accent -z-10"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs sm:text-sm text-ink-muted font-medium">
              作业小结字数
            </label>
            <div className="flex rounded-lg border border-hairline overflow-hidden">
              {[
                { value: "0.5x" as const, label: "压缩", sub: "75-150 字" },
                { value: "1x" as const, label: "标准", sub: "150-300 字" },
                { value: "1.5x" as const, label: "×1.5", sub: "225-450 字" },
                { value: "2x" as const, label: "×2", sub: "300-600 字" },
                { value: "3x" as const, label: "×3", sub: "450-900 字" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSummaryLength(opt.value)}
                  disabled={isWorking}
                  title={`${opt.label} · 作业总体小结 ${opt.sub}`}
                  className={cn(
                    "relative px-2.5 sm:px-3 py-2 sm:py-1.5 text-xs sm:text-sm font-medium transition-colors disabled:opacity-50",
                    summaryLength === opt.value
                      ? "bg-accent text-white"
                      : "bg-white text-ink-muted hover:text-ink hover:bg-canvas-alt",
                    "border-r last:border-r-0 border-hairline",
                  )}
                >
                  {summaryLength === opt.value && (
                    <motion.span
                      layoutId="feedback-length-indicator"
                      className="absolute inset-0 bg-accent -z-10"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <PressableButton
            onClick={handleGenerate}
            disabled={images.length === 0 || isWorking}
            className={cn(
              // ⭐ 移动端按钮略小 + 全宽触感更好
              "inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold text-sm sm:text-base",
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
                生成
              </>
            )}
          </PressableButton>
          {/* 生成完成时在按钮位置喷 6 颗绿点 */}
          <SuccessBurst show={status === "done"} count={6} distance={28} />
        </div>

        {!isWorking && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-accent-soft text-accent-ink text-xs font-semibold rounded-full border border-accent/20">
            <CoinIcon className="w-3 h-3" />扣 1 T-Coin
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

      {/* AI 占位：读图 / 等首包期间输出区三点脉冲；出字后由 hasOutput 门控（DESIGN.md §4） */}
      {isWorking && !hasOutput && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl border border-hairline bg-white px-5 py-6"
        >
          <AiThinkingDots
            label={status === "vision" ? "AI 正在读讲义…" : "AI 正在组织语言…"}
          />
        </motion.div>
      )}

      {error && (
        <motion.div
          key={error}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: -8, x: 0 }}
          animate={
            reduced
              ? { opacity: 1 }
              : { opacity: 1, y: 0, x: [0, -6, 6, -4, 4, 0] }
          }
          transition={{ duration: 0.4 }}
          className="bg-danger/5 border border-danger/20 rounded-xl p-4 text-sm text-danger-text"
        >
          {error}
        </motion.div>
      )}

      {meta && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: EASE_PUBLICATION }}
          className="bg-accent-soft rounded-xl p-5 border border-accent/20"
        >
          <div className="text-xs font-semibold text-accent-ink uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <CheckIcon className="w-3.5 h-3.5" />
            读图结果
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
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, scale: 0.8, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.04, duration: 0.3 }}
                    className="inline-block px-2.5 py-1 bg-white text-ink-mute rounded-md text-xs border border-accent/20"
                  >
                    {kp}
                  </motion.span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {hasOutput && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE_PUBLICATION }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-ink-mute">生成结果</div>
            <div className="flex items-center gap-3">
              {status === "generating" && (
                <span className="inline-flex items-center gap-1.5 text-xs text-accent-text">
                  <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse" />
                  正在输出
                </span>
              )}
              {/* S04 T-404：AI 产出直接写入教师自有表格（免复制粘贴） */}
              <button
                type="button"
                onClick={() => setSinkOpen(true)}
                className="inline-flex items-center gap-1.5 min-h-9 text-xs px-3 rounded-lg bg-canvas-alt text-ink-mute hover:bg-accent-soft hover:text-accent-ink transition"
              >
                落版到表格
              </button>
            </div>
          </div>
          <OutputCard
            feedback={parsed.feedback}
            summary={parsed.summary}
            feedbackTitle={parsed.feedbackTitle}
            summaryTitle={parsed.summaryTitle}
            template={template}
          />
        </motion.div>
      )}

      {/* ⭐ Prompt 展示卡片 — 始终可见 */}
      {visiblePrompt && (
        <motion.div
          className="pt-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <PromptCard
            prompt={visiblePrompt}
            label={`${template === "summary" ? "课堂小结" : "作业/堂测反馈"}提示词${
              template === "feedback"
                ? `（${feedbackCount}条 · 小结${
                    summaryLength === "0.5x"
                      ? "×0.5(压缩)"
                      : summaryLength === "1x"
                        ? "标准"
                        : summaryLength === "1.5x"
                          ? "×1.5"
                          : summaryLength === "2x"
                            ? "×2"
                            : "×3"
                  }）`
                : ""
            } · 可复制到 DeepSeek 使用`}
          />
        </motion.div>
      )}
      {/* S04 T-404：整段落版（班级级文本没有姓名，写入用户指定的单元格） */}
      <ExcelSinkPanel
        open={sinkOpen}
        onClose={() => setSinkOpen(false)}
        title="把小结/反馈写入教师表格"
        classText={parsed.feedback || parsed.summary}
      />
    </div>
  );
}

export type { TemplateType };
