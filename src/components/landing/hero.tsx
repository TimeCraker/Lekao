"use client";

import Link from "next/link";
import { motion, type Variants } from "motion/react";
import { MeshGradientBg } from "./mesh-gradient";
import { HeroTitle } from "./hero-title";

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

export function Hero() {
  return (
    <section className="relative min-h-[88vh] flex items-center justify-center overflow-hidden">
      {/* 流体 mesh gradient 背景 (scoped 到容器) */}
      <MeshGradientBg />

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

        {/* 巨型 H1 · 字符级 3D */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={1}
        >
          <HeroTitle>拒绝重复冗余的操作</HeroTitle>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={2}
          className="mt-8 text-xl md:text-2xl text-ink-muted max-w-2xl mx-auto leading-relaxed"
        >
          AI 智能助手，专为培训机构设计
          <br />
          让助教从抄错题、写小结、写反馈的重复冗余工作里解放出来
        </motion.p>

        {/* CTA */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={3}
          className="mt-12 flex flex-wrap items-center justify-center gap-4"
        >
          <Link
            href="/register"
            className="group px-8 py-3.5 bg-accent-text text-white text-base font-medium rounded-xl hover:bg-accent-hover transition shadow-md hover:shadow-lg flex items-center gap-2"
          >
            免费开始 · 送 5 T-Coin
            <span className="inline-block transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>
          <Link
            href="#features"
            className="px-8 py-3.5 bg-white/60 backdrop-blur-sm border border-hairline text-ink text-base font-medium rounded-xl hover:bg-white hover:border-accent/40 transition"
          >
            查看演示
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
      </div>
    </section>
  );
}
