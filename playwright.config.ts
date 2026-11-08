import { defineConfig } from "@playwright/test";

/**
 * S01 T-001 · 工作台 E2E 入口（2026-10-02 建立）
 *
 * 设计取舍：
 * - 复用本机已安装的 Edge/Chrome（`channel`，默认 msedge），不下载 Playwright 浏览器包
 *   （China 网络 + 磁盘成本）。需要其它内核时覆盖环境变量，例如
 *   `E2E_CHANNEL=chrome`；在 CI/容器里先 `pnpm exec playwright install chromium` 再设
 *   `E2E_CHANNEL=chromium`。
 * - webServer 默认跑生产构建（先 `pnpm build`）；开发期用 `E2E_DEV=1 pnpm test:e2e` 走 next dev。
 * - 本入口**暂不接入 CI**：NFR-001 的必跑门禁是 lint/typecheck/unit/contract/build；
 *   e2e 由 S03 的响应式与视觉门禁正式纳入（届时再决定 CI 内的浏览器安装方式）。
 * - AC-002/AC-004 需要已登录会话 + 隔离测试数据库，见 `e2e/dashboard-session.spec.ts` 的 fixme 说明。
 */
const PORT = Number(process.env.E2E_PORT ?? 3101);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const CHANNEL = process.env.E2E_CHANNEL ?? "msedge";
const DEV = process.env.E2E_DEV === "1";

/**
 * 隔离 E2E 数据库（S01 AC-002/AC-004 与四流程走查的登录态来源）：
 * 嵌入式 PG（e2e/.auth/pgdata，127.0.0.1:5433），由 globalSetup 的 keeper 持有，
 * 与共享生产实例（localhost:5434）零接触。URL/账号是一次性本地资源，不是秘密。
 */
const E2E_DATABASE_URL =
  "postgresql://postgres:postgres@127.0.0.1:5433/lekao_e2e";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/auth.global.ts",
  globalTeardown: "./e2e/auth.teardown.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    channel: CHANNEL,
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
    trace: "retain-on-failure",
    storageState: "e2e/.auth/state.json",
  },
  webServer: {
    command: DEV
      ? `pnpm exec next dev --port ${PORT}`
      : `pnpm exec next start --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: "ignore",
    env: {
      DATABASE_URL: E2E_DATABASE_URL,
      NEXTAUTH_URL: BASE_URL,
    },
  },
});
