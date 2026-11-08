---
name: lekao
description: "维护 LeKao AI 教学编辑台。用于项目上下文、规格驱动开发、GitHub 同步、数据库迁移、生产部署、状态检查、日志、性能验证与故障排查。"
---

# LeKao 项目操作指南

## 执行边界

1. 仅加载本文件或调用 `/lekao` 且未指定动作时，只读取上下文并等待指令；不要主动连接服务器、检查端口或修改环境。
2. 用户明确要求 `status`、`deploy`、`restart`、`db-migrate` 等动作后，才操作生产环境。
3. 正式业务功能必须先读取当前 Stage Spec、Tasks、Prompt 与 Handoff；Prompt 或 Handoff 为 `BLOCKED` 时不得实施。边界明确的文档、配置和小修复可直接处理。
4. 生产环境承载真实用户。任何变更都要先确认目标、工作区、版本与回滚点，完成后验证真实页面和关键路径；HTTP 200 不能单独作为验收结论。
5. 只处理 GitHub 仓库 `TimeCraker/Lekao`；不要添加或同步 Gitee 远端。

## 项目事实

| 项         | 当前约定                                                                             |
| ---------- | ------------------------------------------------------------------------------------ |
| 产品       | 面向 K12 助教、学管和班主任的 AI 教学编辑台                                          |
| 核心能力   | 课堂小结、作业/堂测反馈、错题集 Word、周末反馈表、灵感墙、T-Coin 与教学资产          |
| 本地仓库   | `C:\Users\TimeCraker\Desktop\my_workspace\lekao`                                     |
| GitHub     | `https://github.com/TimeCraker/Lekao.git`，默认分支 `main`                           |
| 技术栈     | Next.js 16、React 19、Tailwind CSS 4、Prisma 6、PostgreSQL、next-auth v4             |
| AI         | Qwen3-VL-8B-Instruct 负责视觉理解；DeepSeek-V4-Flash 负责文本生成                    |
| 营销配图   | `scripts/landing-images/` 使用 MiniMax image-01；它不是主业务模型                    |
| 客户端     | Web（移动端 web-only，2026-10-03 owner 决策）；`lekao-android/` 冻结于 V1.0.0 仅存档 |
| 生产服务器 | `ubuntu@<your-server-ip>`，腾讯云                                                    |
| 生产服务   | `lekao-web`，`/home/ubuntu/Lekao`，端口 `3007`                                       |
| 公网       | `https://lekao.asterforge.top`，腾讯云 nginx 直接终止 TLS 并反代到 `127.0.0.1:3007`  |
| 数据库     | `localhost:5432/lekao`；与 ResumeAIX 共享实例                                        |
| Redis      | `localhost:6380`；与同机服务共享实例                                                 |
| 部署入口   | `scripts/deploy-production.ps1`                                                      |

`<your-proxy-ip>` 是旧阿里云链路 IP，不代表当前生产拓扑，不要据此恢复双层反代。

## 真相源

按以下优先级判断事实，避免把历史快照当成当前状态：

1. 当前用户指令与已批准范围。
2. 当前代码、`package.json`、`prisma/schema.prisma` 和实际运行配置。
3. `docs/ai-delivery/` 中当前 Stage 的 Spec、Tasks、Prompt、Handoff 与验收矩阵。
4. `README.md`、`docs/BRD.md`、`docs/PRD.md`、`docs/ARCHITECTURE.md` 作为背景资料；与现行代码或 `docs/ai-delivery/` 冲突时不优先。
5. Git 历史负责版本演化；本文件不保存提交清单、轮次记录、旧 Lighthouse 分数或服务状态快照。

发布版本只读取 `package.json`，`CHANGELOG.md` 最新条目须与其保持一致（历史上漂移过，勿重演）。

`Foundation V3` 是交付规划名称，不是产品 semver 3.0。各 Stage 的当前状态以 `docs/ai-delivery/README.md` 与对应 Handoff **正文** 的 State 为准（含 `SEALED` / `CANCELLED` 终态与重启规则）；Handoff frontmatter 的 `status` 字段可能滞后，不要据此判断阶段是否解锁。

