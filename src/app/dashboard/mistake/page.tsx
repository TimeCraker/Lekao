import { MistakeWorkflow } from "@/components/mistake/mistake-workflow";
import { TopBar } from "@/components/dashboard/sidebar";
import { FreeIcon } from "@/components/icons";

export default function MistakePage() {
  return (
    <>
      <TopBar
        title="错题集生成"
        description="Excel 错题表 → 选择学科 → 确认封面 → 填题号图片/文字 → 导出 Word"
        rightExtra={
          <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 bg-success-soft text-success-text text-xs font-semibold rounded-full border border-success/20">
            <FreeIcon className="w-3 h-3" />
            完全免费
          </span>
        }
      />
      <MistakeWorkflow />
    </>
  );
}