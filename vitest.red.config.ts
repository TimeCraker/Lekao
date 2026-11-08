import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * S01 T-001 · 特征测试套件（红灯 → 已全部转绿）
 *
 * 生命周期：本套件承载「规格要求、但当前尚未实现」的断言，给对应 Task 提供最短失败证据。
 * 现状（2026-10-02，T-002/T-007 完成后）：两个文件均已转绿，不再有红灯项；
 * 保留为**出口契约守卫**（计费三态 API 必须挂在 @/lib/coin、能力真值必须存在且字段齐全）。
 * 后续 Stage 若需要新的红灯证据，继续放进 tests/red/**。
 *
 * 为什么不并入 `pnpm test`：`pnpm test` 是 CI 硬门槛必须常绿，红灯证据不能进门槛套件。
 * 运行：`pnpm test:red`
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/red/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
