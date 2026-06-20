"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  type MotionValue,
} from "motion/react";

interface HeroTitleProps {
  children: string;
}

/**
 * PRD §3.5.1 HeroTitle 字符级 3D rotateY
 * ±15° (比 my-portfolio ±30° 轻), 鼠标静止 → 归零 (符合 Hard Rules #2)
 * prefers-reduced-motion → CSS 媒体查询自动禁用 (globals.css)
 */
export function HeroTitle({ children }: HeroTitleProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  const mouseX = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    mouseX.set(x);
  };

  const handleMouseLeave = () => mouseX.set(0);

  const chars = Array.from(children);

  return (
    <h1
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="text-[clamp(56px,9vw,144px)] font-bold leading-[1.05] tracking-tight text-ink select-none"
      style={{ perspective: "1000px" }}
    >
      {chars.map((char, i) => (
        <CharSpan
          key={i}
          char={char}
          mouseX={mouseX}
          index={i}
          total={chars.length}
        />
      ))}
    </h1>
  );
}

function CharSpan({
  char,
  mouseX,
  index,
  total,
}: {
  char: string;
  mouseX: MotionValue<number>;
  index: number;
  total: number;
}) {
  // 中间字符更敏感, 两端衰减
  const distance = Math.abs(index - (total - 1) / 2) / Math.max((total - 1) / 2, 1);
  const factor = 1 - distance * 0.6; // 中间 1.0, 两端 0.4
  const maxDeg = 15 * factor; // 中间 ±15°, 两端 ±6°

  const rotateY = useTransform(mouseX, [-0.5, 0, 0.5], [-maxDeg, 0, maxDeg]);

  return (
    <motion.span
      style={{
        rotateY,
        display: "inline-block",
        transformStyle: "preserve-3d",
      }}
      className="will-change-transform"
    >
      {char === " " ? " " : char}
    </motion.span>
  );
}