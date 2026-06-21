import Link from "next/link";
import {
  MistakeIcon,
  SummaryIcon,
  FeedbackIcon,
  CoinIcon,
} from "@/components/icons";

export const metadata = {
  title: "关于 · Lekao Agent",
  description: "Lekao Agent 是为培训机构助教设计的 AI 智能助手，让重复冗余工作交给机器。",
};

const FEATURES = [
  {
    Icon: MistakeIcon,
    title: "错题集生成",
    desc: "上传 Excel + 错题图片，AI 自动整理为带年级 / 题型 / 难度标签的 Word 文档。",
    tag: "免费",
  },
  {
    Icon: SummaryIcon,
    title: "课堂小结",
    desc: "AI 按 BRD 硬约束格式生成 10 条教学建议 + 当堂小结，结构稳定可直接发送。",
    tag: "1 币 / 次",
  },
  {
    Icon: FeedbackIcon,
    title: "作业/堂测反馈",
    desc: "上传讲义图片，AI 生成作业/堂测批改反馈，具体可执行、可直接贴群里。",
    tag: "1 币 / 次",
  },
];

const PRINCIPLES = [
  {
    title: "先解决助教",
    desc: "我们不做替代老师的产品，只让助教从重复劳动里解放出来，把时间花在学生身上。",
  },
  {
    title: "可验证的输出",
    desc: "所有 AI 输出都有明确结构与字段，方便助教人工核对与微调，不做黑盒。",
  },
  {
    title: "数据最小化",
    desc: "我们只收集必需的邮箱与作业图片，不追踪行为数据，不卖给任何第三方。",
  },
];

export default function AboutPage() {
  return (
    <div className="bg-canvas">
      {/* Hero */}
      <section className="relative px-6 py-20 md:py-28">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-accent-soft border border-accent-line rounded-full text-sm text-accent-ink font-medium mb-6">
            <CoinIcon className="w-4 h-4" />
            关于 Lekao Agent
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-ink tracking-tight leading-tight">
            让重复冗余的工作
            <br />
            <span className="text-accent-text">交给机器</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-ink-muted max-w-2xl mx-auto leading-relaxed">
            Lekao Agent 是一款专为培训机构助教设计的 AI 智能助手。
            <br />
            让助教从抄错题、写小结、写反馈的重复冗余工作里解放出来，专注学生成长。
          </p>
        </div>
      </section>

      {/* 三大功能 */}
      <section className="px-6 py-12 md:py-16 bg-white border-y border-hairline">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-ink text-center mb-12">
            三大核心功能
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map(({ Icon, title, desc, tag }) => (
              <div
                key={title}
                className="bg-canvas border border-hairline rounded-2xl p-6 hover:border-accent transition"
              >
                <div className="w-12 h-12 rounded-xl bg-accent-soft flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-accent-text" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-ink">{title}</h3>
                  <span className="inline-flex px-2 py-0.5 bg-accent-soft text-accent-ink text-xs font-semibold rounded">
                    {tag}
                  </span>
                </div>
                <p className="text-sm text-ink-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 设计原则 */}
      <section className="px-6 py-16 md:py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-ink mb-10 text-center">
            我们坚守的原则
          </h2>
          <div className="space-y-4">
            {PRINCIPLES.map((p, i) => (
              <div
                key={p.title}
                className="flex items-start gap-4 p-5 bg-white border border-hairline rounded-xl"
              >
                <div className="w-10 h-10 rounded-lg bg-accent-soft text-accent-text flex items-center justify-center text-base font-bold shrink-0">
                  0{i + 1}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-ink mb-1">
                    {p.title}
                  </h3>
                  <p className="text-sm text-ink-muted leading-relaxed">
                    {p.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16 md:py-20 bg-gradient-to-br from-accent to-accent-hover text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            准备好告别重复冗余工作了吗？
          </h2>
          <p className="text-lg opacity-90 mb-8">
            注册即送 5 枚 T-Coin，永久免费基础功能
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="px-7 py-3 bg-white text-accent-text font-semibold rounded-xl hover:bg-canvas transition shadow-lg"
            >
              免费开始 →
            </Link>
            <Link
              href="https://asterforge.top/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-7 py-3 bg-white/10 backdrop-blur-sm border border-white/30 text-white font-medium rounded-xl hover:bg-white/20 transition"
            >
              了解开发者 ↗
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}