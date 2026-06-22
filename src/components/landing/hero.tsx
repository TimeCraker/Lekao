"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, type Variants } from "motion/react";
import { MeshGradientBg } from "./mesh-gradient";
import { HeroTitle } from "./hero-title";
import { MouseTrail } from "./mouse-trail";
import { ArrowRightIcon, FreeIcon } from "@/components/icons";

const ACCOUNT_KEY = "lekao-account-exists";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.15 + i * 0.08,
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  }),
};

/**
 * fadeUpSSR — 同 fadeUp 视觉，但 SSR 保留可见文本（opacity:1）确保 SEO 抓取
 * 入场动画仍由浏览器 client mount 时 motion 自动接管（hidden → show）
 * 关键：initial 不预隐藏，避免 SSR HTML 丢失关键词
 */

export function Hero() {
  const [freeStartHref, setFreeStartHref] = useState("/register");

  useEffect(() => {
    const has = localStorage.getItem(ACCOUNT_KEY) === "true";
    setFreeStartHref(has ? "/login" : "/register");
  }, []);

  return (
    <section className="relative min-h-[88vh] flex items-center justify-center overflow-hidden">
      <MeshGradientBg />
      {/* 鼠标拖尾（桌面端，淡蓝色系）— 2026-06-22 从 my-portfolio 搬 */}
      <MouseTrail />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-32 text-center">
        {/* Badge */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0}
          className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/60 backdrop-blur-sm border border-hairline rounded-full text-sm text-ink-mute mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          Lekao Agent · 内测中
        </motion.div>

        {/* 巨型 H1：主标（视觉锤，整段 fadeUp 浮现） */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={1}
        >
          <HeroTitle>AI 智能助教助手</HeroTitle>
        </motion.div>

        {/* 副标 2 行对仗（用户原话："帮你提高效率 / 节省冗余工作"） */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={2}
          className="mt-8 text-xl md:text-2xl text-ink-muted max-w-2xl mx-auto leading-relaxed space-y-2"
        >
          <p>帮你提高效率</p>
          <p>节省冗余工作</p>
        </motion.div>

        {/* CTA */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={3}
          className="mt-12 flex flex-wrap items-center justify-center gap-4"
        >
          <Link
            href="/login"
            className="group px-8 py-3.5 bg-accent-text text-white text-base font-medium rounded-xl hover:bg-accent-hover transition shadow-md hover:shadow-lg flex items-center gap-2"
          >
            登录
            <ArrowRightIcon className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href={freeStartHref}
            className="px-8 py-3.5 bg-white/60 backdrop-blur-sm border border-hairline text-ink text-base font-medium rounded-xl hover:bg-white hover:border-accent/40 transition flex items-center gap-2"
          >
            <FreeIcon className="w-4 h-4 text-accent-text" />
            免费开始 · 送 5 T-Coin
          </Link>
        </motion.div>

        {/* Trust signal */}
        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={4}
          className="mt-10 text-sm text-ink-subtle"
        >
          注册即送 5 枚 T-Coin · 永久免费基础功能
        </motion.p>

        {/* 作者联系入口 — 2026-06-22 v2.1.0+ 新增（用户原话：主页最好有联系方式） */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={5}
          className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-ink-subtle"
        >
          <span>联系作者：</span>
          <a
            href="https://asterforge.top"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-accent-text transition-colors"
          >
            个人主页 asterforge.top
            <ArrowRightIcon className="w-3 h-3" />
          </a>
          <span className="text-ink-muted/40">·</span>
          <a
            href="https://github.com/TimeCraker/Lekao"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-accent-text transition-colors"
          >
            GitHub 项目源码
            <ArrowRightIcon className="w-3 h-3" />
          </a>
          <span className="text-ink-muted/40">·</span>
          <a
            href="mailto:timecraker@foxmail.com"
            className="inline-flex items-center gap-1 hover:text-accent-text transition-colors"
          >
            timecraker@foxmail.com
          </a>
        </motion.div>
      </div>
    </section>
  );
}
