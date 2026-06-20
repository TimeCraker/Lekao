export function Stats() {
  return (
    <section className="py-24 px-6 bg-canvas-alt">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
          省下的时间，才是真正的价值
        </h2>
        <p className="text-lg text-ink-muted mb-12">
          拒绝重复冗余，把时间还给学生
        </p>

        {/* Math */}
        <div className="bg-white rounded-2xl p-12 border border-hairline shadow-sm">
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12 text-3xl md:text-5xl font-bold text-ink">
            <div className="flex flex-col items-center">
              <span>30 人</span>
              <span className="text-sm font-normal text-ink-muted mt-2">班级</span>
            </div>
            <span className="text-ink-subtle">×</span>
            <div className="flex flex-col items-center">
              <span>3 道</span>
              <span className="text-sm font-normal text-ink-muted mt-2">核心错题</span>
            </div>
            <span className="text-ink-subtle">=</span>
            <div className="flex flex-col items-center text-accent">
              <span>5 分钟</span>
              <span className="text-sm font-normal text-accent-ink mt-2">
                Lekao Agent 搞定
              </span>
            </div>
          </div>

          <p className="mt-10 text-base text-ink-muted max-w-xl mx-auto">
            传统方式整理错题至少 1 小时 · Lekao Agent 只要 5 分钟
            <br />
            <span className="text-accent-ink font-semibold">
              每次课省 55 分钟
            </span>
            ，多陪学生才是助教的价值
          </p>
        </div>
      </div>
    </section>
  );
}