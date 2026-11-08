import Redis from "ioredis";

// ============================================
// ioredis 单例（Next.js dev HMR 避免重连耗尽）
// ============================================
// Redis 容器在腾讯云 :6380（与 ResumeAIX 共享）
// 生产 .env 必须有 REDIS_URL=redis://localhost:6380

const globalForRedis = globalThis as unknown as {
  lekaoRedis: Redis | undefined;
};

export const redis =
  globalForRedis.lekaoRedis ??
  new Redis(process.env.REDIS_URL ?? "redis://localhost:6380", {
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    lazyConnect: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.lekaoRedis = redis;
}

// 启动失败不要让进程挂掉（监控告警会发邮件）
redis.on("error", (err) => {
  console.error("[redis] error:", err.message);
});
