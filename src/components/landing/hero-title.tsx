"use client";

import { useRef, useState, useEffect } from "react";
import {
  motion,
  useMotionValue,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";

interface HeroTitleProps {
  children: string;
}

/**
 * HeroTitle — 巨型排版字符级 3D rotateY + 整段浮现入场 + 滚走淡出
 *
 * 2026-06-22 v2.1.0+ 重构：
 *  - 入场：去掉 per-char stagger 0.04s（用户反馈"一个字一个字翻上来太繁琐"）
 *  - 改为整段 fadeUp（外层 hero.tsx 的 fadeUp variants 控制）
 *  - 内部仍保留 mouseX-driven rotateY ±15° 字符级 3D 交互
 *  - 新增 useScroll 监听 hero 容器在视口的位置，滚走时整段 fadeOut + y 上移
 *  - 触屏设备不应用 3D tilt
 *  - prefers-reduced-motion → CSS 自动禁用 rotateY + JS 跳过 scroll fade
 */
export function HeroTitle({ children }: HeroTitleProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  const mouseX = useMotionValue(0);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // 整段滚走淡出（基于 hero section 在视口的可见度）
  // element scroll progress: 0=刚进视口 1=完全滚出
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const opacityOut = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const yOut = useTransform(scrollYProgress, [0, 0.7], [0, -40]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsTouchDevice(!window.matchMedia("(pointer: fine)").matches);
    }
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isTouchDevice) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    mouseX.set(x);
  };

  const handleMouseLeave = () => mouseX.set(0);

  const chars = Array.from(children);

  return (
    <motion.h1
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      // 桌面端强制单行（避免"AI 智能助教助手"最后"手"字单独换行）；移动端允许自动换行
      // 2026-06-22 修复：用户反馈 H1 拆两排很丑
      className="text-[clamp(40px,9vw,128px)] font-bold leading-[1.05] tracking-tight text-ink select-none md:whitespace-nowrap"
      style={{ perspective: "1000px", opacity: opacityOut, y: yOut }}
    >
      {chars.map((char, i) => (
        <CharSpan
          key={i}
          char={char}
          mouseX={mouseX}
          index={i}
          total={chars.length}
          isTouchDevice={isTouchDevice}
        />
      ))}
    </motion.h1>
  );
}

function CharSpan({
  char,
  mouseX,
  index,
  total,
  isTouchDevice,
}: {
  char: string;
  mouseX: MotionValue<number>;
  index: number;
  total: number;
  isTouchDevice: boolean;
}) {
  const distance = Math.abs(index - (total - 1) / 2) / Math.max((total - 1) / 2, 1);
  const factor = 1 - distance * 0.6;
  const maxDeg = 15 * factor;

  const rotateY = useTransform(mouseX, [-0.5, 0, 0.5], [-maxDeg, 0, maxDeg]);

  if (isTouchDevice) {
    return (
      <span style={{ display: "inline-block" }}>
        {char === " " ? " " : char}
      </span>
    );
  }

  return (
    <motion.span
      // 入场不再做逐字 stagger：跟随外层 hero.tsx 的 fadeUp variants 整段浮现
      // 内部只保留 mouseX-driven rotateY 字符级 3D 交互
      style={{
        rotateY,
        display: "inline-block",
        transformStyle: "preserve-3d",
      }}
      className="will-change-transform"
    >
      {char === " " ? " " : char}
    </motion.span>
  );
}
