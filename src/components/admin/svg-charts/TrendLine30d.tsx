"use client";

import { motion } from "motion/react";
import type { DailyMetric } from "@/lib/analytics";

/**
 * T44 · 30 天使用趋势线（纯 SVG · 渐变面积 + 折线 + 关键点标注）
 *
 * Round 2 重写:
 * - viewBox 800x300 + aspect 8:3（X Y 同步缩放）
 * - 文字 fontSize 14-18（viewBox 单位 = 实际像素）
 * - 删 preserveAspectRatio="none"
 */

const VB_W = 800;
const VB_H = 300;
const PAD_L = 50;
const PAD_R = 40;
const PAD_T = 30;
const PAD_B = 40;
const CHART_W = VB_W - PAD_L - PAD_R;
const CHART_H = VB_H - PAD_T - PAD_B;

export function TrendLine30d({ data }: { data: DailyMetric[] }) {
  if (!data || data.length === 0) {
    return <EmptyChart label="暂无 30 天数据" />;
  }

  const max = Math.max(...data.map((d) => d.dau), 1);
  const points = data.map((d, i) => {
    const x = PAD_L + (i / Math.max(1, data.length - 1)) * CHART_W;
    const y = PAD_T + CHART_H * (1 - d.dau / max);
    return { x, y, dau: d.dau, date: d.date };
  });

  const pathD = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${PAD_T + CHART_H} L ${points[0].x} ${PAD_T + CHART_H} Z`;

  const last = points[points.length - 1];
  const maxPoint = points.reduce((m, p) => (p.dau > m.dau ? p : m), points[0]);

  // X 轴标签：起点 + 终点（30 天太长不全标）
  const xLabelIndices = [0, Math.floor(data.length / 2), data.length - 1];

  return (
    <div className="w-full" style={{ aspectRatio: `${VB_W} / ${VB_H}` }}>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full h-full"
        role="img"
        aria-label="30 天使用趋势"
      >
        <defs>
          <linearGradient id="trendGrad30" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--accent-text)"
              stopOpacity="0.3"
            />
            <stop
              offset="100%"
              stopColor="var(--accent-text)"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

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

        {/* 面积 */}
        <motion.path
          d={areaD}
          fill="url(#trendGrad30)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        />

        {/* 折线 */}
        <motion.path
          d={pathD}
          fill="none"
          stroke="var(--accent-text)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />

        {/* 数据点（不显眼） */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="3"
            fill="var(--accent-text)"
            opacity={p.dau > 0 ? 0.3 : 0.1}
          />
        ))}

        {/* 最新点高亮 + 数字 */}
        <circle cx={last.x} cy={last.y} r="5" fill="var(--accent-text)" />
        {last.dau > 0 && (
          <text
            x={last.x}
            y={last.y - 12}
            textAnchor="middle"
            fontSize="18"
            fontWeight="700"
            fill="currentColor"
          >
            {last.dau}
          </text>
        )}

        {/* 最高点标注（如不是最新点） */}
        {maxPoint !== last && maxPoint.dau > 0 && (
          <>
            <circle
              cx={maxPoint.x}
              cy={maxPoint.y}
              r="4"
              fill="var(--accent-text)"
              opacity="0.6"
            />
            <text
              x={maxPoint.x}
              y={maxPoint.y - 10}
              textAnchor="middle"
              fontSize="14"
              fontWeight="600"
              fill="var(--ink-muted)"
            >
              max {maxPoint.dau}
            </text>
          </>
        )}

        {/* X 轴标签：起点 + 中点 + 终点 */}
        {xLabelIndices.map((i) => {
          const p = points[i];
          if (!p) return null;
          return (
            <text
              key={p.date}
              x={p.x}
              y={PAD_T + CHART_H + 24}
              textAnchor="middle"
              fontSize="14"
              fill="var(--ink-subtle)"
            >
              {p.date.slice(5)}
            </text>
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
