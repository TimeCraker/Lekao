/**
 * S04 T-405 · 批量交付队列
 *
 * 目标：几十份文档逐个生成/写盘时不能把主线程卡死、也不能因为一份失败就全批中止。
 * - `yieldToBrowser()`：每份之间让出主线程（0ms 定时器，让 React 有机会渲染进度）
 * - `runBatch()`：串行执行 + 错误隔离（一份失败记为 error，继续下一份）+ 进度回调
 */

/** 让出主线程一次（浏览器与 vitest 里都可用） */
export function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

export interface BatchItemResult<T, R> {
  index: number;
  item: T;
  ok: boolean;
  value?: R;
  error?: string;
}

export interface RunBatchOptions<T> {
  /** 每完成一项回调（含失败项），用于进度显示 */
  onProgress?: (done: number, total: number, item: T) => void;
  /** 两份之间的让出（默认 yieldToBrowser；测试可注入立即 resolve） */
  yieldFn?: () => Promise<void>;
}

/**
 * 串行批处理：按顺序执行 worker，一份失败不影响后续。
 * 返回逐项结果（含成功值与错误消息），顺序与输入一致。
 */
export async function runBatch<T, R>(
  items: T[],
  worker: (item: T, index: number) => Promise<R>,
  options: RunBatchOptions<T> = {},
): Promise<BatchItemResult<T, R>[]> {
  const yieldFn = options.yieldFn ?? yieldToBrowser;
  const results: BatchItemResult<T, R>[] = [];

  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    try {
      const value = await worker(item, index);
      results.push({ index, item, ok: true, value });
    } catch (err) {
      results.push({
        index,
        item,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    options.onProgress?.(index + 1, items.length, item);
    // 最后一份之后不必再让出
    if (index < items.length - 1) {
      await yieldFn();
    }
  }

  return results;
}
