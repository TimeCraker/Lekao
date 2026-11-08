import { spawn } from "node:child_process";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { connect } from "node:net";
import { resolve } from "node:path";
import process from "node:process";
import { request } from "@playwright/test";

/**
 * E2E 全局登录：拉起分离 keeper（持有嵌入式 PG）→ 轮询就绪 →
 * 走应用**真实登录端点**（csrf → credentials callback）换取会话 → storageState。
 * 不 mock 会话、不伪造 Cookie。
 */

const HERE = __dirname; // Playwright 以 CJS 转译本文件，__dirname 可用
const ROOT = resolve(HERE, "..");
const STATE_FILE = resolve(HERE, ".auth/state.json");
const READY_FILE = resolve(HERE, ".auth/ready.json");
const KEEPER_PID_FILE = resolve(HERE, ".auth/keeper.pid");
const BASE_URL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3101";
const EMAIL = "e2e@lekao.test";
const PASSWORD = "LekaoE2E!2026";

function waitForPort(port: number, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  return new Promise<void>((resolveDone, rejectDone) => {
    const tryOnce = () => {
      const s = connect({ port, host: "127.0.0.1" });
      s.setTimeout(1500);
      s.on("connect", () => {
        s.end();
        resolveDone();
      });
      s.on("timeout", () => {
        s.destroy();
        retry();
      });
      s.on("error", () => retry());
    };
    const retry = () => {
      if (Date.now() > deadline) {
        rejectDone(new Error(`等待端口 ${port} 超时`));
        return;
      }
      setTimeout(tryOnce, 500);
    };
    tryOnce();
  });
}

async function globalSetup() {
  rmSync(READY_FILE, { force: true });

  // 1) 分离 keeper：持有嵌入式 PG 贯穿整个测试期（本进程随后要退出）。
  //    keeper 内部会把输出重定向到 e2e/.auth/keeper.log（Playwright 拒绝文件路径 stdio）
  const keeper = spawn(
    process.execPath,
    [resolve(ROOT, "scripts/e2e-env.mjs"), "up", "--hold"],
    { detached: true, cwd: ROOT, stdio: "ignore" },
  );
  keeper.unref();
  rmSync(KEEPER_PID_FILE, { force: true });
  writeFileSync(KEEPER_PID_FILE, String(keeper.pid));

  // 2) 轮询 ready（建库 + 播种完成）
  const deadline = Date.now() + 90_000;
  while (!existsSync(READY_FILE)) {
    if (Date.now() > deadline) {
      throw new Error("keeper 90 秒内未就绪");
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  await waitForPort(5433, 30_000);

  // 3) 真实登录 → storageState
  const ctx = await request.newContext({ baseURL: BASE_URL });
  const csrfRes = await ctx.get("/api/auth/csrf");
  const { csrfToken } = (await csrfRes.json()) ?? {};
  if (!csrfToken) throw new Error("拿不到 csrfToken（webServer 是否已就绪？）");

  const loginRes = await ctx.post("/api/auth/callback/credentials", {
    form: {
      csrfToken,
      email: EMAIL,
      password: PASSWORD,
      callbackUrl: BASE_URL,
    },
  });
  if (!loginRes.ok()) {
    throw new Error(`登录失败：HTTP ${loginRes.status()}（检查隔离库与账号）`);
  }

  const cookies = (await ctx.storageState()).cookies;
  if (!cookies.some((c) => c.name.includes("next-auth.session-token"))) {
    throw new Error(
      "登录后没有 next-auth 会话 Cookie（凭据或 NEXTAUTH_URL 不匹配）",
    );
  }

  await ctx.storageState({ path: STATE_FILE });
  await ctx.dispose();
  console.log("[auth.global] 已登录并写入 storageState");
}

export default globalSetup;
