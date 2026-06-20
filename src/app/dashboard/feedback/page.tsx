import Link from "next/link";

export default function FeedbackPage() {
  return (
    <div className="p-8 md:p-12 max-w-3xl">
      <div className="mb-2 text-sm text-ink-subtle">功能入口</div>
      <h1 className="text-3xl md:text-4xl font-bold text-ink tracking-tight">
        课堂反馈
      </h1>
      <p className="text-ink-muted mt-3 text-base">
        上传讲义图片 + 简单描述，AI 生成专业家长反馈消息。
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
          <div className="font-semibold text-ink mb-2">致 XX 家长</div>
          <p className="mb-3">
            您好！今天的课程我们学习了「一元二次方程」，孩子整体表现良好，能够
            主动举手回答问题，特别值得表扬！
          </p>
          <p className="mb-3">
            本节课重点是<span className="text-accent-ink">判别式的应用</span>，
            建议家长在家辅导时关注以下几点：
          </p>
          <ul className="list-disc list-inside space-y-1 mb-3">
            <li>每天 10 分钟口算练习</li>
            <li>本周错题订正 + 签名</li>
          </ul>
          <p>如有任何疑问，欢迎随时联系助教老师～</p>
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