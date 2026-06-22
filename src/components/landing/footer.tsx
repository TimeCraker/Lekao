import Link from "next/link";
import { GithubIcon, MailIcon } from "@/components/icons";

const FOOTER_LINKS = [
  { href: "/about", label: "关于", external: false },
  { href: "/privacy", label: "隐私", external: false },
  { href: "/terms", label: "条款", external: false },
];

// 作者联系方式 — 2026-06-22 v2.1.0+ 新增（用户原话：footer "想联系作者" 要可跳转）
const CONTACT_LINKS = [
  {
    href: "https://asterforge.top",
    label: "个人主页",
    detail: "asterforge.top",
    Icon: null,
  },
  {
    href: "https://github.com/TimeCraker",
    label: "GitHub",
    detail: "@TimeCraker",
    Icon: GithubIcon,
  },
  {
    href: "mailto:timecraker@foxmail.com",
    label: "邮箱",
    detail: "timecraker@foxmail.com",
    Icon: MailIcon,
  },
];

export function Footer() {
  return (
    <footer className="py-12 px-6 bg-page-dark">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-start justify-between gap-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-accent-text text-white flex items-center justify-center text-base font-bold font-mono group-hover:bg-accent-hover transition">
              L
            </div>
            <span className="text-base font-semibold text-ink-on-dark">
              Lekao <span className="text-ink-on-dark-muted font-normal">Agent</span>
            </span>
          </Link>

          {/* 站内链接 */}
          <div className="flex flex-col gap-3">
            <span className="text-xs uppercase tracking-wider text-ink-on-dark-muted/70">
              站点
            </span>
            <div className="flex items-center gap-5 text-sm text-ink-on-dark-muted">
              {FOOTER_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="hover:text-ink-on-dark transition"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* 想联系作者 — 2026-06-22 v2.1.0+ 升级展开 + SVG 图标 */}
          <div className="flex flex-col gap-3">
            <span className="text-xs uppercase tracking-wider text-ink-on-dark-muted/70">
              想联系作者
            </span>
            <div className="flex flex-col gap-2.5 text-sm text-ink-on-dark-muted">
              {CONTACT_LINKS.map(({ href, label, detail, Icon }) => (
                <a
                  key={href}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="group inline-flex items-center gap-2 hover:text-ink-on-dark transition-colors"
                >
                  {Icon && <Icon className="w-4 h-4 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />}
                  <span className="font-medium">{label}：</span>
                  <span className="font-mono text-xs text-ink-on-dark-muted group-hover:text-accent-soft transition-colors">
                    {detail}
                  </span>
                  {href.startsWith("http") && (
                    <span className="text-ink-on-dark-muted/60 group-hover:text-ink-on-dark">↗</span>
                  )}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-hairline-dark text-center text-xs text-ink-on-dark-muted">
          © 2026 Lekao Agent · 鄂ICP备 2026015662 号 · 让助教告别重复冗余工作
        </div>
      </div>
    </footer>
  );
}
