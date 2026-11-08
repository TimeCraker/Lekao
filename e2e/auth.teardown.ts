import { existsSync, readFileSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";

/**
 * E2E 收尾：杀掉持有嵌入式 PG 的 keeper 进程树（Windows 下 taskkill /T
 * 连 postgres 一起结束；类 POSIX 用进程组信号）。残留的孤儿实例无妨——
 * 下一次 auth.global 会检测 5433 占用并复用/重建库。
 */

const HERE = __dirname;
const KEEPER_PID_FILE = resolve(HERE, ".auth/keeper.pid");
const READY_FILE = resolve(HERE, ".auth/ready.json");

async function globalTeardown() {
  if (existsSync(KEEPER_PID_FILE)) {
    const pid = Number(readFileSync(KEEPER_PID_FILE, "utf8").trim());
    if (pid) {
      try {
        if (process.platform === "win32") {
          execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" });
        } else {
          try {
            process.kill(-pid, "SIGTERM");
          } catch {
            process.kill(pid, "SIGTERM");
          }
        }
        console.log("[auth.teardown] keeper 已结束");
      } catch {
        // 已退出或已被外部清理——不视为失败
      }
    }
  }
  rmSync(READY_FILE, { force: true });
  rmSync(KEEPER_PID_FILE, { force: true });
}

export default globalTeardown;
