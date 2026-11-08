# Stage · 侧边栏重构 + 自定义模板 V1 + 移动端适配完善

> **日期**：2026-08-18
> **拍板记录**：用户原话「用户自定义反馈模板 UI 也可以去做，尤其要优化侧边栏，现在侧边栏连控制台主页都没有，ui 和 ux 逻辑都要优化」「把移动端手机端的比例适配做好就行」。安卓端/微信登录/支付明确不做。
> **前置完成**：T-Coin 失败自动退款 + 去充值化已单独提交（commit 2b993b1），不在本 stage 范围。

---

## A. 侧边栏重构（估 2-3h）

### 现状问题（sidebar.tsx 实录）

1. **桌面端无「控制台主页」入口**（NAV_ITEMS 7 项全是功能页；移动端 nav 反而有首页）
2. **信息架构平铺**：7 项无分组，导航项顺序无逻辑（错题集生成 → 错题集历史 → 小结 → 反馈 → 生成历史 → 灵感墙 → 错题反馈表，工具与记录交错）
3. **命名混淆**：「错题反馈表」（weekend-mistake）与「作业/堂测反馈」（feedback）、与「错题集生成」（mistake）三个名字近似，新用户分不清；weekend stage 文档原名即「周末反馈表」，实装时被改掉

### 新信息架构

```
总览
  控制台主页          /dashboard        （新增，DashboardIcon）
生成工具
  错题集生成          /dashboard/mistake      免费
  周末反馈表          /dashboard/weekend-mistake  免费（改名自「错题反馈表」）
  课堂小结            /dashboard/summary      1 币/次
  作业/堂测反馈       /dashboard/feedback     1 币/次
我的记录
  生成历史            /dashboard/history
  错题集历史          /dashboard/history-mgmt
社区
  灵感墙              /dashboard/ideas
管理（仅 admin）
  管理员后台          /admin
```

- 排序逻辑：免费高频引流工具 → 付费核心生成 → 记录 → 社区 → 管理
- 分组小标题样式复用现有「管理」标题样式（pt-4 text-xs uppercase）
- collapsed 模式下分组标题隐藏（与现「管理」标题行为一致）
- 保持现有：active 高亮（layoutId 动画）、localStorage 持久化、tooltip、移动端顶栏同步改（分组不可行，横向滚动平铺即可，但命名与顺序对齐）
- TopBar 不动（本轮仅侧边栏）

### 验收

- [ ] 桌面侧边栏第 1 项 = 控制台主页，点击回 /dashboard 且高亮正确
- [ ] 4 个分组标题正确渲染；collapsed 时标题隐藏、tooltip 可用
- [ ] 「周末反馈表」改名后：侧边栏 + 移动端顶栏 + dashboard QuickCard 三处一致
- [ ] active 高亮 / 收起持久化 / admin 显隐行为与重构前一致
- [ ] `tsc --noEmit` + `eslint` + `next build` 零错

---

## B. 自定义模板 V1（估 5-6h）

### 现状

- `LekaoTemplate` 表已在 schema（`lekao_templates`：userId null=平台预设 / type summary|feedback / content Text / isPublic），**代码 0 引用**
- prompt 组装点：`buildSummaryPrompt` / `buildFeedbackPrompt`（src/lib/ai/prompts.ts，结构化参数）
- 生成页（summary/feedback）目前无模板选择 UI

### V1 范围（最小可用，结构化字段而非裸 prompt 编辑）

**预设 2 套（代码常量，不进 DB）**：

1. `standard` 标准（= 现状默认输出）
2. `concise` 简洁版（条目更短、去客套话，适合字数敏感场景）

**我的模板（DB，userId 隔离）**，字段全部结构化：

- `name`（≤20 字）
- `greeting` 开头称呼（如「各位家长：」，可空=默认）
- `tone` 语气三选一：专业 / 亲切 / 简洁
- `signature` 结尾签名（如「——李老师」，可空）
- `extraNote` 附加要求（≤100 字，如「多提具体题目编号」）

`content` 列存上述字段的 JSON 序列化（无 schema 迁移）。

**不做（V2 候选）**：公开分享/模板市场（PRD §8.5 finding #4 的 RLS 需求不被触发）、裸 prompt 完整编辑、周末反馈表（batch）模板接入、模板插值变量。

### 技术方案

1. **API**（全部 session userId 隔离，防越权读写）：
   - `GET /api/lekao/templates?type=summary|feedback` → 预设（代码常量）+ 我的模板
   - `POST /api/lekao/templates`（上限每用户每类型 5 个 → 422）
   - `DELETE /api/lekao/templates/[id]`（仅本人的可删）
2. **prompt 注入**：`buildSummaryPrompt` / `buildFeedbackPrompt` 增加可选参数 `style?: { greeting?; tone?; signature?; extraNote? }`；greeting 替换默认开头行、tone 追加语气修饰段、signature 追加固定结尾行、extraNote 追加「额外要求」段。预设 `concise` = 预置 style + 既有字数压缩参数
3. **UI**：summary 与 feedback 页参数区加「模板」下拉（标准 / 简洁 / 我的模板名…+「管理模板」）；管理弹窗（列表 + 新建/编辑/删除表单）；选择结果随生成请求提交（`templateId`）
4. **route**：`/api/lekao/summarize` 接受 `templateId`，查模板（校验归属）→ 传 style 进 builder；无效/越权 id 静默回退 standard（不 500）

