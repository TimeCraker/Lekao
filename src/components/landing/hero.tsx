"use client";

import Link from "next/link";
import { useRef } from "react";
import { useLocalStorageValue } from "@/lib/hooks/local-storage";
import { motion, useScroll, useTransform, type Variants } from "motion/react";
import { EASE_PUBLICATION } from "@/lib/motion-tokens";
import { HeroTitle } from "./hero-title";
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
      ease: EASE_PUBLICATION,
    },
  }),
};

export function Hero() {
  // SSR 首帧恒 /register；hydration 后按 localStorage 校正（不写 effect setState）
  const accountExists = useLocalStorageValue(ACCOUNT_KEY);
  const freeStartHref = accountExists === "true" ? "/login" : "/register";
  const sectionRef = useRef<HTMLElement>(null);

  // 「00」水印视差：滚出时慢移上 + 淡出
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const watermarkY = useTransform(scrollYProgress, [0, 1], [0, -140]);
  const watermarkOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[88vh] flex items-center overflow-hidden bg-canvas"
    >
      {/* 质感层走全局 grain（ORN-09）；此处原局部点阵已按 DESIGN.md ORN-11 深色舞台专用规则移除 */}
      {/* 巨型衬线「00」水印 · 视差慢移 */}
      <motion.span
        style={{ y: watermarkY, opacity: watermarkOpacity }}
        className="absolute -top-8 -right-6 md:right-10 font-serif font-semibold text-ink/[0.035] select-none pointer-events-none leading-none"
        // fontSize 在下方 style 注入（与 motion style 合并）
      >
        <span style={{ fontSize: "clamp(12rem, 32vw, 30rem)" }}>00</span>
      </motion.span>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 md:px-12 py-20 md:py-24">
        {/* 编辑栏 */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0}
          className="flex items-center gap-3 mb-8 md:mb-10"
        >
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent-text">
            给助教提供的 AI 日常工作流程简化的工作台
          </span>
          <span className="h-px flex-1 max-w-[180px] bg-hairline" />
        </motion.div>

        {/* 巨型衬线标题 */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={1}
        >
          <HeroTitle>错题本，不再一道道粘贴</HeroTitle>
        </motion.div>

        {/* 衬线副标 */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={2}
          className="mt-6 font-serif text-ink leading-tight max-w-2xl"
          style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)" }}
        >
          上传全班的作业图片和表格，
          <br />
          <span className="text-ink-muted italic">
            Lekao Agent 自动汇总共同错题，生成 Word 错题本。
          </span>
        </motion.div>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={3}
          className="mt-4 text-base text-ink-muted max-w-lg leading-relaxed"
        >
          课堂小结、作业反馈、周末错题反馈表，也在这里直接生成。
        </motion.p>

        {/* CTA */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={4}
          className="mt-8 flex flex-wrap items-center gap-3"
        >
          <Link
            href={freeStartHref}
            className="group px-8 py-4 bg-accent-text text-white text-base font-medium rounded-xl hover:bg-accent-hover transition shadow-lg shadow-accent/25 hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2"
          >
            <FreeIcon className="w-4 h-4" />
            免费开始
            <ArrowRightIcon className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/login"
            className="px-8 py-4 bg-white border border-hairline text-ink text-base font-medium rounded-xl hover:border-accent/40 hover:bg-canvas-alt transition flex items-center gap-2"
          >
            登录
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
