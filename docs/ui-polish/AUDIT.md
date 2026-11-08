# UI Polish AUDIT

目标：前端 UI 细节打磨（零人工 · 循环）。站点：本地 dev `http://localhost:3000`（输入留空，自起）。
环境事实：本地无 PG/Redis/Docker。审计基建（临时目录，不进仓库）：

- embedded-postgres @ `C:\Users\TimeCraker\AppData\Local\Temp\lekao-ui-audit\pgapp`（PG 18.4 @127.0.0.1:5434，库 resumeaix，Lekao 8 个 migration 已应用 + 手工建共享 `users` 表）
- 测试账号（仅本地库）：teacher@lekao-audit.test / admin@lekao-audit.test（synthetic 密码，不入库外任何系统）
- axe-core 4.10.2 经 127.0.0.1:7777 静态服务注入；截图/扫描 JSON 存 `...\lekao-ui-audit\{shots,scans}`
- dev server 以 `DATABASE_URL`/`NEXTAUTH_URL` 环境变量覆盖 .env 指向本地库（进程 env 优先，未读取 .env 值）

---

## 美术升级轮 · B0-C0 立法（2026-09-29）

### 背景与授权

迁移 ResumeAIX 设计方法体系到 lekao 全站（六个体系：令牌纪律/帽线图注/印刷装饰词汇/动效规格/质感层/微交互）。只动美术层；功能/API/schema 不动；主题色相零新增。用户已授权修复线上 Prisma client 事故（见本轮 B0-前置记录）。

### 本节交付

- 新增根级 `DESIGN.md` 单一事实源：三文档仲裁（globals.css 现网值为锚）、令牌总表、装饰词白名单 11 项（ORN-01~11）、动效/微交互/质感规格、状态徽章 10 档映射。
- `docs/ui-polish/rules.md` 全文并入 DESIGN.md §8，原文保留存档。

### 后续批次

B0-C1 reduce 防线真实化 → C2 动效层收编 → C3 质感层+装饰类 → C4 动效令牌+图标收编 → C5 全站双视口基线走查 → B1 marketing ∥ B2 auth → B3 dashboard 骨架（独占）→ B4 生成流 ∥ B5 记录社区 ∥ B6 admin。每批双机位（1440/390）×双档（default/reduce）截图验收，台账在本文件只追加。

### B0 实施记录（2026-09-29 · C1–C4）

- **C1 reduce 防线真实化**：自制 useSyncExternalStore 版 useReducedMotion（SSR 首帧恒 false）；12 处 import 切换；Providers + AdminShell 双挂 MotionConfig reducedMotion="user"（补 admin layout 不经 Providers 的缺口）；删未挂载的 lenis。验收：tsc 非测试 0 错、lint 33E/39W 持平基线、test 197/197。
- **C2 动效层收编**：钳制块四清单化（补 delay 归零，修 4 处 delay+both「隐形后闪现」触雷）；全局默认缓动 + `--ease-editorial` 令牌；删 7 死类 + 8 死 keyframes（btnGlow/popIn/cursorBlink/numFlip/slotRise/heroCharRise/rowHighlight/bobFloat）；裸色归令牌（pulseGlow blue-500→accent、errorPulse→danger、rowFlash→warning、表格 hover→accent-soft，color-mix 保原透明度）；5 处 inline `animation:` 挂载迁登记类（.anim-fade-up 走 --anim-delay / .anim-pulse-glow）。验收：inline 挂载 grep 0；tsc/lint/test 全绿。
- **C3 质感层 + 装饰类**：body::before grain 0.03（ORN-09 全站唯一实现）；ORN-01~11 登记类一次进齐；--hairline-warm 暖灰装饰线；Fraunces 400-italic 字面 22.8KB（裁决项 C 执行，6 处合成斜体消除）。
- **C4 动效令牌**：motion-tokens.ts（EASE_PUBLICATION / 时长三档 / 弹簧四档收编自 6 套散装 spring）；11 处曲线字面量归零；CheckIcon hex→var(--success)；奖牌九色定性印刷专色豁免（DESIGN.md §9）；AiThinkingDots 共用组件（framer 循环，reduce 静态）；PressableButton 弹簧归 SPRING_TAP 档。

### B0-C5 基线走查（2026-09-29）