## 动作路由

| 动作               | 行为                                                              |
| ------------------ | ----------------------------------------------------------------- |
| `context` 或无参数 | 只说明项目现状、约束和可执行下一步                                |
| `sync`             | 比较本地、GitHub 与生产服务器 Git 版本；按范围同步                |
| `plan`             | 读取 `docs/ai-delivery/README.md` 和当前 Stage 交付包             |
| `implement`        | 仅执行已解锁 Stage 中的一个原子 Task                              |
| `deploy`           | 使用生产部署脚本，迁移、构建、重启并验收                          |
| `status`           | 检查 Git、systemd、端口、数据库、资源和公网                       |
| `logs`             | 读取 `lekao-web`、Prisma、nginx 与监控日志                        |
| `monitor`          | 核验 cgroup v2、服务器监控脚本、cron 与告警日志，不假设其当前状态 |
| `restart`          | 仅重启 `lekao-web`，随后检查服务和页面                            |
| `db-migrate`       | 仅执行已审查 migration 的 `prisma migrate deploy`                 |
| `landing-images`   | 按现有配置生成营销配图，人工检查内容后使用版本化文件名接入        |
| `lighthouse`       | 在生产页面执行移动端多轮测量并汇总中位数                          |

## 仓库同步

1. 运行 `git status -sb`，识别并保留用户已有改动；工作区混杂时只暂存本任务文件。
2. 对 `git fetch origin`、`git push origin` 等 GitHub 网络操作最多重试 3 次，间隔 1、2、4 秒；失败必须明确报告。
3. 用 `git rev-list --left-right --count HEAD...origin/main` 判断 ahead/behind，不依据时间戳猜版本。
4. 远端领先且本地无冲突时使用 fast-forward；禁止通过强制推送掩盖分叉。
5. 提交使用 Conventional Commits 与中英文对照，例如：`docs(skill): 精简 LeKao 操作指南 / streamline LeKao operations guide`。
6. 推送后再次确认工作区干净、`ahead 0 / behind 0`。需要三端一致时，再核对服务器 HEAD；纯文档提交可只快进服务器仓库，不构建、不重启服务。

## 规格驱动实施

1. 先读 `docs/ai-delivery/README.md`，再按顺序读取当前 Stage 的 Spec、Tasks、Implementation Prompt 和 Handoff。
2. 一次只实现一个未完成 Task；不得通过改写规格绕过失败项。
3. 每完成一个 Task，立即更新对应 `[x]`、实现证据和 Handoff；实现与计划分开提交。
4. 对付费、认证、教学资产、Android/Web 契约或共享数据库的变更，必须覆盖失败、重试、幂等和恢复路径。
5. 运行当前仓库实际存在的质量命令。不得删除失败测试、伪造 PASS，或用永久 ignore 掩盖基线问题。

## 数据与安全约束

1. `users` 表的 schema ownership 归 ResumeAIX。LeKao 可以按业务规则读写允许的用户行数据，但新的共享字段、类型、枚举或约束变更必须在 ResumeAIX 仓库完成；不得再由 LeKao migration 修改共享表结构。
2. 禁止 `prisma db push --force`、`prisma db push --accept-data-loss` 和任何等价破坏性同步；生产只运行已审查的 `prisma migrate deploy`。
3. `DATABASE_URL` 必须包含 `connection_limit=4&pool_timeout=20`，避免与同机服务争抢连接。
4. `users.lekaoGiftCoin` 的 Prisma 字段为 `lekao_gift_coin`，默认 `-1`；登录时仅对 `-1` 初始化赠送余额。改共享字段前对照 ResumeAIX 当前 schema 的类型、枚举和 `@map`。
5. 收费生成流程已由 S01 收敛为 `reserve -> settle | release` 的幂等账务状态机（`src/lib/coin.ts` 门面 + `src/lib/coin-ledger.ts` 账本）；新的消耗场景直接复用该状态机，不要复制“先扣币、失败后补偿”的旧模式。
6. Next.js 16 使用 `src/proxy.ts`，不要同时新增 `middleware.ts`。
7. 错题与图片历史包含浏览器本地数据。变更 File System Access 或 IndexedDB 流程时必须保留授权恢复、下载回退和数据丢失提示，并按 S02 Artifact 契约处理跨设备恢复。
8. 不在日志、提交、Skill 或命令输出中写入 `.env`、SSH 私钥、API Key、验证码或教学原文。

