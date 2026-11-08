# 2026-08-29 · lib 纯函数单测 Stage Spec — lekao 从 0 引入 vitest

> 执行者：Zcode（GLM-5.3-Flash）。本 spec 自包含，无需会话上下文。
> 复核：Claude（spec §4）→ 用户终审。
> 性质：**只加测试与 dev 依赖，不改业务代码**。

## §0 规则与护栏

- **为什么要做**：lekao 前端仓 0 个测试文件、package.json 无 test script（CLAUDE.md 原文确认）。本站给纯函数层建单测底线，重点钉住 T-Coin 相关计算（免费模式的核心资产）。
- **铁律一（不改业务代码）**：只新增 `*.test.ts`、`vitest.config.ts`、package.json 的 devDependencies + scripts、报告；`src/` 业务文件 diff 必须为 0。**发现疑似 bug → 记报告，不修**。
- **铁律二（纯函数范围）**：只测无 `@prisma` / `ioredis` / `next-auth` / fetch / fs 依赖的纯模块（计算、校验、格式化、解析、常量表）。依赖设施的一律跳过并列入报告。
- **铁律三（dev-only）**：只动 devDependencies（vitest），运行时依赖零变动；**不跑 db:migrate / db:seed / dev server**。
- **铁律四（不放水）**：不为绿删断言/放宽断言。连续 2 轮同一红 → 停下报告。
- pnpm 全局 registry 已是 npmmirror 镜像，直接 `pnpm add -D vitest`。
- 提交只 add 本站文件；不 push，只本地 commit。

## §1 环境事实（已核实）

| 项       | 事实                                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------------- |
| 仓库     | `C:\Users\TimeCraker\Desktop\my_workspace\lekao`，工作树干净（3a8610d）；在线产品（lekao.asterforge.top，免费模式） |
| 包管理   | pnpm；package.json 现仅 dev / build / start / lint 四个 scripts                                                     |
| 测试现状 | 0 测试文件、无测试框架（`*.spec.md` 是 ai-delivery 规格文档，不是测试）                                             |
| 版本参考 | vitest 4.x（同工作区 xiaofanzhuo 用 ^4.1.11，同为 Next.js 家族，node 环境）                                         |
| 在线影响 | 无——dev 依赖不进部署产物，且 push ≠ 自动上线（手动 SSH 部署）                                                       |

## §2 契约

### 配置

- `vitest.config.ts`：node 环境（无 DOM）、include `src/lib/**/*.test.ts`、与 tsconfig 路径别名对齐（若 src 用了 `@/` 别名，config 里 resolve.alias 同步）。
- package.json scripts 加：`"test": "vitest run"`（保留原有四个不动）。

### 测试范围

`src/lib/`（或仓库实际的纯函数目录，Stage 0 盘点确定）下：

- **优先**：T-Coin 计算/扣减/签到发放类纯逻辑（若其中混有 DB 调用，测可拆出的纯部分，不为此重构）。
- 其次：校验、格式化、时间处理、解析类模块。
- 每模块：正常路径 + 边界值 + 错误路径；表风格 `it.each` 或多条 it；断言外部可见行为。

### 报告

`docs/2026-08-29-lib-unit-tests-report.md`：模块清单（已测/跳过及原因）、用例数统计、疑似 bug 清单（只记不修）、复跑命令（`pnpm test`）。

## §3 任务分 Stage

### Stage 0 · 盘点（先分类再动笔）

扫 `src/` 找纯函数模块（判据见 §0 铁律二），列「必测 / 跳过」两清单；确认路径别名用法。写进报告草稿。
完成标准：两清单成文；`pnpm lint` 基线通过（确认起点干净）。

### Stage 1 · 引入框架

`pnpm add -D vitest` + vitest.config.ts + test script。
完成标准：一个最小 smoke 测试（如常量模块断言）`pnpm test` 绿。
commit：`chore(test): 引入 vitest / introduce vitest`

### Stage 2 · 逐模块写测试

按「必测」清单逐模块写 `__tests__/` 或同目录 `*.test.ts`（跟随仓库既有风格，无既有风格则同目录）。每 1-2 模块 commit：
`test(lib): <模块名> 单测 / unit tests for <module>`

### Stage 3 · 三级自验收（停下等确认）

- **L1**：`pnpm test` exit 0；`pnpm lint` 仍绿；`pnpm build` 不因测试文件报错（若 build 对 *.test.ts 报错，tsconfig exclude 处理并在报告说明）。
- **L2**：`git diff --stat` 业务 src 文件改动为 0（只有新增 test/config/package.json/报告）；抽读 3 个测试确认真行为断言。
- **L3**：报告成文。停下等用户确认。

## §4 验收清单（Claude 复核用）

- [ ] `pnpm test` exit 0；lint 绿；build 不破坏
- [ ] src 业务代码 diff = 0；运行时依赖零变动
- [ ] T-Coin 相关纯逻辑有测试覆盖（或报告说明其为何不在纯函数层）
- [ ] 抽读 3 个测试：断言真行为
- [ ] 疑似 bug 只记未修

## §5 参考

- 仓库指引：`lekao/CLAUDE.md`（4 scripts 现状、T-Coin 免费模式、两套扣费模式待收敛——收敛是业务决策，不在本站）
- vitest node 环境用法：vitest.dev 官方文档
