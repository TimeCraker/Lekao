"use client";

import { useRef, useState, useEffect } from "react";
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
 *
 * 2026-06-22 收尾：触屏设备禁用 3D tilt（移动端 mouseX 永远是 0，没意义且浪费 GPU）
 * 2026-06-22 v2.0.0+: 字符级入场动画（mount 时 y/opacity/rotateX 错位升起）
 *  - 与 mouseX-driven rotateY 不冲突（rotateX 是一次性，rotateY 是 motionValue）
 *  - stagger 0.04s 字符间延迟
 */
export function HeroTitle({ children }: HeroTitleProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  const mouseX = useMotionValue(0);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // 触屏检测（pointer: coarse = 触屏设备）
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
    <h1
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      // 2026-06-22：移动端字号下限 40px（小屏字号过大挤）
      className="text-[clamp(40px,9vw,144px)] font-bold leading-[1.05] tracking-tight text-ink select-none"
      style={{ perspective: "1000px" }}
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
    </h1>
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
  // 中间字符更敏感, 两端衰减
  const distance = Math.abs(index - (total - 1) / 2) / Math.max((total - 1) / 2, 1);
  const factor = 1 - distance * 0.6; // 中间 1.0, 两端 0.4
  const maxDeg = 15 * factor; // 中间 ±15°, 两端 ±6°

  const rotateY = useTransform(mouseX, [-0.5, 0, 0.5], [-maxDeg, 0, maxDeg]);

  // 触屏设备不应用 3D transform，节省 GPU
  if (isTouchDevice) {
    return (
      <span style={{ display: "inline-block" }}>
        {char === " " ? " " : char}
      </span>
    );
  }

  return (
    <motion.span
      // 入场：y 升起 + opacity 0→1 + rotateX 从 -30° 翻平
      // 与 style.rotateY (motionValue) 不冲突：rotateX 一次性，rotateY 持续
      initial={{ y: 28, opacity: 0, rotateX: -30 }}
      animate={{ y: 0, opacity: 1, rotateX: 0 }}
      transition={{
        delay: 0.1 + index * 0.04,
        duration: 0.55,
        ease: [0.22, 1, 0.36, 1],
      }}
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
