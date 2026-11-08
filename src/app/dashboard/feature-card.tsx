"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  MistakeIcon,
  SummaryIcon,
  FeedbackIcon,
  WeekendIcon,
  CoinIcon,
  FreeIcon,
  ArrowRightIcon,
} from "@/components/icons";
import { TiltCard } from "./bento";

type FeatureIcon = React.ComponentType<{ className?: string }>;
type FeatureTag = { type: "free" | "coin"; label: string };
type IconName = "mistake" | "weekend" | "summary" | "feedback";

const ICONS: Record<IconName, FeatureIcon> = {
  mistake: MistakeIcon,
  weekend: WeekendIcon,
  summary: SummaryIcon,
  feedback: FeedbackIcon,
};

interface Props {
  iconName: IconName;
  title: string;
  description: string;
  href: string;
  tag: FeatureTag;
  primary?: boolean;
  index: number;
}

function Tag({ tag }: { tag: FeatureTag }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full font-mono uppercase tracking-wider ${
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
  );
}

export function FeatureCard({
  iconName,
  title,
  description,
  href,
  tag,
  primary,
  index,
}: Props) {
  const Icon = ICONS[iconName];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.2 + index * 0.08,
        type: "spring",
        stiffness: 120,
        damping: 18,
      }}
      className="h-full"
    >
      <TiltCard intensity={primary ? 4 : 6} className="h-full">
        <Link
          href={href}
          className={`group relative block h-full bg-white border rounded-3xl overflow-hidden transition-colors duration-300 ${
            primary
              ? "p-7 md:p-8 border-accent/40 shadow-md shadow-accent/10"
              : "p-6 border-hairline hover:border-accent/40"
          }`}
        >
          {/* hover 光晕 */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-accent-soft/50 via-transparent to-transparent pointer-events-none" />
          <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-accent/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

          {primary && (
            <span className="absolute top-5 right-5 text-[10px] font-mono uppercase tracking-[0.18em] px-2 py-0.5 rounded-full bg-accent text-white z-10">
              ★ 主推
            </span>
          )}

          <div
            className={`relative h-full flex flex-col ${
              primary ? "md:flex-row md:items-start md:gap-8" : ""
            }`}
            style={{ transform: "translateZ(35px)" }}
          >
            <div className="flex-1 min-w-0">
              <div
                className={`rounded-2xl bg-accent-soft flex items-center justify-center mb-5 group-hover:bg-accent-text group-hover:scale-110 group-hover:rotate-[6deg] transition-all duration-300 ${
                  primary ? "w-14 h-14" : "w-12 h-12"
                }`}
              >
                <Icon
                  className={`text-accent-text group-hover:text-white transition-colors duration-300 ${
                    primary ? "w-7 h-7" : "w-6 h-6"
                  }`}
                />
              </div>

              <h2
                className={`font-serif font-semibold text-ink group-hover:text-accent-ink transition-colors leading-tight ${
                  primary ? "text-2xl md:text-3xl" : "text-xl"
                }`}
              >
                {title}
              </h2>
              <p className="text-sm text-ink-muted leading-relaxed mt-2 mb-5">
                {description}
              </p>
            </div>

            <div
              className={`flex items-center justify-between pt-4 border-t border-hairline/60 ${
                primary
                  ? "md:w-40 md:flex-col md:items-start md:gap-3 md:border-l md:border-t-0 md:pl-6 md:pt-0"
                  : ""
              }`}
            >
              <Tag tag={tag} />
              <span className="text-accent-text text-xs font-medium inline-flex items-center gap-1 opacity-60 group-hover:opacity-100 group-hover:gap-1.5 transition-all">
                开始
                <ArrowRightIcon className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </div>
        </Link>
      </TiltCard>
    </motion.div>
  );
}