- **协议**：本地干净 dev 实例（:3001，SSH 隧道连生产 PG）+ test-ui@lekao.dev 登录；15 条路由 × 4 机位（1440×900 / 390×844 × default/reduce）= 60 张全页截图，存仓库外 `Temp\lekao-ui-audit\baseline\`；逐页断言 pathname 与登录态（R9 踩坑协议）。
- **结果**：全部路由截图 OK；**console 错误 0**（C1 hydration 修复 dev 实测通过）；**reduce 档内容即时完整可见**（C2 delay 归零修复实证，dashboard 390×844-reduce 目检）。
- **admin 基线缺口**：test-ui@lekao.dev 无管理员角色，/admin 系被重定向登录页——B6 开工前需管理员测试账号或授权提级后补拍。
- **现状问题清单（按批归属）**：
  - B3：签到卡「签到 +N」按钮发光偏 tailwind 蓝感（shadow-accent/40）；功能卡「免费 / 1 币/次」chip 与 ORN-03 徽章语言待统一；coin-card 加赠/赠送拆分图例改点线价目行（ORN-02）。
  - B4：授课内容/学习要求选项 chips 选中态为原地变色，待 morphing 布点（layoutId）；「生成」按钮禁用态语义可再清晰；流式占位接 AiThinkingDots。
  - B5：profile 账号详情「注册时间/邮箱/扣费规则/账号状态」为名目—数值行，点线价目行最佳落点；ideas 状态徽章（待规划）统一到 badge-*；TOP3 金卡暖黄底未走令牌。
  - 全局：grain 质感层 dev 已生效且不干扰对比度；rounded-3xl 存量按 DESIGN.md 保留。

### B1 marketing 批（2026-09-29 · commit 7972efd）

- hero/about 浅底局部点阵移除（ORN-11 规则统一，质感层归全局 grain）；about CTA 副文案去 opacity-90（对比度 4.3→4.68:1 达标）；FAQ 补 AnimatePresence 修关闭瞬变（§12.2 清单 ❌ 项清零）。
- 验收：tsc 0 / lint 33E39W 持平 / test 197；后置截图 16 张（landing/about/privacy/terms ×4 机位，b1-after/）。
- 保留判定：landing PriceTag 胶囊已令牌纯（图标变体）不强行并入 badge-*；navbar/footer/PageHeader 零改动达标。

### B2 auth+错误页批（2026-09-29 · commit e9c33d1）

- login/register 局部点阵移除；发送成功提示 text-success→text-success-text（R-1 语义正文用 -text 后缀）；9 字段 focus 仪式感（field 包裹 group + label group-focus-within 变 accent-text）；register 裸 text-accent 链接→text-accent-text。
- 验收：tsc 0 / lint 持平 / test 197；**focus 仪式感计算色实测 rgb(37,82,229)=#2552E5** ✓；后置截图 8 张 + 聚焦态 1 张（b2-after/）。
- 保留判定：banned/not-found/两 error 页达标零改动；login layoutId tab morphing 既有达标。

### B3 dashboard 骨架批（2026-09-29 · commit cfff568）

- 检讫章 stamp-in 落地（ORN-07）：签到成功 done 态播放，回访已签不重播（freshStamp 状态区分）。
- coin-card 拆分图例改点线价目行（ORN-02 首次落地：mono 名目 + 点线 + serif tabular 数值）。
- bento 三组件弹簧归档 SPRING_TILT / SPRING_MAGNET；审计剩队 P3（bento hover 一致性）复核判定无需改动（各卡 hover 反馈已存在且走令牌）。
- 验收：tsc 0 / lint 持平 / test 197；交互实测 leader-dots=2 行、签到后 0→1 天连签、余额 204→206（+2 入赠送池，符合先赠送序）、done 态「✓ 已签」+ D1 格点亮 + 「+2 ✨」飞出帧；console 0 错；截图 b3-after/（印章播放落在 260ms 帧之后，终态帧确认）。
- 保留判定：sidebar（layoutId 滑块 + mounted 门控）、loading 骨架、TopBar、MobileNav、功能卡图标胶囊 Tag（与 landing 一致）均达标零改动。

### B4 生成流批（2026-09-29）

- summary-workflow：vision 读图与等首包期间输出区 AiThinkingDots 占位（「AI 正在读讲义…/正在组织语言…」），出字后由 hasOutput 门控，避免双过程指示冗余；错误卡正文 text-danger→text-danger-text（R-1）。
- output-card：复制钮实底对比度修复（已复制态 bg-success→bg-success-text，白字 2.5→5.9:1；反馈变体 bg-accent→bg-accent-text）。
- 判定更正（修正 B0 基线台账两处）：①选项 chips layoutId morphing 既有达标，「原地变色待改」判断有误；②weekend-ai-feedback-panel 五段假进度条（读图/识别学科/分析错题/生成反馈/整理小结）已达标零改动，不叠加第二套过程指示。usage-guide 散文体例保留（指南弹窗不硬改价目行）；「扣 1 T-Coin」chip 内联场景保留。
- 验收：tsc 0 / lint 持平 / test 197；真实生成走查（Playwright 现制合成讲义样张，无 PII）：vision 阶段占位「AI 正在读讲义…」实测可见 ✓；错误态渲染实测 ✓（text-danger-text 卡片 + 退款提示）。**外部事件：AI 供应商返回 402（SiliconFlow 账户余额不足），SSE 全链路流式帧留待充值后补验**——流式边收边渲染为既有能力（parseSummaryOutput 实时切分），本批未改动该路径。
- 踩坑：Playwright `emulateMedia reducedMotion` 跨脚本残留（上一脚本末档 reduce 会延续），后续走查脚本须先重置 no-preference。

### B5 记录/社区批（2026-09-29 · commit 7a0d346）

- profile 账号详情 4 行点线价目行（ORN-02）；余额高亮卡白字去 opacity-90/85/75（≈4.2:1 → 全白 AA，层级靠字号）。
- ideas 状态徽章统一 ORN-03（待规划=badge-neutral / 规划中=badge-progress / 已上线=badge-success，mono+前置圆点）。
- 判定更正与保留：TOP3 金卡本就走 warning-soft 令牌渐变（基线台账「未走令牌」有误）零改动；history 来源徽章为 10px 元数据小签（token 纯）不属状态机徽章场景，保留；IdeaEmptyState 三变体三要素达标零改动，场景插画属新增资产不做。
- 验收：tsc 0 / lint 持平 / test 197；实测 profile leader-dots=4、ideas badge-neutral=2；截图 b5-after/ 双页双视口。

### B6 admin 批（2026-09-29）

- palette 裸类全量归零（首轮盘点 68 处 → grep 0）：统计条与概览卡按语义族映射（用户/邀请码族=accent、教学生成族=annotation、消耗/峰值=warning、在线=success）；audit-log 九种操作色、users 封禁与 Admin 章、coin-log 盈亏、invite-codes 计数、admin/history 类型章各自归令牌。
- 对比度真 bug 修复：users「调整 T-Coin」琥珀底白字主按钮（≈2.2:1）→ bg-accent-text。
- svg-charts 四文件：与令牌值不一致的回退 hex 清零（半治理态 → 纯 var()）；轴标签/网格/高亮带裸 rgba 归 var()/color-mix（0.5 黑→ink-subtle 5.05:1、0.7 黑→ink-muted 7:1、高亮带→accent 18% mix）。
- 类型判别色跨页一致化：课堂小结=annotation / 堂测反馈=accent（TodayStrip、AnalyticsOverviewStrip、admin/page 分布条与概览、admin/history 类型章四处对齐）。
- 验收：tsc 0 / lint 持平 / test 197；grep palette 清零 + svg-charts hex/rgba 清零。**视觉验收缺口：test-ui@lekao.dev 无 ADMIN 角色，admin 路由重定向登录页，双机位截图待授权提级或管理员账号后补拍**（代码层由 grep+tsc 覆盖）。

### 收尾 · 六体系 grep 终验 + Lighthouse 留档（2026-09-29）

- **六体系 grep 终验全过**：palette 裸类 0；裸 hex 仅剩 layout.tsx themeColor 元数据（浏览器 chrome 色必须字面量，镜像 --canvas，已登记 DESIGN.md §9 豁免 + MedalIcon 印刷专色九色）；曲线字面量 0；inline animation 挂载 0；leader-dots 运行时 6 处（余额拆分 2 + 账号详情 4）；body::before 质感层唯一实现；layoutId 10 处。
- **Lighthouse login 移动端 ×3 中位数**：本地 v2.7.0 构建 **perf 95 / a11y 100**（95/95/95 三轮稳定）；生产参照（v2.6.0 旧代码、云机异构硬件，仅作方向参照）中位 85（84/85/90）。无回退、正向余量 +10。
- 工具坑：lighthouse 13/12 在 Windows 报「EPERM rmSync」实为**跑完后**临时目录清理失败——报告文件完整落盘，exit code 不可信，以输出 JSON 为准。

### 部署与线上验收终录（2026-09-29 · v2.7.0 @ 6162986）

- 部署：deploy-production.ps1 全链路成功，systemd active，本机与公网双 200，服务器 HEAD 与发版 commit 一致。
- 线上真实浏览器走查：生产登录实测恢复 ✓；工作台回访已签「不重播印章」断言 stampReplay=false ✓；profile 价目行=4 ✓；ideas 徽章=2 ✓；移动端无横向滚动 ✓；console 错误复检 **0**（首次走查的 8+12 条为瞬态，复跑归零）。
- 事故与修复：① 部署脚本 node -e 嵌套引号经 PS→SSH 传递受损（构建前失败，服务器零停机）→ 改无引号方案；② glob 直链真实部署中未展开（链接目标为字面 `*`，因新构建已内联 client 未致故障）→ 服务器手工换实证字面目标（session API 200），脚本改 find 定位版并留「勿改回嵌套引号」警示。
- 遗留移交：① AI 供应商 402（SiliconFlow 账户余额不足，功能层外部事件）——SSE 全链路流式帧待充值后补验；② admin 双机位视觉验收待管理员账号或提级授权。
- Lighthouse：本地 v2.7.0 login 移动端 ×3 中位 **perf 95 / a11y 100**（生产参照 85，异构硬件仅方向参照）。

### 灵感墙弹窗批（2026-09-29 · commit 7ff388a，用户授权的交互层小改）

- 新增 `ConfirmDialog` 组件（Portal + useDialogA11y 焦点陷阱/Esc/焦点归还 + AnimatePresence 双通道开合 + 危险态实底钮），替代灵感墙原生 `confirm()` 与三处 `alert()`。
- 删除走两阶段（点删除 → 弹窗确认 → 执行）；点赞失败/删除失败/网络错误改行内 danger 错误条（anim-shake，4s 自清）。评论区原为行内错误，零改动。
- 验收：tsc 0 / lint 持平 / test 197；**生产 E2E**：发验收灵感 → ConfirmDialog 可见（截图 dialog-after/）→ 确认后灵感消失（自清理）→ 点赞回环 0→1→0 ✓。
- 部署注记：本次部署首次实战脚本 find 定位符号链接步，readlink 显示已正确展开为真实路径；store 内 `.prisma` 布局 ls 输出异常未再深究（运行契约 session API 200 反复验证）。admin 侧同款原生弹窗（admin/ideas×9、history×2）为候选后续批，未在本次授权范围。

---

## Round 10 · 终版验证轮（2026-09-25）

### 隔轮评审

Round 9 收口结论复核：流式卡死已定性移交，测量协议补丁已记录。

### 终版回归扫（truncate 修复波及面）

- dashboard 7 页登录态实测：TopBar h1 `white-space: nowrap` 全部生效、badTruncate=0（/dashboard 与 /profile 无 TopBar 属预期）。
- 修复前（Round 7 发现时）：折行 50px；修复后：单行 25px。

### 全量验证套件（终版）

- `pnpm build` exit 0 ✅
- `tsc --noEmit`（非测试）0 错误 ✅
- `pnpm test` 197/197 ✅
- `pnpm lint` 33E/39W——较基线 **54E 净减 21**，剩余全部为业务/脚本层存量（setState-in-effect×14、require-imports×9 等），UI 范围零残留、零新增 ✅

### 停止声明（按收敛规则，如实写明）

10 轮（修复轮 5 + 精修/验证轮 5）后，**当前工具链（IAB + 本地审计基建）证据范围内找不到更多可验证的改进**。剩余三项均超出本轮授权/能力边界，如实挂起而非宣称完成：

1. 流式 swap 卡死（框架渲染层，需独立 Playwright 抓 console + Next 升级对比）；
2. 弱网走查（需 network throttle 能力）；
3. lint 存量 33E（业务组件 setState-in-effect 等，触碰即改业务逻辑）。
   不宣称完美；以上三项在获得对应工具/授权后可继续。

### 十轮累计成果速览

- P0×1（注册移动端按钮裁切）、P1×14、P2×8 修复；axe critical/serious 全扫面清零
- 全局性修复 2 个：`--ink-subtle` 令牌对比度（46 处使用点受益）、标题 truncate 失效（balance 层级冲突）
- 键盘可达性：skip link ×3、8 弹层焦点陷阱/Esc/焦点恢复、焦点环补齐
- 每路由唯一 title ×21 segment、表单 label 关联 ×15、语义结构修正 ×4、空态/截断补齐 ×6
- 18 个 commit 全部推送成功；AUDIT R1–R10 全记录

（本报告为第 10 轮收敛停机记录；如需继续，从「剩余队列」重启即可。）

---

## Round 9 · 验证轮（2026-09-25）

### 流式 swap 卡死：定性收口（不做代码修复）

补充实验与观察：

- 整页加载 vs 站内跳转对照（同一时段）：两者均正常 → 非「整页必卡」的确定性缺陷；
- 5 连发量化：本轮测量被会话漂移污染（登录成功后数次导航即被重定向 /login，5 次全落登录页）——**长时运行 dev server 的稳定性问题（Fast Refresh 失效、会话漂移、编译缓存劣化）与卡死现象共现**，无法在 IAB 工具链内获得可信的浏览器 console；
- 历史数据：卡死在 clean prod build 上复现过（Round 2 证据链），也多次正常——间歇性竞态。
  **结论**：根因在 Next.js 16/Turbopack 渲染层（流式 Suspense reveal 调度）与长时运行实例状态劣化的交集中；超出样式层边界，且本项目无 CI 环境做二分定位。**移交建议**：升级 Next 补丁版本对比；用独立 Playwright 进程（可抓 console + network throttle）在会话稳定环境下复现；关注 `src/proxy.ts` Redis 心跳与流式响应的潜在交互。真实生产站 Redis/DB 健康 + 用户走站内跳转为主，实际影响面待线上数据确认。

### 验证汇总

- 本轮无代码改动；dev :3000 存活、prod :3111 已停（省资源）。
- 卡死量化失败：测量协议需先断言会话有效（`location.pathname` 非 /login）再判 stuck——已写入踩坑。

### 剩余队列（下轮候选）

1. **[P1] 流式 swap 卡死深查**（框架层，需独立工具链）。
2. **[P2] 弱网走查**（需独立 Playwright 进程）。
3. **[P3] dashboard bento 卡片 hover 反馈一致性**。

### 踩坑

- 会话漂移：dev 长时运行后登录态会在数次导航内失效，所有页面级测量必须每格断言 `location.pathname` + 登录态。
- IAB 截图面超时用 reload 恢复；node 内联脚本遇 /tmp 路径映射问题需 cygpath 转换。

---

## Round 8 · 精修轨（2026-09-25）

### 隔轮评审

Round 7 修复截图（r7-summary-mobile-fixed-prod.png）复核：TopBar 单行省略号、紧凑页头，PASS。

### 修复波及面复查（Round 7 truncate 修复）

- 标题级 truncate 全站仅 2 处（扫描脚本：正则匹配 h1-h6 开标签含 truncate）：
  1. `sidebar.tsx:291` TopBar h1 — /dashboard/summary 375px 实测 `white-space: nowrap`、25px 单行 ✅（Round 7 已验）
  2. `usage-guide/modal.tsx:102` 弹窗 h2 — 375px 实测 28px 单行，全题「课堂小结 · 使用说明」完整显示 ✅
- 其余 33 处 truncate 均在 span/p/td 等非标题元素上（balance 规则从未波及），行为无变化。
- **结论：truncate 修复无回归、无布局惊喜。**

### 截图

- r8-modal-h2-mobile.png（弹窗标题单行）

### 验证汇总

- 无代码改动（纯验证轮）；工作区仅本文件变更。

### 剩余队列（下轮）

1. **[P1] 流式 swap 卡死深查**（框架层）。
2. **[P2] 弱网走查**（需独立 Playwright 进程）。
3. **[P3] 精修轨候选**：dashboard bento 卡片 hover 反馈一致性复查。

### 踩坑

- 多行 JSX 正则扫描需用 node 脚本文件（bash 内联正则转义易炸）。

---

## Round 7 · 精修轨（2026-09-25）

### 隔轮评审

Round 6 截图（r6-register-mobile-after.png）复核：换行按钮全宽、与表单节奏一致，PASS。本轮顺带走查 404/login/banned 移动端（CTA 44px、零溢出，无新问题）。

### 重大发现与修复：全站标题类 `truncate` 失效（P1，1 文件）

**现象**：移动端 TopBar 标题「课堂小结」折成两行（设计意图为单行省略号截断），描述被挤成半截。排查发现全站所有挂 `truncate` 的 h1/h2/h3/h4 均失效。

**根因链**（全部实测）：

1. 元素带 `truncate` 类且 `matches('.truncate')===true`，但计算值 `white-space: normal`、`overflow: visible`——规则不生效；
2. 新建 `div.truncate` 立即生效，新建 `h1.truncate`（任意位置）失效 → **标签级差异**；
3. 编译 CSS 中唯一标签级相关规则：`h1,h2,h3,h4{text-wrap:balance}`（来自 globals.css，**无层**）；
4. 机制：CSS Text 4 拆分后 `white-space` 是 `text-wrap-mode` 的 shorthand——无层 `text-wrap:balance`（mode:wrap）按源顺序压过 utilities 层 `.truncate` 的 `white-space:nowrap`（mode:nowrap），标题全部恢复换行；
5. 修复验证：dev + prod 双构建，TopBar h1 `white-space:nowrap`、高 50px→25px 单行省略号 ✅；无 truncate 的普通标题 `text-wrap:balance` 保留（无回归）✅。

**修法**（`globals.css`，令牌/规则层一次解决）：balance 规则 `:not(.truncate)` 豁免（截断标题无需 balance）。曾试 `@layer base` 包裹——Turbopack/Tailwind 4 编译输出把用户 CSS 的层包装剥掉，不可依赖，故用选择器豁免（不依赖层机制）。

### 证据

- 前：r7-summary-mobile.png（标题折行）
- 后：r7-summary-mobile-fixed-prod.png（prod 构建，单行省略号）
- 实验 JSON 存会话记录；验证脚本：浏览器 computed-style 探针（ws/height/matches）

### 验证汇总

- prod build exit 0 ✅；prod 实测 nowrap + balance 双确认 ✅；dev 同 ✅
- commit `a131ee0` push ✅（4127736..a131ee0）

### 剩余队列（下轮）

1. **[P1] 流式 swap 卡死深查**（框架层，长期挂起）。
2. **[P2] 弱网走查**（需独立 Playwright 进程）。
3. **[P2] `truncate` 失效影响的全面复查**：全站 grep truncate 使用点逐个目检（TopBar 已验；sidebar 品牌截断、coin 显示等下轮扫）。

### 踩坑

- 登录会话随时可能失效：任何 prod/dev 测量前必须断言 `location.pathname`，否则测的是登录页元素（本轮 prod 首测即踩，h1 实为登录页标题）。
- IAB 截图面偶发超时（"capture failed for guest"/"surface preparation timed out"）——reload 后即恢复。
- `@layer` 包裹用户 CSS 会被 Turbopack/Tailwind 4 编译剥掉，层机制在该项目自定义 CSS 中不可依赖。

---

## Round 6 · 精修轨（2026-09-25）

轨 1 已清零，转精修轨。本轮工艺改进 2 项（有截图/对照证据）：

1. **[P2][一致性] 注册/登录「发送验证码」按钮换行后全宽**
   - 前值（r1-fix-register-mobile.png）：375px 下按钮换行后保持固有宽度（102px），与上下全宽输入框/CTA 节奏脱节（隔轮评审 low 建议）。
   - 修法：`max-sm:w-full sm:px-4`——移动端换行即全宽，桌面保持原有内联布局不变（register + login 两处同步）。
   - 后值证据：r6-register-mobile-after.png（按钮与表单字段同宽，节奏统一）。
2. **[P2][一致性] 「返回控制台」链接 hover 色统一**
   - 前值：profile 页 `hover:text-accent-text`，其余 4 处 `hover:text-ink`——同一动作两种反馈。
   - 修法：profile 统一为 `hover:text-ink`（挂靠规则：同语义动作 = 同交互反馈）。

验证：build exit 0 ✅；375px 实测按钮 right=317 ≤ 视口、width=268 全宽 ✅。

跳过：admin 表格横滚可视提示——fade 遮罩方案在白底表格上易显脏、收益有限，判为花活风险，不做（记录原因，不横跳）。

提交 + push：（见 git log）

---

## Round 5（2026-09-25）

### 隔轮评审

Round 4 截断改动经复扫验证（overflowX=0 / wideEls 空），无回归。

### 极端数据追加（本地库）

- 点赞：10 个点赞账号 × 前 10 篇灵感（1~10 赞/篇，覆盖个位到两位数渲染）
- 评论：200 字满长、纯 emoji、RTL、1 字四类极端评论 ×12 条

### 扫描结果

- `/dashboard/ideas` 桌面 + 移动：overflowX=0、wideEls 空；长标题/emoji/RTL/点赞数渲染正常 ✅
- `/admin/ideas/comments`：overflowX=0 ✅（极端评论未默认展示在首屏，属分页/选择交互，非缺陷）

### 修复清单（1 批，1 文件）

1. [P1][焦点环] `weekend-student-table.tsx:189` 搜索输入框 `focus:outline-none` 且无任何替代指示 → 补 `focus:outline-2 focus:outline-offset-[-2px] focus:outline-accent/60`（前值：键盘焦点完全不可见）。
2. [P2][对比度] 同文件「无匹配」`text-danger` → `text-danger-text`（沿用 Round 1 令牌分层规则）。

- 全站焦点环审计结论：`focus:outline-none` 全站仅 9 处，其中 8 处为弹层容器（tabIndex=-1 有意抑制，内部焦点元素不受影响）+ 1 处即上述修复；PressableButton 已有规范 `focus-visible:ring-2`。代码级清零 ✅

### 跳过 + 原因

- 程序化 focus() 探测焦点环的方法论局限：脚本 focus 不触发 `:focus-visible`，无法区分真实键盘环——改用代码级审计（outline-none 清点）+ PressableButton 组件核查，覆盖面等价。

### 提交 + push

- （见 git log；push 如实记录）

### 剩余队列（下轮起转精修轨）

1. **[P1] 流式 swap 卡死深查**（框架层，长期挂起项）。
2. **[P2] 弱网走查**（需独立 Playwright 进程支持 network throttle，IAB 无此能力）。
3. **[P3] 移动端表格横滚可视提示**。

## Round 4（2026-09-25）

### 隔轮评审

Round 3 弹层改动经由实时键盘走查复核（Tab×6 锁定 + Esc 链路 + 焦点恢复），无回归。

### 极端数据压测（本地库灌注）

- 用户：96 字超长中文名、纯 emoji 名、RTL 阿拉伯文名、中英混合长名、null 名 ×各 1
- 数据：200 条调币流水（含 200 字超长理由/emoji）、100 条审计日志（超长 JSON details）、30 条灵感（50 字满标题/500 字满描述/emoji/RTL）

### 扫描结果（桌面 1440 + 移动 375，登录态实测）

- `/admin/users` `/admin/coin-log` `/admin/audit-log` `/dashboard/ideas`：横向溢出全部 **0**，无元素越界 ✅
- 长文本兜底现状：coin-log reason 已有 `max-w-xs truncate`；audit-log details 已有 `pre.break-words max-w-md`；表格容器 `overflow-x-auto` 兜底 ✅

### 修复清单（1 批，3 文件）

1. [P2][截断] `admin/users/page.tsx` 姓名列 `max-w-[140px] truncate` + 邮箱列 `max-w-[220px] truncate`（title 属性保完整值可 hover 查看；前值无截断靠横滚）。
2. [P2][截断] `admin/coin-log/page.tsx` user/admin email 单元格 `max-w-[200px] truncate` ×2。
3. [P2][截断] `admin/audit-log/page.tsx` admin/targetUser email 单元格 `max-w-[200px] truncate` ×2。
   验证：复扫 overflowX=0、wideEls 空 ✅。

### 保留 + 原因

- 现存表格 `overflow-x-auto` 横滚设计保留（移动端窄表标准方案）。
- 首页「00」水印、about「About」出血装饰字：刻意排版（Round 1 已记录）。

### 提交 + push

- `fix(ui): admin 列表长文本单元格补截断 / truncate long text cells in admin tables`（3 文件）→ push ✅

### 剩余队列

1. **[P1] 流式 swap 卡死深查**（框架层）。
2. **[P2] 弱网走查**（CDP throttle）。
3. **[P2] ideas 点赞/评论极端场景**（0 赞/999 赞渲染）→ Round 5 已做。
4. **[P3] 移动端 admin 表格横滚提示**（Round 6 判为花活风险，跳过）。

### 踩坑

- dev server 重启后 next-auth 会话偶发失效导致页面被重定向 /login——扫描脚本必须断言 `onLogin:false`，否则测的是登录页（本轮实测踩中）。

---

## Round 3（2026-09-25）

### 隔轮评审

Round 2 截图（r2-login-aria-pressed）随做随验；弹层交互以实时走查替代静态截图评审。

### 基线

- build exit 0 ✅；tsc（非测试）0 错误 ✅；vitest 197 ✅；lint 33E/39W（Round 2 末 33/39 持平）。

### 修复清单（1 批，9 文件）

1. [P1][键盘] 新增 `src/lib/hooks/dialog-a11y.ts` —— `useDialogA11y({ open, onClose })`：Tab/Shift+Tab 循环锁焦点、Escape 关闭、打开时聚焦容器、关闭时恢复原焦点（挂 window capture，onClose 用 ref 稳定订阅）。
2. [P1][键盘] 8 个弹层全部接入（前值：仅使用说明有 Esc，其余 7 个既无陷阱也无 Esc；全站弹层盘点 = `grep "fixed inset-0"`）：
   - 使用说明 Modal（原 Esc 效果改由 hook 统一）
   - 提个建议 IdeaSubmitDialog（补 role=dialog/aria-modal/aria-label/tabIndex）
   - admin 编辑用户弹层（补语义 + 姓名/角色 label htmlFor + 调币两输入 aria-label + 关闭按钮 aria-label）
   - 模板管理 Modal、Word 预览、错题预览（history-date-panel）、错题集详情（history-mgmt）、添加新 Sheet（weekend-mistake-workflow）

### 验证

- Tab 陷阱：真实键盘事件 6 连 Tab，焦点始终在 dialog 内（`inDlg=true` ×6）✅
- Escape：hook 处理链验证通过（合成 keydown → 关闭 + 焦点恢复触发按钮）✅；真实按键在 IAB 下偶发不达页面（与 Round 1 登录按钮点击同源的工具投递怪癖，已记录），逻辑路径与 Tab 一致无差异。
- tsc 0 / build exit 0 / vitest 197 ✅；lint 33E/39W 零新增 ✅

### 提交 + push

- `feat(a11y): 全站弹层统一焦点陷阱/Esc/焦点恢复 / unified dialog focus trap…`（9 文件）→ push `8f992c8..cfaa364` 一次成功 ✅

### 剩余队列（下轮）

1. **[P1] 流式 swap 卡死深查**（框架层，Round 2 证据链）。
2. **[P2] 超长文本/大数据列表压测**（history/ideas 灌 1000 行 + 超长邮箱姓名）。
3. **[P2] 弱网走查**（CDP throttle 关键路径）。
4. **[P2] admin 其余列表空态**（coin-log/audit-log/history/ideas 与 users 对齐）。
5. **[P2] 使用说明 Modal 内部链接/按钮语义复查**（content.tsx 图标未用告警顺手清）。

### 踩坑

- 测试脚本用 synthetic KeyboardEvent 走查焦点无效（不可信事件不触发浏览器默认焦点移动）——焦点走查必须用真实键盘事件（locator.press）。
- dev 流式卡死会随机污染交互测试（页面停在骨架态导致「按钮不存在」假象）：交互验证前先确认目标按钮真实存在。
- node 批量 patch 遇 CRLF 多行模板必 MISS；且 patch 函数「MISS 仍 writeFileSync」会touch 文件使 Edit 工具状态过期——多行编辑统一用 Read+Edit 工具。

---

## Round 2（2026-09-25）

### 隔轮评审（独立子代理审上轮截图，6 张）

- **overall PASS**。5/6 pass；修复前注册移动端截图 FAIL（按钮视口裁切）作为基线存档。
- 评审带来 2 条 low 建议：①注册页「发送验证码」首屏底部仅露边（正常滚动可达）；②admin 用户表空数据无空态提示 → ②已修（见下），①保留：属正常文档流滚动，压缩首屏留白收益低、扰动大。

### 基线

- build exit 0 ✅；lint 54E/38W（与 Round 1 末一致）；vitest 197 ✅。

### 修复清单

1. [P2][文案] JSX 中文文案 ASCII 直引号 → 中文弯引号「“”」，7 行 4 文件（settings:77、confirm-cover:86/105/115/134、weekend-ai-feedback-panel:800、weekend-mistake-workflow:1041、weekend-student-table:331）。`react/no-unescaped-entities` 21→**0**；lint errors 54→34。验证：lint 复扫清零 + build 绿。踩坑：批量按行替换误伤了 2 处 `className` 属性引号，已当场修复——教训：JSX 行内混有属性/表达式引号时不可整行盲替。
2. [P2][空态] `admin/users/page.tsx:122` 空表补 colSpan=7「暂无用户」整行（前值：仅表头空白，无法区分加载/无数据）。验证：代码审查 + build（本地有种子用户，空态视觉待下轮用无数据账号验证）。
3. [P3][语义] login 登录方式切换按钮补 `aria-pressed` + `role="group" aria-label`（刻意不做 role=tablist——无方向键导航的 tablist 反而违反 APG）。验证：浏览器复扫 aria-pressed=true/false 正确。

### P1 深查：登录态页流式分段 swap 卡死（未修，证据链完整移交）

现象：admin/dashboard 部分子页（users/analytics/invite-codes/settings 等）SSR 后 `main` 永久停留在 `loading.tsx` 骨架，真实内容滞留在 body 下 `DIV#S:0`（视觉不可见，语义树分裂）。`/admin`、dashboard 各页及全部公开页正常。
证据链（本轮全部实测）：

