import Link from "next/link";
import { SummaryWorkflow } from "@/components/summary/summary-workflow";
import { TopBar } from "@/components/dashboard/sidebar";
import { CoinIcon } from "@/components/icons";

export default function FeedbackPage() {
  return (
    <>
      <TopBar
        title="堂测反馈"
        description="上传讲义图片 → AI 自动识别学科、章节、知识点 → 生成堂测批改反馈"
        rightExtra={
          <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 bg-accent-soft text-accent-ink text-xs font-semibold rounded-full border border-accent/20">
            <CoinIcon className="w-3 h-3" />
            1 币 / 次
          </span>
        }
      />

      <div className="px-8 md:px-12 py-8 max-w-4xl">
        <div className="mt-8">
          <SummaryWorkflow template="feedback" />
        </div>

        <div className="mt-12 pt-6 border-t border-hairline">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink transition"
          >
            ← 返回控制台
          </Link>
        </div>
      </div>
    </>
  );
}