## 部署与运维

### 部署前

- 确认本地工作区干净，目标提交已推送 GitHub，并比较本地、`origin/main` 与服务器 HEAD。
- 阅读 `scripts/deploy-production.ps1` 的当前实现，不复制旧 Skill 中的命令片段替代脚本。
- 保存可恢复的生产版本或备份；确认 `.env` 只在授权范围内传输且不会进入日志。
- 数据库变更先审查 migration SQL、共享表影响与回滚策略。

### 部署中

- GitHub 不稳定时使用 `git bundle create <file> main`；bundle 的源 ref 使用 `main`，不要使用 `HEAD` 或 `refs/heads/main`。
- 服务器只快进到已确认提交；构建使用 Node 20 环境，并按脚本限制内存。
- 依次完成依赖安装、`prisma migrate deploy`、`prisma generate`、生产构建和 `lekao-web` 重启。任一步失败立即停止，不带病继续。

### 部署后

- 确认服务器 Git HEAD 与目标提交一致，工作区无意外改动。
- 确认 `systemctl is-active lekao-web` 为 `active`，本机 `127.0.0.1:3007` 与公网均正常。
- 用真实浏览器检查首屏、登录/注册、工作台和本次变更路径；检查控制台与关键 API。
- 若验证失败，回滚到已保存版本并恢复服务，再报告根因与证据。

## 必要验证

按改动风险选择最小充分验证：

```powershell
git diff --check
pnpm exec prisma generate
pnpm lint
pnpm build
```

- 只改 Markdown 时至少执行 frontmatter/链接检查、`git diff --check` 和差异审查，不必重建生产应用。
- 修改 schema、API、认证、计费或导出时，增加对应测试与真实失败路径验证。
- 修改 `lekao-android` 时，在该目录执行 `gradlew.bat assembleDebug` 和 `gradlew.bat testDebugUnitTest`；发布前再验证 release 构建。
- 生产性能使用多轮 Lighthouse 中位数；不要复用旧分数，也不要仅凭单次本地模拟器下结论。

## 常见故障

| 现象                    | 首要检查                                                                 |
| ----------------------- | ------------------------------------------------------------------------ |
| bundle 找不到 `main`    | 创建 bundle 时使用分支名 `main`，不是 `HEAD`                             |
| 公网 502/页面 500       | `journalctl -u lekao-web`、本机 `:3007`、nginx error log                 |
| Prisma 字段或枚举不匹配 | 对照 ResumeAIX schema 的真实列名、类型、枚举与 `@map`                    |
| 生产构建 OOM            | Node 20 PATH 与 `NODE_OPTIONS=--max-old-space-size=1536`                 |
| 新图片部署后仍显示旧图  | 为资源使用新文件名/URL，使 Next.js Image Optimizer 和浏览器缓存键失效    |
| FSA `NotAllowedError`   | 检查用户手势链、句柄权限是否过期及下载回退                               |
| 服务内存判断错误        | 使用 `lekao-web.service` 的 cgroup v2 指标，不用宽泛 `pgrep next-server` |

## 维护规则

- 只保留稳定、可执行且非显然的信息；详细实现放代码和规格，历史放 Git。
- 不记录“第几轮”、用户长引语、完成提交表、临时 IP/证书状态或一次性排障过程。
- 项目事实变化时先更新对应真相源，再更新本文件中的稳定索引；避免在 command、Skill 和 README 重复维护同一状态。
- 保持本文件短于 250 行。若细节持续增长，移动到 `docs/` 并在此注明读取条件。
