#!/usr/bin/env node
/**
 * S01/S03 验收基建 · 自包含 E2E 环境（嵌入式 PostgreSQL）
 *
 * 为什么是嵌入式：共享 Postgres（localhost:5434）实际是生产服务器的 Docker 容器
 * （asterforge-deploy/docker-state.md: resumeaix-postgres, Up 2 months）——
 * 绝不能在它上面建测试库或测试账号。嵌入式 PG 完全跑在本机 e2e/.auth/pgdata，
 * 与共享实例**零接触**，测试产生的数据随目录一起扔掉。
 *
 * 提供：
 * - ensureE2EPostgres()：启动嵌入式 PG（幂等）→ 建 lekao_e2e 库 → 全量 schema
 *   （含 users 表）→ 标记迁移 → 播种测试账号
 * - stopE2EPostgres()：停库（Playwright globalTeardown 调用）
 * - E2E_DATABASE_URL / E2E_LOGIN_EMAIL / E2E_LOGIN_PASSWORD：连接与登录信息
 *
 * 登录走**真实 credentials 流程**（email + bcrypt），不用 mock 会话。
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { connect } from "node:net";
import { resolve } from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import bcrypt from "bcryptjs";

const ROOT = resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
const embeddedPostgresModule = require("embedded-postgres");
const EmbeddedPostgres =
  embeddedPostgresModule.default ?? embeddedPostgresModule;

// keeper 模式下把 stdout/stderr 重定向到日志文件。
// 注意要在 fd 层做（Playwright 会拒绝 spawn 的文件路径 stdio，所以由 keeper 自己转）。
// 逐 fd 容错：某些环境下 fd 1/2 可能本来就无效（EBADF），此时放弃重定向也不影响主流程。
if (process.argv.includes("--hold")) {
  const fs = await import("node:fs");
  const logPath = resolve(ROOT, "e2e/.auth/keeper.log");
  for (const fd of [1, 2]) {
    try {
      fs.closeSync(fd);
      fs.openSync(logPath, "a");
    } catch {
      try {
        fs.openSync(logPath, "a");
      } catch {
        // 连日志文件都开不了就算了，静默运行
      }
    }
  }
  const report = (err) => {
    try {
      fs.appendFileSync(
        logPath,
        `\n[keeper 崩溃] ${new Date().toISOString()}\n${err?.stack ?? String(err)}\n`,
      );
    } catch {
      /* 无论如何不要因日志而二次崩溃 */
    }
  };
  process.on("uncaughtException", (err) => {
    report(err);
    process.exit(1);
  });
  process.on("unhandledRejection", (err) => {
    report(err);
    process.exit(1);
  });
}