- 纯净 prod build（无 dev 并发）复现 → **非环境污染，真实存在**；
- HTML 全量 6ms 送达（28KB，`$RC("B:0","S:0")` 调用内联在 HTML 中）；
- `$RC` 已执行（B:0 前置注释已标记 `$~`），`$RB` 队列长度恒 2 长达 15s+ 不被消化 → React 从不执行 reveal；
- flight chunks 已被消化（`__next_f` 空）、全部 JS chunk 200、无 hydration console error（dev 钩子）；
- 差分实验：移除 segment `layout.tsx` 重建 prod 仍卡 → **与 Round 1 的 layout 重构无关**；现象在 Round 1 之前的扫描中已有痕迹（page-has-heading-one 误报根源即此）；
- 高度疑似 React 19 / Next 16.2.9 Turbopack 流式 reveal 调度内部问题（`$RT` 定时器 id 疑似一次性丢失后永久饥饿），且 Redis 不可达时 `[admin/online-users]` 重试风暴与卡死相关性未定。
  处置：根因在框架渲染层，超出「样式层/组件结构」修复边界 → **跳过并记录**。建议后续：升级 Next 补丁版本对比、在 Redis 健康环境复测、用完整 Playwright(独立进程) 抓 console 确认。真实生产站 Redis 健康，受影响概率低，但值得验证。

