import Link from "next/link";
import { ArrowLeftIcon } from "@/components/icons";

export const metadata = {
  title: "页面不存在",
};

export default function NotFound() {
  return (
    <main className="min-h-[80vh] flex items-center justify-center bg-canvas px-6 py-20">
      <div className="text-center max-w-md">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent-text mb-5">
          404 · Not Found
        </p>
        <h1 className="font-serif text-5xl md:text-6xl font-semibold text-ink leading-tight mb-5">
          页面不存在
        </h1>
        <p className="text-ink-muted leading-relaxed mb-10">
          链接可能失效，或这个页面已经被删除。
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-accent-text text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          返回首页
        </Link>
      </div>
    </main>
  );
}
