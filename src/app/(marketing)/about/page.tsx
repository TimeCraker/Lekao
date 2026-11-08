import Link from "next/link";
import { MistakeIcon, SummaryIcon, FeedbackIcon } from "@/components/icons";
import { PageHeader } from "@/components/landing/page-header";
import { Reveal } from "@/components/landing/reveal";

export const metadata = {
  title: "关于",
  description:
    "Lekao Agent 是给助教的 AI 教学工作台，把错题整理、小结、反馈从重复劳动里解放出来。",
};

const FEATURES = [
  {
    Icon: MistakeIcon,
    title: "错题集生成",
    desc: "上传 Excel + 错题图片，自动整理为带年级 / 题型 / 难度标签的 Word 文档。",
    tag: "免费",
  },
  {
    Icon: SummaryIcon,
    title: "课堂小结",
    desc: "AI 按固定格式生成教学建议和当堂小结，结构稳定可直接发送。",
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
      {/* Hero · 质感层走全局 grain（ORN-09） */}
      <section className="relative px-6 md:px-12 py-20 md:py-28 overflow-hidden">
        <span
          className="absolute -top-8 -right-6 font-serif font-semibold text-ink/[0.035] select-none pointer-events-none leading-none"
          style={{ fontSize: "clamp(10rem, 26vw, 24rem)" }}
        >
          About
        </span>
        <div className="relative max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent-text">
              关于 Lekao Agent
            </span>
            <span className="h-px flex-1 max-w-[180px] bg-hairline" />
          </div>
          <h1
            className="font-serif font-semibold text-ink tracking-tight leading-[1.05]"
            style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)" }}
          >
            把重复的整理，
            <br />
            <span className="text-accent-text italic">交给机器。</span>
          </h1>
          <p
            className="mt-7 font-serif text-ink-muted max-w-2xl leading-snug"
            style={{ fontSize: "clamp(1.25rem, 2.5vw, 1.75rem)" }}
          >
            Lekao Agent 是给助教的 AI 教学工作台 ——
            让你从抄错题、写小结、写反馈里解放出来，把时间还给学生。
          </p>
        </div>
      </section>

      {/* 三大功能 */}
      <section className="px-6 md:px-12 py-16 md:py-20 bg-white border-y border-hairline">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <PageHeader
              index="01"
              kicker="Features"
              title="三大核心功能"
              subtitle="把重复的整理交给 AI，你专注教学本身。"
            />
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {FEATURES.map(({ Icon, title, desc, tag }, i) => (
              <Reveal key={title} delay={i * 0.1}>
                <div className="bg-canvas border border-hairline rounded-2xl p-6 h-full hover:border-accent transition">
                  <div className="w-12 h-12 rounded-xl bg-accent-soft flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-accent-text" />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-serif text-lg font-semibold text-ink">
                      {title}
                    </h3>
                    <span className="inline-flex px-2 py-0.5 bg-accent-soft text-accent-ink text-xs font-semibold rounded font-mono uppercase tracking-wider">
                      {tag}
                    </span>
                  </div>
                  <p className="text-sm text-ink-muted leading-relaxed">
                    {desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 设计原则 */}
      <section className="px-6 md:px-12 py-16 md:py-20">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <PageHeader index="02" kicker="Principles" title="我们坚守的原则" />
          </Reveal>
          <div className="space-y-4 mt-10">
            {PRINCIPLES.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.08}>
                <div className="flex items-start gap-4 p-5 bg-white border border-hairline rounded-2xl">
                  <div className="font-mono text-sm text-accent-text font-bold shrink-0 pt-0.5">
                    0{i + 1}
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-semibold text-ink mb-1">
                      {p.title}
                    </h3>
                    <p className="text-sm text-ink-muted leading-relaxed">
                      {p.desc}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-12 py-16 md:py-20 bg-gradient-to-br from-accent to-accent-hover text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-semibold mb-4">
            准备好告别重复整理了吗？
          </h2>
          <p className="text-lg mb-8">永久免费基础功能，新用户赠送试用额度</p>
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
