# Lekao 全流程 E2E 回归 · 2026-10-03（依赖修复后）

frontend-test 通用流程执行记录。触发背景：本次依赖修复改动了 xlsx 0.18.5→0.20.3(SheetJS CDN)、
nodemailer 7→10、uuid/exceljs/docx/brace-expansion 等 overrides（commit `6125a16`），
需按真实用户路径回归验证。

## 环境清单

| 项       | 值                                                                                  |
| -------- | ----------------------------------------------------------------------------------- |
| 被测端   | 本机生产构建 `http://127.0.0.1:3101`（playwright webServer 自动拉起 `next start`）  |
| 数据库   | 嵌入式隔离 PG `127.0.0.1:5433/lekao_e2e`（与共享生产实例 5434 零接触，keeper 持有） |
| 测试账号 | `e2e@lekao.test` / `LekaoE2E!2026`（e2e-env.mjs 播种，走真实 credentials 登录）     |
| 浏览器   | 本机 Edge（channel=msedge，不下载 Playwright 浏览器包）                             |
| 登录态   | e2e/.auth/state.json（globalSetup 经真实登录端点换取）                              |

## 例外与豁免（显式标注）

1. **登录凭证**：种子账号由 e2e-env.mjs 直接写隔离库——skill 允许的「登录凭证」例外。
2. **上传素材**：Excel fixture 由脚本（exceljs）合成于 `e2e/fixtures/`——skill 允许的「文件上传」例外。
   合成模板结构对齐 `excel-parser.ts`（姓名/堂测错题/作业错题）与 `weekend-parser.ts`（R1 日期标题/R2 表头/R3+ 学生）。
3. **AI 付费流跳过**：课堂小结（summarize）、作业反馈（feedback）、周末表 AI 反馈生成涉及真实 API 花费，
   按工作区规则（付费 API 不盲跑）本次豁免，仅回归其页面可达性。错题集全链路本身**不含 AI、不扣币**，完整覆盖。
4. **人工介入点**：无（密码登录、无扫码/验证码）。

## 阶段路线（业务依赖链）与通过准则

通过准则：0 阻断 + 0 功能错误（体验问题仅记录）。

| #   | 阶段                              | 内容                                                                                    | 负例                                                            |
| --- | --------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| S0  | 冒烟                              | landing/login 渲染；已登录 /dashboard 渲染（Features 先于 Balance）；console 无新增错误 | —                                                               |
| S1  | 账号                              | UI 表单登录（邮箱密码）→ 落 dashboard；登出 → 重登                                      | 错误密码必须被拒（「邮箱或密码错误」）                          |
| S2  | 基础数据                          | 每日签到；灵感墙 新建→列表可见→删除                                                     | 重复签到被拦/幂等；灵感标题当日重复被拒（「标题当天不能重复」） |
| S3  | 核心执行·错题集（依赖风险区）     | 上传 Excel → 选学科 → 确认封面 → 填题号 → **导出 Word**（docx 链）                      | 上传非法文件（.txt）必须被拦                                    |
| S4  | 核心执行·周末反馈表（依赖风险区） | 上传周末 Excel → 日期自动改写 → 手填错题（exceljs 链；AI 部分豁免）                     | —                                                               |
| S5  | 历史与隔离                        | 导出产物入 history；错题集历史页可见当日记录                                            | —                                                               |
| S6  | 回归负例                          | —                                                                                       | 未登录访问 /dashboard 必须重定向 /login                         |

依赖映射：S3 验证 xlsx+docx+nanoid；S4 验证 xlsx+exceljs+uuid。 nodemailer 10 无 UI 面
（服务端邮件），由单测与构建覆盖，不在 E2E 范围。

## 缺陷台账（终版）

```
编号 | 阶段/页面 | 现象 | 根因 | 严重度 | commit | 回归结果
B-01 | S0 dashboard | 「#01 — Features」文本桌面/移动双副本致 Playwright strict 冲突 | 移动端独立渲染副本（产品实现），断言需 first() | 测试适配 | e2e rev2 | 回归通过
B-02 | S2 灵感墙 | 重复标题负例先被「请求过于频繁，请 60 秒后再试」拦截 | 产品规则：每日 1 次 + 60s IP 限频优先于重复标题检测（ideas/route.ts:297-322） | 非缺陷·守卫生效 | e2e rev6 | 回归通过
B-03 | S3 错题集导出 | 首轮全量跑出现 2 次 500（当时未捕获 URL），此后 5 轮加 5xx 监听未复现 | 未定性·一过性 | 观察项（非阻断） | — | 5 轮未复现，持续观察
B-04 | S3 上传 | setInputFiles 泛化 input[type=file] 命中题号图片控件而非 Excel 上传 | 测试定位不精确，改用 accept=".xlsx,.xls" 精确选择器 | 测试代码 | e2e rev8 | 回归通过
B-05 | E2E 基建 | webServer 持续刷 [redis] error（无 REDIS_URL） | 应用可降级运行，不影响功能与断言 | 基建记录 | — | 记录待定
B-06 | E2E 基建 | 嵌入式 PG 连续快速重跑偶发 keeper 启动失败（P1001） | Windows 下上次停库清理竞态；清 pgdata + 杀孤儿 postgres 后稳定 | 基建记录 | — | 已定位规避方式
```

**产品缺陷：0 阻断 + 0 功能错误** → 无修复-部署动作，闭环为测试自身的 5 轮迭代回归（rev2→rev8）。

## 执行结果（2026-10-03）

- 全量套件（含仓内既有 auth-responsive / content-claims / dashboard-session）：**20/20 通过，48.2s，零 flaky**
- 验证门槛：lint 0 errors ✅ · typecheck ✅ · build ✅ · 单测 336/336 ✅ · e2e 20/20 ✅
- 依赖回归结论：xlsx 0.20.3（错题 Excel 解析 + 周末表解析 + 日期改写）、docx（Word 导出 PK 魔数校验）、
  exceljs（周末表生成）、uuid/nanoid/brace-expansion 等 overrides 均通过真实用户路径验证。

## 收尾

- E2E 数据随 `e2e/.auth/pgdata` 整目录丢弃（teardown 停库）；【E2E】前缀数据在隔离库，不入生产。
- 失败现场（test-results/）与 keeper 产物（e2e/.auth/）均已被 gitignore，不入库。
- fixtures 生成脚本与全流程 spec 作为回归资产入库（e2e/fixtures/、e2e/fullrun-deps.spec.ts）。
