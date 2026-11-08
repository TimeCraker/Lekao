# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目定位

LeKao 是面向 K12 培训机构助教 / 学管 / 班主任的 AI 工作台（在线 [lekao.asterforge.top](https://lekao.asterforge.top)）。核心能力：课堂小结、作业 / 堂测反馈、周末错题反馈表、错题集 Word、灵感墙、每日签到。技术栈 Next.js 16 (App Router) + React 19 + Tailwind 4 + Prisma 6 + PostgreSQL + next-auth v4 + ioredis + OpenAI SDK。

详细运维（部署 / 状态 / 日志 / 监控）见仓库内 `.claude/skills/lekao.md`（`/lekao` 技能），本文件只覆盖命令与架构。

## 常用命令

`package.json` 暴露 15 个脚本（`test` 为 vitest，src/lib 单测 241 个）：

```bash
pnpm dev           # 开发服务器（端口由 NEXTAUTH_URL 默认 3007）
pnpm build         # 生产构建（部署时带 NODE_OPTIONS=--max-old-space-size=1536 防 OOM）
pnpm start         # 生产启动（systemd lekao-web 用 pnpm start --port 3007）
pnpm lint          # eslint（flat config · eslint.config.mjs）
pnpm test          # vitest run（src 下 **/*.test.ts）
pnpm test:red      # vitest 特征/契约套件（S01 出口契约守卫，tests/red/**）
pnpm test:e2e      # Playwright e2e（e2e/ 目录，S01 T-001 建立）
pnpm perf:audit    # 路由性能审计（scripts/perf-audit.mjs，S03 T-306 建立）
pnpm typecheck     # tsc --noEmit
pnpm format        # prettier --write .（.prettierrc 仅 endOfLine:auto）
pnpm format:check  # prettier --check .
pnpm db:generate   # prisma generate（改 schema 后必跑）
pnpm db:deploy     # prisma migrate deploy（生产部署用这个，禁 db push）
pnpm db:validate   # prisma validate
```

Prisma（部署只用 `migrate deploy`，**禁 `db push`**）：

```bash
pnpm exec prisma generate          # 生成 client（改 schema 后必跑）
pnpm exec prisma migrate deploy    # 生产部署跑这个
pnpm exec prisma migrate dev       # 本地开发新增 migration
pnpm exec prisma studio            # 查数据
```

`scripts/` 现有运维 / 生成 / 诊断类：`deploy-production.ps1`（部署）、`generate-invite-codes.ts`、`generate-templates.mjs`、`gen-word-template.ts`、`perf-audit.mjs`（`perf:audit` 入口）、e2e 支撑（`e2e-env.mjs` / `e2e-fullflow.mjs`）、诊断（`diagnose-ai-latency.mjs` / `diagnose-profile-reload.mjs` / `measure-first-load.mjs`）、`capture-visual-baselines.mjs`、`landing-images/`（营销配图）。模板开发期的一次性调试脚本已归档到 `scripts/archive/`（不参与构建、无代码依赖）。

移动端定版 **web-only**（2026-10-03 owner 决策，S02 跨端阶段 CANCELLED，主站 hero 的 APK 入口已移除）。`lekao-android/` 冻结于 V1.0.0 仅作存档（复用 Web API，无独立后端）；确需改动时在该目录 `gradlew.bat assembleDebug` / `gradlew.bat testDebugUnitTest`。

部署（手动 SSH，push 不自动上线）：`pwsh scripts/deploy-production.ps1` —— 本地 `git bundle` → SCP → 服务器 `fetch + reset --hard` → `pnpm install` → `prisma migrate deploy` → `prisma generate` → `NODE_OPTIONS=… pnpm build` → `systemctl restart lekao-web`。读当前脚本实现，别复制旧 Skill 片段。

## 架构要点（需跨多文件理解的大图）

### 1. 共享数据库——`users` 表归 ResumeAIX 管

Lekao 与 ResumeAIX 共享同一个 PG 实例 `localhost:5432/lekao`。`prisma/schema.prisma` 里 `User` / `UserRole` 是**只读引用**（`@@map("users")`），schema ownership 在 ResumeAIX 仓库。**绝不能** `prisma db push --force` / `--accept-data-loss`——会误删 ResumeAIX 用户数据。`DATABASE_URL` 必须带 `?connection_limit=4&pool_timeout=20`（3.6GB 单机防连接池爆）。

Lekao 自己的业务表（`lekao_class_summaries` / `lekao_class_feedbacks` / `lekao_coin_log` / `audit_log` / `lekao_ideas*` / `lekao_checkins` 等）由 Lekao migration 管理，挂在 `users.id` 上。

### 2. T-Coin 扣费——幂等计费状态机（S01 T-002 已收敛）

[`src/lib/coin.ts`](src/lib/coin.ts) 是门面，账本实现在 [`src/lib/coin-ledger.ts`](src/lib/coin-ledger.ts)：`request + idempotencyKey → reserve → AI job → settle | release`。`(userId, idempotencyKey)` 唯一（表 `lekao_generation_charges`），重放不产生第二条扣款；release 按 reserve 记录的原池精确返还。summarize 与 batch feedback 两个生成 API 均已接入（1 币 / 次 / Sheet）。旧的「先扣后多路退款」「成功后扣且失败不扣」两套模式已被取代——别再复制。

扣池优先级：优先扣赠送 `lekao_gift_coin`，再扣 `t_coin`（跨产品共享）。`lekao_gift_coin` 默认 `-1`，首次登录在 [`src/lib/auth.ts`](src/lib/auth.ts) `signIn` callback 检测 `=== -1` 才补发 5 枚（延迟初始化，幂等）。

### 3. 两阶段 AI 流水线 + 自定义 SSE 协议

[`src/lib/ai/vision.ts`](src/lib/ai/vision.ts)（Qwen3-VL-8B via 硅基流动）读图 → [`src/lib/ai/text.ts`](src/lib/ai/text.ts)（DeepSeek-V4-Flash）流式生成文本。两者都用 OpenAI SDK，**lazy init client**（避免 build 时缺 key 报错）。

summarize 返回 `text/event-stream`，在原始 token 流外包了一层带内联信令的流（前端按行解析）：

- 首 chunk：`__META__{...}\n\n` —— 学科 / 专题 / 知识点 / 扣费结果。
- 出错：`__ERROR__{code,message,correlationId}\n\n` —— [`classifyAIError`](src/app/api/lekao/summarize/route.ts) 把 402 / 429 / timeout / context-length 转成友好 code（避免前端看到裸 `network error`）。改 prompt 输出格式时同步 [`src/lib/summary/parser.ts`](src/lib/summary/parser.ts) 与 [`src/lib/ai/text.ts`](src/lib/ai/text.ts) 的 marker（「课堂总体小结」/「总体小结」），否则 feedback/summary 切分会错。

vision 输出做 **prompt-injection 清洗**：`subject` 必须 in 9 学科 allowlist，topic/keyPoints/rawText 长度截断。

### 4. banned 四层拦截

封禁用户已签发的 JWT 仍能用 30 天，所以拦四层：`authorize()` → `signIn` callback → `/api/auth/verify-code` → [`src/proxy.ts`](src/proxy.ts)（`token.banned=true` → 302 `/banned`）。**Next.js 16 把 `middleware.ts` 改名 `proxy.ts`，别同时新增 `middleware.ts`**。proxy 还 fire-and-forget Redis 在线心跳。

### 5. 错题集模块——纯前端、免费、保留 Excel 样式

[`src/lib/mistake/`](src/lib/mistake/) 全在客户端跑，**不调 AI、不扣币**。Word 错题文档用 `docx` + `jszip` 生成；周末反馈表导出走 [`weekend-exporter.ts`](src/lib/mistake/weekend-exporter.ts) 的 **exceljs modify-in-place**（`getCell().value = …` 保留 style/cols/merges，不是 `aoa_to_sheet` 重写——SheetJS 社区版写 styles 会丢）。改导出格式时注意「按 students 数组当前顺序从 row 3 连续写」，别回退到按原 `rowIndex` 写（用户排序后会错位）。错题 / 图片历史存 IndexedDB + File System Access，改这块要保留授权恢复、下载回退和数据丢失提示。

### 6. 目录速查

- API：`src/app/api/lekao/{summarize,feedback/batch,ideas,…}` 业务；`src/app/api/admin/*` 管理后台（analytics 用 Redis ZSET 心跳 + `unstable_cache` 5min）；`src/app/api/auth/*` next-auth + 验证码。
- lib：`ai/`（vision+text+prompts+batch-feedback）、`coin.ts`、`auth.ts`、`mistake/`（Excel 解析 + Word/Excel 导出 + 周末表）、`redis*.ts`、`analytics.ts`、`image-compress.ts`（移动端 1280px/0.4MB 降级，前后端共用）。
- 配置产物：`deploy/`（nginx conf）、`references/`（真实讲义 / 反馈表样本，**含学生 PII，已 gitignore 不进 git，仅本地保留**）。Android APK 走 GitHub Releases，不进 git（hero 下载入口已随 web-only 决策移除，见 `public/downloads/README.md`）。

## 硬约束 / 易错点

- **真相源优先级**（避免把历史快照当现状）：当前用户指令 > 代码 / `package.json` / `schema.prisma` > `docs/ai-delivery/` 当前 Stage 包 > `README` / `docs/*` 背景 > Git 历史。版本号以 `package.json` 为准；发版时 CHANGELOG 与 package.json 必须同步更新（历史上漂移过 2.3.0 vs 2.5.0，勿重演）。
- **规格驱动**：正式业务功能开发前读 `docs/ai-delivery/README.md` + 当前 Stage 的 Spec/Tasks/Prompt/Handoff；Prompt 或 Handoff 为 `BLOCKED` 不得实施。一次只做一个原子 Task。
- **AI key / 验证码 / 教学原文不进日志、提交、Skill**。诊断日志走 `console.error`（`next.config.ts` 的 `removeConsole` 生产保留 `error`，其余 `console.*` 被剥离）。
- **新图片部署后强制换文件名**让 Next.js Image Optimizer + 浏览器缓存键失效，否则显示旧图。
- 本仓库内 commit 用 Conventional Commits + 中英对照（见 git log 风格）。
- ⚠️ 本仓 git 历史含 3 个学生真实姓名（2026-09-30 前的提交）。仓库必须保持 PRIVATE；转公开或新增不可信协作者前，必须先 git filter-repo 清洗历史并 force push。
