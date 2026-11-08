import Image from "next/image";
import { PageHeader } from "./page-header";
import { Reveal } from "./reveal";

const STEPS = [
  {
    n: "01",
    title: "上传资料",
    description: "Excel / Word / 图片，拖入即上传",
  },
  { n: "02", title: "AI 识别", description: "自动识别学科 / 章节 / 错题结构" },
  { n: "03", title: "人工校对", description: "关键字段一目了然，按需微调" },
  { n: "04", title: "导出成品", description: "Word / Excel / JSON，按需下载" },
];

export function Workflow() {
  return (
    <section
      id="workflow"
      className="cv-auto relative py-24 px-6 md:px-12 bg-canvas"
    >
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <PageHeader
            index="03"
            kicker="Workflow"
            title="4 步搞定 · 从原始资料到成品文档"
            subtitle="上传 → AI 识别 → 校对 → 导出，每一步都为你省时间。"
          />
        </Reveal>

        <Reveal delay={0.1}>
          <div className="relative aspect-[21/9] mt-10 mb-12 rounded-2xl overflow-hidden bg-canvas-alt border border-hairline">
            <Image
              src="/images/workflow-pipeline.png"
              alt="Lekao Agent 4 步使用流程：上传 → AI 识别 → 校对 → 导出"
              width={2100}
              height={900}
              sizes="(min-width: 1024px) 1152px, 100vw"
              className="w-full h-full object-cover"
            />
          </div>
        </Reveal>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={0.15 + i * 0.08}>
              <div className="bg-white border border-hairline rounded-2xl p-6 h-full hover:border-accent transition-colors">
                <div className="font-mono text-xs text-accent-text mb-3 tracking-wider">
                  {step.n}
                </div>
                <h3 className="font-serif text-xl font-semibold text-ink mb-1.5">
                  {step.title}
                </h3>
                <p className="text-sm text-ink-muted leading-relaxed">
                  {step.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
