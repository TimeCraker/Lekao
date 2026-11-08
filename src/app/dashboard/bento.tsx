"use client";

/**
 * Bento 动效工具组件（cinematic-frontend 基石）
 * - TiltCard: 鼠标视差 3D 倾斜（spring lerp，reduced-motion 降级）
 * - MagneticButton: 磁吸位移（鼠标靠近按钮被吸过去）
 * - HeroGreeting: 字符级 stagger 入场（字号悬殊 + 逐字 spring）
 */
import { useRef, type ReactNode, type MouseEvent } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useReducedMotion } from "@/lib/hooks/motion";
import { SPRING_TILT, SPRING_MAGNET } from "@/lib/motion-tokens";

/* ───────────────────────── TiltCard ─────────────────────────
 * 鼠标在卡内移动 → 卡片绕 X/Y 轴轻微旋转（透视 900px）
 * spring stiffness 150 / damping 18 = cinematic lerp，不 snap
 * reduced-motion → 不旋转（仅保留 hover 阴影由 className 控制）
 */
export function TiltCard({
  children,
  className,
  intensity = 6,
}: {
  children: ReactNode;
  className?: string;
  intensity?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateX = useSpring(
    useTransform(py, [0, 1], [intensity, -intensity]),
    SPRING_TILT,
  );
  const rotateY = useSpring(
    useTransform(px, [0, 1], [-intensity, intensity]),
    SPRING_TILT,
  );

  function onMove(e: MouseEvent<HTMLDivElement>) {
    if (reduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
  }
  function onLeave() {
    px.set(0.5);
    py.set(0.5);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        rotateX: reduced ? 0 : rotateX,
        rotateY: reduced ? 0 : rotateY,
        transformStyle: "preserve-3d",
        transformPerspective: 900,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ───────────────────────── MagneticButton ─────────────────────────
 * 鼠标在按钮附近 → 按钮被吸引位移（最大 30% 偏移）
 * spring stiffness 200 / damping 15
 */
export function MagneticButton({
  children,
  className,
  disabled,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, SPRING_MAGNET);
  const sy = useSpring(y, SPRING_MAGNET);

  function onMove(e: MouseEvent<HTMLButtonElement>) {
    if (reduced || disabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left - rect.width / 2) * 0.3);
    y.set((e.clientY - rect.top - rect.height / 2) * 0.3);
  }
  function reset() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={{ x: sx, y: sy }}
      className={`focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${className}`}
    >
      {children}
    </motion.button>
  );
}

/* ───────────────────────── HeroGreeting ─────────────────────────
 * 文本按字符 stagger 入场（每字 y:24→0 + opacity，delay 0.03*i）
 * accent 段（如用户名）用 brand 色
 */
export function HeroGreeting({
  prefix,
  name,
  delay = 0.1,
}: {
  prefix: string;
  name: string;
  delay?: number;
}) {
  const chars = (prefix + " " + name).split("");
  let consumed = 0;
  return (
    <h1
      className="font-serif font-semibold text-ink leading-[0.95] tracking-tight"
      style={{ fontSize: "clamp(2.5rem, 8vw, 5.5rem)" }}
    >
      {chars.map((c, i) => {
        const isNameChar = i >= prefix.length; // 含 prefix 后那个空格之后
        const node = (
          <motion.span
            key={i}
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              delay: delay + consumed * 0.028,
              ...SPRING_MAGNET,
            }}
            className={`inline-block ${isNameChar ? "text-ink" : "text-ink-muted"}`}
          >
            {c === " " ? " " : c}
          </motion.span>
        );
        consumed++;
        return node;
      })}
    </h1>
  );
}
