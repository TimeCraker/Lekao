import type { CSSProperties } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeCheckinState } from "@/lib/checkin";
import { HeroGreeting } from "./bento";
import { CoinCard } from "./coin-card";
import { CheckinCard } from "./checkin-card";
import { FeatureCard } from "./feature-card";

type FeatureTag = { type: "free" | "coin"; label: string };
type IconName = "mistake" | "weekend" | "summary" | "feedback";
type QuickFeature = {
  iconName: IconName;
  title: string;
  description: string;
  href: string;
  tag: FeatureTag;
  primary?: boolean;
};

const QUICK_FEATURES: QuickFeature[] = [
  {
    iconName: "mistake",
    title: "错题集生成",
    description: "上传 Excel 和错题图片，自动整理成 Word 错题本",
    href: "/dashboard/mistake",
    tag: { type: "free", label: "免费" },
    primary: true,
  },
  {
    iconName: "summary",
    title: "课堂小结",
    description: "按固定格式生成课堂小结和 10 条建议",
    href: "/dashboard/summary",
    tag: { type: "coin", label: "1 币/次" },
  },
  {
    iconName: "feedback",
    title: "作业/堂测反馈",
    description: "上传讲义图片，自动生成批改反馈",
    href: "/dashboard/feedback",
    tag: { type: "coin", label: "1 币/次" },
  },
  {
    iconName: "weekend",
    title: "周末反馈表",
    description: "上传周末 Excel，手填错题，自动生成全班反馈",
    href: "/dashboard/weekend-mistake",
    tag: { type: "free", label: "免费" },
  },
];

export default async function DashboardPage() {
  const session = await auth();
  const dbUser = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { t_coin: true, lekao_gift_coin: true, name: true },
      })
    : null;
  const coin = dbUser?.t_coin ?? 0;
  const giftCoin = dbUser?.lekao_gift_coin ?? -1;
  const giftInitialised = giftCoin !== -1;
  const totalCoin = coin + (giftInitialised ? giftCoin : 0);
  const name = dbUser?.name ?? session?.user?.name ?? "用户";

  const checkin = session?.user?.id
    ? await computeCheckinState(session.user.id)
    : null;

  // 杂志风期号栏（owner 2026-10-03 决策：保留杂志风，推翻设计规格的移除项）
  const issueDate = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="px-6 md:px-12 py-10 md:py-16 max-w-6xl mx-auto">
      {/* IssueBar · 顶部期号栏（杂志风签名元素） */}
      <div className="anim-fade-up flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.18em] text-ink-subtle pb-3 border-b border-hairline">
        <span>Lekao Agent 控制台</span>
        <span>{issueDate}</span>
      </div>
      {/* Hero · 巨衬线问候 */}
      <header className="mt-10 md:mt-14 mb-12 md:mb-16">
        <HeroGreeting prefix="Hi," name={name} />
        <p
          className="anim-fade-up font-serif text-ink-muted mt-5 italic"
          style={
            {
              fontSize: "clamp(1rem, 2vw, 1.35rem)",
              "--anim-delay": "0.45s",
            } as CSSProperties
          }
        >
          欢迎回来，从下面挑一个功能开始。
        </p>
      </header>

      {/* #01 功能入口（任务优先 · T-304：资产/签到不得抢占任务首屏） */}
      <section className="mb-14 md:mb-20">
        <div
          className="anim-fade-up flex items-center gap-3 mb-5"
          style={{ "--anim-delay": "0.1s" } as CSSProperties}
        >
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-subtle">
            #01 — Features
          </span>
          <span className="h-px flex-1 bg-hairline" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {/* 主推 col-span-2 */}
          <div className="sm:col-span-2 lg:col-span-2">
            <FeatureCard index={0} {...QUICK_FEATURES[0]} />
          </div>
          <FeatureCard index={1} {...QUICK_FEATURES[1]} />
          <FeatureCard index={2} {...QUICK_FEATURES[2]} />
          {/* 错题反馈表 col-span-2 收尾 */}
          <div className="sm:col-span-2 lg:col-span-2">
            <FeatureCard index={3} {...QUICK_FEATURES[3]} />
          </div>
        </div>
      </section>

      {/* #02 余额 + 签到（资产区，置于任务之后） */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-subtle">
            #02 — Balance
          </span>
          <span className="h-px flex-1 bg-hairline" />
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          <div className="md:col-span-2">
            <CoinCard
              total={totalCoin}
              paid={coin}
              gift={giftCoin}
              giftInitialised={giftInitialised}
            />
          </div>
          {checkin && <CheckinCard initial={checkin} />}
        </div>
      </section>

      {/* 页脚 colophon */}
      <footer className="mt-16 md:mt-24 pt-6 border-t border-hairline flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.18em] text-ink-subtle">
        <span>Lekao Agent · 教学工作台</span>
      </footer>
    </div>
  );
}
