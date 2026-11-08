# LeKao 系统架构

> 2026-06-22 更新

> ⚠️ **历史背景文档**（`docs/ai-delivery/README.md` 已明示本文件仅作历史背景）。以下内容为 2026-06 时点快照，与现状的已知漂移：①部署拓扑已由「阿里云 SSL 终端 → 腾讯云」双层反代迁移为**腾讯云 nginx 直接终止 TLS**（旧 IP `<your-proxy-ip>` 不再使用）；②数据模型的独立 `lekao_users` 表并不存在，实际为共享 `users` 表（含 `lekao_gift_coin` / `t_coin` 列）+ Lekao 专属业务表，以 `prisma/schema.prisma` 为准；③「微信支付」规划已随 **2026 免费模式定版**（签到得 T-Coin，不付费不充值）废止。现状以代码、`.claude/skills/lekao.md` 与 `docs/ai-delivery/` 为准。

---

## 🌐 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                         用户层                                │
│  PC 浏览器 / 移动端浏览器 / 微信 / QQ 分享卡片                  │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS (443)
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              阿里云 SSL 终端 (root@<your-proxy-ip>)              │
│              lekao.asterforge.top                            │
│              Certbot 自动续签 SSL                             │
│              proxy_set_header X-Real-IP $remote_addr          │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP (80)
                         ↓
┌─────────────────────────────────────────────────────────────┐
│            腾讯云主服务器 (ubuntu@<your-server-ip>)            │
│              nginx (server_name lekao.asterforge.top)        │
│              limit_req_zone 20r/s + burst 50                 │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP (3007)
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              Lekao Next.js 16 (systemd lekao-web)           │
│              单进程 / max-old-space-size=1536MB              │
│              ⭐ runtime: nodejs / maxDuration: 60s           │
└────────────────────────┬────────────────────────────────────┘
                         │ Prisma 6 (connection_limit=4)
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL localhost:5432/lekao            │
│              (与 ResumeAIX 共享 DB 实例, users 表只读)         │
└─────────────────────────────────────────────────────────────┘
                         │
                         │ HTTPS (443)
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                  AI Provider 外部服务                         │
│   DeepSeek API (deepseek-v4-flash)         文本生成           │
│   SiliconFlow API (Qwen3-VL-8B)            视觉识别           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 核心业务流程

### 1. 用户注册 + 首次登录

```
用户在 /register 填邮箱密码
  ↓
POST /api/auth/verify-code (发验证码)
  ↓
POST /api/auth/register (校验验证码 + bcrypt 哈希密码)
  ↓
写入 lekao_users 表 (lekao_gift_coin = -1 标记)
  ↓
自动 next-auth signIn → signIn callback 检测 gift_coin == -1
  ↓
UPDATE lekao_users SET lekao_gift_coin = 5 WHERE id = ?
  ↓
签发 JWT (30 天有效期)
  ↓
302 → /dashboard
```

### 2. 课堂小结生成

```
用户在 /dashboard/summary 上传讲义图片 (1-5 张)
  ↓
前端: browser-image-compression (移动端自动降级 1280px/0.4MB)
  ↓
POST /api/lekao/summarize
  ↓
middleware: auth + banned 拦截 + Rate Limit (5/min) + 并发限流 (5/instance)
  ↓
扣费前置: deductCoin() → 优先扣 lekao_gift_coin, 不足扣 t_coin
  ↓
视觉识别: Qwen3-VL-8B (提取 subject + topic + keyPoints)
  ↓
文本生成: DeepSeek-V4-Flash 流式 (SSE)
  ↓
前端流式渲染 (parsed.feedback + parsed.summary)
  ↓
落盘: lekao_class_summaries 表 (用户历史可查)
  ↓
前端保存到 IndexedDB (本地历史)
```

### 3. 错题集 Word 生成

```
用户在 /dashboard/mistake 下载 Excel 模板
  ↓
填写题号 + 拍照题目 → 上传
  ↓
前端: ExcelJS 解析 + FileReader 读取图片
  ↓
前端: docx 库 + JSZip 生成 .docx (纯前端, 不调 AI)
  ↓
FileSaver.saveAs() 下载到本地
  ↓
**完全免费, 不消耗 T-Coin**
```

---

## 🔒 安全设计

### 四层 banned 拦截

```
用户访问 /dashboard/*
  ↓
1. next-auth authorize() → 查 DB banned 字段 → banned = true → 拒登录
  ↓
2. next-auth signIn() callback → banned 检测 → 阻止创建 session
  ↓
3. /api/auth/verify-code → banned 用户无法发验证码
  ↓
4. proxy.ts (Next 16 middleware 改名) → banned 用户访问受保护路由 → 302 /banned
```

### Rate Limit 双层

```
Layer 1 (用户级):  Map<email, timestamps[]>  每用户 5 次 / 60s
Layer 2 (全局并发): semaphore (5/instance + 队列 100 + 60s 超时)
```

### AI 错误友好分类

```
DeepSeek API 抛错
  ↓
classifyAIError(err)
  ↓
  402 → AI_INSUFFICIENT_BALANCE → "AI 服务余额暂时不足"
  429 → AI_RATE_LIMITED → "AI 服务请求过于频繁"
  timeout → AI_TIMEOUT → "AI 生成超时"
  context_length → AI_CONTEXT_TOO_LONG → "输入内容过长"
  其他 → AI_GENERATION_FAILED → "AI 生成失败"
  ↓
SSE __ERROR__ 事件 → 前端友好文案展示
```

---

## 📊 数据模型

```sql
-- 共享自 ResumeAIX, 只读引用
users (id, email, password, role, banned, ...)

-- Lekao 专属
lekao_users (id, email, lekao_gift_coin, t_coin, created_at)

-- T-Coin 流水（防客诉核心）
coin_log (id, user_id, source, amount, reason, balance_after, created_at)

-- 审计日志
audit_log (id, user_id, action, target_id, meta, ip, created_at)

-- 验证码
verify_codes (id, email, code, expires_at, used, created_at)

-- 课堂小结
lekao_class_summaries (id, user_id, subject, topic, feedback_text, summary_text, t_coin_used, created_at)

-- 作业堂测反馈
lekao_class_feedbacks (id, user_id, subject, topic, feedback_text, description, t_coin_used, created_at)
```

---

## 📈 监控与告警

```
cron */5 * * * * → /usr/local/bin/lekao-monitor.sh
  ↓
检测 lekao-web systemd 状态
  ↓
检测 cgroup v2 memory.current (按 PID 精确识别, 不误杀)
  ↓
内存 > 80% / 进程 dead → QQ SMTP 推送到管理员邮箱
```

详见 `~/.claude/skills/lekao.md` "监控告警" 章节。

---

## 🔧 部署流程

```
本地 (Windows)
  ↓ git bundle create <file> main
  ↓ scp <file> + .env → 腾讯云
服务器 (Ubuntu 22.04)
  ↓ git fetch <bundle> main:main-new
  ↓ git reset --hard main-new
  ↓ pnpm build
  ↓ sudo systemctl restart lekao-web
  ↓ curl -sI http://localhost:3007 | head -1
```

**跨境网络抽风兜底**：bundle + SCP（不走 GitHub 直连）

---

## 🔗 上下游

- **上游**：ResumeAIX（共享 DB + users 表结构）
- **下游**：暂无（独立商业产品）
- **未来**：微信 OAuth（等公司主体）；~~微信支付~~（已随 2026 免费模式定版废止）
