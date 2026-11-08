"use client";

import { motion } from "motion/react";
import type { DailyMetric } from "@/lib/analytics";

/**
 * T44 · 7 天 DAU 柱状图（纯 SVG 手写，0 依赖）
 *
 * Round 2 重写:
 * - viewBox 800x300 + aspect 8:3（X Y 同步缩放，文字不扭曲）
 * - 文字 fontSize 用 viewBox 单位 = 实际像素（Y 1:1 渲染）
 * - 删 preserveAspectRatio="none"（根因：X 方向被拉伸 6-8 倍 → 文字压扁）
 */

const VB_W = 800;
const VB_H = 300;
const PAD_L = 60;
const PAD_R = 30;
const PAD_T = 30;
const PAD_B = 50;
const CHART_W = VB_W - PAD_L - PAD_R;
const CHART_H = VB_H - PAD_T - PAD_B;

export function BarChart7d({ data }: { data: DailyMetric[] }) {
  if (!data || data.length === 0) {
    return <EmptyChart label="暂无 7 天数据" />;
  }

  const max = Math.max(...data.map((d) => d.dau), 1);
  const colW = CHART_W / data.length;
  const barW = colW * 0.6;

  return (
    <div className="w-full" style={{ aspectRatio: `${VB_W} / ${VB_H}` }}>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full h-full"
        role="img"
        aria-label="7 天 DAU 柱状图"
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

        {/* Y 轴刻度（最大 + 0） */}
        <text
          x={PAD_L - 8}
          y={PAD_T + 4}
          textAnchor="end"
          fontSize="14"
          fill="var(--ink-subtle)"
        >
          {max}
        </text>
        <text
          x={PAD_L - 8}
          y={PAD_T + CHART_H + 4}
          textAnchor="end"
          fontSize="14"
          fill="var(--ink-subtle)"
        >
          0
        </text>

        {data.map((d, i) => {
          const h = Math.max(2, (d.dau / max) * (CHART_H - 12));
          const cx = PAD_L + (i + 0.5) * colW;
          const x = cx - barW / 2;
          const y = PAD_T + CHART_H - h;
          return (
            <g key={d.date}>
              <motion.rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx="4"
                fill={
                  d.dau > 0
                    ? "var(--accent-text)"
                    : "color-mix(in srgb, var(--accent) 18%, transparent)"
                }
                initial={{ height: 0, y: PAD_T + CHART_H }}
                animate={{ height: h, y }}
                transition={{ duration: 0.5, delay: i * 0.04, ease: "easeOut" }}
              />
              {/* 柱顶数字（>0 才标） */}
              {d.dau > 0 && (
                <text
                  x={cx}
                  y={y - 8}
                  textAnchor="middle"
                  fontSize="18"
                  fontWeight="600"
                  fill="currentColor"
                >
                  {d.dau}
                </text>
              )}
              {/* X 轴日期 */}
              <text
                x={cx}
                y={PAD_T + CHART_H + 24}
                textAnchor="middle"
                fontSize="14"
                fill="var(--ink-subtle)"
              >
                {d.date.slice(5)}
              </text>
            </g>
          );
        })}
      </svg>
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
