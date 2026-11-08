-- ============================================
-- v2.2.0 后续清理 · 删除 2 个死字段（2026-06-25）
-- ============================================
-- 触发：v2.2.0 收尾审计发现 2 个 schema 字段无任何代码引用
--   1. inputImages: schema 写了 String[] 但代码 0 处写
--      原因：错题集已用本地 File System Access API（PRD §3.4.3 既定决策）
--      删字段 + 删列
--   2. templateId:  schema 写了 String? 但代码 0 处写
--      原因：模板系统未上线，summary/feedback 页面写死 template="summary" 字符串
--      等模板系统上线时再补
-- ⚠️ 共享 users 表归 ResumeAIX 管，本 migration 不触碰
-- ⚠️ 部署只用 prisma migrate deploy (不带 --force / --accept-data-loss)

-- 1. 课堂小结历史
ALTER TABLE "lekao_class_summaries"
  DROP COLUMN IF EXISTS "inputImages",
  DROP COLUMN IF EXISTS "templateId";

-- 2. 课堂反馈历史
ALTER TABLE "lekao_class_feedbacks"
  DROP COLUMN IF EXISTS "inputImages",
  DROP COLUMN IF EXISTS "templateId";
