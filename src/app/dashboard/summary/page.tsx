import Link from "next/link";
import { SummaryWorkflow } from "@/components/summary/summary-workflow";

export default function SummaryPage() {
  return (
    <div className="p-8 md:p-12 max-w-4xl">
      <div className="mb-2 text-sm text-ink-subtle">功能入口</div>
      <h1 className="text-3xl md:text-4xl font-bold text-ink tracking-tight">
        课堂小结 / 家长反馈
      </h1>
      <p className="text-ink-muted mt-3 text-base">
        上传讲义图片 → AI 自动识别学科、章节、知识点 → 生成专业小结或家长反馈。
      </p>

      <div className="mt-8">
        <SummaryWorkflow />
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