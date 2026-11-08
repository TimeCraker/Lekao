import Link from "next/link";
import { GithubIcon, MailIcon } from "@/components/icons";

const FOOTER_LINKS = [
  { href: "/about", label: "关于", external: false },
  { href: "/privacy", label: "隐私", external: false },
  { href: "/terms", label: "条款", external: false },
];

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
    <footer className="py-12 px-6 md:px-12 bg-page-dark">
      <div className="max-w-6xl mx-auto">
        {/* Colophon 顶栏 */}
        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.18em] text-ink-on-dark-muted pb-6 border-b border-hairline-dark mb-8">
          <span>Lekao Agent</span>
          <span>© MMXXVI</span>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg bg-accent-text text-white flex items-center justify-center font-serif font-bold group-hover:bg-accent-hover transition">
              L
            </div>
            <span className="font-serif text-lg font-semibold text-ink-on-dark">
              Lekao Agent
            </span>
          </Link>

          {/* 站内链接 */}
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-on-dark-muted/70">
              站点
            </span>
            <div className="flex items-center gap-4 text-sm text-ink-on-dark-muted">
              {FOOTER_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="inline-block py-1 hover:text-ink-on-dark transition"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* 联系作者 */}
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-on-dark-muted/70">
              想联系作者
            </span>
            <div className="flex flex-col gap-2.5 text-sm text-ink-on-dark-muted">
              {CONTACT_LINKS.map(({ href, label, detail, Icon }) => (
                <a
                  key={href}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={
                    href.startsWith("http") ? "noopener noreferrer" : undefined
                  }
                  className="group inline-flex items-center gap-2 py-1 hover:text-ink-on-dark transition-colors"
                >
                  {Icon && (
                    <Icon className="w-4 h-4 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                  )}
                  <span className="font-medium">{label}：</span>
                  <span className="font-mono text-xs text-ink-on-dark-muted group-hover:text-accent-soft transition-colors">
                    {detail}
                  </span>
                  {href.startsWith("http") && (
                    <span className="text-ink-on-dark-muted/60 group-hover:text-ink-on-dark">
                      ↗
                    </span>
                  )}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-hairline-dark text-center text-xs text-ink-on-dark-muted">
          © 2026 Lekao Agent · 鄂ICP备 2026015662 号 · AI 教学工作台
        </div>
      </div>
    </footer>
  );
}
