import { WeekendMistakeWorkflow } from "@/components/mistake/weekend/weekend-mistake-workflow";
import { TopBar } from "@/components/dashboard/sidebar";

export default function WeekendMistakePage() {
  return (
    <>
      <TopBar
        title="周末反馈表"
        description="上传周末 Excel，自动改成今天日期，手填错题，AI 生成反馈并导出"
      />
      <div className="px-6 md:px-10 pb-8 max-w-6xl">
        <WeekendMistakeWorkflow />
      </div>
    </>
  );
}
