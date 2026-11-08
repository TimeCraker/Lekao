/**
 * 动效令牌 · 单一事实源 DESIGN.md §1.2（2026-09-29 立法）
 * 权威曲线/时长/弹簧的 TS 侧镜像；新动效一律照档选用，禁止私设曲线、弹簧与时长。
 */

/** 全站权威曲线（globals.css --ease-editorial 的镜像） */
export const EASE_PUBLICATION: [number, number, number, number] = [
  0.22, 1, 0.36, 1,
];

/** 时长三档（秒 · framer/motion 单位）：微反馈 / 常规过渡 / 大舞台表达 */
export const DURATION_FAST = 0.12;
export const DURATION_BASE = 0.2;
export const DURATION_EXPRESSIVE = 0.32;

/** 弹簧四档（收编自现网 6 套 spring，2026-09-29 定档） */
export const SPRING_LAYOUT = {
  type: "spring",
  stiffness: 380,
  damping: 30,
} as const;
export const SPRING_TAP = {
  type: "spring",
  stiffness: 400,
  damping: 17,
} as const;
export const SPRING_TILT = {
  type: "spring",
  stiffness: 150,
  damping: 18,
} as const;
export const SPRING_MAGNET = {
  type: "spring",
  stiffness: 200,
  damping: 15,
} as const;