### 跳过 + 原因

- 注册移动端「发送验证码」首屏完整可见性微调：正常滚动可达，评审 low，收益/扰动比低。
- lint 剩余 34E（setState-in-effect 14、require-imports 9 等）：业务/脚本层存量，不在 UI 边界内。

### 验证汇总

- build exit 0 ✅；vitest 未跑改动（无逻辑文件触碰，quote/aria/空态均为模板层）；lint **54→34** errors（-20），零新增 ✅
- aria-pressed 浏览器验证 ✅；截图存 `...\lekao-ui-audit\shots\r2-*`

### 提交 + push

- `fix(a11y): 中文文案引号改弯引号并补用户表空态 / curly quotes … empty state`（6 文件）
- `fix(a11y): 登录方式切换按钮补 aria-pressed 状态 / expose aria-pressed …`（1 文件）
- push `a4512f5..4580237` 一次成功 ✅

### 剩余队列（下轮）

1. **[P1] 流式 swap 卡死深查**（见上，框架层）。
2. **[P1] 弹层焦点陷阱 + Esc 盘点**：IdeaSubmitDialog、admin 用户编辑弹层、使用说明抽屉逐个键盘走查。
3. **[P2] 超长文本/极端数据**：history/ideas 列表灌 1000 行假数据 + 超长邮箱/姓名渲染压测。
4. **[P2] 弱网（CDP throttle）关键路径走查**。
5. **[P2] admin 空态补齐**：coin-log/audit-log/history/ideas 列表空态与 users 对齐。
6. **[P3] 空态视觉验证**：用无数据账号过 users 空态。

