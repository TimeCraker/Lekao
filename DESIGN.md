# DESIGN.md — Lekao 设计令牌与装饰词汇 · 单一事实源

> **文档地位**：本文件是 lekao 前端视觉层的唯一权威规范。之后的每个样式改动都走这份文档。
> **真源优先级**：本文件 > `src/app/globals.css` 注释 > `docs/ai-delivery/design/editorial-intelligence-system.md` > 其余 `docs/*`。
> **仲裁基线**：2026-09-29 立法。令牌值以当日 `globals.css` 现网值为锚（10 轮 UI 工艺打磨的产物），`editorial-intelligence-system.md` 契约仅用于补缺口。
> **变更流程**：改令牌 = 改本文件登记行 + `globals.css` 改动放进**同一个 commit**；新装饰词必须先登记 §3 再使用。
> **方法来源**：ResumeAIX 设计方法体系（MASTER.md / rules.md / AUDIT R15–R21）——只迁移方法与秩序，不搬颜色。lekao 主题色相零新增。

---

## 0. 三文档仲裁结论

| 议题          | 现网 globals.css                               | editorial 契约                   | **裁决**                                                                                                                      |
| ------------- | ---------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| canvas        | `#F8F6F1`                                      | `#F4F1E9`（更暖）                | **锚定现网**。10 轮打磨产物，改动无收益                                                                                       |
| hairline      | `#e2e8f0`（冷灰）                              | `#D9D6CE`（暖灰）                | **保留现网**，另增暖灰辅助档 `--hairline-warm: #E3DFD5` 供印刷装饰词（帽线/价目行/角标）使用，冷灰继续承担 UI 分隔            |
| 语义色        | 带 `-text` 深色变体（5.21–5.94:1）             | 深化值 `#168462/#9A6500/#B42318` | **锚定现网 `-text` 变体**（对比度已达标），契约值记录不采                                                                     |
| 动效时长      | 散写 0.4–0.6s                                  | 120/200/320                      | **采纳契约三档**，存量映射规则见 §1.2                                                                                         |
| 权威曲线      | 已在用 `cubic-bezier(0.22,1,0.36,1)`           | 同                               | 一致，升格为 `--ease-editorial` 令牌 + 全局默认缓动兜底                                                                       |
| 圆角          | 10/14/20/24 四档                               | 控件10/容器14/舞台20             | 锚定现网四档；**禁默认 `rounded-3xl` 新增**（存量 3 处保留）                                                                  |
| Fraunces 斜体 | 只托管 400/600 正体，5+ 处 `italic` 为合成斜体 | —                                | **裁决：补 `fraunces-latin-400-italic.woff2`**（约 15KB，展示层收益 > 成本）；600-italic 不引，斜体只用于 400 字重的副标/夹注 |

---

## 1. 令牌总表

### 1.1 色彩（以现网为锚，全部定义于 `globals.css :root`）

| 令牌                               | 值                                | 用途                              | 对比度                            |
| ---------------------------------- | --------------------------------- | --------------------------------- | --------------------------------- |
| `--canvas`                         | `#F8F6F1`                         | 全局背景                          | —                                 |
| `--canvas-alt`                     | `#F1EEE6`                         | 次背景（sidebar/分区）            | —                                 |
| `--paper`                          | `#FFFEFB`                         | 工作纸/卡片                       | —                                 |
| `--ink`                            | `#111722`                         | 标题/正文主色                     | ≥15:1                             |
| `--ink-mute`                       | `#1e293b`                         | 次文字                            | ≥12:1                             |
| `--ink-muted`                      | `#475569`                         | 辅助文字                          | ≥7:1                              |
| `--ink-subtle`                     | `#5A6B80`                         | 弱化文字（eyebrow/计数）          | canvas 5.05:1 / canvas-alt 4.70:1 |
| `--hairline`                       | `#e2e8f0`                         | UI 分隔线                         | —                                 |
| `--divider`                        | `#cbd5e1`                         | 强分隔/点线价目行                 | —                                 |
| `--hairline-warm` 🆕               | `#E3DFD5`                         | 印刷装饰线（帽线/价目点线/角标）  | 装饰豁免                          |
| `--accent`                         | `#3157F6`                         | 钴蓝 · 装饰/描边/选中态           | —                                 |
| `--accent-hover`                   | `#2547D8`                         | hover 深一档                      | —                                 |
| `--accent-soft`                    | `#E4EAFD`                         | 标签浅底                          | —                                 |
| `--accent-ink`                     | `#1E3A8A`                         | 深底大字标签                      | —                                 |
| `--accent-text`                    | `#2552E5`                         | CTA 实底/浅底文字                 | 白字 AA                           |
| `--accent-line`                    | `rgba(49,87,246,.32)`             | 蓝装饰线                          | 装饰豁免                          |
| `--annotation` / `-soft` / `-text` | `#F06449` / `#FEE4DE` / `#C24130` | 珊瑚批注（不作大面积背景）        | text AA                           |
| `--success` / `-text` / `-soft`    | `#10b981` / `#047857` / `#d1fae5` | 完成/成功                         | text 5.94:1                       |
| `--warning` / `-text` / `-soft`    | `#f59e0b` / `#b45309` / `#fef3c7` | 等待/注意                         | text 5.21:1                       |
| `--danger` / `-text` / `-soft`     | `#ef4444` / `#b91c1c` / `#fee2e2` | 失败/破坏性                       | text 5.21:1                       |
| `--page-dark` 等 6 个              | 现网值                            | 局部深色舞台（签到卡/footer/CTA） | —                                 |

