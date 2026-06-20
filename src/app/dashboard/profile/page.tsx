import Link from "next/link";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileActions } from "./profile-actions";
import {
  MailIcon,
  CoinIcon,
  ClockIcon,
  FreeIcon,
} from "@/components/landing/icons";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // 拿完整用户信息 (session 里只有核心字段, 注册时间要查 DB)
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      lekao_gift_coin: true,
      t_coin: true,
      createdAt: true,
    },
  });

  if (!dbUser) redirect("/login");

  const tCoin = dbUser.t_coin;
  const giftCoin = dbUser.lekao_gift_coin;
  const giftInitialised = giftCoin !== -1;
  const totalCoin = tCoin + (giftInitialised ? giftCoin : 0);

  return (
    <div className="p-8 md:p-12 max-w-4xl">
      {/* Header · 返回 + 标题 */}
      <div className="mb-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-accent-text transition mb-4"
        >
          ← 返回概览
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-ink tracking-tight">
          个人中心
        </h1>
        <p className="text-ink-muted mt-2">查看账号信息与 T-Coin 余额</p>
      </div>

      {/* 头像 + 基础信息 */}
      <div className="bg-white rounded-2xl border border-hairline p-8 mb-6">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent to-accent-hover text-white flex items-center justify-center text-3xl font-bold shrink-0 shadow-md">
            {dbUser.name?.[0]?.toUpperCase() ?? dbUser.email[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-2xl font-semibold text-ink">
                {dbUser.name ?? "用户"}
              </h2>
              {dbUser.role === UserRole.ADMIN && (
                <span className="inline-flex items-center px-2 py-0.5 bg-accent-soft text-accent-ink text-xs font-semibold rounded">
                  管理员
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-ink-muted text-sm">
              <MailIcon className="w-4 h-4 text-ink-subtle" />
              <span className="truncate">{dbUser.email}</span>
            </div>
          </div>
        </div>

        {/* 修改名 (Phase 2 接入) */}
        <ProfileActions userId={dbUser.id} currentName={dbUser.name ?? ""} />
      </div>

      {/* T-Coin 余额卡 */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {/* 充值 T-Coin */}
        <CoinCard
          label="充值 T-Coin"
          desc="跨产品共享 (ResumeAIX / Lekao)"
          amount={tCoin}
          highlight={false}
        />
        {/* 赠送 T-Coin */}
        <CoinCard
          label="赠送 T-Coin"
          desc={
            giftInitialised
              ? "Lekao 注册赠送"
              : "首次登录后赠送 5 枚"
          }
          amount={giftInitialised ? giftCoin : 0}
          highlight={false}
          pending={!giftInitialised}
        />
        {/* 总可用 */}
        <CoinCard
          label="总可用"
          desc="扣费顺序: 先赠币 → 再充值"
          amount={totalCoin}
          highlight={true}
        />
      </div>

      {/* 账号详情 */}
      <div className="bg-white rounded-2xl border border-hairline p-6 mb-6">
        <h3 className="text-base font-semibold text-ink mb-4">账号详情</h3>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <Item
            icon={<ClockIcon className="w-4 h-4 text-ink-subtle" />}
            label="注册时间"
            value={formatDate(dbUser.createdAt)}
          />
          <Item
            icon={<CoinIcon className="w-4 h-4 text-ink-subtle" />}
            label="扣费规则"
            value="课堂小结/反馈 = 1 币/次"
          />
          <Item
            icon={<MailIcon className="w-4 h-4 text-ink-subtle" />}
            label="邮箱"
            value={dbUser.email}
          />
          <Item
            icon={<FreeIcon className="w-4 h-4 text-ink-subtle" />}
            label="账号状态"
            value="正常"
          />
        </dl>
      </div>

      {/* 安全提示 */}
      <div className="bg-accent-soft border border-accent-line rounded-2xl p-6 text-sm text-ink-mute">
        <strong className="text-ink">💡 T-Coin 扣费顺序</strong>
        <p className="mt-2 leading-relaxed">
          每次生成课堂小结或反馈，先扣除 <strong>赠送 T-Coin</strong>，余额不足再扣除
          {" "}<strong>充值 T-Coin</strong>。
          赠送币用完后，注册赠送的 5 枚不再补发；充值币可通过 T-Coin
          充值获得（Phase 2 上线）。
        </p>
      </div>
    </div>
  );
}

function CoinCard({
  label,
  desc,
  amount,
  highlight,
  pending,
}: {
  label: string;
  desc: string;
  amount: number;
  highlight: boolean;
  pending?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-6 ${
        highlight
          ? "bg-gradient-to-br from-accent to-accent-hover border-transparent text-white shadow-md"
          : "bg-white border-hairline"
      }`}
    >
      <div
        className={`text-xs ${highlight ? "opacity-90" : "text-ink-subtle"}`}
      >
        {label}
      </div>
      <div className="mt-3 text-4xl font-bold flex items-center gap-2">
        {pending ? "—" : amount}
        {!pending && (
          <span className={`text-lg ${highlight ? "opacity-75" : "text-ink-subtle"}`}>
            枚
          </span>
        )}
      </div>
      <div
        className={`mt-2 text-xs ${
          highlight ? "opacity-85" : "text-ink-muted"
        }`}
      >
        {desc}
      </div>
    </div>
  );
}

function Item({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <dt className="text-ink-subtle">{label}</dt>
        <dd className="text-ink mt-0.5">{value}</dd>
      </div>
    </div>
  );
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
