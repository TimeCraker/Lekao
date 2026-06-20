---
description: '部署/运维/管理 Lekao AI 智能助教助手（Next.js 16 + Prisma 6 + PostgreSQL · 独立仓库 · 腾讯云 :3007 · lekao.asterforge.top）'
---

> 执行前先 Read `~/.claude/skills/lekao.md` 获取完整知识（项目位置/服务清单/Prisma 安全/反模式/故障排查）。
> **被动模式**：用户没说要操作时，不主动跑检查命令。

## 📍 当前进度（2026-06-20 · 第 4 轮更新 · Phase 1 全部完成）

### ✅ Phase 1 T1-T15 全部完成

| Commit | 内容 |
|--------|------|
| `b4ea37b` | T2-T5 脚手架 (Next.js 16 + Tailwind 4 + Prisma 6) |
| `659fe23` | T6-T8 登录系统 (邮箱密码 + 验证码 + 延迟初始化赠币) |
| `a6a726f` | T9-T13 页面 + Excel 模板 + admin 入口 |
| `c369d8c` | T14 部署腾讯云 :3007 (systemd + 阿里云反代) |
| `1e1d3ec` | T15 Lighthouse (a11y token 矩阵化修复 color-contrast 95→100) |

**公网**：`https://lekao.asterforge.top` · 200 OK · systemd `lekao-web` active
**Lighthouse mobile**：Performance 95 / A11y 100 / Best Practices 100 / SEO 100

### 📋 Phase 2 候选项（等用户决定方向）
- T16-T25 错题集（Excel 解析 + Word 导出 + File System Access API）
- T26-T35 课堂小结 + 反馈（接 DeepSeek API + T-Coin 扣费）
- T36-T40 T-Coin 充值 + 管理员后台
- T41+ 微信 OAuth + 商业化（等公司主体）

## 支持的操作

| 命令 | 说明 |
|------|------|
| `/lekao deploy` | **核心**：git bundle → SCP → 服务器 fetch bundle → rebuild → restart service |
| `/lekao status` | 服务状态 + 端口 + DB 连接 + 公网 + 磁盘/内存 |
| `/lekao logs` | 拉取 systemd / Next.js / Prisma 日志（支持实时 `-f`） |
| `/lekao restart` | 重启 lekao-web service |
| `/lekao db-migrate` | 安全跑 `prisma migrate deploy`（**禁 db push --force**） |
| `/lekao lighthouse` | 跑 Lighthouse mobile 验证 (perf/a11y/bp/seo) |

## 信息速查

**项目**：Lekao（AI 智能助教助手）— 让培训机构助教从"抄错题、写小结、写反馈"里解放出来，每次课省 1-2 小时
**仓库**：`TimeCraker/Lekao`（独立 Git 仓库，**不是** ResumeAIX monorepo）
**文档**：`C:\Users\TimeCraker\Desktop\my_workspace\lekao\docs\PRD.md`（52KB）
**部署**：腾讯云 `111.229.200.178:3007` ← 阿里云反代 `lekao.asterforge.top`
**服务器**：腾讯云 3.6GB（ubuntu@111.229.200.178）+ 阿里云 SSL 终端（root@8.162.7.172）
**DB**：PostgreSQL `localhost:5434/resumeaix`（共享 DB 实例，**Lekao users 表只读引用**）

## 核心部署流程（CLAUDE.md 跨境抽风兜底）

```bash
# 本地打包 git bundle (注意: 用 `main` 不是 `HEAD`,bundle 才带 refs/heads/main ref)
git bundle create /tmp/lekao.bundle main

# SCP bundle + .env 到服务器
scp -i <tencent-key> /tmp/lekao.bundle ubuntu@111.229.200.178:/tmp/lekao.bundle
scp -i <tencent-key> .env ubuntu@111.229.200.178:/home/ubuntu/Lekao/.env

# 服务器 fetch bundle (用 main:main-new 命名临时 ref, bundle 不带 refs/ 前缀)
ssh -i <tencent-key> ubuntu@111.229.200.178 '
  cd /home/ubuntu/Lekao
  git fetch /tmp/lekao.bundle main:main-new
  git reset --hard main-new
  git branch -D main-new
  rm -f /tmp/lekao.bundle
  export PATH=/usr/local/node20/bin:$PATH
  NODE_OPTIONS=--max-old-space-size=1536 pnpm build
  sudo systemctl restart lekao-web
  sleep 4
  curl -sI http://localhost:3007 | head -1
'
```

完整脚本：`scripts/deploy-production.ps1`（一键跑）

## 三铁律（PRD §3.4.1 + BRD §7.2）

1. **共享 users 表只读**：Lekao 永远不修改 users 表结构，**禁 prisma db push --force**
2. **Prisma 连接池**：`.env` `DATABASE_URL` 必须带 `?connection_limit=4&pool_timeout=20`
3. **延迟初始化赠币**：`lekao_gift_coin` 默认 -1，signIn callback 检测 == -1 才补发 5 枚

## 实战避坑（部署/反代/SSH）

| 坑 | 教训 |
|----|------|
| 阿里云 `aliyun-proxy.conf` 已声明 `server_name lekao.asterforge.top` (Certbot 自动加 `:3007` 直连) | 新加 serverblock 触发 `conflicting server name` 警告，nginx 取先声明者 → 不要新加文件，直接 `sed` 改 `aliyun-proxy.conf` 内 lekao 段 `:3007` → 无端口（走腾讯云 nginx :80 分流） |
| `git bundle create HEAD` 不带 `refs/heads/main` ref | 服务器 fetch 报 "couldn't find remote ref main" → 用 `git bundle create <file> main` |
| 服务器 fetch bundle 用 `'refs/heads/main:refs/heads/main-new'` 报 "couldn't find remote ref" | bundle 不像 remote，没 `refs/heads/` 前缀 → 用 `'main:main-new'` |
| 腾讯云 3007 端口入站被安全组挡 | 阿里云反代必须走腾讯云 :80 (nginx server_name 分流) 而不是直连 :3007 |
| Prisma 6 client 字段是 snake_case（`lekao_gift_coin` / `t_coin`）不是 camelCase | TS 报错 "Property does not exist" → sed 全局替换 + next-auth.d.ts 类型扩展 |
| WCAG AA: 柔和 brand color (blue-500 #3b82f6) 在白背景上 3.67:1 < 4.5:1 | 加 `--accent-text #1d4ed8` token（blue-700, 5.21:1）+ `--success-text #047857` |

## 自动进化机制

每次执行后自动检查新知识：
1. 有新知识 → 同步更新 2 个文件（command + skill，双写到本机 + repo `lekao/.claude/`）
2. 无新知识 → 跳过