**一色三态纪律**（承 ResumeAIX）：同一色相按用途拆分——裸色只做图标/边框/装饰；`-text` 做浅底文字；`-soft` 做浅底。**可读文字禁透明度修饰**（`/70 /60` 等），层次用完整的 `-text`/`-muted` 令牌表达。

### 1.2 动效令牌

| 令牌                                | 值                                | 场景                                                                                            |
| ----------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------- |
| `--ease-editorial`                  | `cubic-bezier(0.22, 1, 0.36, 1)`  | **全站权威曲线**。globals.css 挂全局默认 `transition-timing-function`；TS 侧 `EASE_PUBLICATION` |
| `DURATION_FAST`                     | 120ms                             | hover/按下/颜色                                                                                 |
| `DURATION_BASE`                     | 200ms                             | 展开/切换/入场                                                                                  |
| `DURATION_EXPRESSIVE`               | 320ms                             | 大舞台入场/盖章                                                                                 |
| 存量映射                            | 现网 0.4–0.6s 入场                | 允许保留为 EXPRESSIVE×1.5 上限（≤480ms），新动效禁超 320ms                                      |
| SPRING_LAYOUT / TAP / TILT / MAGNET | 380/30 · 400/17 · 150/18 · 200/15 | layoutId 指示器 / 按压 / 倾斜 / 磁吸（收编现网 6 套 spring 为 4 套，新动效禁私设）              |

**过渡属性边界**：布局属性（font-size/top/width/margin/padding）禁入 transition；只动 `transform`/`opacity`（阴影/颜色/描边允许）。

### 1.3 阴影 / 圆角 / 间距 / z-index

- 阴影四档锚定现网（暖色调 `rgba(60,52,36,*)`，禁彩色阴影）：`--shadow-sm / -md / -lg / -card-hover`。
- 圆角四档：10（控件）/ 14（容器）/ 20（舞台）/ 24（特殊大舞台·存量保留）。徽章与点线价目行小件 `rounded-[5px]`。
- 间距序列：4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96。
- z-index 序列：`-1` 质感层 → `10` 内容浮片 → `40` 导航/TopBar → `50` skip-link → `100` 弹层。禁任意值。

### 1.4 字体三轨

| 角色      | 字体                                           | 场景                                                       |
| --------- | ---------------------------------------------- | ---------------------------------------------------------- |
| UI sans   | 系统栈（PingFang SC 等，现网 `--font-sans`）   | 正文/导航/表单；中文一律 sans，**中文绝不斜体**            |
| 展示衬线  | Fraunces 400/600 + 400-italic 🆕（本地 woff2） | 英文/数字展示标题、大数字（必配 `tabular-nums`）、副标夹注 |
| 数据 mono | JetBrains Mono 栈                              | 帽线图注、kicker、计数、期号、徽章                         |

**mono 两档表**（新标签照档，禁私调）：帽线/标签 `11px · 0.18em · uppercase`；图注/角标辅注 `10px · 0.14em`。

---

