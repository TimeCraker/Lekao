import { WeekendMistakeWorkflow } from "@/components/mistake/weekend/weekend-mistake-workflow";
import { TopBar } from "@/components/dashboard/sidebar";

export default function WeekendMistakePage() {
  return (
    <>
      <TopBar
        title="错题反馈表"
        description="上传周末 Excel → 自动改今日日期 → 手动填错题 → AI 反馈 + 导出"
      />
      <div className="px-6 md:px-10 pb-8 max-w-6xl">
        <WeekendMistakeWorkflow />
      </div>
    </>
  );
}