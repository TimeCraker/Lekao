import Image from "next/image";
import { PageHeader } from "./page-header";
import { Reveal } from "./reveal";
import { CountUp } from "./count-up";

export function Stats() {
  return (
    <section className="cv-auto py-24 px-6 md:px-12 bg-canvas-alt">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <PageHeader
            index="02"
            kicker="Value"
            title="省下的时间，才是真正的价值"
            subtitle="拒绝重复冗余，把时间还给学生。"
          />
        </Reveal>

        <Reveal delay={0.1}>
          <div className="relative aspect-[4/3] max-w-3xl mx-auto mt-10 mb-12 rounded-2xl overflow-hidden bg-white border border-hairline shadow-sm">
            <Image
              src="/images/value-time-comparison.png"
              alt="Lekao Agent 错题集生成流程示意"
              width={1024}
              height={768}
              sizes="(min-width: 768px) 768px, 100vw"
              className="w-full h-full object-cover"
            />
          </div>
        </Reveal>

        {/* 数学算式 · 巨衬线数字 + count-up */}
        <Reveal delay={0.15}>
          <div className="bg-white rounded-3xl p-10 md:p-14 border border-hairline shadow-sm">
            <div
              className="flex flex-wrap items-center justify-center gap-4 md:gap-10 font-serif font-semibold text-ink"
              style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
            >
              <div className="flex flex-col items-center leading-none">
                <span>
                  <CountUp value={30} />
                  <span className="text-xl md:text-2xl font-sans font-normal text-ink-muted ml-1">
                    人
                  </span>
                </span>
                <span className="text-xs font-sans font-normal text-ink-muted mt-2 uppercase tracking-wider">
                  班级
                </span>
              </div>
              <span className="text-ink-subtle">×</span>
              <div className="flex flex-col items-center leading-none">
                <span>
                  <CountUp value={3} />
                  <span className="text-xl md:text-2xl font-sans font-normal text-ink-muted ml-1">
                    道
                  </span>
                </span>
                <span className="text-xs font-sans font-normal text-ink-muted mt-2 uppercase tracking-wider">
                  核心错题
                </span>
              </div>
              <span className="text-ink-subtle">=</span>
              <div className="flex flex-col items-center leading-none text-accent">
                <span>
                  <CountUp value={5} />
                  <span className="text-xl md:text-2xl font-sans font-normal text-accent-ink ml-1">
                    分钟
                  </span>
                </span>
                <span className="text-xs font-sans font-normal text-accent-ink mt-2 uppercase tracking-wider">
                  自动生成
                </span>
              </div>
            </div>

            <p className="mt-10 text-base text-ink-muted max-w-xl mx-auto text-center leading-relaxed">
              一个班 30 人、每人 3 道错题，Lekao Agent 几分钟生成全班 Word
              错题集
              <br />
              <span className="text-accent-ink font-semibold">
                把手抄的时间，还给学生
              </span>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