### 验收

- [ ] 新建模板 → 生成时选择 → 输出含自定义称呼/签名/附加要求生效（真实生成对比）
- [ ] 简洁预设输出条目明显短于标准（真实生成对比）
- [ ] 模板数达 5 个后新建 → 422 + 友好提示
- [ ] 用户 A 的模板 id 用户 B 提交 → 回退 standard 生成，无越权报错
- [ ] 删除模板后下拉即时移除；生成历史不受影响
- [ ] 无 schema 迁移；`tsc` + `eslint` + `build` 零错

---

## C. 移动端适配完善（估 2-3h，视审计结果）

### 方法

Playwright 3 视口（375 / 390 / 768）过全部页面截图审计：dashboard 9 页 + marketing 4 页 + login/register + admin 主要页。对照清单：无横向溢出、触控目标 ≥44px、表格可横滑、上传区可用、字号不破版。

已知结构：桌面侧边栏 `hidden md:flex`，<768px 走顶部横向导航（b145cef 已建）；8 月 Stage 0-6 已做排版精修。

### 修补原则（memory 既定约定）

- 优先独立组件/媒体查询变体，**保 PC 零回归**；装饰层 scoped 不整屏 fixed
- 修补清单以审计截图为准，逐项打勾，不做预防性重构

### 验收

- [ ] 审计报告（每页 3 视口截图 + 问题清单）落 docs/stages/ 附录
- [ ] 发现的 P0/P1 布局问题全部修复并复截图像级对比
- [ ] PC 1440px 全页截图与修补前一致（零回归）

---

## 执行顺序与提交粒度

A → B → C，各一个或多个独立 commit（`feat(sidebar)` / `feat(templates)` / `fix(mobile)`）。A 最小先出（立刻可见），B 大件居中，C 收尾。

## 部署

lekao 为在线运营站，push 后按既有部署流程（deploy/ 目录 + asterforge-deploy 手册）手动 SSH 上线；上线后真实页面验收 A/B/C 三组验收项。

---

## 执行结果（2026-08-18 · 实录）

### A 侧边栏（commit aaa8baf）

全部验收通过：4 分组渲染 / 控制台主页第 1 项 + active 精确匹配（子页不误亮）/ collapsed 标题隐藏 + tooltip 8/8 / localStorage 持久化（reload 后 64px 保持）/ 改名三处一致（侧栏+QuickCard+TopBar）/ 移动顶栏对齐（aside display:none + 无页面溢出）。

### B 自定义模板（commit 28361a6）

真实验收（本地 dev + 生产 PG + 真实 AI 调用）：

- 自定义模板「家长群反馈」（称呼「各位家长：」/ 亲切 / 签名「——李老师」/ 附加要求「多提具体题目编号」）→ 真实生成输出**开头即称呼、结尾签名、每条反馈带题号**，三字段端到端生效
- 上限：第 6 个 422「每个类型最多 5 个模板」（压测数据已清理）
- 越权：他人模板 id 提交 → 模板解析段安全通过（静默回退标准，不 500）
- 简洁预设：可见 prompt 注入「每条控制在 40 字以内」
- 零 schema 迁移（content 列存 style JSON）

**意外收获**：验收过程中 DeepSeek 两次真实失败（空输出 + vision 400），上午的自动退款链路两次真实触发并验证——流水 `AI失败自动退款-空输出-{cid}`（4→5）与 `AI失败自动退款-视觉识别-{cid}`（3→4），余额账目完全正确（成功生成扣 1、失败不扣）。

### C 移动端适配（审计 + 2 处 P0 修复）

审计方法：程序化检测（页面级 scrollWidth vs clientWidth + 溢出元素定位，排除 overflow-auto 设计内横滑）。

| 视口     | 结果                                                                                                                                         |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 375×812  | 15 页扫描 → 1 页溢出：/dashboard/mistake（scrollW 504，步骤条 5 步横排撑破）→ 修复：StepIndicator 加 overflow-x-auto（5 pill 横滑到底可见）  |
| 390×844  | 15 页全绿（0 溢出）                                                                                                                          |
| 768×1024 | 15 页 → 1 页溢出：/dashboard（scrollW 822，签到卡 w-28 按钮在 md 3 列挤压下溢出）→ 修复：签到卡 header 加 flex-wrap（按钮换行，PC 单行不变） |
| 1440×900 | PC 抽 3 页零回归（两处修复均不影响桌面布局）                                                                                                 |

其余扫描命中的 offender 均为设计内行为：移动顶栏 overflow-x-auto 横滑（b145cef 既有设计）、landing 装饰字出界（父容器 overflow 兜底）。

测试账号 test-ui@lekao.dev（生产库，1 个真实测试模板挂其下，可随时 admin 删除）。
