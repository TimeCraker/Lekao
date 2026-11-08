# UI Polish 规则（挂靠现有设计令牌）

> **2026-09-29 起本文件全文并入根级 [`DESIGN.md`](../../DESIGN.md) §8（可访问性与验收门禁）**；本文件保留作历史存档，规则更新一律在 DESIGN.md 进行。

本文件是轨 2 工艺轨的挂靠规则。所有工艺修复必须引用本文件或 `src/app/globals.css` 中已有的设计令牌。

## 文字色令牌分层（浅色底）

| 令牌           | 值          | 用途                          | 对比度（最浅底 canvas-alt #F1EEE6）                     |
| -------------- | ----------- | ----------------------------- | ------------------------------------------------------- |
| `--ink`        | #111722     | 标题/正文主色                 | ≥ 15:1                                                  |
| `--ink-mute`   | #1e293b     | 次文字                        | ≥ 12:1                                                  |
| `--ink-muted`  | #475569     | 辅助文字                      | ≥ 7:1                                                   |
| `--ink-subtle` | **#5A6B80** | 弱化文字（eyebrow/计数/说明） | **4.70:1**（2026-09-25 由 #64748b 调深，原值仅 4.41:1） |

规则：

- 11px/12px 小字号（eyebrow、时间戳、计数）必须 ≥4.5:1 → 用上表令牌，不私调透明度 <1。
- 语义色作**正文**时用 `-text` 后缀令牌（`danger-text` / `warning-text` / `success-text` / `annotation-text`）；裸色（`danger` 等）只用于图标/边框/装饰。hover 态例外（过渡态，2026-09-25 决定保留）。

## 点击目标

- 通用可点击元素 ≥24×24px；关键路径（主 CTA/返回/关闭/删除）≥44×44px。
- 文本行内链接：`py-1 -my-1 inline-block` 增加命中区不引起布局位移（login/register/footer 已采用）。
- 表格行内图标按钮：`p-1.5` 起步（如 users 编辑按钮）。

## 表单

- 所有 input/select/textarea 必须有程序化关联的 label：优先 `htmlFor`+`id`；纯图标场景用 `aria-label`。
- 密码/验证码并排输入行：`flex flex-wrap gap-2` + 输入框 `min-w-0 flex-1 basis-40`，防移动端溢出裁切。

## 标题结构

- 每页 1 个可见 h1（页面标题）；区块级标题 h2 起，不跳档。
- segment 独立 title：页面 title 只写短名（如「关于」），由根模板补「· Lekao Agent」；首页用 `title: { absolute: ... }`。

## 链接可辨识性

- 正文块内链接必须有下划线（不依赖颜色）：`underline decoration-<token>/40 underline-offset-2`。

## 动效 / 布局（沿用既有约定）

- 动效时长 150–300ms；装饰性溢出元素必须被 `overflow-hidden` 容器裁切（dashboard 快捷卡圆环）。
- admin 横向导航条为 `overflow-x-auto` 滚动条设计，不属于横向溢出缺陷。
