-- ============================================
-- v2.2.0 · 灵感墙 3 张表（手写 migration）
-- ============================================
-- 触发：用户在 dashboard 新增"灵感墙"功能
-- 含：灵感主表 + 点赞表 + 评论表
-- 决策 #10：评论 partial unique index (status='visible') 实现"删了 = 永久禁"

-- 1. 灵感墙主表
CREATE TABLE IF NOT EXISTS "lekao_ideas" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"     TEXT NOT NULL,
  "user_email"  TEXT NOT NULL,
  "title"       VARCHAR(50) NOT NULL,
  "description" VARCHAR(500) NOT NULL,
  "status"      VARCHAR(20) NOT NULL DEFAULT 'open',
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_lekao_ideas_user_id" ON "lekao_ideas" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_lekao_ideas_created_at" ON "lekao_ideas" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_lekao_ideas_status" ON "lekao_ideas" ("status");

-- 2. 点赞表（联合主键防重复）
CREATE TABLE IF NOT EXISTS "lekao_idea_likes" (
  "idea_id"    UUID NOT NULL REFERENCES "lekao_ideas"("id") ON DELETE CASCADE,
  "user_id"    TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("idea_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "idx_lekao_idea_likes_user_id" ON "lekao_idea_likes" ("user_id");

-- 3. 评论表（partial unique index 实现"删了 = 永久禁"）
CREATE TABLE IF NOT EXISTS "lekao_idea_comments" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "idea_id"     UUID NOT NULL REFERENCES "lekao_ideas"("id") ON DELETE CASCADE,
  "user_id"     TEXT NOT NULL,
  "user_email"  TEXT NOT NULL,
  "content"     VARCHAR(200) NOT NULL,
  "status"      VARCHAR(20) NOT NULL DEFAULT 'visible',
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ⭐ partial unique index：只对 status='visible' 强制唯一
-- 决策 #10：删评论 = UPDATE status='banned'（行不删），partial index 仍生效 → 永久禁
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_lekao_idea_comments_active"
  ON "lekao_idea_comments" ("idea_id", "user_id")
  WHERE "status" = 'visible';

CREATE INDEX IF NOT EXISTS "idx_lekao_idea_comments_idea_user"
  ON "lekao_idea_comments" ("idea_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_lekao_idea_comments_idea_created"
  ON "lekao_idea_comments" ("idea_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_lekao_idea_comments_status"
  ON "lekao_idea_comments" ("status");