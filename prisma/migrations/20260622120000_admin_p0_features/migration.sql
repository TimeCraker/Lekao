-- ============================================
-- P0 三件套 · 2026-06-22 · admin 后台关键缺口补齐
-- ============================================

-- 1. P0#3 users.banned 字段（admin 封禁/启用）
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS users_banned_idx ON users(banned);

-- 2. P0#1 lekao_coin_log 表（T-Coin 调币流水 · 客诉可查）
CREATE TABLE IF NOT EXISTS lekao_coin_log (
    id          TEXT PRIMARY KEY,
    "userId"    TEXT NOT NULL,
    "adminId"   TEXT NOT NULL,
    amount      INTEGER NOT NULL,
    "beforeGift" INTEGER NOT NULL,
    "beforePaid" INTEGER NOT NULL,
    "afterGift"  INTEGER NOT NULL,
    "afterPaid"  INTEGER NOT NULL,
    reason      TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT lekao_coin_log_userId_fkey  FOREIGN KEY ("userId")  REFERENCES users(id),
    CONSTRAINT lekao_coin_log_adminId_fkey FOREIGN KEY ("adminId") REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS lekao_coin_log_userId_createdAt_idx  ON lekao_coin_log("userId", "createdAt");
CREATE INDEX IF NOT EXISTS lekao_coin_log_adminId_createdAt_idx ON lekao_coin_log("adminId", "createdAt");

-- 3. P0#2 audit_log 表（admin 操作审计日志）
CREATE TABLE IF NOT EXISTS audit_log (
    id            TEXT PRIMARY KEY,
    "adminId"     TEXT NOT NULL,
    "targetUserId" TEXT,
    action        TEXT NOT NULL,
    details       TEXT,
    ip            TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT audit_log_adminId_fkey      FOREIGN KEY ("adminId")      REFERENCES users(id),
    CONSTRAINT audit_log_targetUserId_fkey FOREIGN KEY ("targetUserId") REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS audit_log_adminId_createdAt_idx ON audit_log("adminId", "createdAt");
CREATE INDEX IF NOT EXISTS audit_log_action_createdAt_idx  ON audit_log(action, "createdAt");
CREATE INDEX IF NOT EXISTS audit_log_targetUserId_idx      ON audit_log("targetUserId");