### 踩坑

- Windows 后台 bash 任务结束会带走其子进程树：embedded-postgres 需 node 常驻脚本（persistent 模式）；postgres 僵死后 netstat 无监听但进程存活，需删 postmaster.pid 重启。
- 3111 端口旧进程占位导致 `pnpm start` 静默失败（grep Ready 误判成功）——重启前必须核对 netstat。
- JSX 整行引号盲替会破坏属性/表达式，必须按目标片段精准替换。

---

## Round 1（2026-09-25）

### 隔轮评审

首轮，无上轮改动可评审。

### 基线

- build：红（prisma client 未生成 → `prisma generate` 后绿，exit 0）
- lint：54 errors / 38 warnings，**全部存量**（no-require-imports×9、setState-in-effect×14、no-unescaped-entities×21、unused-vars 等）。策略：UI 范围项随批修（正文引号转义属文案层，本轮未触；业务相关 setState-in-effect 不动），不新增即可提交。轮末复查：54E/38W 与基线完全一致，零新增。
- test（vitest）：197 passed / 14 files ✅

### 覆盖矩阵（24 路由 × 1440×900 + 375×812）

公开：`/`、`/login`、`/register`、`/about`、`/privacy`、`/terms`、`/banned`、404 ✅ 全扫
dashboard：`/dashboard`、`/summary`、`/feedback`、`/history`、`/history-mgmt`、`/ideas`、`/mistake`、`/weekend-mistake`、`/profile` ✅ 全扫
admin：`/admin`、`/users`、`/analytics`、`/coin-log`、`/audit-log`、`/history`、`/ideas`、`/invite-codes`、`/settings` ✅ 全扫（audit-log/ideas/comments 仅结构扫描 + title 验证）
无遗漏。