export const E2E_PG_PORT = 5433;
export const E2E_DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${E2E_PG_PORT}/lekao_e2e`;
export const E2E_LOGIN_EMAIL = "e2e@lekao.test";
export const E2E_LOGIN_PASSWORD = "LekaoE2E!2026";

const DATA_DIR = resolve(ROOT, "e2e/.auth/pgdata");
let pg = null;

async function prisma(args) {
  const { execFileSync } = await import("node:child_process");
  const cli = resolve(ROOT, "node_modules/prisma/build/index.js");
  try {
    execFileSync(process.execPath, [cli, ...args], {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL },
    });
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString() : "";
    console.error(`[e2e-env] prisma ${args.join(" ")} 失败：`);
    console.error(stderr.slice(0, 1500));
    throw err;
  }
}

async function executeSql(sql, url = E2E_DATABASE_URL, label) {
  const dir = resolve(ROOT, "e2e/.auth");
  mkdirSync(dir, { recursive: true });
  const file = resolve(dir, "tmp.sql");
  writeFileSync(file, sql, "utf8");
  await prisma(["db", "execute", "--url", url, "--file", file]);
  if (label) console.log(`[e2e-env] ${label}`);
}

export async function ensureE2EPostgres() {
  mkdirSync(DATA_DIR, { recursive: true });

  // 端口已被占（上一次 keeper 存活）→ 直接复用现有实例，全部用 SQL 操作
  const portBusy = await new Promise((resolvePort) => {
    const s = connect({ port: E2E_PG_PORT, host: "127.0.0.1" });
    s.setTimeout(1500);
    s.on("connect", () => {
      s.end();
      resolvePort(true);
    });
    s.on("timeout", () => {
      s.destroy();
      resolvePort(false);
    });
    s.on("error", () => resolvePort(false));
  });

  if (portBusy) {
    console.log("[e2e-env] 5433 已有实例在跑，直接复用");
  } else {
    if (!pg) {
      pg = new EmbeddedPostgres({
        databaseDir: DATA_DIR,
        user: "postgres",
        password: "postgres",
        port: E2E_PG_PORT,
        persistent: true,
      });
      if (!existsSync(resolve(DATA_DIR, "PG_VERSION"))) {
        await pg.initialise();
        console.log("[e2e-env] 嵌入式 PG 已初始化（首次）");
      }
      // 端口无监听但数据目录里有 postmaster.pid → 上次运行的孤儿锁。
      // 只在确认该 PID 确实是 postgres 进程时才清理（防 PID 复用误伤）。
      const pidFile = resolve(DATA_DIR, "postmaster.pid");
      if (existsSync(pidFile)) {
        const stalePid = Number(
          readFileSync(pidFile, "utf8").split(/\r?\n/)[0],
        );
        if (stalePid) {
          try {
            const { execSync } = await import("node:child_process");
            if (process.platform === "win32") {
              const out = execSync(
                `tasklist /FI "PID eq ${stalePid}" /FO CSV /NH`,
                { encoding: "utf8" },
              );
              if (out.toLowerCase().includes("postgres")) {
                execSync(`taskkill /PID ${stalePid} /F`, { stdio: "ignore" });
                console.log(`[e2e-env] 已清理孤儿 postgres（PID ${stalePid}）`);
              }
            } else {
              const out = execSync(`ps -p ${stalePid} -o comm=`, {
                encoding: "utf8",
              });
              if (out.includes("postgres")) {
                process.kill(stalePid);
                console.log(`[e2e-env] 已清理孤儿 postgres（PID ${stalePid}）`);
              }
            }
          } catch {
            // 进程已不存在——锁是陈旧的，直接删
          }
        }
        rmSync(pidFile, { force: true });
        rmSync(resolve(DATA_DIR, "postmaster.opts"), { force: true });
        console.log("[e2e-env] 已清除陈旧锁文件");
      }
      await pg.start();
      console.log(`[e2e-env] 嵌入式 PG 已启动: 127.0.0.1:${E2E_PG_PORT}`);
    }
  }

  const adminUrl = `postgresql://postgres:postgres@127.0.0.1:${E2E_PG_PORT}/postgres`;
  // 每次确定性重建 lekao_e2e（prisma db execute 会包事务，DROP/CREATE 必须分开跑）
  await executeSql(`DROP DATABASE IF EXISTS lekao_e2e WITH (FORCE);`, adminUrl);
  await executeSql(`CREATE DATABASE lekao_e2e;`, adminUrl, "已重建空库");

  // 全量 schema（含 users 表）+ 标记迁移 + 播种账号（全部幂等）
  await prisma([
    "migrate",
    "diff",
    "--from-empty",
    "--to-schema-datamodel",
    "prisma/schema.prisma",
    "--script",
    "--output",
    "e2e/.auth/schema.sql",
  ]);
  await prisma([
    "db",
    "execute",
    "--url",
    E2E_DATABASE_URL,
    "--file",
    "e2e/.auth/schema.sql",
  ]);

  const migrations = readdirSync(resolve(ROOT, "prisma/migrations")).filter(
    (name) => !name.startsWith(".") && name !== "migration_lock.toml",
  );
  for (const name of migrations) {
    try {
      await prisma(["migrate", "resolve", "--applied", name]);
    } catch {
      // 标记失败不影响运行时（只有 migrate CLI 关心）
    }
  }

  const hash = bcrypt.hashSync(E2E_LOGIN_PASSWORD, 10);
  const seedSql = [
    `INSERT INTO "users" ("id","email","password","name","role","tCoin","lekaoGiftCoin","banned","updatedAt")`,
    `VALUES ('e2e-user-0001','${E2E_LOGIN_EMAIL}','${hash}','测试助教','USER',50,5,false,NOW())`,
    `ON CONFLICT ("email") DO UPDATE SET "password" = EXCLUDED."password", "banned" = false;`,
  ].join(" ");
  await executeSql(seedSql);

  console.log(`[e2e-env] 隔离库就绪（lekao_e2e）· 测试账号 ${E2E_LOGIN_EMAIL}`);

  // keeper 模式：写 ready 文件供 globalSetup 轮询
  if (process.argv.includes("--hold")) {
    writeFileSync(
      resolve(ROOT, "e2e/.auth/ready.json"),
      JSON.stringify({ pid: process.pid, port: E2E_PG_PORT }),
    );
    console.log("[e2e-env] keeper 就绪（--hold，等待 teardown 结束）");
    await new Promise(() => {}); // 持有 PG 直到被 teardown 杀掉
  }
}

export async function stopE2EPostgres() {
  if (pg) {
    await pg.stop();
    pg = null;
    console.log("[e2e-env] 嵌入式 PG 已停止");
  }
}

// CLI：node scripts/e2e-env.mjs up|down
if (process.argv[1] && process.argv[1].endsWith("e2e-env.mjs")) {
  const cmd = process.argv[2] ?? "up";
  if (cmd === "up") {
    await ensureE2EPostgres();
  } else if (cmd === "down") {
    await stopE2EPostgres();
  }
}
