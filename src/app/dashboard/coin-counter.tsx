"use client";

import { useEffect, useState } from "react";

/**
 * T-Coin 数字 count-up 动画
 * mount 后从 0 缓动到 value (一次性), 卸载时取消 RAF
 */
export function CoinCounter({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const duration = 700;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <span>{display}</span>;
}