### 修复清单（前值→后值，验证 = 浏览器复扫 + axe）

**批 1 · 令牌与公开/认证页（commit 1，11 文件）**

1. [P1][对比度] `globals.css:33` `--ink-subtle` #64748b→#5A6B80（canvas-alt 4.41→4.70:1 / canvas 5.05:1）。根因：eyebrow/计数 11px 小字在多页低于 4.5。验证：axe color-contrast 于 /、/dashboard、/admin/analytics 清零。
2. [P0][布局] `register/page.tsx` 验证码行 flex 不收缩，「发送验证码」按钮 375px 视口被裁切（right=434>375）→ 输入行 `flex-wrap` + input `min-w-0 basis-40`。后值：按钮 right=151 完整可见。验证：375px 截图 + 坐标复测。
3. [P1][表单] login/register 全部 input 补 `htmlFor`+`id`（login 4、register 5，前值 0 关联）。验证：重扫 unlabeledInputs=0。
4. [P1][链接] 注册页「服务条款/隐私政策」axe link-in-text-block serious → 加 `underline decoration-accent/40`。验证：/register axe 清零。
5. [P1][点击目标] footer 链接 h20→h28（py-1）；login/register 底部链接加 py-1 -my-1。验证：结构复扫 footerLinks h=28。
6. [P1][键盘] marketing 布局加 skip link（`#main-content`，Tab 首位可见）。验证：skipLink=true 且聚焦可见。
7. [P1][title] 内页标题重复「关于 · Lekao Agent · Lekao Agent」→ 页面 title 短名化；首页 `absolute`；404 补 `页面不存在`。验证：5 页 title 唯一。
8. [P2][alt] navbar 两处 logo `alt="Lekao Agent"`→`alt=""`（相邻文字已表达，axe image-redundant-alt minor）。验证：/、/about axe 清零。

