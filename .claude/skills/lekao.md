# Lekao AI 智能助教助手 - 知识库

最后更新：2026-06-20（第 5 轮更新 · Phase 1 全部完成）

---

## ⚠️ 被动模式铁律（2026-06-20 用户原话）

> "不用去检查这个端口，这个 skill 还是有问题，就是你只需要了解上下文就可以了，好吧？就是我要你操作的时候，你再去操作，就是你先不要自己贸然的，就是你知道这个服务器是什么状态就是可以了，而不是就是每次这个 skill 就应该写上次的状态是什么样子的，你只要了解就可以了。然后接下来怎么做？嗯，听我的指令，好吗"

**规则**：
- `/lekao`（无子动作）被调用 → **Read skill 了解上下文，不跑任何检查命令**
- `/lekao <子动作>` 被调用 → 才执行对应操作
- skill 顶部承载**已知状态快照**，不是实时值（避免每次调用都跑 status）
- 反模式：调用 `/lekao` 后主动 `systemctl status` / `curl :3007` / `docker ps`

---

## 📌 已知状态快照（2026-06-20 Phase 1 完成 · 仅供参考）

> **不是实时值**。要确认当下状态 → 用户指令触发对应 status 操作。

### 1. 服务状态（部署成功）
| 服务 | 端口 | 状态 |
|------|------|------|
| `lekao-web` (systemd) | :3007 | ✅ active + enabled (Lekao Next.js 16.2.9) |
| Docker `resumeaix-postgres` | :5434 | ✅ Up 3+ weeks healthy |
| Docker `resumeaix-redis` | :6380 | ✅ Up 3+ weeks healthy |

### 2. 服务器环境（腾讯云 111.229.200.178 · 3.6GB / ubuntu）
| 项 | 值 |
|----|----|
| Node | v20.18.1 ✅ |
| pnpm | 9.15.9 ✅ (在 `/usr/local/node20/bin/`, **PATH 不默认包含,需 export**) |
| npm | 10.8.2 ✅ |
| git | 2.43.0 ✅ |
| Docker | postgres + redis 已跑 |

### 3. 部署状态（公网 `lekao.asterforge.top` → 阿里云反代 → 腾讯云 :3007）
- DNS：lekao.asterforge.top → 8.162.7.172 ✅
- SSL：certbot 已签（89 天有效）✅
- Nginx 反代：aliyun-proxy.conf lekao 段已配置（:80 → 腾讯云 :80 → nginx server_name 分流 → :3007）✅
- 腾讯云：nginx `/etc/nginx/conf.d/lekao.conf` 已加（server_name lekao.asterforge.top → 127.0.0.1:3007）✅
- systemd：`/etc/systemd/system/lekao-web.service` 已启用 ✅
- 公网验证：`HTTP/1.1 200 OK` ✅

### 4. 本地仓库（`C:\Users\TimeCraker\Desktop\my_workspace\lekao`）
- HEAD = `1e1d3ec`（a11y token 修复）
- 5 个 commit：`b4ea37b` / `659fe23` / `a6a726f` / `c369d8c` / `1e1d3ec`
- 服务端 HEAD = 本地 HEAD ✅（三端一致）
- ⚠️ **GitHub origin 还未配置**（deploy 用 bundle + SCP，不依赖 GitHub）

### 5. ResumeAIX 同步状态
- HEAD = `ab03b08`（三端同步完成）✅
- `lekao_gift_coin Int @default(-1)` 字段已在生产 PG 部署，14 个用户 = -1 ✅

### 6. Lighthouse Mobile（2026-06-20 v0.5）

| 指标 | 分数 | 阈值 | 状态 |
|------|------|------|------|
| Performance | 95 | >90 good | ✅ |
| A11y | 100 | 100 | ✅ 完美 |
| Best Practices | 100 | 100 | ✅ |
| SEO | 100 | 100 | ✅ |
| LCP | 2.8s | <2.5s good | 🟡 needs improvement（可接受） |
| CLS | 0 | <0.1 | ✅ |
| TBT | 50ms | <200ms | ✅ |

---

## 📋 Phase 1 任务状态（PRD §3.8 · T1-T15）

