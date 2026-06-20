import Link from "next/link";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-canvas/80 backdrop-blur-md border-b border-hairline">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-accent text-white flex items-center justify-center text-lg font-bold font-mono">
            L
          </div>
          <span className="text-lg font-semibold text-ink tracking-tight">
            Lekao
          </span>
        </Link>

        {/* Right */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-ink-mute hover:text-ink transition"
          >
            登录
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition"
          >
            免费开始
          </Link>
        </div>
      </div>
    </nav>
  );
}