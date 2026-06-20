-- ============================================
-- Lekao - Security Hardening (2026-06-20)
-- ============================================
-- 来源: 后台安全审查 (security-guidance hook) 4 个 finding 中 1+2+3 项
-- 推迟: finding 4 (RLS / 部分索引) 等 Phase 2 公开模板功能再做
--
-- 1. verification_codes: 加 codeHash + attempts, 验证码改 bcrypt 哈希 (HIGH)
-- 2. tCoinUsed: 加 CHECK >= 1 防负数 (MEDIUM)
-- 3. verification_codes 字段约束: purpose enum + code/email 长度 (MEDIUM)

-- ============================================
-- 1. verification_codes 加列 + CHECK
-- ============================================

-- 加 codeHash 列 (存 bcrypt(code, cost=10))
ALTER TABLE "verification_codes" ADD COLUMN IF NOT EXISTS "codeHash" TEXT;

-- 加 attempts 列 (防暴力, 默认 0)
ALTER TABLE "verification_codes" ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0;

-- 加唯一 partial index: 同一 email+purpose 同时只能有 1 个未使用的有效码
-- (既防并发发码竞态, 也强制 IN 列表只能 register/login/reset)
CREATE UNIQUE INDEX IF NOT EXISTS "verification_codes_email_purpose_active_idx"
    ON "verification_codes"("email", "purpose")
    WHERE "used" = false;

-- purpose CHECK 约束 (3 个合法取值)
ALTER TABLE "verification_codes"
    DROP CONSTRAINT IF EXISTS "verification_codes_purpose_check";
ALTER TABLE "verification_codes"
    ADD CONSTRAINT "verification_codes_purpose_check"
    CHECK ("purpose" IN ('register', 'login', 'reset'));

-- code 长度 CHECK (兼容老数据 NULL + 新数据 4-16 字符)
ALTER TABLE "verification_codes"
    DROP CONSTRAINT IF EXISTS "verification_codes_code_length_check";
ALTER TABLE "verification_codes"
    ADD CONSTRAINT "verification_codes_code_length_check"
    CHECK ("code" IS NULL OR char_length("code") BETWEEN 4 AND 16);

-- codeHash 长度 CHECK (bcrypt $2a$10$ + 22 字符 salt + 31 字符 hash ≈ 60 字符, 给 256 上限)
ALTER TABLE "verification_codes"
    DROP CONSTRAINT IF EXISTS "verification_codes_codehash_length_check";
ALTER TABLE "verification_codes"
    ADD CONSTRAINT "verification_codes_codehash_length_check"
    CHECK ("codeHash" IS NULL OR char_length("codeHash") BETWEEN 4 AND 256);

-- email 长度 CHECK (RFC 5321 上限 320)
ALTER TABLE "verification_codes"
    DROP CONSTRAINT IF EXISTS "verification_codes_email_length_check";
ALTER TABLE "verification_codes"
    ADD CONSTRAINT "verification_codes_email_length_check"
    CHECK (char_length("email") <= 320 AND char_length("email") >= 3);

-- attempts CHECK (>= 0)
ALTER TABLE "verification_codes"
    DROP CONSTRAINT IF EXISTS "verification_codes_attempts_check";
ALTER TABLE "verification_codes"
    ADD CONSTRAINT "verification_codes_attempts_check"
    CHECK ("attempts" >= 0 AND "attempts" <= 20);

-- ============================================
-- 2. tCoinUsed CHECK (防负数 / 异常值)
-- ============================================

ALTER TABLE "lekao_class_summaries"
    DROP CONSTRAINT IF EXISTS "lekao_class_summaries_tcoin_check";
ALTER TABLE "lekao_class_summaries"
    ADD CONSTRAINT "lekao_class_summaries_tcoin_check"
    CHECK ("tCoinUsed" >= 1);

ALTER TABLE "lekao_class_feedbacks"
    DROP CONSTRAINT IF EXISTS "lekao_class_feedbacks_tcoin_check";
ALTER TABLE "lekao_class_feedbacks"
    ADD CONSTRAINT "lekao_class_feedbacks_tcoin_check"
    CHECK ("tCoinUsed" >= 1);
