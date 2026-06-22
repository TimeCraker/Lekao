# LeKao · AI 智能助教助手

> 让培训机构助教从"抄错题、写小结、写反馈"的重复工作里解放出来，每次课省 1-2 小时。

[![在线体验](https://img.shields.io/badge/在线体验-lekao.asterforge.top-blue)](https://lekao.asterforge.top)
[![技术栈](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748)](https://prisma.io)
[![License](https://img.shields.io/badge/license-Private-red)]()

---

## ✨ 项目定位

**LeKao** 是一款面向 K12 培训机构助教 / 学管 / 班主任的 AI 工作台：

- 📝 **课堂小结**：上传讲义图片，AI 自动识别学科 + 章节 + 知识点，按 BRD 硬约束格式生成"10 条反馈 + 一段小结"
- 📋 **作业/堂测反馈**：上传讲义图片，AI 生成逐题反馈 + 作业总体小结（4 挡字数：标准/×1.5/×2/×3）
- 📚 **错题集 Word 生成**：Excel 模板 + 拖拽题目图片 → 5 分钟生成全班 Word 错题文档（**永久免费**）
- 💰 **T-Coin 体系**：注册即送 5 枚，每次生成消耗 1 枚

**目标用户**：K12 培训机构助教（每次课抄错题、写小结、写反馈要 1-2 小时）

---

## 🛠 技术栈

| 层 | 选型 | 理由 |
|----|------|------|
| 前端 | **Next.js 16** App Router + React 19 | SSR + 流式响应 + Server Components |
| 样式 | **Tailwind 4** + 设计 token | 主题色：`--ink` / `--canvas` / `--signal` |
| 数据库 | **PostgreSQL** + Prisma 6 | 类型安全 + Migration 管控 |
| 认证 | **next-auth v4** + JWT | 邮箱密码 + 邮箱验证码 |
| 视觉模型 | **Qwen3-VL-8B-Instruct**（硅基流动）| 读图提取学科/章节/知识点 |
| 文本模型 | **DeepSeek-V4-Flash** | 低延迟 + 标准输出 |
| 部署 | 腾讯云 3.6GB 单进程 + nginx 反代 | systemd + cgroup v2 监控 |
| Word 生成 | **docx** 库 + **JSZip** | 纯前端生成 .docx |
| 图片压缩 | **browser-image-compression** + Web Worker | 移动端自动降级（1280px / 0.4MB） |

---

## 📁 目录结构

```
lekao/
├── src/
│   ├── app/
│   │   ├── (marketing)/      # 公开站（landing + about + privacy + terms）
│   │   ├── api/              # 后端路由（auth + summarize + mistake + coin + admin）
│   │   ├── dashboard/        # 登录后（summary / feedback / mistake / usage-guide）
│   │   ├── login/            # 登录
│   │   ├── register/         # 注册
│   │   ├── admin/            # 管理员后台
│   │   ├── banned/           # 封禁提示页
│   │   ├── icon.tsx          # Favicon（动态生成）
│   │   ├── apple-icon.tsx    # Apple Touch Icon
│   │   ├── opengraph-image.tsx # 社交分享卡片
│   │   ├── robots.ts         # robots.txt
│   │   ├── sitemap.ts        # sitemap.xml
│   │   └── layout.tsx        # 根布局 + 全局 metadata
│   ├── components/
│   │   ├── landing/          # Hero + FeatureCards + Stats + FAQ
│   │   ├── summary/          # 课堂小结 + 反馈生成 UI
│   │   ├── mistake/          # 错题集生成 UI
│   │   ├── icons/            # SVG 图标库
│   │   └── ...
│   ├── lib/
│   │   ├── ai/               # prompts + vision + text（DeepSeek / Qwen 封装）
│   │   ├── auth/             # next-auth 配置
│   │   ├── coin/             # T-Coin 扣费 + 流水
│   │   ├── image-compress.ts # 共享图片压缩工具（移动端降级）
│   │   ├── storage/          # IndexedDB 本地历史
│   │   ├── mistake/          # 错题集 Excel 解析 + Word 生成
│   │   ├── summary/          # 小结输出解析
│   │   ├── prisma.ts         # Prisma Client 单例
│   │   └── ...
│   └── proxy.ts              # ⭐ banned 中间件（Next 16 改名 middleware → proxy）
├── prisma/
│   ├── schema.prisma         # 数据模型
│   └── migrations/           # 迁移历史（**禁 db push --force**）
├── scripts/
│   ├── deploy-production.ps1 # 一键部署（git bundle + SCP + fetch + rebuild）
│   └── run_real_e2e.ps1      # 真实 LLM e2e 测试
├── docs/
│   ├── PRD.md                # 产品需求文档（v0.6）
│   ├── BRD.md                # 业务需求文档
│   └── ARCHITECTURE.md       # 系统架构图
└── public/
    └── lekao-mark.svg        # Logo 矢量源
```

---

## 🚀 本地开发

### 前置条件

- Node 20+ / pnpm
- PostgreSQL 14+
- DeepSeek API Key（[deepseek.com](https://deepseek.com)）
- 硅基流动 API Key（[siliconflow.cn](https://siliconflow.cn)）

### 安装步骤

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env：DATABASE_URL / DEEPSEEK_API_KEY / SILICONFLOW_API_KEY

# 3. 数据库迁移
pnpm prisma migrate deploy

# 4. 启动开发服务器
pnpm dev
# → http://localhost:3000
```

---

## 📦 部署

### 一键部署到腾讯云

```bash
./scripts/deploy-production.ps1
```

**部署流程**：
1. 本地 `git bundle create <file> main`
2. SCP bundle + `.env` 到腾讯云
3. 服务器 `git fetch <bundle> main:main-new` + `reset --hard`
4. `pnpm build` + `systemctl restart lekao-web`

**架构**：

```
[用户] → 阿里云 SSL 终端 (lekao.asterforge.top :443)
        ↓ 反向代理
       腾讯云 (111.229.200.178 :80)
        ↓ nginx server_name 路由
       Lekao Next.js (:3007 systemd)
        ↓ Prisma 6 connection_limit=4
       PostgreSQL localhost:5434/resumeaix
```

详见 [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

---

## 🔒 核心安全设计

详见 [PRD §3.4.1 + §9 P0](./docs/PRD.md)：

1. **共享 users 表只读**：Lekao 永远不修改 ResumeAIX 共享的 users 表结构（**禁 `prisma db push --force`**）
2. **Prisma 连接池**：`.env` DATABASE_URL 必须带 `?connection_limit=4&pool_timeout=20`
3. **延迟初始化赠币**：`lekao_gift_coin` 默认 -1，signIn callback 检测 == -1 才补发 5 枚
4. **banned 双层防护**：`authorize` + `signIn` callback + `verify-code` + `proxy.ts` 四层拦截
5. **全局并发限流**：summarize 5 并发 + 队列 + 60s 超时（防 AI provider 滥用）
6. **Rate Limit**：每用户 5 次 / 60s（防刷）
7. **AI 错误友好提示**：402 余额不足 / 429 限流 / 超时 → 转成 SSE `__ERROR__` 事件，前端展示友好文案

---

## 📊 监控

- **systemd + cgroup v2** memory 监控（`/usr/local/bin/lekao-monitor.sh` 每 5 分钟）
- **QQ SMTP 告警**：超过 80% 内存 / 进程死掉立刻推送到 QQ 邮箱
- **nginx limit_req**：20r/s + burst 50（防 DDoS）

---

## 🤝 致谢

- 视觉模型：[Qwen3-VL-8B-Instruct](https://qwenlm.github.io/)（通义千问团队）
- 文本模型：[DeepSeek-V4-Flash](https://deepseek.com)（深度求索）
- 图像压缩：[browser-image-compression](https://github.com/Donaldcwl/browser-image-compression)
- Word 生成：[docx](https://docx.js.org/)
- 流式响应：[motion](https://motion.dev/)

---

## 📄 许可证

Private · 暂不开源

---

<p align="center">
  <img src="./public/lekao-mark.svg" alt="LeKao" width="64" />
  <br />
  <sub>© 2026 LeKao · AI 智能助教助手</sub>
</p>