## 2. 排版体系

- **帽线图注**：区块顶部「mono 11px 帽线 + 标题」节奏。载体：`<PageHeader>`（marketing）与 `.eyebrow`（工作台，形制=mono 11px/0.18em/`--ink-subtle` + 发丝延伸线 `--hairline`；印刷语境变体用 `--hairline-warm`）。编号式帽线（`#01 — Balance`）只在页面级分节用，一屏 ≤2 处。
- **标题阶梯**：H1 serif `clamp(2.25–3.5rem)`；H2 `1.75–2.25rem`；H3 `1.125–1.375rem`；禁相邻板块同字号。中文标题走 sans 加粗（Fraunces 只上西文/数字，防回退混排割裂）。
- **正文**：`16/26` 起，长文行宽 ≤68ch；说明文字 ≤52ch。
- **数字**：数据展示一律 `tabular-nums`；大数字 serif + mono 单位后缀（如 `2,340` + `枚`）。

## 3. 印刷装饰词汇白名单（登记制）

> 教育场景口径：清晰、可信、亲和。强编辑式词汇（巨型编号/pull-quote）默认不上，白名单外一律禁用。

| 编号   | 词汇           | 视觉规格（只引令牌）                                                                                  | 语义绑定（正面条件）                            | 禁用场景                     | 代码载体                    | 深浅底 | 状态      |
| ------ | -------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------- | --------------------------- | ------ | --------- |
| ORN-01 | 帽线图注       | §2 帽线规格                                                                                           | 每个功能区顶部，绑定真实区块名                  | 纯装饰无信息处               | `.eyebrow` / `<PageHeader>` | 双态   | 登记      |
| ORN-02 | 点线价目行     | `flex items-baseline gap-2` + 中缝 `flex-1 border-b border-dotted --divider/-60` + 右值 serif tabular | **名目—数值**场景（币种拆分/计费说明/余额明细） | 普通键值对滥用               | `.leader-dots`              | 浅底   | 登记      |
| ORN-03 | 状态徽章       | mono 10.5px + 前置 5px 圆点 + `语义-soft` 底 `rounded-[5px]`                                          | 绑定真实状态机档位（见 §7 徽章映射表）          | 无状态含义的标签             | `.badge-*`                  | 浅底   | 登记      |
| ORN-04 | 图钉便签       | `--canvas-alt` 底 + 顶部图钉 SVG + 微旋转 ±0.4deg                                                     | 公告/作业提醒类临时信息                         | 常驻操作入口                 | `.pin-note`                 | 浅底   | 登记      |
| ORN-05 | 制图角标       | `h-3 w-3` L 形双边框 span ×4，`--hairline-warm` 或 `--accent-line`                                    | 重要舞台卡（签到/余额/主推）的图纸感            | 小组件滥用                   | `.corner-mark`              | 双态   | 登记      |
| ORN-06 | 引线注记       | 10px mono + 1px 折线引出                                                                              | 功能说明从锚点引出                              | 长段落说明                   | `.leader-line`              | 浅底   | 登记      |
| ORN-07 | 检讫章（盖章） | §4 盖章规格；章面 `--accent` 双环 + ✓                                                                 | **完成态**（签到已签/导出成功）一次性动效       | 失败态；可逆操作             | `.stamp-in`                 | 双态   | 登记      |
| ORN-08 | 期号栏 / folio | mono 10px/0.14em 页脚 `— 01 —` 边码                                                                   | 长流程页（生成流）步骤边码                      | 短页凑数                     | `.folio`                    | 双态   | 登记      |
| ORN-09 | 纸纹质感       | §6 全局 grain 0.03                                                                                    | 全站背景（默认开启）                            | 深色舞台/弹层内              | `body::before`              | —      | 登记      |
| ORN-10 | 巨型章节编号   | hero「00」衬线水印，`--canvas-alt` 级别极淡                                                           | **仅 landing hero**（既有先例追溯登记）         | 工作台任何位置               | landing/hero                | 浅底   | 登记·限界 |
| ORN-11 | 点阵纹理       | 24px 网格 radial 1px 点，`rgba(17,23,34,.05)`                                                         | 深色舞台（签到卡）内纹理                        | 浅底页面（与 ORN-09 二选一） | `.dot-grid-dark`            | 深底   | 登记      |

