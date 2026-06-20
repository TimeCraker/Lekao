import Link from "next/link";

export default function SummaryPage() {
  return (
    <div className="p-8 md:p-12 max-w-3xl">
      <div className="mb-2 text-sm text-ink-subtle">功能入口</div>
      <h1 className="text-3xl md:text-4xl font-bold text-ink tracking-tight">
        课堂小结
      </h1>
      <p className="text-ink-muted mt-3 text-base">
        AI 按 BRD 硬约束格式生成 10 条教学建议 + 完整小结，可一键复制。
      </p>

      {/* 占位 */}
      <div className="mt-12 bg-white border-2 border-dashed border-hairline rounded-2xl p-16 text-center">
        <div className="text-5xl mb-4">🚧</div>
        <h2 className="text-xl font-semibold text-ink mb-2">功能开发中</h2>
        <p className="text-sm text-ink-muted">
          预计 2026 年 7 月上线 · 每次生成消耗 1 枚 T-Coin
        </p>
      </div>

      {/* 预览示例 */}
      <div className="mt-10">
        <div className="text-sm font-medium text-ink-mute mb-3">
          预览：AI 输出样例
        </div>
        <div className="bg-white border border-hairline rounded-xl p-6 text-sm leading-relaxed text-ink-mute">
          <div className="font-semibold text-ink mb-2">📌 本节小结</div>
          <p className="mb-4">
            本节重点讲解一元二次方程的解法，学生整体掌握率 78%，主要问题集中在
            <span className="text-danger">判别式符号判断</span>。
          </p>
          <div className="font-semibold text-ink mb-2">💡 教学建议</div>
          <ol className="list-decimal list-inside space-y-1">
            <li>加强判别式 Δ = b² - 4ac 的符号训练</li>
            <li>补充 3 道经典例题巩固解法</li>
            <li>...</li>
          </ol>
        </div>
      </div>

      <div className="mt-8">
        <Link
          href="/dashboard"
          className="text-sm text-ink-muted hover:text-ink transition"
        >
          ← 返回概览
        </Link>
      </div>
    </div>
  );
}