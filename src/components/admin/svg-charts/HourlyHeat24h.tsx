"use client";

import { motion } from "motion/react";
import type { HourlyMetric } from "@/lib/analytics";

/**
 * T44 · 24h 高峰分布（按小时聚合，纯 SVG 柱状图）
 *
 * 揭示"助教什么时候用得最多" — 给运营排班/促销时段提供依据
 *
 * Round 2 重写:
 * - viewBox 800x300 + aspect 8:3（X Y 同步缩放）
 * - 文字 fontSize 14-16
 * - 删 preserveAspectRatio="none"
 * - 0 数据时显示淡灰占位柱（不消失）
 */

const VB_W = 800;
const VB_H = 300;
const PAD_L = 40;
const PAD_R = 30;
const PAD_T = 30;
const PAD_B = 40;
const CHART_W = VB_W - PAD_L - PAD_R;
const CHART_H = VB_H - PAD_T - PAD_B;

export function HourlyHeat24h({ data }: { data: HourlyMetric[] }) {
  if (!data || data.length === 0) {
    return <EmptyChart label="暂无 24h 数据" />;
  }

  const max = Math.max(...data.map((d) => d.count), 1);
  const colW = CHART_W / 24;
  const barW = colW * 0.7;
  // 最小柱高 4 viewBox 单位（约 4px），确保 0 数据柱也可见
  const minBarH = 4;

  const peakHour = data.reduce((m, d) => (d.count > m.count ? d : m), data[0]);

  return (
    <div className="w-full" style={{ aspectRatio: `${VB_W} / ${VB_H}` }}>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full h-full"
        role="img"
        aria-label="24h 高峰分布"
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

        {data.map((d, i) => {
          const h = Math.max(
            minBarH,
            d.count > 0 ? (d.count / max) * (CHART_H - 16) : minBarH,
          );
          const cx = PAD_L + (i + 0.5) * colW;
          const x = cx - barW / 2;
          const y = PAD_T + CHART_H - h;
          return (
            <g key={d.hour}>
              <motion.rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx="2"
                fill={
                  d.count > 0
                    ? "var(--accent-text)"
                    : "color-mix(in srgb, var(--ink) 10%, transparent)"
                }
                initial={{ height: 0, y: PAD_T + CHART_H }}
                animate={{ height: h, y }}
                transition={{
                  duration: 0.4,
                  delay: i * 0.015,
                  ease: "easeOut",
                }}
              />
              {/* 每 4 小时标一次 X 轴 */}
              {i % 4 === 0 && (
                <text
                  x={cx}
                  y={PAD_T + CHART_H + 22}
                  textAnchor="middle"
                  fontSize="14"
                  fill="var(--ink-subtle)"
                >
                  {d.hour}:00
                </text>
              )}
            </g>
          );
        })}

        {/* 标高峰小时 */}
        {peakHour.count > 0 && (
          <text
            x={PAD_L + (peakHour.hour + 0.5) * colW}
            y={PAD_T + CHART_H - (peakHour.count / max) * (CHART_H - 16) - 8}
            textAnchor="middle"
            fontSize="16"
            fontWeight="700"
            fill="currentColor"
          >
            {peakHour.count}
          </text>
        )}
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
