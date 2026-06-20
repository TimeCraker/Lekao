import Link from "next/link";
import { auth } from "@/lib/auth";
import {
  MistakeIcon,
  SummaryIcon,
  FeedbackIcon,
  CoinIcon,
  FreeIcon,
  ArrowRightIcon,
} from "@/components/icons";
import { CoinCounter } from "./coin-counter";

type FeatureIcon = React.ComponentType<{ className?: string }>;
type FeatureTag = { type: "free" | "coin"; label: string };
type QuickFeature = {
  Icon: FeatureIcon;
  title: string;
  description: string;
  href: string;
  tag: FeatureTag;
};

const QUICK_FEATURES: QuickFeature[] = [
  {
    Icon: MistakeIcon,
    title: "错题集生成",
    description: "上传 Excel + 错题图片，AI 自动整理为 Word 文档",
    href: "/dashboard/mistake",
    tag: { type: "free", label: "免费" },
  },
  {
    Icon: SummaryIcon,
    title: "课堂小结",
    description: "AI 按 BRD 硬约束格式生成 10 条建议 + 小结",
    href: "/dashboard/summary",
    tag: { type: "coin", label: "1 币/次" },
  },
  {
    Icon: FeedbackIcon,
    title: "堂测反馈",
    description: "上传讲义图片，AI 生成专业堂测批改反馈",
    href: "/dashboard/feedback",
    tag: { type: "coin", label: "1 币/次" },
  },
];

export default async function DashboardPage() {
  const session = await auth();
  const coin = session?.user?.t_coin ?? 0;
  const giftCoin = session?.user?.lekao_gift_coin ?? -1;
  const giftInitialised = giftCoin !== -1;
  const totalCoin = coin + (giftInitialised ? giftCoin : 0);
  const name = session?.user?.name ?? "用户";

  return (
    <div className="px-8 md:px-12 py-10 max-w-6xl">
      {/* Welcome */}
      <header className="mb-10">
        <div className="text-xs font-medium text-ink-subtle uppercase tracking-wider mb-2">
          控制台
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-ink tracking-tight">
          欢迎回来，{name}
        </h1>
        <p className="text-ink-muted mt-2">从下方选择一个功能开始</p>
      </header>

      {/* T-Coin 卡片 · 大色块 + count-up */}
      <div className="relative bg-gradient-to-br from-accent to-accent-hover rounded-2xl p-8 md:p-10 text-white shadow-lg mb-10 overflow-hidden">
        <div className="absolute -top-10 -right-10 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="relative flex items-start gap-6">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
            <CoinIcon className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-sm opacity-90">T-Coin 总可用</div>
            <div className="text-5xl md:text-6xl font-bold mt-3 flex items-baseline gap-2">
              <CoinCounter value={totalCoin} />
              <span className="text-2xl font-medium opacity-75">枚</span>
            </div>
            <div className="mt-4 text-sm opacity-85 max-w-md leading-relaxed">
              {giftInitialised ? (
                <>
                  充值 <strong className="font-semibold">{coin}</strong> + 赠送{" "}
                  <strong className="font-semibold">{giftCoin}</strong> · 每次
                  课堂小结/反馈消耗 1 枚
                </>
              ) : (
                <>注册即送 5 枚 T-Coin · 永久免费基础功能</>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3 功能入口 · stagger entrance */}
      <div className="grid md:grid-cols-3 gap-6">
        {QUICK_FEATURES.map((f, i) => (
          <QuickCard key={f.href} index={i} {...f} />
        ))}
      </div>
    </div>
  );
}

function QuickCard({
  Icon,
  title,
  description,
  href,
  tag,
  index,
}: QuickFeature & { index: number }) {
  return (
    <Link
      href={href}
      style={{
        animation: `fadeUp 0.5s ease-out ${0.1 + index * 0.08}s both`,
      }}
      className="group block bg-white border border-hairline rounded-2xl p-6 transition-all duration-300 hover:border-accent hover:shadow-card-hover hover:-translate-y-1"
    >
      {/* Icon · 64×64 圆角彩色容器 */}
      <div className="w-14 h-14 rounded-xl bg-accent-soft flex items-center justify-center mb-5 group-hover:bg-accent-text group-hover:scale-105 transition-all duration-300">
        <Icon className="w-7 h-7 text-accent-text group-hover:text-white transition-colors duration-300" />
      </div>

      <h3 className="text-lg font-semibold text-ink mb-2 group-hover:text-accent-ink transition">
        {title}
      </h3>
      <p className="text-sm text-ink-muted leading-relaxed mb-5 min-h-[2.5rem]">
        {description}
      </p>

      <div className="flex items-center justify-between pt-2 border-t border-hairline/60">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${
            tag.type === "free"
              ? "bg-success-soft text-success-text"
              : "bg-accent-soft text-accent-ink"
          }`}
        >
          {tag.type === "free" ? (
            <FreeIcon className="w-3 h-3" />
          ) : (
            <CoinIcon className="w-3 h-3" />
          )}
          {tag.label}
        </span>
        <span className="text-accent-text text-sm font-medium inline-flex items-center gap-1 opacity-70 group-hover:opacity-100 group-hover:gap-2 transition-all">
          开始
          <ArrowRightIcon className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}