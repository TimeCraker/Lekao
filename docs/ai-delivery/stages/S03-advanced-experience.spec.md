---
id: S03-ADVANCED-EXPERIENCE
title: S03 品牌与高级体验系统
kind: stage-spec
version: 3
status: READY
baseline_sha: 4a5780e92215fbe01db87b5e1827465135253efa
related: PRD-LEKAO-FOUNDATION-V3, TASKS-S03-ADVANCED-EXPERIENCE, DESIGN-LEKAO-EDITORIAL-INTELLIGENCE, UX-LEKAO-ROUTE-MATRIX
handoff_ref: ../handoffs/S03-advanced-experience.md
observed_handoff_revision: 3
---

# S03 品牌与高级体验系统

## 1. 目标与非目标

目标：把 LeKao 从通用蓝白 SaaS 页面升级为具有明确品牌识别的“教学编辑台”，统一公开站、认证、工作台和四条核心流程的内容、视觉、交互、响应式和性能。

覆盖：FR-008/009/011，NFR-002/003/005/008，AC-008/009/010/013/014。

前置：S01、S04 均 SEALED（S02 跨端对齐按 ROADMAP v3 修订后置，S03 交付步只展示本地保存状态与 S04 交付面板，统一 Artifact 状态接入留给 S02）；capability registry（S01 T-007 交付）、API、Artifact 和质量门禁不可被 UI 层绕开。

非目标：不新增业务功能（浏览器内真实产物渲染、就地编辑、打印/PDF 交付与 AI 产出落表由 S04「无 Office 交付」交付，S03 只托管其交付面板 src/components/deliver/delivery-panel.tsx，不重复实现）、不改计费规则、不换框架、不使用未授权付费字体/图片、不处理安全专项。

## 2. 当前代码事实

- 公开页 Hero 同时放登录、免费开始、Android 下载和联系作者；移动端隐藏主注册 CTA。
- 文案含“AI 按 BRD 硬约束格式”等内部语言，产品名并用 LeKao/Lekao Agent/AI 智能助教。
- Hero、Navbar、Feature cards 大量 client/motion；营销 layout 全树包 SessionProvider。
- Lighthouse 生产移动中位 LCP 3.397s，LCP 文案约 1.274s render delay。
- Dashboard 主要是通用卡片与渐变余额块；四条流程各自设计状态/步骤，缺少统一任务骨架。
- globals.css 已有 token 和 reduced-motion 处理，但颜色、层级和组件治理不足。
- 最新 dashboard 已加入 Fraunces、卡片 tilt、字符 stagger、Issue/Balance/Features 段名和 `¥` 水印；页面手写 v2.4.0，而 package 仍为 2.3.0。
- dashboard 把余额/签到排在四项核心任务之前；功能卡仍包含“AI 自动整理”“硬约束”，与真实能力和内容规范不一致。

## 3. 设计策略

### 3.1 品牌概念：Editorial Intelligence / 教学编辑台

LeKao 不是“聊天机器人”，而是把散乱教学材料编辑成可交付成果的工作台。视觉借鉴编辑出版、教师批注和数据刻度：大面积纸张感留白、清晰网格、精确标尺、小面积信号色，不依赖玻璃拟态、霓虹渐变或鼠标尾迹营造“AI 感”。

### 3.2 品牌规范

- 中文/英文主品牌统一写 `LeKao`；产品类别写“AI 教学编辑台”。禁止公开使用 `Lekao Agent`。
- Logo 由 LeKao wordmark + 可独立使用的“折页/批注 L”mark 构成；首轮可用 CSS/SVG 几何实现，不引入外部版权资产。
- 色彩：Canvas `#F4F1E9`、Paper `#FFFEFB`、Ink `#111722`、Ink-muted `#586171`、Signal Cobalt `#3157F6`、Annotation Coral `#F06449`、Success `#168462`、Hairline `#D9D6CE`。深色只用于局部舞台，不强制全站 dark mode。
- 字体：中文使用系统无衬线栈；数字/标签使用稳定等宽栈。Display 采用紧凑字距与 1.05–1.12 行高，正文 1.6–1.75。不得因远程字体阻塞首屏。
- 圆角层级：控件 10px、卡片 16px、Hero/舞台 24px；禁止所有元素同一大圆角。
- 阴影只表达层级；默认卡片以 hairline + 色差为主。

### 3.3 Motion 规范

