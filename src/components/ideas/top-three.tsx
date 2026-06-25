// ============================================
// Lekao · 灵感墙 · TOP 3 排行榜组件 (v2.2.0)
// ============================================
// 横排 3 卡（移动端竖排）+ MedalIcon 金银铜 + TrophyIcon 标题
// v2.2.0 #4 emoji → SVG：🥇🥈🥉 改 MedalIcon，🏆 改 TrophyIcon
// 只展示 status='open' 中的 top 3（排除 planned/done）

"use client";

import { motion } from "motion/react";
import { TrophyIcon, MedalIcon, ThumbsUpIcon, CommentIcon } from "@/components/icons";

export interface TopThreeItem {
  id: string;
  title: string;
  description: string;
  userEmail: string;
  likeCount: number;
  commentCount: number;
}

interface TopThreeProps {
  items: TopThreeItem[];
}

const CARD_BG = [
  "bg-gradient-to-br from-warning-soft/60 to-warning-soft/20 border-warning/30",
  "bg-gradient-to-br from-canvas-alt to-white border-hairline",
  "bg-gradient-to-br from-warning-soft/30 to-canvas-alt border-warning/20",
];

export function TopThree({ items }: TopThreeProps) {
  if (items.length === 0) return null;

  return (
    <section className="mb-6 sm:mb-8">
      <h2 className="text-sm font-medium text-ink-subtle uppercase tracking-wider mb-3 sm:mb-4 px-1 flex items-center gap-2">
        <TrophyIcon className="w-4 h-4 text-warning" />
        大家最想要的 TOP 3
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {items.map((item, i) => (
          <motion.article
            key={item.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.05 + i * 0.08,
              type: "spring",
              stiffness: 280,
              damping: 24,
            }}
            className={`relative rounded-2xl border-2 p-4 sm:p-5 transition-all hover:shadow-md ${CARD_BG[i]}`}
          >
            <div className="mb-2">
              <MedalIcon
                rank={((i + 1) as 1 | 2 | 3)}
                className="w-9 h-9"
              />
            </div>
            <h3 className="text-base font-semibold text-ink mb-2 line-clamp-2 leading-snug">
              {item.title}
            </h3>
            <p className="text-sm text-ink-muted line-clamp-3 mb-3 leading-relaxed">
              {item.description}
            </p>
            <div className="flex items-center justify-between pt-3 border-t border-hairline/60 text-xs text-ink-muted">
              <span className="truncate max-w-[60%]" title={item.userEmail}>
                {item.userEmail}
              </span>
              <span className="inline-flex items-center gap-2.5 shrink-0">
                <span className="inline-flex items-center gap-1">
                  <ThumbsUpIcon className="w-3 h-3" />
                  {item.likeCount}
                </span>
                <span className="inline-flex items-center gap-1">
                  <CommentIcon className="w-3 h-3" />
                  {item.commentCount}
                </span>
              </span>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