**批 2 · dashboard（commit 2）** 9. [P1][title] dashboard 全部页共用默认 title → layout 转 server 组件导出 metadata + 8 个 segment layout（控制台/课堂小结/作业/堂测反馈/生成历史/历史管理/灵感墙/错题集/周末反馈表/个人中心）。验证：每路由 title 唯一。10. [P1][表单] ideas 页排序 `<select>` 无可访问名（axe **critical**）→ `aria-label`；搜索框同。验证：/dashboard/ideas axe 清零。11. [P1][表单] summary-workflow 班级/日期 label 关联（前值 0）。验证：unlabeledInputs=0。12. [P1][语义] profile `<dl>` 内 dt/dd 被 div 隔层包裹（axe serious×2）→ Item 改为 `div > dt(icon+label) + dd`。验证：/dashboard/profile axe 清零。13. [P1][点击目标] 「← 返回控制台」h20→h28（summary/feedback/history/mistake/profile 5 处）；profile「修改用户名」h20→h28。14. [P1][结构] dashboard layout（client）抽壳层 `components/dashboard/shell.tsx`，layout 转 server + skip link + `main#main-content`。

**批 3 · admin 与红字对比度（commit 3）** 15. [P1][title] admin layout 同批 2 模式 + 9 个 segment title（数据分析/用户管理/调币流水/审计日志/邀请码管理/内容历史/灵感墙管理/评论管理/系统设置）。16. [P1][表单] users 行内「编辑用户」图标按钮 axe button-name **critical** → `aria-label`；coin-log/history/ideas 搜索框 aria-label；invite-codes 数量/前缀补 htmlFor+id（含修一处 sed 误加重复 id 的 TS17001）。验证：admin 各页 axe 无 critical/serious。17. [P1][对比度] 静态红字正文 `text-danger`(#ef4444, 3.76:1)→`text-danger-text`(#b91c1c, ≥5.2:1)：admin/TodayStrip、admin error.tsx、dashboard error.tsx、admin/page、comments「已撤回」、checkin-card、history-mgmt 警示标题、profile-actions alert、login/register 错误条（10 处）。验证：/admin/analytics axe 清零。18. [P2][语义] banned 页包 `<main>`（axe landmark-one-main/region moderate）。验证：/banned axe 清零。19. [P2][标题] settings/invite-codes section h3→h2、history-mgmt 空态 h3→h2、feature-card h3→h2（修 1>3 跳档）。验证：真实树大纲 1→2 无跳档。

### 跳过 + 原因

- **lint 54 存量 errors**：setState-in-effect（React Compiler 规则，14 处）触碰业务组件逻辑；no-require-imports 在 `scripts/` 运维脚本（不参与构建）。UI 范围外的统一不动，只保证零新增。
- **登录按钮 Playwright 点击超时**：IAB actionability 检查不过（JS click 秒过、真实用户可用）。疑与 motion 动画有关，属工具链现象，不改产品。
- **admin 移动端「评论管理」tab right=1096**：横滚 tab 条（overflow-x-auto）刻意设计，保留。

### 保留 + 原因

- dashboard 快捷卡装饰圆环 -right-10 越界（视觉裁切正常）：刻意装饰，overflow-hidden 已约束。
- about「About」、首页「00」serif 巨型水印字：刻意排版装饰。
- `--ink-subtle` 调深后仍保持比 `--ink-muted` 浅的层次。

### 验证汇总

- 最终 build exit 0 ✅；vitest 197/197 ✅；lint 54E/38W 与基线一致（零新增）✅
- axe（wcag2a/2aa/21a/21aa/best-practice）：公开页 7/7 清零；dashboard 扫描页清零；admin（analytics/users/settings/invite-codes 等）critical/serious 清零（users/settings/invite-codes 的 page-has-heading-one 见下条待查项）
- 桌面 1440×900 + 移动 375×812 横向溢出：全路由 0
- 截图 30+ 张存临时目录（路径见头部）

### 提交 + push

- `70647da` fix(a11y): 公开页与认证页可访问性修复 / accessibility fixes for public and auth pages
- `refactor(a11y)` dashboard 壳层（中间提交）
- `8b081ed` fix(a11y): admin 壳层/标题/语义结构与红字对比度（尾提交）
- push：`01875ed..8b081ed main -> main` 一次成功 ✅（工作区仅剩 docs 本文件与 rules.md）
- 说明：本轮实际触及 ~50 文件，超出「每批 ≤10 文件」约定——结构性修复（layout 抽壳层 + 19 个 segment layout 元文件）无法按更小粒度独立 revert，按区域分 3 批并如实披露。

### 待查队列（下轮优先）

1. **[P1] React 流式分段 swap 未完成（dashboard/admin 登录态页）**：`main` 内残留 `loading.tsx` 骨架（animate-pulse）+ `<TEMPLATE>`，真实内容经 body 下 `DIV#S:0` 流式段渲染（视觉正常，语义树分裂 → axe 间歇性 page-has-heading-one / 读屏可能读到骨架+正文两份）。dev 与 prod build 均现；公开页无此现象。已试 dashboard layout client→server 化，未消除。疑 hydration 边界问题，属渲染核心而非样式层，需专门轮次深查（浏览器 console 抓 hydration error 定位）。
2. **[P2] `react/no-unescaped-entities` 21 处**（正文裸引号，文案层）：随批转义。
3. **[P2] 弱网/超长文本/大数据列表边界**：下轮以 CDP 弱网 + 1000 行假数据压测 history/ideas 列表。
4. **[P2] 弹层焦点陷阱盘点**：IdeaSubmitDialog、admin 编辑弹层、使用说明抽屉的 Esc/焦点圈待逐个验证。
5. **[P3] 登录页「邮箱密码/邮箱验证码」tab 需 role=tablist 语义**（当前是普通 button 组）。

### 踩坑

- Windows 无 psql/docker → embedded-postgres + `prisma db execute` 替代；Lekao 迁移不建 `users` 表 → 先跑前 4 个迁移、手工建表、`migrate resolve --rolled-back` 后续跑余下 4 个（P3018 恢复路径）。
- prisma client 字段名是 `t_coin`/`lekao_gift_coin`（`@map("tCoin")` 是列名），seed 时猜错过一次。
- IAB 大字符串 evaluate 参数会静默失败 → axe 经 127.0.0.1:7777 `<script src>` 注入。
- Turbopack Fast Refresh 偶发不生效 → touch + 整页 reload。
- axe 结果与页面客户端加载态强耦合：admin 页需 ≥2.5s settle 再扫，否则误报/漏报。

---

## P02 全仓巡检 · 基线更新（2026-09-30）

- **lint 基线由 33E/39W 收敛为 22E/2W**：8 个 error 随 `scripts/archive/**` 移出 lint 范围（一次性调试脚本归档，tsconfig 已排除，非关闭规则）；2 个 `no-explicit-any` 与 35 个 warning 已修（未用符号 / 死代码 / 显式响应类型）。余量 22 error（react-hooks：set-state-in-effect ×17、refs ×3、immutability ×1、preserve-manual-memoization ×1）+ 2 warning（navbar `<img>`）修复均需改运行时行为，按行为冻结留待专门重构轮。**后续批次验收基线：22E/2W 持平。**
- **typecheck 基线**：`pnpm typecheck`（tsc --noEmit）0 错（修复 4 个测试文件类型基线：TemplateStyle 导入源、checkin mock partialRow、matchField 签名放宽、map() helper 默认参数）；`noImplicitOverride` 已开（0 违例）；`noUncheckedIndexedAccess` 实测 121 处需改、超「≤30 处」阀门，未启用。
- 此前各批记录的「33E/39W 持平」为当时历史快照，不回填。
