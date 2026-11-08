"use client";

import { useEffect, useRef, useState } from "react";

/**
 * T-Coin 数字 count-up 动画
 * - mount 时从 0 缓动到 value（一次性）
 * - value 变化时（如签到后）从当前显示值平滑滚到新 value，不闪
 * - 卸载时取消 RAF
 */
export function CoinCounter({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);

  useEffect(() => {
    let raf: number;
    const from = displayRef.current;
    const start = performance.now();
    const duration = 700;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const v = Math.round(from + (value - from) * eased);
      setDisplay(v);
      displayRef.current = v;
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <span>{display}</span>;
}
