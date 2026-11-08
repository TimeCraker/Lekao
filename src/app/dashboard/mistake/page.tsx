import { MistakeWorkflow } from "@/components/mistake/mistake-workflow";
import { TopBar } from "@/components/dashboard/sidebar";
import { FreeIcon } from "@/components/icons";
import { UsageGuideButton } from "@/components/usage-guide/trigger-button";

export default function MistakePage() {
  return (
    <>
      <TopBar
        title="错题集生成"
        description="上传 Excel 错题表，选学科，确认封面，填题号图片或文字，导出 Word"
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
    </>
  );
}
