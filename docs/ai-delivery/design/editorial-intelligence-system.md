---
id: DESIGN-LEKAO-EDITORIAL-INTELLIGENCE
title: LeKao Editorial Intelligence 设计系统规格
kind: design-spec
version: 2
status: READY
baseline_sha: 4a5780e92215fbe01db87b5e1827465135253efa
related: PRD-LEKAO-FOUNDATION-V3, S03-ADVANCED-EXPERIENCE, S04-OFFICE-FREE-DELIVERY
handoff_ref: ../handoffs/S03-advanced-experience.md
observed_handoff_revision: 3
---

# LeKao Editorial Intelligence 设计系统规格

## 1. 设计命题

LeKao 是把散乱教学材料编辑成可交付成果的“AI 教学编辑台”，不是聊天机器人、金融面板或游戏化签到产品。高级感来自信息密度、排版秩序、可验证状态和克制动效。

## 2. 视觉原则

- **Paper first**：大面积纸张色和清晰留白，卡片只在需要分组时出现。
- **Ink hierarchy**：通过字重、字级、色阶组织信息，不依赖阴影和渐变。
- **Annotation signal**：钴蓝表示主动作，珊瑚色只表示批注/注意，不作为大面积背景。
- **Editorial grid**：12 栏桌面、8 栏平板、4 栏移动；内容宽度而非视口决定可读性。
- **Semantic ornament**：页码、刻度、批注线只有绑定真实步骤/数据时才使用；禁止伪 `ISSUE`、`¥` 水印和无意义英文段名。

## 3. Token 契约

### 色彩

| Token          |        值 | 用途            |
| -------------- | --------: | --------------- |
| `--canvas`     | `#F4F1E9` | 全局背景        |
| `--paper`      | `#FFFEFB` | 工作纸/表单     |
| `--ink`        | `#111722` | 主文字          |
| `--ink-muted`  | `#586171` | 次文字          |
| `--hairline`   | `#D9D6CE` | 分隔线          |
| `--signal`     | `#3157F6` | 唯一主动作      |
| `--annotation` | `#F06449` | 批注/注意       |
| `--success`    | `#168462` | 已完成          |
| `--warning`    | `#9A6500` | 待处理          |
| `--danger`     | `#B42318` | 失败/破坏性动作 |

颜色必须有语义映射；不得在页面组件中新增未登记的品牌色。

### 字体与字级

- 中文正文：系统无衬线；`16/28`，最小辅助文字 `12/18`。
- Display：Fraunces 只用于英文、数字或短标题；中文不得因回退产生中西混排割裂。
- H1：desktop `56/60`，mobile `36/40`；页面 H1 不做逐字透明入场。
- H2：`32/38`；H3：`22/30`；label：`12/18` + 0.04em 字距。
- 长文最大行宽 68ch；表单说明最大 52ch。

### 空间、圆角、阴影

- 间距序列：4、8、12、16、24、32、48、64、96。
- 控件圆角 10；普通容器 14；重要舞台 20。禁止默认 `rounded-3xl`。
- 默认卡片无阴影或 `0 1px 2px rgba(17,23,34,.06)`；浮层才允许中等阴影。

## 4. 组件状态矩阵

每个交互组件必须有 default、hover、focus-visible、active、disabled、loading、error、success；触点最小 44×44px。Dialog/Sheet 锁焦点、Escape 关闭、关闭后还焦。Skeleton 保留最终布局尺寸。

| 组件          | 必需语义                                 |
| ------------- | ---------------------------------------- |
| PrimaryButton | 每个视图最多一个；loading 保留标签宽度   |
| TaskCard      | 标题、输入、输出、费用、最近状态、主动作 |
| StatusBadge   | 文本 + 图标，不只靠颜色                  |
| Stepper       | 当前/完成/阻塞三种状态，可键盘理解       |
| SaveIndicator | 仅本机/保存中/已保存/同步失败/冲突       |
| CostPreview   | 触发前显示费用与扣费时点                 |
| RecoveryPanel | error code、发生原因、保留内容、下一动作 |

## 5. 页面布局

- Marketing：5/7 非对称 Hero，主 CTA 首屏可见；证据和工作流优先于功能罗列。
- Dashboard：首屏顺序固定为“继续最近工作 → 新建任务 → 待处理 → 资产与签到”。
- Workflow desktop：步骤导航 + 主工作纸 + 上下文检查器；mobile 为全屏单步 + sticky action。
- Auth：单列 400–440px，320px 不横向溢出；验证码区窄屏纵向。

## 6. Motion 契约

- 时长：fast 120ms、base 200ms、expressive 320ms。
- 只动画 transform/opacity；首屏内容初始 opacity 必须为 1。
- tilt、magnetic、mouse trail 不用于核心路径；精细指针设备可在非关键展示区渐进增强。
- reduced motion 下不移动、不脉冲、不逐字 stagger；状态仍清晰。
- 动效必须归属以下一种目的：空间连续、状态反馈、注意力转移。仅“更酷”不构成理由。

## 7. 响应式与无障碍门禁

- 视口：320、390、768、1024、1440；200% zoom 仍可完成主路径。
- 无非预期横向滚动；表格在移动端转为卡片/逐条编辑，不缩放桌面表格。
- WCAG AA；axe serious/critical 为 0；所有核心流程只用键盘可完成。
- 视觉回归覆盖 default/loading/empty/error/success，以及长文本、零余额、长用户名。

## 8. 明确禁止

- 无证据评分、伪数据图表、无业务含义的金融符号。
- 全屏玻璃拟态、霓虹 AI 渐变、持续呼吸背景、鼠标尾迹承担品牌。
- 为动效把 Server Component 整棵树转为 client。
- 用英文装饰词替代中文信息架构。
