import Link from "next/link";

export function Footer() {
  return (
    <footer className="py-12 px-6 bg-page-dark">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center text-base font-bold font-mono">
              L
            </div>
            <span className="text-base font-semibold text-ink-on-dark">
              Lekao
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-ink-on-dark-muted">
            <Link href="#" className="hover:text-ink-on-dark transition">
              关于
            </Link>
            <Link href="#" className="hover:text-ink-on-dark transition">
              隐私
            </Link>
            <Link href="#" className="hover:text-ink-on-dark transition">
              条款
            </Link>
            <Link
              href="mailto:hello@lekao.asterforge.top"
              className="hover:text-ink-on-dark transition"
            >
              联系
            </Link>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-hairline-dark text-center text-xs text-ink-on-dark-muted">
          © 2026 Lekao · 鄂ICP备 2026015662 号 · 让培训机构助教省 1-2 小时/课
        </div>
      </div>
    </footer>
  );
}