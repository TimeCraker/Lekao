import { ReactNode } from "react";

/**
 * T44 · 通用数字卡
 *
 * 复用场景：
 * - commit 2 · 仪表盘 5 数字卡（累计 / DAU / 今日小结 / 今日反馈 / 错题 N/A）
 * - commit 3 · analytics 页面顶部数字
 *
 * 风格：与现有 admin/page.tsx 6 卡片保持一致
 *   rounded-xl border border-hairline bg-white p-4
 *   icon 在 inline-flex rounded-lg p-2 + 颜色背景
 *   数字 text-2xl font-bold + 标签 text-xs text-ink-muted
 */

interface StatCardProps {
  label: string;
  value: number | string | null;
  icon?: ReactNode;
  color?: string; // tailwind class, e.g. "text-accent-text bg-accent-soft"（令牌对，见 DESIGN.md §1.1）
  suffix?: string; // 单位: "人" / "%" / "次"
  trend?: { delta: number; suffix?: string }; // 同比箭头
  className?: string;
  note?: string; // 备注（如"纯前端数据"）
}

export function StatCard({
  label,
  value,
  icon,
  color = "text-ink-muted bg-canvas-alt",
  suffix,
  trend,
  className = "",
  note,
}: StatCardProps) {
  const display =
    value === null || value === undefined
      ? "N/A"
      : typeof value === "number"
        ? value.toLocaleString()
        : value;

  return (
    <div
      className={`rounded-xl border border-hairline bg-white p-4 ${className}`}
    >
      {icon && (
        <div className={`mb-2 inline-flex rounded-lg p-2 ${color}`}>{icon}</div>
      )}
      <p className="text-2xl font-bold text-ink">
        {display}
        {suffix && value !== null && value !== undefined && (
          <span className="ml-1 text-sm font-normal text-ink-muted">
            {suffix}
          </span>
        )}
      </p>
      <p className="text-xs text-ink-muted">{label}</p>
      {note && <p className="mt-1 text-[10px] text-ink-subtle">{note}</p>}
      {trend && (
        <p
          className={`mt-1 text-xs ${trend.delta >= 0 ? "text-success-text" : "text-danger"}`}
        >
          {trend.delta >= 0 ? "↑" : "↓"} {Math.abs(trend.delta)}
          {trend.suffix || ""}
        </p>
      )}
    </div>
  );
}
