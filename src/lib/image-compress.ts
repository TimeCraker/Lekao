"use client";

/**
 * 图片批量压缩工具（2026-06-22 v2 升级）
 *
 * 设计目标（PRD §3.5.5 + 低配设备优化）：
 * 1. 并发上限 2 — 避免 5 张 20MB 讲义同时压爆低端手机内存
 * 2. 移动端自动降级（长边 1280px + 质量 0.8） — 老手机 CPU 跑得动
 * 3. 桌面端保留高清（长边 1920px + 质量 0.85）
 * 4. 进度回调 onProgress(current, total) — UI 显示 "正在压缩 2/5"
 * 5. iOS Safari / createImageBitmap 失败 — fallback 降到 50% 目标 + 关 Worker
 *
 * 适用：错题集 qnumber-slot + 课堂小结/反馈 uploader
 */

import imageCompression from "browser-image-compression";

// ============================================
// 配置常量
// ============================================
const DEFAULT_MAX_PARALLEL = 2;
const MAX_WIDTH_DESKTOP = 1920;
const MAX_WIDTH_MOBILE = 1280;
const MAX_SIZE_MB_DESKTOP = 0.5;
const MAX_SIZE_MB_MOBILE = 0.4;
const QUALITY_DESKTOP = 0.85;
const QUALITY_MOBILE = 0.8;

export type CompressOptions = {
  /** 进度回调：current = 已完成数, total = 总数 */
  onProgress?: (current: number, total: number) => void;
  /** 中止信号（可选）*/
  signal?: AbortSignal;
  /** 自定义并发上限（默认 2）*/
  maxParallel?: number;
};

// ============================================
// 设备检测
// ============================================

/**
 * 移动端检测（iOS / Android / iPad 等）
 *
 * 为什么不直接用 matchMedia('(pointer: coarse)')：平板外接鼠标也可能是 coarse
 * 这里按 user-agent 更准
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mobile|iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

// ============================================
// 单张压缩（带 fallback）
// ============================================

async function compressOne(
  blob: File | Blob,
  isMobile: boolean,
): Promise<Blob> {
  const maxSizeMB = isMobile ? MAX_SIZE_MB_MOBILE : MAX_SIZE_MB_DESKTOP;
  const maxWidthOrHeight = isMobile ? MAX_WIDTH_MOBILE : MAX_WIDTH_DESKTOP;
  const initialQuality = isMobile ? QUALITY_MOBILE : QUALITY_DESKTOP;

  // 已经 ≤ 目标大小且是 jpeg → 跳过（节省 CPU）
  if (blob.size <= maxSizeMB * 1024 * 1024 && blob.type === "image/jpeg") {
    return blob;
  }

  // 第一次压缩（在 Web Worker 跑）
  try {
    const compressed = await imageCompression(blob as File, {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker: true,
      fileType: "image/jpeg",
      initialQuality,
    });
    return compressed;
  } catch (err) {
    // ⭐ iOS Safari 偶尔 createImageBitmap 失败 / 内存不足 → fallback
    console.warn("[image-compress] 第一次压缩失败，尝试降级:", err);
    try {
      const compressed = await imageCompression(blob as File, {
        maxSizeMB: maxSizeMB * 0.5, // 目标再降一半
        maxWidthOrHeight: Math.round(maxWidthOrHeight * 0.75),
        useWebWorker: false, // 关 Worker（主线程执行，避免 worker 启动失败）
        fileType: "image/jpeg",
        initialQuality: 0.7,
      });
      return compressed;
    } catch (err2) {
      console.error("[image-compress] 降级也失败:", err2);
      throw new Error(
        `图片压缩失败（${err2 instanceof Error ? err2.message : "未知原因"}）`,
      );
    }
  }
}

// ============================================
// 并发队列
// ============================================

/**
 * 简易并发队列（手写 p-limit 风格，避免新增依赖）
 *
 * @param items 待处理项
 * @param limit 最大并发数
 * @param fn 处理函数
 * @param onProgress 完成回调
 */
async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
  onProgress?: (current: number, total: number) => void,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  let completed = 0;
  const total = items.length;

  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
      completed++;
      onProgress?.(completed, total);
    }
  }

  const laneCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: laneCount }, () => worker()));
  return results;
}

// ============================================
// 主入口
// ============================================

/**
 * 批量压缩图片（带并发限制 + 移动端降级 + 进度回调 + iOS fallback）
 *
 * @example
 *   await compressImages([file1, file2, file3], {
 *     onProgress: (cur, total) => console.log(`压缩中 ${cur}/${total}`),
 *   });
 */
export async function compressImages(
  files: (File | Blob)[],
  opts: CompressOptions = {},
): Promise<Blob[]> {
  const { onProgress, maxParallel = DEFAULT_MAX_PARALLEL } = opts;
  const isMobile = isMobileDevice();
  const total = files.length;

  onProgress?.(0, total);
  if (total === 0) return [];

  return runWithConcurrency(
    files,
    maxParallel,
    (file) => compressOne(file, isMobile),
    onProgress,
  );
}

/**
 * 压缩单张（兼容旧 API）
 *
 * 用法：替换原来的 compressImage 调用
 */
export async function compressOneImage(file: File | Blob): Promise<Blob> {
  return compressOne(file, isMobileDevice());
}
