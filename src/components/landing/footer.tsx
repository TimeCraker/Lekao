import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/about", label: "关于", external: false },
  { href: "/privacy", label: "隐私", external: false },
  { href: "/terms", label: "条款", external: false },
  {
    href: "https://asterforge.top/",
    label: "联系",
    external: true,
  },
];

export function Footer() {
  return (
    <footer className="py-12 px-6 bg-page-dark">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-accent-text text-white flex items-center justify-center text-base font-bold font-mono group-hover:bg-accent-hover transition">
              L
            </div>
            <span className="text-base font-semibold text-ink-on-dark">
              Lekao <span className="text-ink-on-dark-muted font-normal">Agent</span>
            </span>
          </Link>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-ink-on-dark-muted">
            {FOOTER_LINKS.map(({ href, label, external }) =>
              external ? (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-ink-on-dark transition"
                >
                  {label} ↗
                </a>
              ) : (
                <Link
                  key={href}
                  href={href}
                  className="hover:text-ink-on-dark transition"
                >
                  {label}
                </Link>
              ),
            )}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-hairline-dark text-center text-xs text-ink-on-dark-muted">
          © 2026 Lekao Agent · 鄂ICP备 2026015662 号 · 让助教告别重复冗余工作
        </div>
      </div>
    </footer>
  );
}