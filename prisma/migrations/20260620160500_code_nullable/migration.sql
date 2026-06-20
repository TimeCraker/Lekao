-- ============================================
-- Lekao - 修复 code 列 NOT NULL 约束 (2026-06-20)
-- ============================================
-- 来源: verificationCodes 表原 schema `code String` NOT NULL, 新 schema 改
-- 成 `code String?` (新数据只写 codeHash), 但 PG 列约束没改 → INSERT codeHash
-- 不写 code 时报 Null constraint violation on code
--
-- 修复: ALTER COLUMN code DROP NOT NULL (只这条, 其他都不动)

ALTER TABLE "verification_codes" ALTER COLUMN "code" DROP NOT NULL;
