"use client";

import { CoinCounter } from "./coin-counter";
import { TiltCard } from "./bento";

interface Props {
  total: number;
  paid: number;
  gift: number;
  giftInitialised: boolean;
}

export function CoinCard({ total, paid, gift, giftInitialised }: Props) {
  const safeTotal = total > 0 ? total : 0;
  const paidPct = safeTotal > 0 ? (paid / safeTotal) * 100 : 0;
  const giftPct = safeTotal > 0 ? (gift / safeTotal) * 100 : 0;

  return (
    <TiltCard
      intensity={3}
      className="relative bg-white border border-hairline rounded-3xl p-8 md:p-10 min-h-[230px] flex flex-col overflow-hidden"
    >
      <div className="relative flex-1">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-subtle">
          T-Coin Balance
        </div>
        <div
          className="font-serif font-semibold text-ink leading-none mt-3 flex items-baseline gap-2 tabular-nums"
          style={{ fontSize: "clamp(3.5rem, 10vw, 6.5rem)" }}
        >
          <CoinCounter value={total} />
          <span className="font-sans text-xl md:text-2xl font-medium text-ink-muted">
            枚
          </span>
        </div>
      </div>

      {/* 拆分条数据可视化 */}
      <div className="relative mt-6">
        {giftInitialised ? (
          <>
            <div className="h-1.5 rounded-full bg-ink-subtle/15 overflow-hidden flex">
              <div
                className="bg-accent transition-all duration-700"
                style={{ width: `${paidPct}%` }}
              />
              <div
                className="bg-ink transition-all duration-700"
                style={{ width: `${giftPct}%` }}
              />
            </div>
            {/* 拆分明细 · 点线价目行（ORN-02 · DESIGN.md §3 名目—数值） */}
            <div className="mt-4 space-y-1.5">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-subtle">
                  加赠 T-Coin
                </span>
                <span className="leader-dots" aria-hidden="true" />
                <span className="font-serif text-lg font-semibold text-ink tabular-nums">
                  {paid}
                  <span className="font-sans text-xs font-normal text-ink-muted ml-0.5">
                    枚
                  </span>
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-subtle">
                  赠送 T-Coin
                </span>
                <span className="leader-dots" aria-hidden="true" />
                <span className="font-serif text-lg text-ink-muted tabular-nums">
                  {gift}
                  <span className="font-sans text-xs font-normal ml-0.5">
                    枚
                  </span>
                </span>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-ink-muted">
            错题集等功能免费，新用户送试用额度
          </p>
        )}
      </div>
    </TiltCard>
  );
}