- fast 120ms、base 220ms、expressive 360ms；只动画 transform/opacity。
- 首屏 H1、副文案、主 CTA 和信任条首帧可见；禁止 stagger opacity 影响 LCP。
- 列表/状态变化可使用轻量位移；鼠标尾迹和持续 mesh 呼吸从核心路径移除。
- reduced motion 下非必要动画为 0.01ms/无位移，功能状态仍可理解。

完整 token、组件状态和禁止项以 `../design/editorial-intelligence-system.md` 为权威设计契约；本 Spec 只定义 Stage 范围，不复制可漂移细节。

## 4. 内容架构与基准文案

### 4.1 首页结构

1. 导航：LeKao、产品、工作方式、价格与限制、登录、主 CTA。
2. Hero：用户结果 + 可视化工作台预览；不放联系作者和 APK 下载。
3. 可验证信任条：免费/收费/隐私处理等来自 capability registry 的事实。
4. 三步工作流：导入材料 → 校对结构 → 导出成果。
5. 四个能力章节：每个写输入、处理、输出、费用与限制。
6. 成果证据：真实、脱敏的 Word/Excel/群消息结果局部，不使用无来源评分。
7. 跨平台：Web 主工作台与 Android 能力边界；下载在此出现。
8. FAQ 与最终 CTA。

### 4.2 Hero 基准文案

- Eyebrow：`为教培一线设计的 AI 教学编辑台`
- H1：`把一节课后的整理，压缩成 10 分钟`
- Body：`导入讲义、Excel 和错题图片，LeKao 帮你校对结构、生成课堂小结与反馈，并导出可直接交付的 Word 或 Excel。`
- Primary CTA：`免费创建工作台`
- Secondary CTA：`查看 3 分钟工作流`
- Trust line：`错题整理永久免费 · AI 生成每次 1 T-Coin · 注册赠 5 枚`

实施时必须由 capability registry 验证数字与能力；若真值变化，修改基准文案而不是硬编码错误承诺。

完整命名、功能卡、错误与认证文案待重新定义内容契约（原 product-copy-system.md 已废弃）。

### 4.3 功能卡文案句式

统一为“输入 → 结果 → 限制/费用”，示例：

- 错题集：`导入学生表与错题图片，校对题号后导出 Word 错题集。基础整理免费。`
- 课堂小结：`识别讲义重点，生成可贴入教务表和班级群的两段式小结。每次 1 T-Coin。`
- 作业反馈：`按学生错题批量生成具体反馈，保留人工校对再交付。每个 Sheet 1 T-Coin。`
- 周末反馈表：以 capability registry 的真实 AI/手工边界为准，禁止笼统写“全自动”。

## 5. 信息架构与关键界面契约

### 5.1 公开站

- 默认 Server Component；会话 CTA 只做最小渐进增强，不让未知 session 阻断页面。
- Hero 桌面采用 5/7 非对称网格，右侧是真实工作台状态预览；移动端单列且主 CTA 首屏可见。
- 联系方式和 Android 下载移出 Hero；每屏只保留一个视觉主动作。

### 5.2 工作台 Shell

- Desktop：64px rail + 可选 224px workspace nav + 主画布；无需同时出现时不强制三栏。
- Mobile：S01 bottom nav 延续，页面 header 固定当前任务/保存状态；操作区使用 sticky bottom action。
- 首页固定按“继续最近工作 → 新建教学任务 → 待处理 → T-Coin 与签到”排序；无最近任务时以真实示例引导替代空白。余额、签到和奖励不得成为首屏最大视觉元素。
- 移除无业务语义的 `ISSUE`、`Balance`、`Features` 和 `¥` 水印；版本从 build metadata 读取。

### 5.3 核心工作流模板

每条流程统一：

```text
Step 1 导入 -> Step 2 校对 -> Step 3 生成 -> Step 4 交付
               | context inspector |
```

- 每步显示完成条件、保存状态和下一动作。
- 费用在触发前明确，失败展示 S01 billingState 和 recovery action。
- 空状态提供示例文件/格式说明；错误状态不清空已录入内容；成功态提供下载、复制、继续编辑和查看历史。
- 长表格在移动端切为学生卡/逐条编辑，不允许把桌面 10 列表格硬缩放。

## 6. 实现契约

### UI 状态与交互

组件必须覆盖 default/hover/focus/disabled/loading/error/success/empty；所有 loading 保留布局，避免 CLS。Dialog/Sheet 锁焦点、Escape 关闭、关闭后还焦触发器。

### API、数据、身份

沿用 S01/S02 契约，不改变 schema、状态码、计费或权限。UI 不绕过 repository 直接写存储。

