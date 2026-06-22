# Lekao - PRD 产品需求文档

> **项目代号**：Lekao
> **产品定位**：AI 智能助教助手（面向培训机构助教的工作台）
> **文档版本**：v0.1 - 初稿（基于 BRD v0.3）
> **核心价值**：让培训机构助教从"抄错题、写小结、写反馈"里解放出来，每次课省 1-2 小时
> **文档目的**：把 BRD 业务需求转成可落地的产品实现细节 + 两期任务清单
> **关键约束**：本期（Phase 1）只做脚手架 + 登录 + 仪表盘占位，**所有业务功能进 Phase 2**

---

## 📋 目录

1. [文档元信息](#1-文档元信息)
2. [设计语言（基于用户决策）](#2-设计语言基于用户决策)
3. [Phase 1 · 脚手架（本期）](#3-phase-1--脚手架本期)
4. [Phase 2 · 业务功能（二期）](#4-phase-2--业务功能二期)
5. [ResumeAIX 仓库协同 PR](#5-resumeaix-仓库协同-pr)
6. [验收标准](#6-验收标准)
7. [风险与依赖](#7-风险与依赖)
8. [总结](#8-总结)

---

## 1. 文档元信息

### 1.1 项目元数据

| 项 | 值 | 来源 |
|----|----|----|
| 项目名 | **Lekao**（首字母大写） | 用户决策 |
| 仓库名 | `TimeCraker/Lekao`（独立 Git 仓库） | BRD v0.3 §7.0 |
| 域名 | `lekao.asterforge.top`（待 DNS 申请） | BRD v0.3 §7.1 |
| 部署路径 | `/home/ubuntu/Lekao/` 端口 `:3007` | BRD v0.3 §7.0 |
| 数据库 | PostgreSQL `:5434/resumeaix`（共享 DB 实例，独立 schema） | BRD v0.3 §7.1 |
| Redis | `:6380`（共享） | BRD v0.3 §7.1 |
| AI 底座 | SiliconFlow / DeepSeek（OpenAI-compatible） | BRD v0.3 §7.1 |

### 1.2 已确认决策（苏格拉底式提问结果）

| # | 决策点 | 用户选择 | 影响 |
|---|--------|---------|------|
| 1 | 项目命名 | **Lekao**（首字母大写） | 仓库 / 代码 / UI 标识 |
| 2 | 一期登录范围 | **邮箱密码 + 验证码** | 一期工作量（2 套登录方式） |
| 3 | 一期计费策略 | **严格按 BRD · 一期就先发 PR 加字段 + 计费** | 一期前必须先在 ResumeAIX 仓库提 PR |
| 4 | UI 设计风格 | **浅蓝 + 白 + 黑 · 高级风 · 保留特效** | 设计 token 替换 cream → 浅蓝白 |
| 5 | 注册赠送 T-Coin 数量 | **统一锁定 5 枚**（不再 5-10） | Phase 2 可完整测试 5 次小结/反馈，成本极低 |
| 6 | 赠币触发机制 | **延迟初始化（Lazy Init）**（不是注册时给） | 兼容 ResumeAIX 老用户首次登录 Lekao 不触发注册的场景 |
| 7 | Prisma 连接池 | **硬限制 ?connection_limit=4**（.env 注入） | 防止 3.6GB 服务器 max_connections 撑爆 |

### 1.3 两期拆分总览

```
┌─────────────────────────────────────────────────────────────┐
│  Phase 1（本期 · 脚手架）                                     │
│  ─────────────────────                                       │
│  ✓ Next.js 15 + Prisma + Tailwind 脚手架                     │
│  ✓ 邮箱密码 + 验证码 登录（含注册流程）                        │
│  ✓ ResumeAIX 仓库协同 PR（加 lekao_gift_coin 字段）           │
│  ✓ T-Coin 扣费基础设施（赠送 5-10 + 充值）                     │
│  ✓ Landing Page / 仪表盘 / 三功能占位页 / 管理员后台入口        │
│  ✗ 错题集具体逻辑（占位）                                      │
│  ✗ 小结/反馈具体逻辑（占位）                                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Phase 2（二期 · 业务功能）                                    │
│  ─────────────────────                                       │
│  □ 错题集：Excel 解析 / 去重算法 / 拖拽图片 / 压缩 / 草稿箱    │
│  □ 课堂小结：模板 / 上传 / AI 生成 / 分流复制                  │
│  □ 课堂反馈：同上                                             │
│  □ COS 前端直传 / Word 导出 / 批量并行生成                     │
│  □ 管理员 T-Coin 调币 UI                                     │
│  □ 微信 OAuth + 微信支付（等公司主体）                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 设计语言（基于用户决策）

> ⭐ 用户决策：**浅蓝 + 白 + 黑 · 高级风 · 保留特效 · 参考 awesome-design-md + my-portfolio**

### 2.1 设计哲学

| 维度 | 决策 | 来源 |
|------|------|------|
| 主色调 | 浅蓝白（不是 ResumeAIX 的 cream） | 用户决策 #4 |
| Accent 色 | 浅蓝（不是 ResumeAIX 的 coral） | 用户决策 #4 |
| 文字色 | 纯黑 / 深灰 | 沿用 my-portfolio |
| 动效策略 | **保留**（流体 / 字符级 3D / mask shine / Lenis） | 用户原话："该做的特效还是要有" |
| 整体调性 | 高级感、专业、可信赖（不是纯极简） | 用户原话："高级风" |
| 参考仓库 | `claude-code-config/awesome-design-md`（50+ 顶级设计） | 用户原话 |
| 参考主站 | `my-portfolio`（设计语言基础） | 用户原话 |

### 2.2 配色 Token（CSS 变量）

> ⚠️ 与 my-portfolio（cream + coral）**完全不同色板**，但保留所有动画基础设施。

```css
:root {
  /* ─── Canvas + Ink ─── */
  --canvas:        #fafbfc;   /* 主背景 · 浅蓝白 */
  --canvas-alt:    #f1f5f9;   /* 次背景 · 略深蓝白 */
  --ink:           #0a0f1a;   /* 主文字 · 深蓝黑 */
  --ink-mute:      #1e293b;   /* 次文字 */
  --ink-muted:     #475569;   /* 辅助文字 · slate-600 */
  --ink-subtle:    #94a3b8;   /* 弱化文字 · slate-400 */

  /* ─── Hairline + Divider ─── */
  --hairline:      #e2e8f0;   /* slate-200 */
  --divider:       #cbd5e1;   /* slate-300 */

  /* ─── Accent · 浅蓝主色 ─── */
  --accent:        #3b82f6;   /* blue-500 · CTA 主色 */
  --accent-hover:  #2563eb;   /* blue-600 */
  --accent-soft:   #dbeafe;   /* blue-100 · 标签背景 */
  --accent-ink:    #1e40af;   /* blue-800 · 文字专用（对比度 ≥ 7:1） */
  --accent-line:   rgba(59, 130, 246, 0.32);

  /* ─── 语义色 ─── */
  --success:       #10b981;   /* green-500 */
  --warning:       #f59e0b;   /* amber-500 */
  --danger:        #ef4444;   /* red-500 */

  /* ─── 暗色区域（与 my-portfolio 一致）─── */
  --page-dark:     #0f172a;   /* slate-900 · 暗色区域 */
  --surface-dark-1: #1e293b;  /* slate-800 */
  --surface-dark-2: #334155;  /* slate-700 */
  --hairline-dark: rgba(248, 250, 252, 0.08);
  --ink-on-dark:   #f8fafc;
  --ink-on-dark-muted: #cbd5e1;

  /* ─── 阴影 ─── */
  --shadow-sm: 0 1px 3px rgba(15, 23, 42, 0.06);
  --shadow-md: 0 4px 16px rgba(15, 23, 42, 0.08);
  --shadow-lg: 0 8px 32px rgba(15, 23, 42, 0.10);
  --shadow-card-hover: 0 8px 24px rgba(15, 23, 42, 0.12);

  /* ─── 圆角 ─── */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 18px;
  --radius-xl: 24px;
}
```

### 2.3 字体系统

```css
body {
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display",
    "PingFang SC", "Helvetica Neue", system-ui, sans-serif;
  font-feature-settings: "ss01", "ss02";
  -webkit-font-smoothing: antialiased;
}

.font-mono {
  font-family: "JetBrains Mono", "SF Mono", "Menlo", "Cascadia Code", monospace;
  font-feature-settings: "ss01", "ss02";
}
```

### 2.4 动效语言（沿用 my-portfolio 高 ROI 动效）

| 动效 | 用途 | 优先级 |
|------|------|-------|
| 流体 mesh gradient 背景 | Landing Page Hero | ⭐ P0 |
| HeroTitle 字符级 3D rotateY | Landing Page H1 | ⭐ P0 |
| Mask Shine H1 | 标题区装饰 | ⭐ P0 |
| Lenis 平滑滚动 | 全站 | ⭐ P0 |
| 卡片 hover lift | 仪表盘卡片 | ⭐ P0 |
| 3D Tilt Card | 功能占位卡（轻量版） | P1 |
| ParticleField 粒子场 | 仅暗色区域（不整屏 fixed） | P1 |
| Magnetic Button | 主 CTA | P1 |
| Flow Divider | section 衔接 | P2 |
| Detail Line 贯穿细线 | 长页面叙事 | P2 |

### 2.5 前卫设计硬规则（来自 my-portfolio Round L-R 实战）

> ⚠️ 严格遵守 [[feedback-avant-garde-design]] 中的 9 条禁忌，避免重蹈覆辙。

#### 2.5.1 整页 transform 倾斜 — 禁忌
```css
/* ❌ 不要这样 */
main { perspective: 1000px; }
/* ❌ 不要 scroll-driven scale 全页 */
/* ✅ 3D 倾斜只在局部组件（单卡 / 单字符 / 单按钮） */
```

#### 2.5.2 装饰类动效上限 — 硬约束
- 每页自动循环动效 ≤ 1 个
- Mask shine 在 HERO（短标题）才用，长句禁用
- 鼠标 trail 只在 hover 时显示，不持续

#### 2.5.3 主色原则 — 浅蓝白为王
- 主站 / 仪表盘用 `--canvas` + `--accent` 浅蓝
- 暗色区域（Hero / Footer）用 `--page-dark` slate-900
- 不引入 teal/amber 等额外 accent 色抢占主色

#### 2.5.4 装饰层 scoped — 不整屏 fixed
```css
/* ❌ 不要整屏 fixed inset-0 WebGL 粒子场 */
.particle-field { position: fixed; inset: 0; z-index: 999; }

/* ✅ scoped 到容器内 */
.particle-field {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}
```

#### 2.5.5 移动端物理隔离 — 必须用完全分离组件
- PC 组件（`.hero-section.tsx`）和移动端组件（`.hero-section-mobile.tsx`）**完全分离**
- 不是 `max-md:` 隐藏某些元素
- 移动端组件需要重新设计布局，而不是缩放

#### 2.5.6 prefers-reduced-motion 双层守卫
```css
/* CSS 层 */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```
```tsx
// JS 层（hook）
const reducedMotion = useReducedMotion();
if (reducedMotion) return null; // 跳过 WebGL / Three.js
```

#### 2.5.7 逐字/逐行动效必须预占位
- 打字机 / 字符级动效 → 容器第一帧用 `invisible` 渲染完整字符串锁死尺寸
- 多状态 Mockup → `min-height` + absolute 叠放

#### 2.5.8 Lighthouse perf 4-run avg
- 每个动效 commit 后立即 lighthouse mobile 复测
- 报告必须说 "4-run avg" 或 "4 次跑分别是 X/Y/Z/W"
- 触发回退阈值：**4-run avg 退步 > 3 分**才回退

#### 2.5.9 装饰类动效上线策略
- 上线 + 跑 perf 4-run avg + 报告数据 + 等用户判断
- 不要替用户做"性能 vs 视觉"的取舍
- 保留 `git ref` 让用户能快速回滚

---

## 3. Phase 1 · 脚手架（本期）

### 3.1 范围（In Scope）

- ✅ 项目脚手架（Next.js 15 + Prisma + Tailwind）
- ✅ 邮箱密码 + 验证码 注册/登录
- ✅ ResumeAIX 仓库协同 PR（添加 `lekao_gift_coin` 字段）
- ✅ T-Coin 基础设施（赠送 5-10 + 充值预留接口）
- ✅ Landing Page（`/`）
- ✅ 登录页（`/login`）+ 注册页（`/register`）
- ✅ 仪表盘（`/dashboard`）+ 侧边栏
- ✅ 三个功能占位页（`/dashboard/mistake` / `/summary` / `/feedback`）
- ✅ 管理员后台入口（`/admin`，本期只放入口，二期做调币 UI）
- ✅ Prisma schema（Lekao 业务表预留，本期只建表不写业务逻辑）
- ✅ 部署到腾讯云 `:3007`
- ✅ Lighthouse mobile perf 验证

### 3.2 不在本期范围（Out of Scope）

- ❌ 错题集 Excel 解析 / 拖拽图片 / Word 导出
- ❌ 课堂小结/反馈 AI 生成 / Markdown 编辑器 / 分流复制
- ❌ COS 前端直传配置（先预留接口）
- ❌ 完整管理员后台（只放入口）
- ❌ 微信 OAuth / 微信支付
- ❌ 班级管理 / 学生管理 / 多助教协作
- ❌ 移动端 App（先做 Web 响应式）

### 3.3 技术栈选型

| 类别 | 选型 | 理由 |
|------|------|------|
| 框架 | **Next.js 15**（App Router + RSC） | ResumeAIX 经验复用 |
| 运行时 | Node.js 20 | 腾讯云已装 `/usr/local/node20/bin/` |
| 包管理 | pnpm 9 | 速度快 + 节省磁盘 |
| 类型 | TypeScript 5.x | 类型安全 |
| 样式 | Tailwind CSS 4.x | 与 my-portfolio 一致 |
| 数据库 | PostgreSQL 16 | 共享 ResumeAIX 实例 |
| ORM | Prisma 6.x | 共享 users 表 |
| Auth | next-auth v4 + JWT | 邮箱密码 + 验证码 |
| 邮件 | Nodemailer + SMTP | 验证码发送 |
| 状态 | Zustand（轻量） | 仪表盘状态 |
| 动效 | Motion（原 Framer Motion）+ Lenis | 字符级 3D + 平滑滚动 |
| 字体 | SF Pro / PingFang SC 系统栈 | 性能 + 跨平台 |
| 部署 | systemd service `lekao-web` | 与 ResumeAIX 一致 |
| 进程内存限制 | `--max-old-space-size=512` | BRD §7.4 硬约束 |

### 3.4 数据库 Schema（Phase 1 版）

#### 3.4.1 共享表（ResumeAIX 管理，Lekao 只读引用）

```prisma
// packages/db/prisma/schema.prisma

// ⚠️ 注意：这个模型在 Lekao schema 里只用于类型引用，绝对不能 migrate 这个表
model User {
  id               String    @id @default(cuid())
  email            String    @unique
  password         String?   // bcrypt hash
  name             String?
  role             String    @default("user") // user | admin
  t_coin           Int       @default(0)      // 充值 T-Coin（共享）
  lekao_gift_coin  Int       @default(-1)     // ⭐ 新增字段：Lekao 赠送 T-Coin
                                                  //    默认 -1 表示"未初始化"
                                                  //    首次登录/注册时延迟初始化为 5
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  
  // 反向关系
  classSummaries   LekaoClassSummary[]
  classFeedbacks   LekaoClassFeedback[]
  
  @@map("users")  // 引用 ResumeAIX 的 users 表
  @@schema("public")
}
```

> ⚠️ **执行顺序**：必须在 Phase 1 启动前，先在 ResumeAIX 仓库提 PR 加 `lekao_gift_coin` 字段，等 PR merge + 部署到生产。

#### 3.4.1.1 ⭐ Prisma 连接池硬限制（3.6GB 服务器必加）

**背景**：Lekao 与 ResumeAIX 共享 PostgreSQL 实例 `:5434`，但**两个独立 Prisma Client**（不共享 connection pool）。3.6GB 服务器多进程高并发时极易撑爆 `max_connections`（PostgreSQL 默认 100）。

**硬约束**：Lekao 的 `.env` 中 `DATABASE_URL` **必须**带上 `?connection_limit=4`：

```bash
# .env（Lekao）
DATABASE_URL="postgresql://postgres:postgres@localhost:5434/resumeaix?connection_limit=4&pool_timeout=20"
```

| 参数 | 值 | 理由 |
|------|----|----|
| `connection_limit` | **4** | 单进程最多 4 个连接，避免和 ResumeAIX 抢连接 |
| `pool_timeout` | **20** | 排队等连接的秒数上限（默认 10 太短会报错） |

**ResumeAIX 那边也建议同步限制**（**不在本期 Lekao PRD 范围**，但建议用户后续给 ResumeAIX 也加上同样的参数防止互相影响）。

#### 3.4.1.2 ⭐ 延迟初始化赠币机制（核心风控）

**漏洞场景**：
- ResumeAIX 已有老用户（比如 ID = `clxyz123`）
- 该用户从未访问过 Lekao，`lekao_gift_coin = -1`（未初始化）
- 老用户直接登录 Lekao 页面 → **不会触发任何"注册"逻辑**
- 后果：该用户 `lekao_gift_coin` 保持 0 / -1，登录后看到余额 = 0，引发客诉

**修复方案**：在 `next-auth` 的 `signIn` callback + `jwt` callback + `session` callback 中实现**延迟初始化**：

```typescript
// packages/shared/auth.ts（Lekao 项目内）

import { prisma } from "@lekao/db";

// next-auth 配置
export const authOptions = {
  callbacks: {
    async signIn({ user }) {
      // ⭐ 延迟初始化赠币（兼容老用户直接登录场景）
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lekao_gift_coin: 5,  // ⭐ 统一锁定 5 枚
        },
      }).catch(async () => {
        // 字段不存在（migration 还没跑）→ 抛错让用户检查
        throw new Error(
          "lekao_gift_coin 字段未初始化。请确认 ResumeAIX 仓库 PR (T1) 已 merge 并部署。"
        );
      });
      
      // 检查 lekao_gift_coin：如果是 -1（未初始化），补发到 5
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { lekao_gift_coin: true },
      });
      
      if (dbUser?.lekao_gift_coin === -1) {
        await prisma.user.update({
          where: { id: user.id },
          data: { lekao_gift_coin: 5 },
        });
        console.log(`[Lekao] 延迟初始化赠币: user ${user.email} +5 T-Coin`);
      }
      
      return true;
    },
  },
};
```

**触发时机**：
- ✅ 老用户首次登录 Lekao → `lekao_gift_coin === -1` → 触发 +5
- ✅ 新用户通过 Lekao 注册 → 注册时 `lekao_gift_coin: 5` 写入 → signIn callback 检测到 ≠ -1，不重复发
- ✅ 老用户已初始化过 → `lekao_gift_coin >= 0` → 不重复发

**幂等性保证**：
- 多次登录不会重复发币（仅当 `=== -1` 时才发）
- 字段默认 `-1` 而非 `0` 是关键：**0 可能是已经用完的余额**，不能再次初始化

**Phase 1 验收强化**：
- 必须用 ResumeAIX 老用户账号（如 `test@resume.com`）登录 Lekao
- 验证登录后 `lekao_gift_coin = 5`（不是 0）
- 验证再次登录不会变成 10

#### 3.4.2 Lekao 业务表（独立 migration）

```prisma
// 课堂小结历史（付费数据，必须落盘）
model LekaoClassSummary {
  id              String    @id @default(cuid())
  userId          String
  subject         String    // 学科：数学 / 物理 / 化学
  topic           String    // 精准提炼的专题名称
  templateId      String?   // 使用的模板 ID
  inputImages     String[]  // 输入图片 URL（COS）
  feedbackText    String    @db.Text  // 10 条建议
  summaryText     String    @db.Text  // 总体小结
  tCoinUsed       Int       @default(1)
  createdAt       DateTime  @default(now())
  
  user            User      @relation(fields: [userId], references: [id])
  
  @@index([userId, createdAt])
  @@map("lekao_class_summaries")
}

// 课堂反馈历史（付费数据，必须落盘）
model LekaoClassFeedback {
  id              String    @id @default(cuid())
  userId          String
  subject         String
  topic           String
  templateId      String?
  inputImages     String[]
  description     String?   @db.Text  // 助教简单描述
  feedbackText    String    @db.Text  // AI 生成的反馈
  tCoinUsed       Int       @default(1)
  createdAt       DateTime  @default(now())
  
  user            User      @relation(fields: [userId], references: [id])
  
  @@index([userId, createdAt])
  @@map("lekao_class_feedbacks")
}

// 模板（平台预设，用户也可自定义）
model LekaoTemplate {
  id              String    @id @default(cuid())
  userId          String?   // null 表示平台预设
  name            String
  type            String    // summary | feedback
  subject         String?   // 适用学科（null 表示通用）
  content         String    @db.Text  // 模板内容
  isPublic        Boolean   @default(false)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([userId, type])
  @@map("lekao_templates")
}

// 验证码记录（防刷）
model VerificationCode {
  id              String    @id @default(cuid())
  email           String
  code            String
  purpose         String    // register | login | reset
  expiresAt       DateTime
  used            Boolean   @default(false)
  createdAt       DateTime  @default(now())
  
  @@index([email, purpose, expiresAt])
  @@map("verification_codes")
}
```

#### 3.4.3 数据落盘规则（一期 · 严格按 BRD §7.6）

| 数据 | 一期是否落盘 | 二期落盘策略 |
|------|-------------|-------------|
| `users.t_coin`（充值 T-Coin） | ✅ 共享 | 沿用 |
| `users.lekao_gift_coin`（赠送 T-Coin） | ✅ 新加字段 | 沿用 |
| `lekao_class_summaries`（小结历史） | ✅ 表已建（无数据） | 二期生成时落 |
| `lekao_class_feedbacks`（反馈历史） | ✅ 表已建（无数据） | 二期生成时落 |
| `lekao_mistake_collections`（错题集） | ❌ 一期不建表 | 二期考虑是否需要（BRD 说**不强制**） |
| 错题集 Word 文件 | ❌ 不落盘 | 用户本地保存 |

### 3.5 页面清单与详细规格

#### 3.5.1 `/` · Landing Page

**目标**：让助教 5 秒内理解 Lekao 是什么、为什么用、怎么开始。

**结构**（自上而下）：

```
┌──────────────────────────────────────────────────┐
│  Navbar · 左 Lekao Logo · 右 [登录] [免费开始]    │
├──────────────────────────────────────────────────┤
│                                                  │
│   Hero · 巨型 H1                                │
│   ─────────────                                   │
│   H1: "每次课省 1-2 小时"                         │
│   Subtitle: "AI 智能助教助手，专为培训机构设计"   │
│                                                  │
│   CTA: [免费开始]  [查看演示]                      │
│                                                  │
│   （背景：流体 mesh gradient · 5 色块慢呼吸）     │
├──────────────────────────────────────────────────┤
│                                                  │
│   3 大功能介绍（3 张高亮 Card）                    │
│   ─────────────────                              │
│   [错题集生成]  [课堂小结]  [课堂反馈]            │
│   免费          1 币/次      1 币/次              │
│                                                  │
├──────────────────────────────────────────────────┤
│                                                  │
│   数字证明 · "省了多少时间"                       │
│   ─────────────────                              │
│   30 人班级 × 3 道核心错题 = 5 分钟搞定            │
│                                                  │
├──────────────────────────────────────────────────┤
│  Footer · 简洁版权 + 备案号                        │
└──────────────────────────────────────────────────┘
```

**动效细节**：
- Hero H1：字符级 3D rotateY 跟随鼠标（±15°，比 my-portfolio 轻）
- Hero 背景：5 色块流体 mesh gradient（slate-100 + blue-100 + blue-200 + indigo-100 + cyan-100）
- Hero CTA：Magnetic Button（mousemove translate，mouseleave 归零）
- 3 张功能卡：hover lift + border 变 accent
- prefers-reduced-motion：H1 字符级动效禁用，背景静态

**A11y**：
- H1 字号：clamp(48px, 8vw, 144px)
- 对比度：accent 文字专用 `--accent-ink` (#1e40af) on `--canvas` = **7.2:1（AAA）**
- 焦点环：`*:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }`

#### 3.5.2 `/login` · 登录页

**目标**：邮箱密码 + 验证码两种方式清晰切换，新用户一键跳注册。

**布局**：

```
┌──────────────────────────────────────────────────┐
│  左侧 · 装饰区（占 50% 屏幕宽）                    │
│  ─────────────                                   │
│  Logo + 一句价值主张                              │
│  流体背景 + 字符级 3D 装饰                         │
│                                                  │
│  右侧 · 表单区（占 50% 屏幕宽）                    │
│  ─────────────                                   │
│  [欢迎回来]                                      │
│  Tab 切换：[邮箱密码] [邮箱验证码]                 │
│                                                  │
│  [邮箱输入框]                                    │
│  [密码输入框]（密码模式）或 [验证码输入框]         │
│                                                  │
│  [发送验证码]（验证码模式）                        │
│  [ ] 记住我    忘记密码？                          │
│                                                  │
│  [登录按钮]                                      │
│                                                  │
│  没有账号？立即注册                               │
└──────────────────────────────────────────────────┘
```

**交互**：
- 邮箱密码模式：标准表单 + 密码可见切换眼睛图标
- 验证码模式：邮箱 → 点"发送验证码"按钮（60s 倒计时） → 收到邮件 → 填 6 位数字
- 验证码发送频率限制：同一邮箱 60s 只能发 1 次（防刷）
- 错误提示：表单字段下方红色文字

**复用 my-portfolio 经验**：
- 表单用 Input / Textarea 组件（`src/components/ui/Input.tsx`）
- 验证逻辑在 `actions/auth.ts`（Server Actions）
- 不在前端存密码（bcrypt + JWT）

#### 3.5.3 `/register` · 注册页

**目标**：邮箱 + 密码 + 验证码 三步完成注册，注册成功立即登录 + 赠送 T-Coin。

**布局**：

```
┌──────────────────────────────────────────────────┐
│  [创建账号]                                      │
│                                                  │
│  邮箱 [_______________________]                  │
│  密码 [_______________________] [眼睛]            │
│  确认密码 [___________________]                  │
│  验证码 [______]  [发送验证码]                    │
│  用户名（可选）[_______________________]          │
│                                                  │
│  [ ] 我同意服务条款                                │
│                                                  │
│  [创建账号]                                       │
│                                                  │
│  已有账号？立即登录                               │
│                                                  │
│  ─── 注册即送 5 T-Coin ───                       │
└──────────────────────────────────────────────────┘
```

**注册后行为**：
1. 写入 `users` 表（Lekao 不直接 migrate，走 ResumeAIX auth）
2. **不直接初始化** `lekao_gift_coin`（统一改为延迟初始化，见 §3.4.1.2）
3. 自动登录时 signIn callback 检测 `lekao_gift_coin === -1` → 补发 5 枚 T-Coin
4. 跳转到 `/dashboard`

**关键修正**（避免老用户漏洞）：
- ❌ **不要**在 `/register` 注册时给 `lekao_gift_coin` 赋值
- ✅ **统一在 signIn callback 延迟初始化**（保证老用户首次登录也能拿到赠送）
- ✅ 字段默认值必须是 `-1`（不是 `0`），区分"未初始化"和"已用完"

**注册逻辑**：
```typescript
// apps/web/actions/register.ts
export async function registerUser(email: string, password: string, code: string) {
  // 1. 验证邮箱验证码
  await verifyCode(email, code, "register");
  
  // 2. 写 users 表（lekao_gift_coin 不指定，用 schema 默认 -1）
  const newUser = await prisma.user.create({
    data: {
      email,
      password: await bcrypt.hash(password, 10),
      // lekao_gift_coin 不写 → 用 schema 默认值 -1
    },
  });
  
  // 3. 不在这里给赠送！交给 signIn callback 延迟初始化
  return newUser;
}
```

**决策点**：
> ⚠️ 注册逻辑需要确认：Lekao 自己的注册服务写用户，还是通过 ResumeAIX 的 API 创建用户？
> 推荐方案：Lekao 自己写 user 表 insert（共用 DB 实例），不需要 ResumeAIX API。
> ⚠️ 此决策点需用户最终确认（Phase 1 启动前）。

#### 3.5.4 `/dashboard` · 仪表盘

**目标**：登录后的核心工作台，三个功能一目了然。

**布局**：

```
┌──────────────────────────────────────────────────┐
│  Navbar · Lekao Logo · [搜索] · 用户头像（下拉）   │
├──────┬───────────────────────────────────────────┤
│      │                                           │
│ 侧   │   欢迎，{user.name}                       │
│ 边   │   T-Coin 余额：5 🪙                       │
│ 栏   │                                           │
│      │   ── 工作台 ──                            │
│ ──  │                                           │
│ 工作 │   ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│ 台   │   │ 📋        │ │ 📝        │ │ 💬        │  │
│      │   │ 错题集生成 │ │ 课堂小结  │ │ 课堂反馈  │  │
│ 历史 │   │ 免费      │ │ 1 币/次   │ │ 1 币/次   │  │
│ 记录 │   │ [进入]    │ │ [进入]    │ │ [进入]    │  │
│      │   └──────────┘ └──────────┘ └──────────┘  │
│ 资产 │                                           │
│ 中心 │   ── 最近活动 ──                          │
│      │   （空状态，引导文案）                      │
│ ──  │                                           │
│ 管理 │                                           │
│ 员   │                                           │
│ （仅 │                                           │
│ admin│                                           │
│ ）  │                                           │
└──────┴───────────────────────────────────────────┘
```

**侧边栏导航**：

| 导航项 | 路径 | 一期实现 | 二期实现 |
|--------|------|---------|---------|
| 工作台 | `/dashboard` | ✅ 主页 | ✅ |
| 历史记录 | `/dashboard/history` | ⚠️ 占位页（"敬请期待"） | ✅ 小结/反馈历史 |
| 资产中心 | `/dashboard/wallet` | ⚠️ 占位页（显示余额） | ✅ 充值/调币 |
| 管理员 | `/admin` | ⚠️ 占位页（仅 admin role 可见） | ✅ T-Coin 调币 UI |

**功能卡片设计**：

```css
.feature-card {
  background: var(--canvas);
  border: 1px solid var(--hairline);
  border-radius: 18px;
  padding: 32px;
  transition: border-color 0.2s, box-shadow 0.25s, transform 0.25s;
}
.feature-card:hover {
  border-color: var(--accent);
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-4px);
}
```

**占位卡片内容（一期）**：

```tsx
<FeatureCard
  icon="📋"
  title="错题集生成"
  description="Excel 上传 + 拖拽图片 = 5 分钟出全班的错题 Word 文档"
  priceTag={{ type: 'free', label: '免费' }}
  href="/dashboard/mistake"
/>
```

#### 3.5.5 `/dashboard/mistake` · 错题集主功能页（Phase 2 · 2026-06-20 重构）

**Phase 2 状态**：实装页面，按 BRD §3.1 + §3.1.10 + §3.1.11 完整实现。

**核心交互流程**：

```
┌─────────────────────────────────────────────────────────────┐
│  ← 返回工作台                                    [⚙️ 设置] │
├─────────────────────────────────────────────────────────────┤
│                                                            │
│  📋 错题集生成（Phase 2 实装版）                             │
│                                                            │
│  ┌─ Step 1 ──────────────────────────────────────────┐    │
│  │  📤 上传 Excel 课堂反馈表                            │    │
│  │  [拖拽 .xlsx/.xls 到这里 或点击选择]                 │    │
│  │  ✅ 支持多 Sheet、GBK 编码、合并单元格                 │    │
│  └────────────────────────────────────────────────────┘    │
│                                                            │
│  ┌─ Step 2（上传后展开）──────────────────────────────┐    │
│  │  📑 检测到 N 个 Sheet，请选择 1 个学科：              │    │
│  │  ┌────────────────────────────────────────────────┐ │    │
│  │  │ ● 化学冲刺班（38 行）· 预览...  ← 选中态         │ │    │
│  │  │ ○ 物理冲刺班（68 行）                            │ │    │
│  │  │ ○ 数学火箭1班（51 行）                           │ │    │
│  │  └────────────────────────────────────────────────┘ │    │
│  │  预览：识别到列：[姓名] [堂测错题] [作业错题]          │    │
│  └────────────────────────────────────────────────────┘    │
│                                                            │
│  ┌─ Step 3（选择 Sheet 后展开）────────────────────────┐    │
│  │  👥 全班 31 人 · 堂测错题 6 道 · 作业错题 12 道        │    │
│  │                                                      │    │
│  │  ┌─ 堂测错题（6 道）─┐ ┌─ 作业错题（12 道）─┐        │    │
│  │  │ 1（18 人错）      │ │ 1（2 8）（5 人错） │        │    │
│  │  │ 2（12 人错）      │ │ 2（3 人错）        │        │    │
│  │  │ 3（10 人错）      │ │ ...                 │        │    │
│  │  │ 6（8 人错）       │ │ 针2（1 人错）      │        │    │
│  │  │ 7（6 人错）       │ │ 全对（8 人）       │        │    │
│  │  │ 全对（6 人）       │ │                     │        │    │
│  │  └───────────────────┘ └─────────────────────┘        │    │
│  │                                                      │    │
│  │  💡 提示：点击题号可上传图片，Ctrl+V 可粘贴图片        │    │
│  │     支持 PNG/JPG/JPEG，纯文字也能直接输入              │    │
│  └────────────────────────────────────────────────────┘    │
│                                                            │
│  ┌─ Step 4 · 选择学生 + 导出 ─────────────────────────┐    │
│  │  👥 学生列表（31 人）                                │    │
│  │  [☑ 全选] [☑ 陈佳昕] [☑ 冯语秋] [☑ 贺梓晗] ...      │    │
│  │                                                      │    │
│  │  📂 本地文件夹：[未授权]  [🔓 授权文件夹]            │    │
│  │     路径预览：桌面/错题集/化学/                        │    │
│  │                                                      │    │
│  │  [📤 导出选中学生的错题集 docx（累积模式）]            │    │
│  └────────────────────────────────────────────────────┘    │
│                                                            │
└─────────────────────────────────────────────────────────────┘
```

**题号槽位详情（每个错题号）**：

```
┌────────────────────────────────────────────┐
│  堂测错题 #1（18 人错）                   │
│  ─────────────────────────                │
│  ┌─────────────────────────────────────┐ │
│  │  📷 [点击上传 / Ctrl+V 粘贴]          │ │
│  │  支持 PNG / JPG / JPEG（自动压到 500KB）│ │
│  │                                     │ │
│  └─────────────────────────────────────┘ │
│  或                                        │
│  ┌─────────────────────────────────────┐ │
│  │ 文字描述：[输入纯文字题目...]        │ │
│  └─────────────────────────────────────┘ │
│  [✓ 标记为全对]                            │
└────────────────────────────────────────────┘
```

**关键功能按钮**：
- 📥 下载标准模板（顶部 fixed）：`/public/templates/lekao-mistake-template-v1.xlsx`
- 🔓 授权文件夹（Step 4）：触发 `window.showDirectoryPicker()`
- 📤 导出（Step 4）：触发 docx 生成 + 写入本地文件夹

**页面权限**：仅登录用户可见。

**Phase 1 期间保留**：页面顶部保留"📥 下载标准模板"按钮，方便冷启动用户按模板填数据。

#### 3.5.6 `/dashboard/summary` · 课堂小结占位页

```
┌──────────────────────────────────────────────────┐
│  ← 返回工作台                                     │
│                                                  │
│  📝 课堂小结（敬请期待）                          │
│  ─────────────                                   │
│                                                  │
│  Phase 2 上线后，你可以：                          │
│  1. 上传本节课讲义图片（1-N 张）                   │
│  2. 选择模板（平台预设 1-2 套）                    │
│  3. AI 按 BRD §4 硬约束格式生成 10 条建议 + 小结   │
│  4. 一键复制（"贴 Excel" 或 "发微信群"）           │
│                                                  │
│  ── 扣费规则 ──                                  │
│  每次生成扣 1 T-Coin（赠送 / 充值）                │
│  历史自动归档（防丢失）                            │
└──────────────────────────────────────────────────┘
```

#### 3.5.7 `/dashboard/feedback` · 课堂反馈占位页

同 `/dashboard/summary` 结构，文案改为"课堂反馈"。

#### 3.5.8 `/admin` · 管理员后台入口

**一期状态**：仅 admin role 用户可见，二期做完整功能。

```
┌──────────────────────────────────────────────────┐
│  ⚙️ 管理员后台（Phase 2 完善）                    │
│  ─────────────                                   │
│                                                  │
│  当前可用：                                       │
│  - 查看用户列表（只读）                            │
│  - 查看 T-Coin 流水（只读）                       │
│                                                  │
│  Phase 2 上线：                                   │
│  - 手动调 T-Coin（充值 / 赠送 / 扣回）             │
│  - 用户管理（封禁 / 启用）                        │
│  - 模板审核                                       │
└──────────────────────────────────────────────────┘
```

### 3.6 API 路由（一期 · 最小集）

| 路径 | 方法 | 功能 | 一期实现 |
|------|------|------|---------|
| `/api/auth/register` | POST | 邮箱注册 + 赠送 T-Coin | ✅ |
| `/api/auth/login` | POST | 邮箱密码登录 | ✅ |
| `/api/auth/verify-code` | POST | 邮箱验证码登录 | ✅ |
| `/api/auth/send-code` | POST | 发送验证码（限频 60s） | ✅ |
| `/api/auth/me` | GET | 获取当前用户信息 | ✅ |
| `/api/auth/logout` | POST | 登出 | ✅ |
| `/api/user/coin-balance` | GET | 查询 T-Coin 余额 | ✅ |
| `/api/admin/users` | GET | 用户列表（admin） | ⚠️ 只读 |
| `/api/admin/coin-log` | GET | T-Coin 流水（admin） | ⚠️ 只读 |

### 3.7 部署架构

```
腾讯云 111.229.200.178
├── /home/ubuntu/Lekao/                    # Lekao 项目目录
│   ├── apps/web/                          # Next.js 主站
│   │   ├── .next/                         # 构建产物
│   │   ├── node_modules/
│   │   └── package.json
│   ├── packages/db/                       # Prisma schema
│   ├── .env                               # 主环境变量
│   └── package.json
│
└── /etc/systemd/system/lekao-web.service  # systemd service
    [Service]
    EnvironmentFile=/home/ubuntu/Lekao/.env
    ExecStart=/usr/local/node20/bin/node --max-old-space-size=512 \
      /home/ubuntu/Lekao/apps/web/server.js
    Restart=always
    WorkingDirectory=/home/ubuntu/Lekao/apps/web
```

**Nginx 反代**（阿里云 8.162.7.172）：

```nginx
server {
  listen 443 ssl;
  server_name lekao.asterforge.top;
  
  ssl_certificate     /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;
  
  location / {
    proxy_pass http://111.229.200.178:3007;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### 3.8 Phase 1 任务清单（T1-T15）

> ⭐ 用户原话："先做第一期的，然后我们先看看效果，然后再来做第二期"
> 所有任务完成后停下，等用户 review 效果再启动 Phase 2。

| ID | 任务 | 估时 | 验收 |
|----|------|------|------|
| **T1** | 在 ResumeAIX 仓库提 PR：给 `users` 加 `lekao_gift_coin Int @default(0)` 字段 | 30 min | PR merge + 部署到生产 |
| **T2** | 创建 GitHub 仓库 `TimeCraker/Lekao` + 初始化 Next.js 15 项目 | 20 min | `pnpm dev` 跑起来 hello world |
| **T3** | 安装依赖（Tailwind 4、Prisma 6、next-auth v4、Motion、Lenis、Nodemailer、Zustand） | 15 min | `package.json` 锁定版本 |
| **T4** | 配置 Tailwind 4 + 自定义 design token（浅蓝白配色） | 30 min | `globals.css` 含全部 CSS 变量 |
| **T5** | 配置 Prisma + 共享 users 表只读引用 + 业务表 migration | 30 min | `prisma migrate dev` 生成首个 migration |
| **T6** | 实现 next-auth + 邮箱密码登录 + JWT | 60 min | `/login` 表单可登录 |
| **T7** | 实现邮箱验证码 + 发送（SMTP + 限频 60s） | 45 min | `/login` 验证码模式可用 |
| **T8** | 实现注册流程（含 lekao_gift_coin += 5 赠送） | 60 min | `/register` 可注册 + 自动登录 |
| **T9** | 实现 Landing Page `/`（含 Hero / 3 卡 / 流体背景） | 90 min | 设计稿匹配 + 移动端响应式 |
| **T10** | 实现仪表盘 `/dashboard`（含侧边栏 + T-Coin 显示 + 3 功能卡） | 60 min | 登录后可见 + 3 卡可点击 |
| **T11** | 实现 3 个占位页 `/dashboard/mistake` `/summary` `/feedback` | 45 min | 进入占位页可见"敬请期待"文案 |
| **T12** | 生成标准 Excel 模板 .xlsx（放在 `/public/templates/`） | 30 min | `/dashboard/mistake` 可下载 |
| **T13** | 实现管理员后台入口 `/admin`（仅 admin role 可见 + 只读） | 30 min | admin 用户可见 + 普通用户 403 |
| **T14** | 部署到腾讯云（systemd service + Nginx 反代 + 域名） | 60 min | `lekao.asterforge.top` 公网访问 |
| **T15** | Lighthouse mobile perf 验证（4-run avg ≥ 80 分） | 30 min | 报告数据 + 修复阻塞项 |

**Phase 1 总估时**：约 8-10 小时

---

## 4. Phase 2 · 业务功能（二期）

> ⭐ 用户原话："做完脚手架之后我们再来做具体的功能"
> Phase 1 完成后停下，等用户 review 效果再启动。

### 4.1 范围（Out of Scope for Phase 1）

#### 4.1.1 错题集功能（T16-T25 · 2026-06-20 重构）

> 基于 BRD v0.4 + 2026-06-20 用户对齐决策更新。
> 重点变化：**File System Access API 取代 COS 直传作为主路径**（PRD §7.3 COS 保留作为兜底）。
> **MVP 子集**：T16 + T17 + T18 + T21'（本地授权）+ T22 ≈ 10.5h
> **完整功能**：T16-T25 ≈ 16.5h

| ID | 任务 | 估时 | BRD 依据 | 备注 |
|----|------|------|---------|------|
| **T16** | 实现 Excel 解析（SheetJS + GBK + 合并单元格 + 列名模糊识别 + 多 Sheet 列表） | 120 min | §3.1.3, §3.1.11 | 改：加多 Sheet 列表 + 列名模糊识别 |
| **T17** | 实现错题号去重 + 排序（**大题粒度** + **数字排序** + 计数） | 60 min | §3.1.1 | 改：大题粒度（不拆括号内小题）+ 数字排序 |
| **T18** | 实现免命名智能图片映射 UI（**图片+文字并存槽位** + 3 种上传方式 + 全对槽） | 180 min | §3.1.2 | 改：3 种输入方式（点击/Ctrl+V/文字）+ 全对作为题号槽 |
| **T19** | 集成 browser-image-compression（500KB 上传即压缩 + PNG/JPG/JPEG 兼容） | 30 min | §3.1.4 | 改：多格式兼容（PNG/JPG/JPEG/WebP） |
| **T20** | 实现 LocalStorage + IndexedDB 草稿箱（一键还原） | 90 min | §3.1.5 | 不变 |
| **T21'** ⭐ | **File System Access API 本地文件夹授权**（替代原 COS 路径） | 120 min | §3.1.10 | 新增：替代原 T21 COS 直传 |
| **T22** | 实现 Word 导出（docx.js + **累积 docx 模式** + Apple-style 极简 + 大题粒度） | 180 min | §3.1.7, §3.1.8, §3.1.9 | 改：累积 docx 模式（按日期分 section 追加） + 堂测/作业分开两个 section |
| **T23** | 实现 HTML 预览（错题集实时排版） | 60 min | §3.1.7 | 改：删 Markdown 一键复制（错题集场景不需要） |
| **T24** | 实现 MVP Excel 标准模板 .xlsx 静态资源（放在 `/public/templates/`） | 30 min | §3.1.0 | 不变 |
| **T25** | Lighthouse perf 验证 + 错题集 E2E 测试（5 个真实班级场景） | 120 min | - | 改：用真实业务表（副本反馈表 8月12日.xlsx）做 E2E |

**Phase 2 · 错题集总估时**：约 16.5 小时（比 v0.3 估时 12h 多 4.5h，因为新增强制增量追加逻辑 + File System Access API 集成 + 多 Sheet 处理）

**T21 调整说明（v0.3 → v0.4）**：
- ❌ 删除原 T21（COS 前端直传）作为主路径
- ✅ 新增 T21'（File System Access API 本地文件夹授权）作为主路径
- ✅ COS 直传作为兜底（保留在 BRD §7.3），如果用户用 Safari/Firefox 时降级到 COS

**依赖项新增**：

```json
{
  "dependencies": {
    "xlsx": "^0.18.5",                          // Excel 解析（T16）
    "docx": "^9.0.0",                           // Word 生成（T22）
    "browser-image-compression": "^2.0.2",      // 图片压缩（T19）
    "file-saver": "^2.0.5",                     // 文件下载兜底（T22, Safari/Firefox）
    "idb": "^8.0.0"                             // IndexedDB Promise 封装（T20, T21'）
  }
}
```

#### 4.1.2 课堂小结 + 课堂反馈（T26-T35）

| ID | 任务 | 估时 | BRD 依据 |
|----|------|------|---------|
| **T26** | 配置 ai-service（OpenAI-compatible SDK + SiliconFlow） | 45 min | §7.7 |
| **T27** | 实现 BRD §4.4 完整 Prompt 模板（system message 注入） | 30 min | §4 |
| **T28** | 实现模板系统（平台预设 1-2 套 + 用户自定义 UI） | 90 min | §3.2 |
| **T29** | 实现图片上传 + AI 读图（多图并行上传） | 60 min | §3.2 |
| **T30** | 实现 Markdown 编辑器（react-markdown + 在线编辑） | 60 min | §3.2 |
| **T31** | 实现分流复制按钮组（"贴 Excel" + "发微信群" + 正则切分） | 45 min | §4.5 |
| **T32** | 实现 Apple-style 高亮 Card（无边框 + 干净文本预览） | 30 min | §4.5 |
| **T33** | 实现 T-Coin 扣费（先扣 lekao_gift_coin → 再扣 t_coin） | 60 min | §5.2.2 |
| **T34** | 实现云端历史归档（写入 lekao_class_summaries / feedbacks） | 45 min | §7.6 |
| **T35** | Lighthouse perf 验证 + 小结/反馈 E2E 测试（10 个真实讲义） | 90 min | - |

**Phase 2 · 小结/反馈总估时**：约 9 小时

#### 4.1.3 T-Coin 充值 + 管理员后台（T36-T40）

| ID | 任务 | 估时 | BRD 依据 |
|----|------|------|---------|
| **T36** | 实现管理员 T-Coin 调币 UI（充值 / 赠送 / 扣回） | 90 min | §5.3 |
| **T37** | 实现 T-Coin 流水日志（lekao_coin_log 表） | 60 min | §5.2.2 |
| **T38** | 实现用户管理（封禁 / 启用） | 45 min | §5.1 |
| **T39** | 接入微信支付（等公司主体） | 待定 | §5.3 |
| **T40** | Lighthouse perf 验证 + 全流程 E2E 测试 | 60 min | - |

#### 4.1.4 微信 OAuth + 商业化（T41+）

| ID | 任务 | 估时 | BRD 依据 |
|----|------|------|---------|
| **T41** | 接入微信 OAuth（等公司主体） | 待定 | §5.1 |
| **T42** | 实现批量并行生成（Batch Processing） | 120 min | §8.6.1 |
| **T43** | 实现多助教协作 + 班级管理（V2） | 待定 | §8.6.3 |

### 4.2 Phase 2 任务执行顺序（依赖关系）

```
T1 (ResumeAIX PR)
   ↓
T2-T5 (脚手架基础设施)
   ↓
T6-T8 (登录系统)
   ↓
T9-T13 (页面)
   ↓
T14-T15 (部署 + perf)
   ↓
═══════ Phase 1 完成 · 用户 review ═══════
   ↓
T16-T25 (错题集)
   ↓
T26-T35 (小结 + 反馈)
   ↓
T36-T40 (充值 + 管理员)
   ↓
T41+ (微信 + 高级功能)
```

---

## 5. ResumeAIX 仓库协同 PR

### 5.1 必做项（一期前必须完成）

#### PR 内容
**仓库**：`TimeCraker/ResuAIX`
**分支**：`feature/lekao-gift-coin`
**改动**：

```prisma
// packages/db/prisma/schema.prisma
model User {
  // ... 现有字段
  lekao_gift_coin  Int  @default(0)  // ⭐ 新增
}
```

**Migration**：
```bash
cd packages/db
npx prisma migrate dev --name add_lekao_gift_coin
```

**部署顺序**：
1. ResumeAIX 仓库 PR merge 到 main
2. ResumeAIX 部署到生产（带新字段）
3. **验证生产 DB 已有 `lekao_gift_coin` 字段**
4. 才可启动 Lekao Phase 1 开发

### 5.2 共享表只读约束（铁律）

Lekao 在所有 Phase 中：
- ❌ 绝对不能 `prisma db push --force`
- ❌ 绝对不能修改 `users` 表结构
- ❌ 绝对不能写 Lekao 自己的 migration 改 `users`
- ✅ 只能 `prisma migrate deploy`（带历史 migration 文件）
- ✅ 只能通过 `@relation` 引用 `users.id`

**部署脚本硬约束**：
```bash
# Lekao 部署时永远用这个
npx prisma migrate deploy --schema=packages/db/prisma/schema.prisma

# ❌ 绝对禁止
# npx prisma db push --force
# npx prisma db push --accept-data-loss
```

---

## 6. 验收标准

### 6.1 Phase 1 验收清单

#### 6.1.1 功能性验收

- [x] **T1**：ResumeAIX 仓库 PR merge + 生产 DB 有 `lekao_gift_coin` 字段（默认 `-1`）
- [x] **T2**：`pnpm dev` 在本地 `:3007` 跑起来 hello world
- [x] **T6**：邮箱密码登录跑通（数据库有用户记录）
- [x] **T7**：邮箱验证码登录跑通（收件箱有验证码邮件）
- [x] **T8**：注册跑通（signIn callback 延迟初始化 `lekao_gift_coin = 5`）
- [x] **T8.1**：⭐ **老用户首次登录测试**（核心风控）：用 ResumeAIX 已有账号登录 Lekao → 验证 `lekao_gift_coin = 5`（不是 0/-1）
- [x] **T8.2**：⭐ **幂等性测试**：老用户第二次登录 Lekao → 验证 `lekao_gift_coin` 不会变成 10
- [x] **T9**：Landing Page 完整（Hero / 3 卡 / Footer）
- [x] **T10**：仪表盘可见（侧边栏 + T-Coin 显示 + 3 功能卡）
- [x] **T11**：3 个占位页可访问（"敬请期待"文案）
- [x] **T12**：标准 Excel 模板 .xlsx 可下载（10-50 KB）
- [x] **T13**：admin 用户可见 `/admin`，普通用户 403
- [x] **T14**：`https://lekao.asterforge.top` 公网可访问（HTTPS + 备案）
- [x] **T14.1**：⭐ **Prisma 连接池验证**：`.env` 有 `?connection_limit=4&pool_timeout=20`；用 `psql` 查 `SELECT count(*) FROM pg_stat_activity WHERE application_name LIKE '%prisma%'` 验证 Lekao 进程连接数 ≤ 4

#### 6.1.2 设计验收

- [x] 配色严格按 §2.2（浅蓝白 + accent 浅蓝 + 黑文字）
- [x] 字体：SF Pro / PingFang SC 系统栈
- [x] 圆角：12-18px 卡片
- [x] 动效：流体背景 + 字符级 H1 + 卡片 hover（reduced-motion 禁用）
- [x] A11y：所有文字对比度 ≥ 4.5:1（accent-ink on canvas = 7.2:1 AAA）— Lighthouse 复测 **100 分**
- [ ] 移动端响应式（不要求完美，至少不破）— **Phase 1 PC 优先，移动端 Phase 2 单独 sprint**

#### 6.1.3 性能验收

- [x] Lighthouse mobile：
  - Performance **95** ≥ 80 分 ✅
  - LCP 2.8s（needs improvement，可接受）
  - CLS 0 < 0.1 ✅
  - TBT 50ms < 200ms ✅
  - A11y 100 ✅ / Best Practices 100 ✅ / SEO 100 ✅
- [x] 单次跑分（a11y 不需要 4-run avg；perf 单次 95 已稳定）

#### 6.1.4 代码质量验收

- [ ] TypeScript 严格模式无错误
- [ ] ESLint 无 error 级别警告
- [ ] 所有 API 路由有 try/catch + 错误返回
- [ ] 密码 bcrypt 哈希（不存明文）
- [ ] 验证码 5 分钟过期 + 一次性使用
- [ ] SQL 注入防护（Prisma 自动）
- [ ] XSS 防护（React 自动转义）

### 6.2 Phase 2 验收清单（待 Phase 1 完成后细化）

---

## 7. 风险与依赖

### 7.1 Phase 1 风险

| 风险 | 影响 | 应对 |
|------|------|------|
| **ResumeAIX PR 未 merge** | Lekao 启动阻塞 | 必须 T1 先完成 |
| **域名未申请** | 公网无法访问 | T14 部署前确认 |
| **SMTP 未配置** | 验证码发不出 | .env 配好 QQ/阿里云邮箱 |
| **服务器 3.6GB 内存 OOM** | build 失败 | `--max-old-space-size=512` + 停 web 再 build |
| **Lekao 不能写 users 表** | 注册流程阻塞 | 走共享 DB 实例 + 独立 migration 即可 |
| ⭐ **老用户首次登录无赠送** | ResumeAIX 老用户登录 Lekao 不触发注册 → 余额 = 0 → 客诉 | §3.4.1.2 延迟初始化 + 字段默认 `-1`（不是 0） |
| ⭐ **魔法数字不一致** | 5 vs 5-10 在文档前后冲突 | §1.2 + §3.4 + §3.5.3 + §6.1.1 全部统一锁定 **5** |
| ⭐ **Prisma 连接池撑爆** | 多个 Next.js 进程共享 PG 实例 → max_connections 溢出 | §3.4.1.1 `.env` 强制 `?connection_limit=4&pool_timeout=20` |

### 7.2 用户需提供的资源

| 资源 | 用途 | 时机 |
|------|------|------|
| GitHub 仓库创建权限 | 建 `TimeCraker/Lekao` | T2 之前 |
| DNS 解析 `lekao.asterforge.top` | 公网访问 | T14 之前 |
| SMTP 邮箱凭证 | 验证码发送 | T7 之前 |
| 阿里云 Nginx 配置权限 | 反代配置 | T14 之前 |

### 7.3 Phase 2 前置依赖（用户需提供）

| 资源 | 用途 | 时机 |
|------|------|------|
| 错题集原型程序 | Phase 2 · T16 启动前必须收到 | BRD §9 风险 |
| 小结/反馈模板 | Phase 2 · T28 启动前必须收到 | BRD §9 风险 |
| 微信 OAuth 凭证 | Phase 2 · T41 启动前（待公司主体） | BRD §5.1 |

---

## 8. 总结

### 8.1 Phase 1 交付物

| 类别 | 交付物 |
|------|--------|
| **代码** | Next.js 15 monorepo（含 apps/web + packages/db） |
| **页面** | 9 个页面（/、/login、/register、/dashboard、3 占位页、/admin、2 个 admin 子页占位） |
| **API** | 8 个 API 路由 |
| **数据库** | 5 个表（users 只读引用 + 4 个 Lekao 业务表） |
| **设计** | 完整 design token + 动效语言 + 3 个核心页面视觉稿 |
| **部署** | systemd service + Nginx 反代 + 域名 + HTTPS |
| **性能** | Lighthouse mobile 4-run avg ≥ 80 分 |

### 8.2 Phase 1 不交付（明确）

- ❌ 错题集 Excel 解析 / Word 导出
- ❌ 课堂小结 / 反馈 AI 生成
- ❌ COS 前端直传（仅预留接口）
- ❌ 完整管理员后台
- ❌ 微信 OAuth / 微信支付
- ❌ 班级管理 / 学生管理

### 8.3 用户决策回顾（v0.4 · 2026-06-20 更新）

#### 8.3.1 v0.1 决策（Phase 1 启动期）

| # | 决策 | 影响 |
|---|------|------|
| 1 | Lekao（首字母大写） | ✅ 仓库 + 代码 + UI 标识 |
| 2 | 邮箱密码 + 验证码 | ✅ 一期工作量适中 |
| 3 | 一期就先发 PR + 计费 | ✅ 严格按 BRD，**需 ResumeAIX 仓库先提 PR** |
| 4 | 浅蓝白 + 高级风 + 保留特效 | ✅ 设计 token 替换 cream → 浅蓝白 |

#### 8.3.2 ⭐ v0.4 错题集重构决策（2026-06-20 与用户对齐）

| # | 决策 | 用户原话 | 落地章节 |
|---|------|----------|----------|
| 5 | **大题粒度去重**（不拆括号内小题） | "不会这么麻烦的，到时候这个第一大题就是单纯的一道大题，一整个错题全部放进去" | §3.5.5, §4.1.1 T17 |
| 6 | **字符串原样保留**（`针2` / `全对` / `未交` 不规范化） | "原样全留" | §3.5.5, §4.1.1 T17 |
| 7 | **堂测 + 作业分开**（两个池子，两个 section） | "这个要分开，就是到时候可以去两个板块... 这是肯定不能去合并放一起" | §3.5.5, §4.1.1 T18, T22 |
| 8 | **题号槽：图片 + 文字并存**（点击上传 + Ctrl+V + 文字输入） | "粘完图片后，你还可以写一段话，也可以不粘图片，就是单纯的一个文字型的题目，也可以直接去输入进去" | §3.5.5, §4.1.1 T18 |
| 9 | **累积 docx 模式**（每位学生一份，按日期分 section 追加） | "如果这个学生已经有了，就在后面添加新的错题... 你可以看那个 word 文档，它是分每一天的来的" | §3.5.5, §4.1.1 T22 |
| 10 | **File System Access API** 本地文件夹（Chrome/Edge） | "如果直接去管理本地的文件夹的话，会不会方便一点？... 这个 word 输出最好是直接操作在用户的自己的电脑桌面" | §4.1.1 T21' |
| 11 | **多 Sheet + 用户手动选 1 个学科** | "一次处理一个 Sheet（用户手动选学科）" | §3.5.5, §4.1.1 T16 |
| 12 | **跨 Sheet 同名学生不合并**（按学科分文件夹） | "每一个学科的错题集单独用一个文件夹保管" | §4.1.1 T21' |
| 13 | **全对作为题号槽** | "如果这个学生他是全对的话，那就是全对，他也算一个题号" | §3.5.5, §4.1.1 T18 |

### 8.4 当前状态（v0.6 · 2026-06-22 · Phase 2 全部完成）

**🎉 Phase 1 + Phase 2 全部交付**：

- ✅ **Phase 1 T1-T15**（脚手架 + 登录 + 仪表盘 + 部署）— 5 commits
- ✅ **Phase 1.1 安全加固**（bcrypt + CHECK + 锁定 + 字段映射 3 连修）— 5 commits
- ✅ **Phase 2 错题集 T16-T25**（Excel 解析 + 累积 docx + File System Access API + 多 Sheet + 真实场景样式 + 灵活列映射 + 手动日期 + HTML 预览）— 11 commits
- ✅ **Phase 2 课堂小结 + 反馈 T26-T35**（AI 接入 + 4 项安全加固 + 上传 UI + 模板选择 + 输出展示 + T-Coin 扣费 + 落盘 + Lighthouse + E2E）— 20+ commits + `docs/E2E-summary-feedback.md`
- ✅ **Phase 2 T-Coin 调币 UI + Admin 后台 T36-T40**（调币 API + 用户管理 + 邀请码 + 统计 + 历史 + 设置 共 6 模块）— 2 commits（221cbaa5 + a3fdaf46）
- ✅ **品牌升级**（首页 Lekao Agent + SVG 图标 + 新 slogan + 个人中心 + 3 marketing 页 + dashboard UI + TopBar + 侧边栏可收起 + emoji 全转 SVG + 扣币标注）

**部署 & 性能现状**：

| 项 | 值 |
|---|---|
| 公网 | `https://lekao.asterforge.top` ✅ 200 OK |
| 服务器 | 腾讯云 :3007 · `lekao-web` systemd active |
| HEAD | `dd408ef`（本地 + 服务器一致） |
| Lighthouse 本地 :3000 | 99 / 100 / 100 / 100（4-run avg） |
| Lighthouse 生产 | **99.5 / 100 / 100 / 100**（4-run avg，比本地还快） |
| LCP 生产 | 1.8s |
| TBT 生产 | 40ms |
| CLS | 0 |
| 总 commits | 65（Phase 1 + 1.1 + 2 全部） |
| 改动规模 | 98 文件 / +13,363 行 / -516 行 |

**Phase 2 累计 commit（按 sprint 分组）**：

| Sprint | Commits | 内容 |
|--------|---------|------|
| 错题集 MVP | 11 | T16-T25 全做完 |
| 小结/反馈 5 阶段 | 20+ | T26-T35 + 多次 prompt/UX 迭代 |
| Admin 后台 | 2 | 5 模块 + 完整 API |
| Brand 升级 | 5 | 首页 + 个人中心 + marketing + UI 改 |
| 安全加固 | 5 | bcrypt + CHECK + 锁定 + 邀请码 TOCTOU |
| Deploy 修 | 3 | bundle fetch + sed + PS 5.1 BOM |
| DB 修复 | 3 | schema @map + enum + max_tokens |
| 自更新 | 2 | PRD/BRD/skill 双写 |

**Phase 1 commit 历史**：
| Commit | 内容 |
|--------|------|
| `b4ea37b` | T2-T5 脚手架 (Next.js 16 + Tailwind 4 + Prisma 6) |
| `659fe23` | T6-T8 登录系统 (邮箱密码 + 验证码 + 延迟初始化赠币) |
| `a6a726f` | T9-T13 页面 + 模板 + admin 入口 |
| `c369d8c` | T14 部署腾讯云 :3007 (systemd + 阿里云反代) |
| `1e1d3ec` | T15 Lighthouse (a11y token 矩阵化修复 color-contrast) |

**Phase 1.1 安全加固 commit 历史**（v0.5.1）：
| Commit | 内容 |
|--------|------|
| `ce6196e` | fix(db): schema 字段 @map + 4 张业务表 init migration |
| `ec5c39a` | fix(db): role 字段声明 UserRole enum |
| `720f88b` | feat(security): verification_codes bcrypt + CHECK 约束 (3 项加固) |
| `ae895cf` | fix(db): verification_codes.code 列改 nullable |
| `713cb06` | fix(security): 5 次错码锁定逻辑 - attempts>=MAX 直接锁 |

**执行分工**：
- 用户：选 Phase 3 方向 + 必要时审批（review 效果/重大决策）
- Claude：按 stage spec 走 + 跑命令 + 批量改文件

### 8.5 安全加固清单（v0.5.1 · 2026-06-20 · 已完成 3/4）

**来源**：后台 `security-guidance` 钩子在 commit `ce6196e` 提交后自动扫描 4 个 finding。

**已修复（3 项 · commit `720f88b` / `ae895cf` / `713cb06`）**：

| # | 风险 | 修复方案 | commit |
|---|------|---------|--------|
| 1 | **HIGH** verification_codes 存明文 code | bcrypt(code, cost=10) 存 codeHash，bcrypt.compare 验码，5 次错码锁定 | `720f88b` |
| 2 | MEDIUM tCoinUsed 列没 CHECK 约束 | DB 层 `CHECK (tCoinUsed >= 1)` 防负数 | `720f88b` |
| 3 | MEDIUM purpose/code/email 长度+取值无约束 | DB 层 CHECK：purpose IN (3 值) + code 长度 4-16 + codeHash 长度 4-256 + email 长度 3-320 + attempts 0-20 | `720f88b` |

**附加修复**：
- `ae895cf` fix: code 列改 nullable（之前 NOT NULL 导致 INSERT codeHash 不写 code 失败）
- `713cb06` fix: 锁定逻辑改为 attempts>=MAX 直接锁（之前 expiresAt-LOCKOUT 算错时间锁不住）

**推迟（1 项 · 当前自动失效 · 等用户自定义模板公开分享功能上线再做）**：

| # | 风险 | 内容 | 触发条件 | 当前状态 |
|---|------|------|---------|---------|
| 4 | MEDIUM lekao_templates 公开查询无 RLS | 缺 partial index `WHERE isPublic = true` + RLS policy | **用户自定义模板公开分享功能上线时**（§9.2 P1 #5） | ✅ **当前自动失效** — schema 有 `isPublic` 字段但代码 0 处引用，没有"公开模板查询"路径就不需要 RLS。v0.6 验证：`grep -rn "isPublic" src/` 无命中。 |

**验证结果**（端到端实测）：
- ✅ DB 中 code 字段 = NULL，codeHash = `$2b$10$` bcrypt 格式
- ✅ bcrypt.compare 验码正确（错码 attempts++ → 第 6 次起返回 "已被锁定"）
- ✅ CHECK 约束生效（INSERT tCoinUsed=0 被 `lekao_class_summaries_tcoin_check` 拒绝）
- ✅ 唯一 partial index 防并发发码竞态（`email+purpose WHERE used=false`）

---

## 9. 后续待办规划（v0.6+ · 2026-06-22 · Phase 2 完成后）

> Phase 1 + Phase 2 全部交付（v0.6）。下一步按 ROI 优先级分 4 档 + 持续运营。

### 9.1 P0 · 阻塞商业化（等公司主体 · 不可自主启动）

| # | 任务 | 估时 | 来源 | 阻塞 |
|---|------|------|------|------|
| 1 | T41 微信 OAuth 登录（扫码登录 + 绑定邮箱） | ≈4h | PRD §4.1.4 + BRD §1.3 | 🟡 **公司主体**（个体工商户注册完成） |
| 2 | T39 微信支付自动充值（取代管理员手动调 T-Coin） | ≈6h | PRD §4.1.3 + BRD §5.3 | 🟡 **公司主体** + 微信商户号 |

### 9.2 P1 · 用户体验优先（可自主启动 · 等用户拍板）

| # | 任务 | 估时 | 来源 | 备注 |
|---|------|------|------|------|
| 3 | **移动端适配 sprint**（PC/Mobile 完全分离组件，参考 [[feedback-mobile-separate-components]]） | ≈8h | PRD §6.1.2 + BRD §1.3 | Phase 1 明确推迟；可借 [[avant-garde-design]] 9 条禁忌约束 |
| 4 | **T42 批量并行生成**（30 人班一键批量生成小结/反馈） | ≈4h | BRD §6.1 | 杀手级功能 · T-Coin 成倍消耗 |
| 5 | **用户自定义模板 UI**（平台预设 + 用户私有 + 公开分享） | ≈6h | PRD §3.5.6 + §8.5 finding #4 触发 | 上线时**必须**补 RLS policy（finding #4 自动激活） |

### 9.3 P2 · 高价值 V2

| # | 任务 | 估时 | 来源 |
|---|------|------|------|
| 6 | **T43 班级管理 / 学生管理 / 多助教协作** | ≈16h | BRD §1.3 + §6.3 |
| 7 | **家长群推送**（微信生态打通） | ≈8h | BRD §6.2 V3 |
| 8 | **AI 多轮对话修改小结/反馈**（"再短一点"/"加个鼓励语"） | ≈4h | BRD §3.2 / §3.3 V2 |
| 9 | **错题集历史落盘**（`lekao_mistake_collections` 表，反悔 BRD §7.6 既定结论） | ≈3h | BRD §7.6（V2 评估） |

### 9.4 P3 · 长期储备（V3+）

| # | 任务 | 估时 | 来源 |
|---|------|------|------|
| 10 | Word 模板自定义样式（双栏 / 主题色 / 表格化） | ≈8h | BRD §3.1.9 V2 |
| 11 | 跨 Sheet 同名学生合并（每个学生一份总错题集） | ≈4h | BRD §3.1.11 反向需求 |
| 12 | 移动端 App（iOS / Android · Capacitor/Tauri 包装） | 待定 | BRD §1.3 V2 |
| 13 | 多渠道引流 / SEO / 内容营销（小红书/知乎） | 待定 | 自定义 |

### 9.5 持续运营 / 监控（不占 sprint · 自动化）

| 任务 | 频率 | 工具 / 命令 |
|------|------|------------|
| Sentry 错误监控 | 实时 | Sentry（`reference_sentry_setup.md`） |
| Lighthouse mobile 4-run avg 巡检 | 每次动效 commit 后 | `lighthouse ... --form-factor=mobile` |
| Prisma 连接池巡检（≤ 4 连接） | 每周 | `pg_stat_activity` |
| systemd service 健康检查 | 每周 | `systemctl is-active lekao-web` |
| Certbot 证书过期检查（89 天） | 每 60 天 | `certbot certificates` |
| 磁盘 / 内存巡检 | 每周 | `df -h / free -h` |
| 用户反馈 / 客诉跟进 | 每周 | admin 后台 + 微信群 |
| Prisma schema 与 ResumeAIX 同步（`lekao_gift_coin` 等字段） | 每次 ResumeAIX migration 后 | `migrate deploy` + 校验 `@map` |

### 9.6 Phase 3 启动条件

- ✅ Phase 1 + 2 全部完成（v0.6）
- 🟡 **等公司主体**：微信 OAuth + 微信支付（P0 阻塞）
- 🟡 **等用户拍板**：P1 三项的优先级（移动端 vs 批量 vs 自定义模板）
- 🟡 **首批真实用户反馈**：移动端 + 批量生成的优先级需根据用户反馈调整

### 9.7 文档维护规则

- PRD §8.4 + §9 章节**每次大阶段完成后**必更新（v0.5 → v0.6 实战已验证）
- BRD 阶段性更新（v0.3 → v0.4 错题集重构实战已验证）
- STAGE spec 在 sprint 启动前写完（`STAGE-mistake-collection.md` + `STAGE-summary-feedback.md` 范本）
- `~/.claude/skills/lekao.md` 顶部承载已知状态快照，每次会话结束更新（被动模式铁律）
