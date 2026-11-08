-- ============================================
-- v2.4.0 · 每日签到 (七日递增循环奖励) · 2026-08-01
-- ============================================
-- 规则：连签 streak 1-7 循环，每天 +1 从 2 起
--   D1=2 D2=3 D3=4 D4=5 D5=6 D6=7 D7=8
--   签满 7 天重置回 D1；中断也重置
-- dayKey (Asia/Shanghai YYYY-MM-DD) 唯一约束防同日重复签到
-- ⚠️ 共享 users 表归 ResumeAIX 管，本 migration 不触碰 users 表结构

CREATE TABLE "lekao_checkins" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "streakDay" INTEGER NOT NULL,
    "award" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lekao_checkins_pkey" PRIMARY KEY ("id")
);

-- ⭐ 同一用户同一自然日唯一 (防重复签到靠这个)
CREATE UNIQUE INDEX "lekao_checkins_userId_dayKey_key"
    ON "lekao_checkins"("userId", "dayKey");

-- 查"最近一次签到" + 历史用 (userId, createdAt)
CREATE INDEX "lekao_checkins_userId_createdAt_idx"
    ON "lekao_checkins"("userId", "createdAt");

ALTER TABLE "lekao_checkins"
    ADD CONSTRAINT "lekao_checkins_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