| ID | 任务 | Commit | 状态 |
|----|------|--------|------|
| T1 | ResumeAIX PR (加 lekaoGiftCoin) | (PR #1 merged) | ✅ |
| T2-T5 | 脚手架 (Next.js 16 + Tailwind 4 + Prisma 6) | b4ea37b | ✅ |
| T6-T8 | 登录系统 (邮箱密码 + 验证码 + 延迟初始化赠币) | 659fe23 | ✅ |
| T9-T13 | 页面 + Excel 模板 + admin 入口 | a6a726f | ✅ |
| T14 | 部署腾讯云 :3007 | c369d8c | ✅ |
| T15 | Lighthouse mobile 95/100/100/100 | 1e1d3ec | ✅ |

---

## 🎯 Phase 2 候选项（等用户指令决定）

| Sprint | 任务 | 工作量 | 阻塞 |
|--------|------|--------|------|
| 错题集 MVP | T16 + T17 + T18 + T21' + T22 | ≈10.5h | 错题集原型程序 |
| 课堂小结+反馈 | T26-T35 | ≈9h | DeepSeek API 配通 + 模板 |
| T-Coin 充值+管理 | T36-T40 | ≈5h | 管理员 UI 设计 |
| 微信 OAuth+商业化 | T41+ | 待定 | 公司主体 |

---

## 🚫 用户已叫停的事

- **主动跑 status / curl / docker ps**（被动模式，等指令）
- **写 Phase 2 业务代码**（等用户决定 Phase 2 方向）

---

## 触发场景

部署/运维/管理 Lekao AI 智能助教助手项目（与 `/resumeaix` 平行的独立产品，Next.js 16 + Prisma 6 + PostgreSQL）。

## 数据源 / 操作对象

**mixed**（项目 + 远程服务器 + PostgreSQL DB）

- **项目**：`C:\Users\TimeCraker\Desktop\my_workspace\lekao`（独立 Git 仓库 `TimeCraker/Lekao`）
- **腾讯云服务器**：111.229.200.178（3.6GB / ubuntu / 应用服务器）
- **阿里云服务器**：8.162.7.172（SSL 终端 + Nginx 反向代理）
- **PostgreSQL**：5434（与 ResumeAIX 共享实例，**Lekao users 表只读引用**）

## 信息速查

### 项目定位

让培训机构助教从"抄错题、写小结、写反馈"里解放出来，每次课省 1-2 小时。

### 三大核心功能（BRD §3）

| 功能 | 计费 | 实现阶段 |
|------|------|---------|
| 错题集生成 | ❌ 免费 | Phase 2 |
| 课堂小结 | 1 T-Coin/次 | Phase 2 |
| 课堂反馈 | 1 T-Coin/次 | Phase 2 |

### 项目元数据

- **项目名**：Lekao（首字母大写）
- **仓库**：`TimeCraker/Lekao`（独立 Git 仓库，**不是** ResumeAIX monorepo — BRD §7.0 既定结论）
- **域名**：`lekao.asterforge.top`（DNS 已指向阿里云 8.162.7.172，SSL 已签 89 天有效）
- **部署路径**：`/home/ubuntu/Lekao/`（**单仓 flat 结构**，不是 monorepo — Next.js 16 默认）
- **端口**：`:3007`
- **DB**：PostgreSQL `localhost:5434/resumeaix`（共享 DB 实例，库名沿用 resumeaix）
- **Redis**：`localhost:6380`（共享）
- **AI 底座**：SiliconFlow / DeepSeek（OpenAI-compatible，共享 ResumeAIX 密钥 · Phase 2 启用）

### 服务器清单

| 角色 | IP | 用户 | 密钥路径 |
|------|-----|------|----------|
| 腾讯云（Lekao 应用服务器） | 111.229.200.178 | ubuntu | `C:\Users\TimeCraker\Desktop\my_workspace\asterforge-deploy\ssh-keys\tencent_server_key.pem` |
| 阿里云（SSL 终端 + 反代） | 8.162.7.172 | root / admin | `C:\Users\TimeCraker\Desktop\my_workspace\asterforge-deploy\ssh-keys\aliyun-ecs-login.pem` |

### SSH 连接速查

```bash
# 腾讯云
ssh -F /dev/null -i "C:\Users\TimeCraker\Desktop\my_workspace\asterforge-deploy\ssh-keys\tencent_server_key.pem" \
  -o ConnectTimeout=15 -o StrictHostKeyChecking=no ubuntu@111.229.200.178

# 阿里云
ssh -F /dev/null -i "C:\Users\TimeCraker\Desktop\my_workspace\asterforge-deploy\ssh-keys\aliyun-ecs-login.pem" \
  -o ConnectTimeout=15 -o StrictHostKeyChecking=no root@8.162.7.172
```

### 数据库

- **PostgreSQL**（Docker `resumeaix-postgres`）：`localhost:5434`
- **用户**：`postgres` / 密码：`postgres`
- **库**：`resumeaix`
- **Redis**（Docker `resumeaix-redis`）：`localhost:6380`

### ⭐ T-Coin 池子架构（BRD §5.2.2 既定结论 — 选项 B）

```
users.t_coin              = 充值 T-Coin（ResumeAIX/Lekao/Interview Helper 跨产品共享）
users.lekao_gift_coin     = Lekao 注册赠送（仅限 Lekao 消耗）
```

- **扣费优先级**：先扣 `lekao_gift_coin` → 再扣 `t_coin`
- **赠送额度**：注册 / 首次登录 = **5 T-Coin**（锁死，不再 5-10，PRD §1.2 决策 #5）
- **`lekao_gift_coin` 字段默认 -1**（未初始化），**signIn callback 延迟初始化为 5**（PRD §3.4.1.2）

### 设计语言（PRD §2 · 与 my-portfolio 同源，色板替换）

- **主色**：浅蓝白（`--canvas: #fafbfc` / `--accent: #3b82f6` / `--accent-ink: #1e40af`）
- **WCAG AA 修复（v0.5）**：
  - `--accent-text: #1d4ed8`（blue-700, 5.21:1 vs white）— CTA 按钮底色专用
  - `--success-text: #047857`（green-700, 5.94:1 vs white）— success tag 文字专用
  - `--success-soft: #d1fae5`（green-100）— success tag 背景专用
- **字体**：SF Pro / PingFang SC 系统栈
- **动效**：保留流体 mesh gradient + 字符级 3D H1 + Lenis 平滑滚动
- **硬约束**：参考 [[feedback-avant-garde-design]] 9 条禁忌：
  1. 整页 transform 倾斜禁忌（只在局部组件）
  2. 装饰类动效 ≤1/页（Mask Shine / 流光 / trail）
  3. 主色不被 accent 抢（teal/amber 只用于局部强调）
  4. 装饰层 scoped（不整屏 fixed inset-0）
  5. 移动端物理隔离（PC/Mobile 完全分离组件，不是 max-md: 隐藏）
  6. prefers-reduced-motion 双层守卫（CSS + JS）
  7. 逐字/逐行动效必须预占位（invisible 锁死容器尺寸）
  8. Lighthouse perf 4-run avg（单次跑不能当数据 — 但 a11y 单次 100 即可）
  9. 装饰类动效先看效果再决定（"如果 perf 掉 5 分我还要不要"）

## 关键对象

### 部署路径（服务器 · Next.js 16 flat 单仓）

```
/home/ubuntu/Lekao/
├── .env                          # 含 DATABASE_URL=...?connection_limit=4
├── prisma/schema.prisma          # 只引 users, 5 个业务表
├── src/
│   ├── app/                      # Next.js 16 App Router
│   ├── components/               # landing/, dashboard/
│   └── lib/                      # auth.ts / prisma.ts / email.ts
├── public/templates/             # Excel 模板
├── scripts/                      # generate-templates.mjs
└── node_modules/
```

### 服务清单

| 服务名 | 端口 | 启动命令 | systemd 状态命令 |
|--------|------|----------|------------------|
| `lekao-web` | :3007 | `next start --port 3007` (via systemd) | `systemctl is-active lekao-web` |
| PostgreSQL | :5434 | Docker `resumeaix-postgres` | `docker ps` |
| Redis | :6380 | Docker `resumeaix-redis` | `docker ps` |
| 腾讯云 nginx | :80 | `nginx -g 'daemon off;'` | `systemctl is-active nginx` |

### 端口冲突检查

Lekao :3007 与现有服务端口无冲突：

| 端口 | 服务 |
|------|------|
| :80 | 腾讯云 nginx (server_name 分流) |
| :3000 | my-portfolio |
| :3002 | ResumeAIX AI Service |
| :3003 | ResumeAIX Export Service |
| :3004 | ResumeAIX 主站 |
| :3005 | Interview Helper |
| :3006 | Interview Audio |
| **:3007** | **Lekao** ✅ |
| :5434 | PostgreSQL |
| :6380 | Redis |

### 双层 Nginx 反代架构（关键避坑）

**阿里云 `aliyun-proxy.conf`**（SSL 终端）：
```nginx
server {
    server_name lekao.asterforge.top;
    # ... SSL 配置 ...
    location / {
        proxy_pass http://111.229.200.178;   # ← 走腾讯云 :80
        proxy_set_header Host $host;
        # ...
    }
}
```

**腾讯云 `/etc/nginx/conf.d/lekao.conf`**（server_name 分流）：
```nginx
server {
    listen 80;
    server_name lekao.asterforge.top;
    location / {
        proxy_pass http://127.0.0.1:3007;     # ← Next.js app
    }
}
```

**为什么不用 `:3007` 直连**：腾讯云 Lighthouse 安全组挡非标端口入站，必须走 :80 → nginx → 127.0.0.1:3007

### 数据库表（PRD §3.4）

**只读引用**（ResumeAIX 管理 schema，Lekao 不 migrate）：
- `users`（含 `t_coin` 共享 / `lekao_gift_coin` 赠送隔离 — **字段由 ResumeAIX 仓库 PR T1 加进去**）

**Lekao 独立表**（Lekao 自己的 migration）：

| 表名 | 用途 | 落盘策略 |
|------|------|---------|
| `lekao_class_summaries` | 课堂小结历史 | ✅ 必须落盘（防客诉） |
| `lekao_class_feedbacks` | 课堂反馈历史 | ✅ 必须落盘（防客诉） |
| `lekao_templates` | 模板（平台预设 + 用户自定义） | ✅ |
| `verification_codes` | 邮箱验证码（防刷） | ✅ |
| `lekao_mistake_collections` | 错题集历史 | ❌ **Phase 1 不建表**（BRD §7.6 既定：纯前端 LocalStorage/IndexedDB） |

## 操作命令

### deploy → git bundle + SCP + rebuild + restart

**完整脚本**：`scripts/deploy-production.ps1`（一键跑完 7 步）

**手动流程**：

```bash
# 1. 本地打包 git bundle (注意: 用 `main` 不是 `HEAD`, bundle 才带 refs/heads/main ref)
git -C C:/Users/TimeCraker/Desktop/my_workspace/lekao bundle create /tmp/lekao.bundle main

# 2. SCP bundle 到服务器
scp -i "C:/Users/TimeCraker/Desktop/my_workspace/asterforge-deploy/ssh-keys/tencent_server_key.pem" \
  /tmp/lekao.bundle ubuntu@111.229.200.178:/tmp/lekao.bundle

# 3. SCP .env (注意: 服务器 .env 已存在才能 scp 覆盖)
scp -i "C:/Users/TimeCraker/Desktop/my_workspace/asterforge-deploy/ssh-keys/tencent_server_key.pem" \
  .env ubuntu@111.229.200.178:/home/ubuntu/Lekao/.env

# 4. 服务器 fetch bundle + reset + rebuild + restart
ssh -i "C:/Users/TimeCraker/Desktop/my_workspace/asterforge-deploy/ssh-keys/tencent_server_key.pem" \
  -o BatchMode=yes ubuntu@111.229.200.178 '
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

### status → 服务状态 + 端口 + DB + 公网

```bash
SSH_KEY="C:/Users/TimeCraker/Desktop/my_workspace/asterforge-deploy/ssh-keys/tencent_server_key.pem"

# 1. 服务状态
ssh -i "$SSH_KEY" ubuntu@111.229.200.178 "sudo systemctl is-active lekao-web && sudo systemctl is-enabled lekao-web"

# 2. 本地端口
curl -s -o /dev/null -w "Lekao local :3007 → HTTP %{http_code}\n" http://127.0.0.1:3007

# 3. 公网
curl -s -o /dev/null -w "lekao.asterforge.top → HTTP %{http_code}\n" https://lekao.asterforge.top

# 4. Docker
ssh -i "$SSH_KEY" ubuntu@111.229.200.178 "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -E 'postgres|redis'"

# 5. ⭐ Prisma 连接数验证（Lekao 进程应 ≤ 4）
ssh -i "$SSH_KEY" ubuntu@111.229.200.178 "
  PGPASSWORD=postgres psql -h localhost -p 5434 -U postgres -d resumeaix -c \\
    \"SELECT application_name, count(*) FROM pg_stat_activity \\
     WHERE application_name LIKE '%prisma%' GROUP BY application_name;\"
"

# 6. 磁盘 + 内存
ssh -i "$SSH_KEY" ubuntu@111.229.200.178 'df -h /home/ubuntu/Lekao && free -h'
```

### logs → 拉取日志

```bash
SSH_KEY="C:/Users/TimeCraker/Desktop/my_workspace/asterforge-deploy/ssh-keys/tencent_server_key.pem"

# Next.js 最近 100 行
ssh -i "$SSH_KEY" ubuntu@111.229.200.178 'sudo journalctl -u lekao-web --no-pager -n 100'

# Next.js 实时（前台）
ssh -i "$SSH_KEY" ubuntu@111.229.200.178 'sudo journalctl -u lekao-web --no-pager -f'

# Prisma migration 日志
ssh -i "$SSH_KEY" ubuntu@111.229.200.178 'sudo journalctl -u lekao-web --no-pager -n 500 | grep -i prisma'

# Docker（PG / Redis）
ssh -i "$SSH_KEY" ubuntu@111.229.200.178 'docker logs resumeaix-postgres --tail 50'
```

### restart → 重启 web

```bash
SSH_KEY="C:/Users/TimeCraker/Desktop/my_workspace/asterforge-deploy/ssh-keys/tencent_server_key.pem"

ssh -i "$SSH_KEY" ubuntu@111.229.200.178 '
  sudo systemctl restart lekao-web
  sleep 3
  sudo systemctl is-active lekao-web
'

curl -s -o /dev/null -w "Lekao :3007 → HTTP %{http_code}\n" http://127.0.0.1:3007
```

### db-migrate → 安全迁移

```bash
SSH_KEY="C:/Users/TimeCraker/Desktop/my_workspace/asterforge-deploy/ssh-keys/tencent_server_key.pem"

# ✅ 安全：migrate deploy（带历史 migration 文件，永不丢数据）
ssh -i "$SSH_KEY" ubuntu@111.229.200.178 '
  cd /home/ubuntu/Lekao
  export PATH=/usr/local/node20/bin:$PATH
  pnpm exec prisma migrate deploy
'

# ❌ 绝对禁止（PRD §3.4.1.1 + BRD §7.2 硬约束）
# pnpm exec prisma db push --force
# pnpm exec prisma db push --accept-data-loss
```

**为什么禁 `db push --force`**：Lekao 与 ResumeAIX 共享 `users` 表，`--force` 可能误删 ResumeAIX 付费用户数据。

### lighthouse → 跑分验证

```bash
# 1. 杀 stale Chrome
powershell.exe -NoProfile -Command "Get-Process chrome,chromium,msedge -ErrorAction SilentlyContinue | Stop-Process -Force"

# 2. 清空 temp (Windows EPERM 坑)
rm -rf /c/Users/TimeCraker/AppData/Local/Temp/lighthouse.*

# 3. 跑分
mkdir -p /tmp/lh-tmp
cd C:/Users/TimeCraker/Desktop/my_workspace/lekao
TMPDIR=/tmp/lh-tmp TMP=/tmp/lh-tmp \
  lighthouse "https://lekao.asterforge.top/?v=$(date +%s)" \
  --form-factor=mobile \
  --throttling-method=simulate \
  --output=json --output-path=lighthouse-mobile.json \
  --chrome-flags="--headless --no-sandbox --disable-gpu --disable-dev-shm-usage" \
  --quiet

# 4. 解析
cat lighthouse-mobile.json | node -e "
const j = JSON.parse(require('fs').readFileSync(0, 'utf8'));
const a = j.audits;
const c = j.categories;
console.log('Performance:    ', Math.round(c.performance.score*100));
console.log('A11y:           ', Math.round(c.accessibility.score*100));
console.log('Best Practices: ', Math.round(c['best-practices'].score*100));
console.log('SEO:            ', Math.round(c.seo.score*100));
console.log('LCP:            ', a['largest-contentful-paint'].displayValue);
console.log('TBT:            ', a['total-blocking-time'].displayValue);
console.log('CLS:            ', a['cumulative-layout-shift'].displayValue);
"
```

## 关键模式（防踩坑 · BRD §7.2 + PRD §3.4.1.1 + §3.4.1.2）

### 1. Prisma 共享表只读约束（铁律）

- ❌ Lekao 永远不能 `prisma db push --force`
- ❌ Lekao 不能修改 `users` 表结构
- ❌ Lekao 不能写自己的 migration 改 `users`
- ✅ 只能 `prisma migrate deploy`（带历史 migration 文件）
- ✅ 只能通过 `@relation` 引用 `users.id`
- ✅ `lekao_gift_coin` 字段必须走 **ResumeAIX 仓库 PR** 加进去（Lekao 不能私自加 — `users` 表归 ResumeAIX 管）

### 2. Prisma 连接池硬限制（3.6GB 服务器）

Lekao 的 `.env` 中 `DATABASE_URL` **必须**带上：

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5434/resumeaix?connection_limit=4&pool_timeout=20"
```

- `connection_limit=4` — 单进程最多 4 个连接，避免和 ResumeAIX 抢连接
- `pool_timeout=20` — 排队等连接的秒数上限（默认 10 太短会报错）

### 3. 延迟初始化赠币（防老用户首登漏洞 — PRD §3.4.1.2）

- `users.lekao_gift_coin` 字段默认 **-1**（不是 0）
- signIn callback 检测到 `-1` 才补发 5 枚
- 多次登录不会重复发币（仅 `=== -1` 触发）
- **漏洞场景**：ResumeAIX 老用户首次登录 Lekao 不触发注册 → 余额 = -1 → 客诉
- **修复方案**：在 signIn callback 延迟初始化，不在注册时给

### 4. 跨境网络抽风兜底（CLAUDE.md 写明 · 实战已验证）

- 本地 push 失败 → `git bundle create <file> main` + SCP fallback
- 服务器 fetch bundle → `git fetch <file> main:main-new` (注意: **bundle 不带 `refs/heads/` 前缀**)
- ⚠️ **git bundle 必须指定 branch 名**（`main`），不是 `HEAD` — 否则 bundle 不带 ref，服务器 fetch 报 "couldn't find remote ref"

### 5. 双层 Nginx 反代架构（实战踩坑后总结）

- 阿里云 `aliyun-proxy.conf` SSL 终端 → 腾讯云 `:80`（**不要 `:3007`，被安全组挡**）
- 腾讯云 `nginx conf.d/lekao.conf` server_name 分流 → `127.0.0.1:3007`
- ⚠️ **不要新加 serverblock 文件** — 阿里云 `aliyun-proxy.conf` 已被 Certbot 自动加上 lekao 段（用 `:3007` 直连）— `sed` 改它比新加文件简单

### 6. Next.js 16 flat layout（不是 monorepo）

- Next.js 16 推 flat 单仓 — 没有 `apps/web/`，直接在根目录
- systemd ExecStart：`pnpm start --port 3007` (从 `/home/ubuntu/Lekao/`)
- 不是 monorepo：`packages/db/`，prisma schema 在 `prisma/schema.prisma`

### 7. Prisma 6 client 字段命名（实战踩坑）

- Prisma 6.x client 生成的字段是 **snake_case**（`lekao_gift_coin` / `t_coin`），不是 camelCase
- TS 报错 "Property does not exist" → 改 schema 用 `@map` 或 sed 全局替换 TS 文件
- `next-auth.d.ts` 类型扩展也要用 snake_case 字段名

## 故障排查

| 现象 | 原因 | 处理 |
|------|------|------|
| `:3007` 不通 | lekao-web service 未启动 / 未 enable | `sudo systemctl enable lekao-web && sudo systemctl start lekao-web` |
| 公网 502 | 腾讯云服务挂了 | SSH 到腾讯云 `systemctl status lekao-web` |
| 公网 504 | 阿里云反代连不上腾讯云 :3007 | 改 aliyun-proxy.conf 用 `:80` 端口分流（不是 `:3007`） |
| 公网 200 但页面 500 | Next.js 启动报错 | `journalctl -u lekao-web -n 100`（看 Prisma 字段缺失 / SMTP 未配） |
| `prisma migrate` 报 `lekao_gift_coin` 字段不存在 | ResumeAIX PR (T1) 未 merge | 等 T1 完成（PRD §3.4.1）|
| `lekao_gift_coin` 一直是 -1 / 0 | signIn callback 漏写延迟初始化 | 检查 `src/lib/auth.ts` §3.4.1.2 模式 |
| Prisma 连接池爆（`max_connections` 满） | `.env` 没设 `connection_limit=4` | 改 .env + restart service |
| 验证码发不出 | SMTP 未配置 | 检查 .env `SMTP_*` 变量（参考 ResumeAIX 已配的 SMTP） |
| `pg_stat_activity` 显示 Lekao > 4 连接 | `.env` 漏 `connection_limit` | 同上 |
| 域名访问报 SSL 错 | certbot 证书未签 | 在阿里云跑 `certbot --nginx -d lekao.asterforge.top` |
| DNS 不解析 | A 记录没指阿里云 8.162.7.172 | 检查 DNS：`dig lekao.asterforge.top @8.8.8.8 +short` |
| build 时 OOM | 3.6GB 内存不够 | 限制 `NODE_OPTIONS=--max-old-space-size=1536` |
| git fetch bundle 报 "couldn't find remote ref main" | bundle 没带 refs/heads/main | `git bundle create <file> main` （用 branch 名不是 HEAD） |
| 阿里云 serverblock 报 "conflicting server name" | aliyun-proxy.conf 已有同名 server | `rm` 新加 serverblock + `sed` 改 aliyun-proxy.conf 内的 lekao 段 |

## 演化记录

### 2026-06-20（第 5 轮更新 · Phase 1 全部完成）
- **T1-T15 全部完成**：5 个 commit, 公网可访问, Lighthouse 95/100/100/100
- **A11y token 矩阵化修复**：Lighthouse a11y 95 → 100（color-contrast 0 failures）
- **实战教训写入**：
  - 阿里云 `aliyun-proxy.conf` 已声明 server_name（Certbot 自动加）→ 不要新加 serverblock，`sed` 改现成的
  - 腾讯云 3007 端口入站被安全组挡 → 阿里云反代必须走 :80（nginx server_name 分流）
  - `git bundle create HEAD` 不带 ref → 必须 `git bundle create <file> main`
  - bundle fetch 用 `main:main-new`（不带 `refs/heads/` 前缀）
  - Prisma 6 client 字段 snake_case（不是 camelCase）
  - WCAG AA: 柔和 brand color (blue-500) 在白背景 3.67:1 < 4.5:1 → 加 `--accent-text` (blue-700) token
- **commit 节奏**：用户原则"每个大阶段完成后才 commit" → T9-T13 / T14 / T15 各 1 commit

### 2026-06-20（第 4 轮更新）
- **被动模式铁律**：用户原话"你不要自己贸然跑检查"，skill 只承载已知状态快照
- **T14 部署成功**：systemd + 阿里云反代 + SSL
- **演化策略**：自动更新进度段（command + skill 顶部），双写到本机 + repo

### 2026-06-20（初始化）
- 通过 `/new-command-skill lekao` 生成
- 类型：mixed（项目 + 远程服务器 + PostgreSQL DB）
- 触发场景：部署/运维 Lekao AI 智能助教助手项目
- 操作清单：deploy / status / logs / restart / db-migrate
- 数据源策略：项目（git）+ 服务器（腾讯云 111.229.200.178 / 阿里云 8.162.7.172）+ DB（PG :5434）
- 来源会话：本会话 BRD v0.3 + PRD v0.2 + 阿里云反代配置 + DNS 指向阿里云
- 关键 PRD 摘要：Phase 1 任务 T1-T15（脚手架 + 登录 + 仪表盘占位），约 8-10 小时；Phase 2 任务 T16-T43
- 关键反模式：共享 users 表只读 / Prisma 连接池 / 延迟初始化赠币 / 整页 transform 禁 / 装饰动效先看效果