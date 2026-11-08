/**
 * PageHeader — 全站统一的杂志编辑栏（server-safe，纯样式）
 * 章节编号 #NN + 1px 细线 + 衬线大标题 + 衬线斜体副标
 * 一处改全站统一（dashboard / landing / 功能页都可复用）
 */
interface PageHeaderProps {
  index: string; // "01" "02"
  kicker: string; // "FEATURES" "VALUE"
  title: string;
  subtitle?: string;
  dark?: boolean; // 深底模式
  className?: string;
}

export function PageHeader({
  index,
  kicker,
  title,
  subtitle,
  dark,
  className,
}: PageHeaderProps) {
  const ink = dark ? "text-ink-on-dark" : "text-ink";
  const sub = dark ? "text-ink-on-dark-muted" : "text-ink-muted";
  const meta = dark ? "text-ink-on-dark-muted" : "text-ink-subtle";
  const line = dark ? "bg-white/15" : "bg-hairline";
  return (
    <div className={className}>
      <div className="flex items-center gap-3 mb-5">
        <span
          className={`font-mono text-[11px] uppercase tracking-[0.18em] ${meta}`}
        >
          #{index} — {kicker}
        </span>
        <span className={`h-px flex-1 ${line}`} />
      </div>
      <h2
        className={`font-serif font-semibold leading-[1.05] tracking-tight ${ink}`}
        style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={`font-serif italic mt-3 ${sub}`}
          style={{ fontSize: "clamp(1rem, 1.8vw, 1.25rem)" }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