### 错误、超时、重试与降级

错误组件消费稳定 code/recoveryAction/billingState；离线/超时保留表单并允许重试。图片/工作台预览加载失败有非空白 fallback。

### 日志、指标与可观测性

漏斗事件：hero_primary_cta、workflow_demo、register_start/complete、workspace_start、step_complete、generation_submit/success/fail、export。事件名与属性集中定义，不在组件散写。

### 性能

- 公开页初始 JS 预算建议 ≤150KB gzip（以构建分析为准）；首屏不加载工作台重依赖 `xlsx/docx/jszip`。
- LCP 图/文字首帧可见，关键图片明确尺寸/priority；below-fold 使用 content-visibility/lazy。
- 不在 scroll/mousemove 中触发布局读写交错；forced reflow 审计 <10ms/次。
- 核心任务卡不得仅为 tilt 转成 Client Component；精细指针增强必须按 pointer capability 动态启用且不影响触摸/键盘。

### 可访问性

语义 landmark、唯一 H1、标题层级、表单 label/error、键盘路径、焦点可见、颜色对比满足 WCAG AA；触点 ≥44px；支持 200% zoom 和 reduced motion。

## 7. 允许与禁止范围

允许：`src/app/(marketing)/**`、认证公开视觉、`src/app/dashboard/**` 视图层、`src/components/landing|dashboard|ui|workflow-shell/**`、`globals.css`、design/content config、build metadata、图标/SVG、自有静态预览资产、视觉/E2E/perf 测试。

禁止：Prisma/API/计费业务变更、Android 功能扩展、外部未授权资产、把 mock 数据当证据、删除 S01/S02 测试、全局 `use client` 包裹。

## 8. Task 顺序与依赖

T-301 → T-302；T-303 与 T-304 依赖 T-302；T-305 依赖 T-304；T-306 依赖 T-303/305；T-307 依赖全部。

## 9. 验证矩阵

| AC         | 层级            | 命令/方法                                                 | 预期                                   | required | final_judge            |
| ---------- | --------------- | --------------------------------------------------------- | -------------------------------------- | -------- | ---------------------- |
| AC-008     | visual + E2E    | `pnpm test:e2e --grep "responsive visual accessibility"`  | 320/390/768/1440 无 overflow，交互可用 | yes      | rerun                  |
| AC-009     | performance     | `pnpm perf:audit -- --url http://127.0.0.1:3101 --runs 3` | 中位指标全部达标                       | yes      | rerun                  |
| AC-010     | static + human  | `pnpm test -- capability-copy` + 内容评审记录             | CTA/术语/承诺全部通过                  | yes      | rerun + hash-bound-log |
| AC-013     | E2E             | `pnpm test:e2e --grep "dashboard task priority"`          | 最近/新建任务为首要动作，资产区在后    | yes      | rerun                  |
| AC-014     | static + visual | `pnpm test -- design-governance release-metadata`         | 禁止隐喻、品牌名、token 与版本全部一致 | yes      | rerun                  |
| regression | full gate       | `pnpm lint && pnpm typecheck && pnpm test && pnpm build`  | 全部 exit 0                            | yes      | rerun                  |
| a11y       | axe + keyboard  | `pnpm test:e2e --grep "a11y keyboard"`                    | axe 0 serious/critical，键盘脚本通过   | yes      | rerun                  |

人工评审必须由产品/设计 owner 对首页桌面与移动、工作台首页和一条完整流程打分：品牌一致性、层级、文案清晰度、真实感各 ≥4/5，且无单项阻断意见。AI 自评不算证据。

## 10. 部署、回滚和数据恢复

以 feature flag 分开发布 public-site-v3 与 workspace-shell-v3；先 10% 内测再全量。旧组件保留一个发布窗口，回滚只切视图 flag，不回滚 S01/S02 数据契约。静态资产使用内容哈希；旧缓存与新 HTML 组合必须兼容。

## 11. 风险、假设和未决问题

- BLOCKER：S01/S04 未 SEALED；`pnpm test:e2e` 尚未存在（由 S01 T-001 建立），`pnpm perf:audit` 由本 Stage T-306 建立；人工评审 owner 未登记。planning commit 已随 S04 阶段包落地，S03 规格已重绑当前 HEAD。
- 人工品牌/内容评审 owner 需在实施前指定；缺失时 T-307 与最终验收 BLOCKED。
- 真实脱敏成果预览需要内容 owner 提供；缺失时用结构化示意图，必须标“示意”，不得伪造用户案例。