## 4. 动效规格

**三轨使用规则**：framer/motion = 交互与 layout 动画；CSS keyframes = §3 登记表内活体（fadeUp/pulseGlow/shakeX/errorPulse/rowFlash + 新登记 `stampIn`）；**inline `style={{animation}}` 挂载禁新增**（存量 4 处已在批 0 迁出）。

- **展开/切换**：高度+透明度双通道 200ms 权威曲线，spring height `0→auto`（stiffness 400 / damping 30）+ 内层承载纵向 padding。**禁瞬变**。
- **选中态**：morphing 滑块（`layoutId="<scope>-<role>-indicator"` 胶囊垫底，文字层 relative 压上），弃原地变色。
- **消息/卡片**：入场 opacity+y，**exit 必补**（AnimatePresence fade+y ~180ms）；列表 key 用稳定派生值。
- **AI 对话（AiThinkingDots，`src/components/ui/ai-thinking-dots.tsx`）**：三点脉冲占位（framer 循环 opacity [0.3,1,0.3] + scale [1,1.15,1]，1.1s easeInOut，错峰 delay 0/0.2/0.4s——**framer 实现规避 CSS delay 归零登记义务**）+ 首包到达后边收边渲染（`streamingText: null | '' | string` 三态机）。消费方：summary-workflow、feedback 批量进度、weekend-ai-feedback-panel。
- **盖章（ORN-07）**：`@keyframes stampIn`（scale 1.6→0.95→1 + rotate -8°→1.5°→0 + opacity 0→1，0.5s EXPRESSIVE，fill both 无 delay→reduce 下钳制即达终态，无隐形风险）。
- **reduced-motion 三层防线**：①CSS 钳制块四清单化（时长归零/迭代归一/**delay 归零**/滚动归 auto）；②自制 `useReducedMotion`（`src/lib/hooks/motion.ts`，useSyncExternalStore 实现，SSR snapshot 恒 false；**禁用 framer 自带版**——SSR/客户端首值分叉会 hydration 崩页）；③`<MotionConfig reducedMotion="user">` 双挂载（`providers.tsx` + `admin/shell.tsx`——admin layout 不经 Providers）。
- **循环动画**：周期 ≥3s ease-in-out（pulseGlow 1.6s 保留为既有登记豁免）。

## 5. 微交互

- 按压：`whileTap` scale 0.96–0.97（PressableButton 统一）；hover 抬升 `-translate-y-0.5` + `--shadow-card-hover`，**只允许在非 motion 直管 transform 的元素上**（framer 管的元素走 `whileHover`）。
- 表单 focus 仪式感：label 变 `--accent-text` + input 发丝线→accent 过渡 + `focus-visible:ring-2 ring-accent/40 ring-offset-2`（全局焦点环兜底，禁裸删 outline）。
- 点击目标：通用 ≥24×24；主 CTA/删除/关闭 ≥44×44。
- 空态三要素：中文说明原因 + 场景化视觉（教育版小场景）+ 至少一条出路。模板：`IdeaEmptyState`。
- 行内反馈统一语言：成功=success-text 短语 chip；失败=danger-text + `.anim-shake`；进行中=AiThinkingDots 或按钮 spinner。**不引入 toast 系统**。

## 6. 质感层

- **全局唯一实现**：`body::before`，`position:fixed; inset:0; z-index:-1; pointer-events:none`，SVG feTurbulence grain，opacity 0.03（ORN-09）。
- 深色舞台（签到卡/page-dark 区）自带实底自动遮罩质感层；卡内纹理用 ORN-11 点阵。
- **豁免区**：`src/lib/email-templates.ts`、opengraph-image / icon / apple-icon、`lekao-android/`。
- 深浅底纹理互斥：浅底页面用全局 grain，深底卡内用点阵，禁叠加。

## 7. 组件模式

**状态徽章 10 档映射表**（mono 圆点语言，`rounded-[5px]`，非胶囊）：

