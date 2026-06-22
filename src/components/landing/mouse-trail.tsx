"use client";

/**
 * MouseTrail — 鼠标拖尾 Canvas（从 my-portfolio Round J 搬过来）
 *
 * 原版（my-portfolio）：signal/amber/signal-hover 三色 cream 主题
 * 当前（lekao）：accent-text (#1d4ed8) 系淡蓝三色 — 与 CTA 按钮同色系
 *  - #1d4ed8 alpha 0.75 主色（拖尾主线）
 *  - #3b82f6 alpha 0.65 副色（蓝色提亮）
 *  - #60a5fa alpha 0.55 末色（淡蓝渐隐）
 *
 * 性能：纯 Canvas 2D，0 DOM 节点；mousemove passive + RAF 节流
 * 触屏跳过（pointer:coarse 检测）
 * prefers-reduced-motion 跳过整组件
 *
 * 2026-06-22 v2.1.0+ 增量：从 my-portfolio 原样搬，只换 colors 数组
 */

import { useEffect, useRef } from "react";

const POINTS_MAX = 24;
const FADE_AGE_MS = 1500;

export function MouseTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<Array<{ x: number; y: number; t: number; color: string }>>([]);
  const rafRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // prefers-reduced-motion → 跳过（不挂 mousemove）
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };
    resize();
    window.addEventListener("resize", resize);

    // pointer:coarse（mobile / 触屏）跳过
    const isCoarse = window.matchMedia("(pointer: coarse)").matches;
    if (isCoarse) {
      return () => {
        window.removeEventListener("resize", resize);
      };
    }

    // 淡蓝主题色（accent-text #1d4ed8 系）
    const colors = [
      "rgba(29, 78, 216, 0.75)",  // accent-text 主蓝
      "rgba(59, 130, 246, 0.65)", // accent 亮蓝
      "rgba(96, 165, 250, 0.55)", // 淡蓝渐隐
    ];

    const onMove = (e: MouseEvent) => {
      const now = performance.now();
      const colorIdx = pointsRef.current.length % colors.length;
      pointsRef.current.push({
        x: e.clientX * dpr,
        y: e.clientY * dpr,
        t: now,
        color: colors[colorIdx],
      });
      while (pointsRef.current.length > POINTS_MAX) {
        pointsRef.current.shift();
      }
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    const draw = () => {
      if (!mountedRef.current) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const now = performance.now();
      const pts = pointsRef.current;

      while (pts.length > 0 && now - pts[0].t > FADE_AGE_MS) {
        pts.shift();
      }

      for (let i = 1; i < pts.length; i++) {
        const p0 = pts[i - 1];
        const p1 = pts[i];
        const ageMs = now - p1.t;
        const ageRatio = Math.max(0, 1 - ageMs / FADE_AGE_MS);
        const widthRatio = i / pts.length;
        const lineWidth = (4 * widthRatio + 0.5) * dpr * ageRatio;
        const alpha = 0.85 * ageRatio * widthRatio;

        ctx.strokeStyle = p1.color.replace(
          /[\d.]+\)$/,
          `${alpha.toFixed(3)})`,
        );
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }

      if (pts.length > 0) {
        const head = pts[pts.length - 1];
        const ageMs = now - head.t;
        const ageRatio = Math.max(0, 1 - ageMs / FADE_AGE_MS);
        const headR = 4 * dpr * ageRatio;
        ctx.fillStyle = head.color.replace(
          /[\d.]+\)$/,
          `${(0.9 * ageRatio).toFixed(3)})`,
        );
        ctx.beginPath();
        ctx.arc(head.x, head.y, headR, 0, Math.PI * 2);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      mountedRef.current = false;
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="lekao-mouse-trail"
      aria-hidden="true"
    />
  );
}
