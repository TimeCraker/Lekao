import { MistakeWorkflow } from "@/components/mistake/mistake-workflow";
import { WeekendMistakeWorkflow } from "@/components/mistake/weekend/weekend-mistake-workflow";
import { TopBar } from "@/components/dashboard/sidebar";
import { FreeIcon, ExpandIcon } from "@/components/icons";
import { UsageGuideButton } from "@/components/usage-guide/trigger-button";

export default function MistakePage() {
  return (
    <>
      <TopBar
        title="错题集生成"
        description="Excel 错题表 → 选择学科 → 确认封面 → 填题号图片/文字 → 导出 Word"
        rightExtra={
          <div className="flex items-center gap-2">
            <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 bg-success-soft text-success-text text-xs font-semibold rounded-full border border-success/20">
              <FreeIcon className="w-3 h-3" />
              完全免费
            </span>
            <UsageGuideButton module="mistake" />
          </div>
        }
      />
      <MistakeWorkflow />

      {/* 🆕 Stage 1 · 周末错题反馈表 · 折叠区（v0.1） */}
      <div className="px-6 md:px-10 pb-8 max-w-6xl">
        <details className="rounded-2xl border border-accent-line bg-accent-soft/10 group">
          <summary className="cursor-pointer flex items-center gap-3 px-5 py-4 select-none">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-accent text-white">
              🆕 v0.1
            </span>
            <h3 className="text-base font-semibold text-ink">
              周末错题反馈表
            </h3>
            <span className="text-xs text-ink-muted">
              上传周末 Excel → 改日期 → 手动填错题 → 导出 / AI 反馈
            </span>
            <span className="ml-auto inline-flex items-center gap-1 text-xs text-accent-ink group-open:hidden">
              <ExpandIcon className="w-3.5 h-3.5" />
              点击展开
            </span>
            <span className="ml-auto inline-flex items-center gap-1 text-xs text-accent-ink hidden group-open:inline-flex">
              收起
            </span>
          </summary>
          <div className="px-5 pb-5 border-t border-accent-line/30 pt-4">
            <WeekendMistakeWorkflow />
          </div>
        </details>
      </div>
    </>
  );
}