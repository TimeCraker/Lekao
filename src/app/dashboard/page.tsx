import Link from "next/link";
import { auth } from "@/lib/auth";

const QUICK_FEATURES = [
  {
    icon: "📋",
    title: "错题集生成",
    description: "上传 Excel + 错题图片，AI 自动整理为 Word 文档",
    href: "/dashboard/mistake",
    tag: { type: "free" as const, label: "免费" },
  },
  {
    icon: "📝",
    title: "课堂小结",
    description: "AI 按 BRD 硬约束格式生成 10 条建议 + 小结",
    href: "/dashboard/summary",
    tag: { type: "coin" as const, label: "1 币/次" },
  },
  {
    icon: "💬",
    title: "课堂反馈",
    description: "上传讲义图片 + 简单描述，AI 生成专业家长反馈",
    href: "/dashboard/feedback",
    tag: { type: "coin" as const, label: "1 币/次" },
  },
];

export default async function DashboardPage() {
  const session = await auth();
  const coin = session?.user?.t_coin ?? 0;
  const name = session?.user?.name ?? "用户";

  return (
    <div className="p-8 md:p-12 max-w-6xl">
      {/* Welcome */}
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-ink tracking-tight">
          欢迎回来，{name}
        </h1>
        <p className="text-ink-muted mt-2">从下方选择一个功能开始</p>
      </div>

      {/* T-Coin 卡片 */}
      <div className="relative bg-gradient-to-br from-accent to-accent-hover rounded-2xl p-8 md:p-10 text-white shadow-lg mb-10 overflow-hidden">
        <div className="absolute -top-10 -right-10 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <div className="text-sm opacity-90">T-Coin 余额</div>
          <div className="text-5xl md:text-6xl font-bold mt-3 flex items-center gap-3">
            <span>🪙</span>
            {coin}
          </div>
          <div className="mt-4 text-sm opacity-85 max-w-md">
            每次课堂小结或反馈消耗 1 枚 T-Coin · 注册即送 5 枚永久免费
          </div>
        </div>
      </div>

      {/* 3 功能入口 */}
      <div className="grid md:grid-cols-3 gap-6">
        {QUICK_FEATURES.map((f) => (
          <QuickCard key={f.href} {...f} />
        ))}
      </div>
    </div>
  );
}

function QuickCard({
  icon,
  title,
  description,
  href,
  tag,
}: {
  icon: string;
  title: string;
  description: string;
  href: string;
  tag: { type: "free" | "coin"; label: string };
}) {
  return (
    <Link
      href={href}
      className="group block bg-white border border-hairline rounded-2xl p-6 transition hover:border-accent hover:shadow-card-hover hover:-translate-y-0.5"
    >
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-ink mb-2">{title}</h3>
      <p className="text-sm text-ink-muted leading-relaxed mb-4 min-h-[2.5rem]">
        {description}
      </p>
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${
            tag.type === "free"
              ? "bg-success/10 text-success"
              : "bg-accent-soft text-accent-ink"
          }`}
        >
          {tag.type === "free" ? "✦" : "🪙"} {tag.label}
        </span>
        <span className="text-accent text-sm font-medium opacity-0 group-hover:opacity-100 transition">
          开始 →
        </span>
      </div>
    </Link>
  );
}