| 档位语义          | 底                  | 文字                | 示例            |
| ----------------- | ------------------- | ------------------- | --------------- |
| 中性/草稿/归档    | `--canvas-alt`      | `--ink-subtle`      | 草稿 · 已归档   |
| 进行中（AI/解析） | `--accent-soft`     | `--accent-ink`      | 生成中 · 解析中 |
| 等待人工          | `--warning-soft`    | `--warning-text`    | 待确认          |
| 成功/完成         | `--success-soft`    | `--success-text`    | 已完成 · 已导出 |
| 失败              | `--danger-soft`     | `--danger-text`     | 生成失败        |
| 批注/计费         | `--annotation-soft` | `--annotation-text` | 1 币/次         |

组件规格：`inline-flex items-center gap-1.5 rounded-[5px] px-[9px] py-[3px] font-mono text-[10.5px] tracking-[0.06em]` + 前置 `h-[5px] w-[5px] rounded-full bg-current` 圆点（aria-hidden）。

**按钮**：PressableButton 4 variant × 3 size（既有）；主按钮实底用 `--accent-text`（白字 AA）；深底舞台主按钮白/10 幽灵变体。**每个视图最多一个主按钮**。
**弹层**：自制 Dialog + `useDialogA11y`（焦点陷阱/Esc/焦点归还），开合 180ms 双通道，禁瞬变。
**PageHeader / .eyebrow / .leader-dots / .badge-\* / AiThinkingDots**：以组件/类为唯一载体，禁止页面内手搓变体。

## 8. 可访问性与验收门禁（全文收编 `docs/ui-polish/rules.md`）

- 对比度硬标准 4.5:1（小字号）/ 3:1（大字号）；`--ink-subtle` 是弱化文字下限，**禁再浅**；语义色作正文必须 `-text` 后缀。
- 每路由 1 个 h1；表单程序化 label；正文链接带下划线；装饰溢出必须 `overflow-hidden` 裁切。
- 每路由恰一个 `<main id="main-content">`；skip link 走 `.skip-link` 类；键盘完成所有主路径。
- 视口门禁：320 / 390 / 768 / 1440 无横向滚动；200% zoom 主路径可用。
- 每批验收=lint（UI 零新增）+ tsc + build + test 197 + Playwright 四机位（1440/390 × default/reduce）+ 每路由 console 0 error + 台账 commit。

## 9. 豁免区（grep 审计不计入）

`src/lib/email-templates.ts`（服务端邮件 HTML）、`src/app/opengraph-image*` / `icon*` / `apple-icon*`、`lekao-android/`、`scripts/`（构建期工具）。

**印刷专色豁免**：`src/components/icons/index.tsx` MedalIcon 的金/银/铜九色（`#f59e0b/#fbbf24/#fef3c7` 等纯装饰插画专色，aria-hidden 语境，承 ResumeAIX「缩印铜版纸专色不归令牌」先例）。除此之外 `src/components/icons/index.tsx` 内零裸 hex。

**themeColor 元数据豁免**：`src/app/layout.tsx` viewport `themeColor` 的字面色值（`#F8F6F1` 等）——浏览器 chrome 元数据不支持 CSS 变量，取值必须镜像 `--canvas` 令牌，改令牌时同步。

## 10. 变更日志（只追加）

| 日期       | 批次  | 内容                                                                                                                                                                             |
| ---------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-29 | B0-C0 | 立法：三文档仲裁（§0）、令牌总表（§1）、装饰词白名单 11 项（§3）、动效/微交互/质感规格（§4–6）、徽章映射（§7）                                                                   |
| 2026-09-29 | B0-C1 | reduce 防线真实化：自制 useSyncExternalStore 版 useReducedMotion（12 处 import 切换）、Providers + AdminShell 双挂 MotionConfig、删 lenis 死依赖                                 |
| 2026-09-29 | B0-C2 | globals.css 动效层收编：四清单化钳制块（delay 归零）、全局默认缓动、删 7 死类 + 8 死 keyframes、裸色归令牌（pulseGlow/errorPulse/rowFlash/表格 hover）、5 处 inline 挂载迁登记类 |
| 2026-09-29 | B0-C3 | 质感层 + 装饰类进齐（ORN-01~11 载体）、--hairline-warm 辅助线、Fraunces 400-italic 字面落地（裁决项 C 执行）                                                                     |
| 2026-09-29 | B0-C4 | 动效令牌 TS 侧（motion-tokens.ts）+ 11 处曲线字面量归令牌 + CheckIcon hex→var(--success) + 奖牌九色定性印刷专色豁免（§9）+ AiThinkingDots 共用组件                               |
