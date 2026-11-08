"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { SuccessBurst } from "@/components/ui/success-burst";
import { MagneticButton } from "./bento";
import { FlameIcon, SparklesIcon } from "@/components/icons";
import type { CheckinState } from "@/lib/checkin-types";

const DISPLAY_AWARDS = [2, 3, 4, 5, 6, 7, 8];

interface Props {
  initial: CheckinState;
}

type Status = "idle" | "pending" | "done";

export function CheckinCard({ initial }: Props) {
  const router = useRouter();
  const [todayCheckedIn, setTodayCheckedIn] = useState(initial.todayCheckedIn);
  const [currentStreak, setCurrentStreak] = useState(initial.currentStreakDay);
  const [todayStreakDay, setTodayStreakDay] = useState(initial.todayStreakDay);
  const [nextStreakDay, setNextStreakDay] = useState(initial.nextStreakDay);
  const [status, setStatus] = useState<Status>(
    initial.todayCheckedIn ? "done" : "idle",
  );
  const [burst, setBurst] = useState(false);
  const [flyAward, setFlyAward] = useState<number | null>(null);
  const [justSignedDay, setJustSignedDay] = useState<number | null>(null);
  // 检讫章只在「本次点击签到成功」时播放；回访已签用户不重播（ORN-07）
  const [freshStamp, setFreshStamp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckin() {
    if (status !== "idle") return;
    setStatus("pending");
    setError(null);
    try {
      const res = await fetch("/api/checkin", { method: "POST" });
      const data = await res.json();
      if (!res.ok || (!data.ok && !data.alreadyCheckedIn)) {
        throw new Error(data.error ?? "签到失败");
      }
      const signedDay = data.streakDay;
      const award = data.award;
      setFlyAward(award);
      setBurst(true);
      setJustSignedDay(signedDay);
      setTimeout(() => setBurst(false), 700);
      setTimeout(() => setFlyAward(null), 1100);
      setTimeout(() => setJustSignedDay(null), 900);
      setCurrentStreak(signedDay);
      setTodayStreakDay(signedDay);
      setTodayCheckedIn(true);
      setNextStreakDay(signedDay === 7 ? 1 : signedDay + 1);
      setFreshStamp(true);
      setStatus("done");
      router.refresh();
    } catch (e) {
      setStatus("idle");
      setError(e instanceof Error ? e.message : "签到失败");
    }
  }

  const nextAward = DISPLAY_AWARDS[nextStreakDay - 1] ?? 2;
  const streakLabel = todayCheckedIn ? todayStreakDay : currentStreak;

  return (
    <section
      className="anim-fade-up relative bg-page-dark text-ink-on-dark rounded-3xl p-7 md:p-8 overflow-visible min-h-[230px] flex flex-col"
      style={{ "--anim-delay": "0.18s" } as CSSProperties}
    >
      {/* header（2026-08-18：flex-wrap——768 平板列宽下按钮换行防溢出，PC 单行不变） */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-on-dark-muted">
            每日签到
          </div>
          <div
            className="font-serif font-semibold leading-none mt-2 flex items-baseline gap-2"
            style={{ fontSize: "clamp(2.5rem, 7vw, 4rem)" }}
          >
            <span>{streakLabel}</span>
            <span className="font-sans text-sm font-normal text-ink-on-dark-muted inline-flex items-center gap-1">
              天连签 <FlameIcon className="w-4 h-4 text-annotation" />
            </span>
          </div>
          <p className="text-xs text-ink-on-dark-muted mt-2">
            {todayCheckedIn
              ? `今日已签 · 明天可领 +${nextAward}`
              : "连签每天 +1，满 7 天重置"}
          </p>
        </div>

        {/* 磁吸签到按钮 */}
        <div className="relative">
          <AnimatePresence>
            {flyAward !== null && (
              <motion.span
                initial={{ y: 0, opacity: 0, scale: 0.8 }}
                animate={{ y: -52, opacity: [0, 1, 1, 0], scale: 1.4 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.1, ease: "easeOut" }}
                className="absolute -top-2 left-1/2 -translate-x-1/2 text-xl font-bold text-success pointer-events-none z-10 whitespace-nowrap"
              >
                +{flyAward} <SparklesIcon className="w-4 h-4 inline ml-0.5" />
              </motion.span>
            )}
          </AnimatePresence>

          <MagneticButton
            onClick={handleCheckin}
            disabled={status !== "idle"}
            className={[
              "relative w-28 h-11 rounded-2xl font-bold text-sm overflow-visible transition-colors",
              status === "done"
                ? "bg-white/10 text-ink-on-dark-muted border border-white/15 cursor-default"
                : "bg-accent text-white shadow-lg shadow-accent/40",
            ].join(" ")}
          >
            <SuccessBurst
              show={burst}
              count={8}
              color="var(--success)"
              distance={30}
            />
            {status === "pending" ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                …
              </span>
            ) : status === "done" ? (
              <span className={freshStamp ? "stamp-in" : undefined}>
                ✓ 已签
              </span>
            ) : (
              <span>签到 +{nextAward}</span>
            )}
          </MagneticButton>
        </div>
      </div>

      {/* 七日点阵 */}
      <div className="mt-auto pt-6">
        <div className="flex gap-1 sm:gap-1.5">
          {DISPLAY_AWARDS.map((award, i) => {
            const day = i + 1;
            const signed = day <= currentStreak;
            const isTodayTarget = !todayCheckedIn && day === nextStreakDay;
            const justSigned = justSignedDay === day;
            return (
              <motion.div
                key={day}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  delay: 0.25 + i * 0.04,
                  type: "spring",
                  stiffness: 300,
                }}
                className={[
                  "relative flex-1 aspect-square min-w-0 rounded-xl flex flex-col items-center justify-center transition-colors",
                  signed
                    ? "bg-accent text-white"
                    : isTodayTarget
                      ? "anim-pulse-glow border-2 border-accent text-white"
                      : "bg-white/8 text-ink-on-dark-muted border border-white/10",
                ].join(" ")}
              >
                <AnimatePresence>
                  {justSigned && (
                    <motion.div
                      initial={{ scale: 0, opacity: 1 }}
                      animate={{ scale: 1.4, opacity: 0 }}
                      transition={{ duration: 0.7 }}
                      className="absolute inset-0 rounded-xl ring-2 ring-success"
                    />
                  )}
                </AnimatePresence>
                <span className="text-[10px] font-medium opacity-80 leading-none">
                  {signed ? "✓" : `D${day}`}
                </span>
                <span className="text-xs font-bold leading-none mt-1">
                  +{award}
                </span>
              </motion.div>
            );
          })}
        </div>
        {error && <p className="text-xs text-danger-text mt-2">{error}</p>}
      </div>
    </section>
  );
}
