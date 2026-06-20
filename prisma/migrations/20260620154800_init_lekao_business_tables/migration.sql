-- ============================================
-- Lekao - init migration
-- ============================================
-- 创建 4 张 Lekao 业务表 (BRD §3.4 + PRD §3.4.2)
-- ⚠️ 共享 users 表归 ResumeAIX 管, 本 migration 不触碰
-- ⚠️ 部署只用 prisma migrate deploy (不带 --force / --accept-data-loss)

-- 1. 课堂小结历史 (付费数据, 必须落盘防客诉)
CREATE TABLE IF NOT EXISTS "lekao_class_summaries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "templateId" TEXT,
    "inputImages" TEXT[],
    "feedbackText" TEXT NOT NULL,
    "summaryText" TEXT NOT NULL,
    "tCoinUsed" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lekao_class_summaries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "lekao_class_summaries_userId_createdAt_idx"
    ON "lekao_class_summaries"("userId", "createdAt");

-- 2. 课堂反馈历史 (付费数据, 必须落盘防客诉)
CREATE TABLE IF NOT EXISTS "lekao_class_feedbacks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "templateId" TEXT,
    "inputImages" TEXT[],
    "description" TEXT,
    "feedbackText" TEXT NOT NULL,
    "tCoinUsed" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lekao_class_feedbacks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "lekao_class_feedbacks_userId_createdAt_idx"
    ON "lekao_class_feedbacks"("userId", "createdAt");

-- 3. 模板 (平台预设 + 用户自定义)
CREATE TABLE IF NOT EXISTS "lekao_templates" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lekao_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "lekao_templates_userId_type_idx"
    ON "lekao_templates"("userId", "type");

-- 4. 验证码记录 (防刷)
CREATE TABLE IF NOT EXISTS "verification_codes" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_codes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "verification_codes_email_purpose_expiresAt_idx"
    ON "verification_codes"("email", "purpose", "expiresAt");

-- ⚠️ users 表不加外键 (Lekao 不管理 users 表, 由 ResumeAIX 维护)
-- 业务表通过 userId 字符串引用, 不加 FOREIGN KEY 约束以避免对 ResumeAIX 表结构造成强耦合
