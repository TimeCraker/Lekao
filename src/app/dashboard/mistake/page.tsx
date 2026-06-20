import Link from "next/link";

export default function MistakePage() {
  return (
    <div className="p-8 md:p-12 max-w-3xl">
      <div className="mb-2 text-sm text-ink-subtle">功能入口</div>
      <h1 className="text-3xl md:text-4xl font-bold text-ink tracking-tight">
        错题集生成
      </h1>
      <p className="text-ink-muted mt-3 text-base">
        上传 Excel 错题表 + 拖拽题目图片，AI 自动整理为带排版的 Word 文档。
      </p>

      {/* 占位 */}
      <div className="mt-12 bg-white border-2 border-dashed border-hairline rounded-2xl p-16 text-center">
        <div className="text-5xl mb-4">🚧</div>
        <h2 className="text-xl font-semibold text-ink mb-2">功能开发中</h2>
        <p className="text-sm text-ink-muted">
          预计 2026 年 7 月上线 · 错题集功能对所有用户永久免费
        </p>
      </div>

      {/* 模板下载 */}
      <div className="mt-6 bg-accent-soft/60 border border-accent-line rounded-xl p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-2xl shadow-sm">
          📥
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-accent-ink">
            下载 Excel 错题录入模板
          </div>
          <div className="text-sm text-ink-muted mt-0.5">
            按格式填写后上传即可自动识别
          </div>
        </div>
        <a
          href="/templates/lekao-mistake-template-v1.xlsx"
          download
          className="px-4 py-2 bg-accent-text text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition whitespace-nowrap"
        >
          下载 .xlsx
        </a>
      </div>

      {/* 模板说明 */}
      <details className="mt-8 bg-white border border-hairline rounded-xl">
        <summary className="px-5 py-4 cursor-pointer text-sm font-medium text-ink hover:bg-canvas-alt transition">
          模板字段说明（点击展开）
        </summary>
        <div className="px-5 pb-5 pt-2 border-t border-hairline">
          <table className="w-full text-sm">
            <thead className="text-left text-ink-muted">
              <tr>
                <th className="py-2 font-medium">列名</th>
                <th className="py-2 font-medium">是否必填</th>
                <th className="py-2 font-medium">说明</th>
              </tr>
            </thead>
            <tbody className="text-ink-mute">
              <tr>
                <td className="py-2 font-mono">题号</td>
                <td className="py-2">必填</td>
                <td className="py-2">第 1 / 2 / 3 题</td>
              </tr>
              <tr>
                <td className="py-2 font-mono">题目</td>
                <td className="py-2">必填</td>
                <td className="py-2">题干文本（最长 500 字）</td>
              </tr>
              <tr>
                <td className="py-2 font-mono">答案</td>
                <td className="py-2">选填</td>
                <td className="py-2">正确答案（如已知）</td>
              </tr>
              <tr>
                <td className="py-2 font-mono">错题人数</td>
                <td className="py-2">必填</td>
                <td className="py-2">整数 1-30</td>
              </tr>
              <tr>
                <td className="py-2 font-mono">错误原因</td>
                <td className="py-2">选填</td>
                <td className="py-2">AI 辅助分析依据</td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>

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