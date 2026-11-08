"use client";

import { motion } from "motion/react";
import type { DailyMetric } from "@/lib/analytics";

/**
 * T44 · 7 天小结 vs 反馈双折线（纯 SVG · 双线对比）
 *
 * Round 2 重写:
 * - viewBox 800x300 + aspect 8:3（X Y 同步缩放）
 * - 文字 fontSize 14-18
 * - 删 preserveAspectRatio="none"
 * - 图例用 HTML 渲染（避免 SVG 文字被 X 拉伸）
 *
 * 配色:
 * - 小结 = var(--accent-text)（蓝）主色
 * - 反馈 = var(--success-text)（绿）success 主题色
 */

const VB_W = 800;
const VB_H = 300;
const PAD_L = 50;
const PAD_R = 30;
const PAD_T = 30;
const PAD_B = 40;
const CHART_W = VB_W - PAD_L - PAD_R;
const CHART_H = VB_H - PAD_T - PAD_B;

export function SummaryFeedbackDualLine({ data }: { data: DailyMetric[] }) {
  if (!data || data.length === 0) {
    return <EmptyChart label="暂无 7 天数据" />;
  }

  const max = Math.max(
    1,
    ...data.map((d) => Math.max(d.summaries, d.feedbacks)),
  );

  const buildPath = (vals: number[]) =>
    vals
      .map((v, i) => {
        const x = PAD_L + (i / Math.max(1, vals.length - 1)) * CHART_W;
        const y = PAD_T + CHART_H * (1 - v / max);
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");

  const summaryPath = buildPath(data.map((d) => d.summaries));
  const feedbackPath = buildPath(data.map((d) => d.feedbacks));

  const xLabelIndices = [0, Math.floor(data.length / 2), data.length - 1];

  return (
    <div>
      <div className="w-full" style={{ aspectRatio: `${VB_W} / ${VB_H}` }}>
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="w-full h-full"
          role="img"
          aria-label="小结 vs 反馈 7 天对比"
        >
          {/* 网格 4 条 */}
          {[0.25, 0.5, 0.75, 1].map((p) => (
            <line
              key={p}
              x1={PAD_L}
              y1={PAD_T + CHART_H * (1 - p)}
              x2={PAD_L + CHART_W}
              y2={PAD_T + CHART_H * (1 - p)}
              stroke="color-mix(in srgb, var(--ink) 6%, transparent)"
              strokeWidth="1"
            />
          ))}

          {/* 小结折线（蓝） */}
          <motion.path
            d={summaryPath}
            fill="none"
            stroke="var(--accent-text)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
          {/* 反馈折线（绿） */}
          <motion.path
            d={feedbackPath}
            fill="none"
            stroke="var(--success-text)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          />

          {/* 数据点 */}
          {data.map((d, i) => {
            const x = PAD_L + (i / Math.max(1, data.length - 1)) * CHART_W;
            const ySum = PAD_T + CHART_H * (1 - d.summaries / max);
            const yFb = PAD_T + CHART_H * (1 - d.feedbacks / max);
            return (
              <g key={d.date}>
                <circle cx={x} cy={ySum} r="4" fill="var(--accent-text)" />
                <circle
                  cx={x}
                  cy={yFb}
                  r="4"
                  fill="var(--success-text)"
                  opacity={d.feedbacks > 0 ? 1 : 0.3}
                />
              </g>
            );
          })}

          {/* X 轴标签 */}
          {xLabelIndices.map((i) => {
            const d = data[i];
            if (!d) return null;
            const x = PAD_L + (i / Math.max(1, data.length - 1)) * CHART_W;
            return (
              <text
                key={d.date}
                x={x}
                y={PAD_T + CHART_H + 24}
                textAnchor="middle"
                fontSize="14"
                fill="var(--ink-subtle)"
              >
                {d.date.slice(5)}
              </text>
            );
          })}
        </svg>
      </div>

      {/* 图例（HTML 渲染，不被 SVG 拉伸） */}
      <div className="flex items-center justify-center gap-6 mt-3 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 h-0.5 bg-[var(--accent-text)]" />
          课堂小结
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-5 h-0.5"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to right, var(--success-text) 0 6px, transparent 6px 10px)",
            }}
          />
          堂测反馈
        </span>
      </div>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-40 text-sm text-ink-muted">
      {label}
    </div>
  );
}
