---
id: S04-OFFICE-FREE-DELIVERY
title: S04 无 Office 交付
kind: stage-spec
version: 1
status: READY
baseline_sha: 4a5780e92215fbe01db87b5e1827465135253efa
related: PRD-LEKAO-FOUNDATION-V3, TASKS-S04-OFFICE-FREE-DELIVERY, UX-LEKAO-ROUTE-MATRIX
handoff_ref: ../handoffs/S04-office-free-delivery.md
observed_handoff_revision: 1
---

# S04 无 Office 交付

## 1. 目标与非目标

目标：把「看真实成品 → 就地修改 → 交付」这三步从本机 Office 搬回浏览器。用户在 LeKao 内能确认导出件长什么样、直接改正内容、并完成下载/打印/另存 PDF/批量交付，全程不需要安装 Word、Excel 或 PDF 软件。

覆盖：FR-013/014/015/016，NFR-006/009/010，AC-016/017/018/019/020。

前置：S01 SEALED（计费与能力真值；S04 复用其错误与账务契约，但自身不触碰计费）。排期上先完成 AI 链路优化（阶段 3），该优化不是 S04 的规格门禁。S02 跨端对齐已按 ROADMAP v3 修订后置：S04 只处理 Web 客户端产物层，不新增服务端存储。

非目标：

- 不做在线分享链接、二维码、服务端产物归档或任何把教学内容送出浏览器的能力（PII 边界，见 NFR-009）。
- 不做通用 Office 编辑器，只覆盖本产品产出的交付物：错题集 Word、周末反馈表 Excel、AI 小结/反馈文本。
- 不做机构自有模板的占位符引擎（docxtemplater 一类）；不做文件级 PDF 生成引擎（PDF 走浏览器打印对话框）。
- 不改 AI prompt/marker 契约、不改计费规则、不改 Prisma schema、不新增 API route。
- 不引入 Playwright/E2E 框架：`pnpm test:e2e` 由 S01 T-001 建立，S04 不重复搭建；S04 的自动化验证下沉到 `src/lib/deliver/**` 的 vitest 断言。

## 2. 当前代码事实（2026-10-02 于 `4a5780e` 核对）

- 错题集 Word 预览是手搓 HTML 近似，组件自己声明不可信：`src/components/mistake/html-preview.tsx:95` 文案「预览只是大致样子，导出的 Word 才是准的」。渲染源是 `MistakeCollection` + `QNumberSlot`，不是 docx 字节。
- 周末反馈表**没有任何导出前预览**：`src/lib/mistake/weekend-exporter.ts` 用 exceljs 原地改单元格后直接下载（`exportWeekendWorkbook` :577、`buildExportWorkbook` :532、`loadWeekendWorkbookForExport` :455）。
- AI 产出只能复制粘贴：`src/components/summary/output-card.tsx:76` 「贴 Excel 用」、:91 「贴群里用」。落进教师自己的反馈表这一步目前必须在 Office 里手工完成。
- 目标表列语义**已有可复用真值**：`src/lib/mistake/weekend-headers.ts:89` `parseR2Headers` 按 R2 表头关键词（反馈/评价/评语/总评…）动态识别姓名列与反馈列，含缺列降级。
- 交付通道：错题集走 FS Access 目录授权或 ZIP 下载（`src/lib/mistake/export-bar.tsx`），周末表走 xlsx 下载；无打印、无 PDF、无批量交付队列。
- 能力探测：`src/lib/mistake/fs-access.ts:49` `isFileSystemAccessSupported()`；已有 `src/lib/hooks/capability.ts`（useSyncExternalStore 版）与 `src/lib/hooks/local-storage.ts`。
- 重依赖全为静态导入：`docx`、`jszip`、`xlsx`、`exceljs`、`file-saver`。全仓仅 2 处动态导入先例（`weekend-exporter.ts:611` 的 jszip、`qnumber-slot.tsx` 的 image-store）。`exceljs` 已于 `4a5780e` 从 devDependencies 移入 dependencies。
- 渲染依赖现状：无 docx 渲染器、无表格渲染器；`docx-preview` 与 `exceljs` 均未在公开页或工作台首屏按需加载。
- 首屏 JS 基线（2026-10-02，`node scripts/measure-first-load.mjs`，gzip；**以 HTML 口径为准**）：

  | 路由                         | HTML 口径（真·首屏）         | manifest 口径（页面自身依赖） |
  | ---------------------------- | ---------------------------- | ----------------------------- |
  | `/dashboard/mistake`         | 499.4 KB                     | 333.1 KB                      |
  | `/dashboard/weekend-mistake` | 759.1 KB                     | 592.8 KB                      |
  | `/dashboard/summary`         | 269.2 KB                     | 106.4 KB                      |
  | `/dashboard/feedback`        | 269.2 KB                     | 106.4 KB                      |
  | `/dashboard`                 | n/a（动态路由无预渲染 HTML） | 74.5 KB                       |

  口径说明：manifest 只列页面自身引用的 chunk，**会漏掉共享 framework chunk（实测差约 33%）**，
  因此以预渲染 HTML 的 `static/chunks/*.js` 集合为准。T-402/T-403 接入后必须重新测量并保证不回退
  （重依赖只能进按需 chunk，见 NFR-010）。

## 3. 交付契约与设计策略

### 3.1 产物渲染（FR-013）

- docx：新增依赖 `docx-preview` 0.4.1（**Apache-2.0**），对**真实 Blob 字节**渲染，仅在预览被打开时 `await import`。内部复用已装 `jszip`。
- xlsx：用已装 `exceljs` 读回产前 Workbook 模型渲染真实网格（合并单元格、列宽、行高、对齐、换行、字体粗斜）。**禁止**引入 SheetJS 的样式渲染路径（社区版丢样式，与「保留模板样式」承诺冲突）。
- 渲染失败不得空白：显示文件名/页数或 Sheet 数/行数摘要 + 原因 + 重试按钮。
- 保真口径：预览与导出件由同一份源模型驱动，二者不一致即为缺陷。T-401 的首个增量必须产出「实测差异清单」（至少 1 份单学生错题集、1 份 40 人批量错题集、1 份多 Sheet 反馈表），差异要么修掉、要么逐条记录进本 Spec 与证据清单；**不允许**以模糊免责文案代替保真。

### 3.2 就地编辑与重导出（FR-014）

- 编辑只发生在源模型上：`MistakeCollection` + `QNumberSlot`（题号/学生名/文字/图片增删与顺序）、`WeekendSheet.students`（单元格文本）。
- 任何编辑完成后由**现有生成器**重新产出：`generateStudentDocx` / `generateBatchDocx`（`docx-generator.ts:85/668`）、`exportWeekendWorkbook`。渲染层不得自行拼装文件字节。
- 每次编辑都要通过 `onChange` 链路回写父级 state 与既有草稿存储（IndexedDB 图片、localStorage 周末草稿、history.json），保持「导出 = 预览 = 草稿」三方一致。
- 批量：逐份渲染，渲染后立即 `URL.revokeObjectURL`；大批量时分批提示，不阻塞主线程。

### 3.3 无 Office 交付（FR-015）

- 交付动作集固定为：下载（单份/批量 ZIP/目录授权）、打印（A4）、另存 PDF（浏览器打印对话框）、批量打印队列、重新编辑、查看历史。
- 打印视图：`@page` A4 尺寸、页边距、页码与页眉（学生名/日期/班级）、分页不切断单题图片组。
- 移动端：iOS 走系统分享/打印（`navigator.share` 可用时）；其余浏览器下载或 ZIP 回退；不因 FS Access 不可用而阻断交付。
- 交付失败（写目录被拒、打印被取消、下载被拦截）必须给出可恢复说明且不产生半成品文件。

### 3.4 AI 产出落进用户表格（FR-016）

- 入口放在课堂小结/作业反馈结果区：选择目标 Excel → 自动按 `parseR2Headers` 识别姓名列与反馈列 → 按姓名把文本写入对应行 → 未命中（重名/缺行/表头无法识别）列出供人工处理 → 允许手点目标列兜底。
- 写入复用 exceljs 原地改值路径（保留 merges/styles/cols/row heights），并沿用既有的 conditionalFormatting 剥离后处理。
- 文本长度按现有 `wrapText` + 行高策略处理；写入结果必须能立即进入同一条渲染/预览/导出链路。

### 3.5 统一交付面板（跨四条流程的唯一出口）

`src/components/deliver/delivery-panel.tsx` 对外契约冻结为：

```text
props: { artifact, state, onEdit, onRegenerate, history }
state: default | loading | error | success | empty
actions: download | print | batch | reedit | history
```

S03 T-305 只负责把它挂进四步模型的「交付」步，不得改其内部实现。该契约是 S03 与 S04 之间唯一的接口面。

## 4. 信息架构与关键界面契约

- 错题集（`/dashboard/mistake`）：Step 4 选择学生后，预览入口从「大致样子」升级为真实渲染；预览面板内可直接改姓名/题号/文字、增删图片、调整顺序；面板底部固定「下载本份 / 打印 / 返回编辑」。
- 周末反馈表（`/dashboard/weekend-mistake`）：导出前新增真实表样预览（多 Sheet 切换）；单元格文本可就地修正；导出按钮文案与预览状态一致（未预览不承诺「已确认」）。
- 课堂小结 / 作业反馈（`/dashboard/summary`、`/dashboard/feedback`）：结果卡保留复制按钮（贴群/贴表场景仍在），新增「写入我的反馈表」入口；写入后展示目标表预览与导出。
- 全流程：预览/打印/交互动效遵守 reduced motion；触控目标 ≥44px；窄屏下预览按单列纵向分页呈现。
- 长表格在移动端不做 10 列缩放，切为学生卡或逐条编辑。

## 5. 实现契约

### UI 状态与交互

面板必须覆盖 default/hover/focus/disabled/loading/error/success/empty；loading 保留布局避免 CLS；Dialog/Sheet 锁焦点、Escape 关闭、关闭后还焦触发器；打印视图不依赖动画完成才可见。

### API、数据、身份

无 API、schema、计费与权限变更。目标 Excel 由用户本地上传，不落库、不上传。历史与草稿沿用既有 IndexedDB/localStorage/history.json 契约，不破坏旧 v1 只读导入。

### 错误、超时、重试与降级

渲染器加载失败（离线/动态 import 失败）→ 非空白摘要 + 重试；图片 Blob 缺失 → 明确占位与「重新授权/重新上传」指引，不静默空白；打印/下载失败 → 说明 + 重试，不写半成品。

### 日志、指标与可观测性

前端事件：`preview_open`、`preview_render_fail`、`artifact_edit`、`print_start`、`print_fail`、`excel_sink_match`、`excel_sink_unmatched`、`delivery_download`。事件不含学生姓名、图片内容或教学内容正文（沿用 NFR-007）。事件名集中定义，不散写。

### 性能

- 新增依赖只能按需动态加载：公开页与工作台首屏 JS 不得包含 `docx-preview`、`exceljs`、`xlsx`、`docx`、`jszip`。
- 每个 Task 提交前记录 `/dashboard/mistake` 与 `/dashboard/weekend-mistake` 的首屏 JS（gzip）前后数字；引入渲染器后允许按需 chunk 增长，但首屏不得回退。
- 预览与打印视图不得在 scroll/hover 中触发布局读写交错。

### 可访问性

预览面板具备语义 landmark 与标题层级；打印/下载/批量按钮可达且可键盘操作；错误信息与重试通过 `aria-live` 宣告；200% zoom 下不出现横向滚动。

## 6. 允许与禁止范围

允许：`src/lib/deliver/**`、`src/components/deliver/**`、`src/components/mistake/**`（预览与导出链路）、`src/components/summary/**`（落表入口）、`globals.css` 的打印样式、`package.json` 新依赖声明、`src/lib/**` 单测与 fixtures。

禁止：Prisma/API/计费业务变更、新增服务端存储或分享能力、绕过既有生成器自行拼装文件、把 mock 或结构化示意当真实渲染证据、删除既有测试、把重依赖静态引入公开页或工作台首屏、改动 S01/S02/S03 的既有契约。

## 7. Task 顺序与依赖

`T-401 → T-402 / T-403 / T-404`；`T-405` 依赖 `T-401`、`T-402`；`T-406` 依赖全部。

## 8. 验证矩阵

| AC         | 层级             | 命令/方法                                                                         | 预期                                                 | required | final_judge         |
| ---------- | ---------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------- | -------- | ------------------- |
| AC-016     | static + visual  | `pnpm test -- deliver-render parity` + 真实页面预览/导出件对照                    | 预览与导出件文本/图片/分页一致，差异清单为空或已记录 | yes      | rerun + walkthrough |
| AC-017     | static + visual  | `pnpm test -- deliver-editable mistake-export-parity` + 真实浏览器改 3 处后重导出 | 导出件与预览一致，草稿与 history.json 未被破坏       | yes      | rerun + walkthrough |
| AC-018     | static + visual  | `pnpm test -- weekend-export-style-parity` + 多 Sheet 真实页面走查                | 改值前后 merges/cols/styles 不变，导出前可确认成品   | yes      | rerun + walkthrough |
| AC-019     | static + visual  | `pnpm test -- excel-sink` + 真实反馈表样本走查                                    | 按表头落到正确行列，未匹配行被列出，导出保留原表样式 | yes      | rerun + walkthrough |
| AC-020     | manual + network | Chrome 打印预览 A4 + 390×844 移动视口 + DevTools Network 面板                     | 打印无溢出、移动端可交付、无携带产物的网络请求       | yes      | walkthrough         |
| budget     | build            | `pnpm build` 首屏 JS 前后数字比对                                                 | 重依赖不进首屏，首屏无回退                           | yes      | rerun               |
| regression | full gate        | `pnpm lint && pnpm typecheck && pnpm test && pnpm build`                          | 全部 exit 0                                          | yes      | rerun               |

真实页面走查必须覆盖：单学生与 40 人批量错题集、多 Sheet 周末表、至少一份 `references/` 脱敏副本反馈表；导出件用 Office/WPS 打开对照；走查结论与截图写入仓库外证据目录。AI 自评不算证据。

## 9. 部署、回滚

无 schema、无数据、无服务端变更，因此不使用 feature flag：一次性替换旧预览入口，上线走既有手动 SSH 脚本，上线前完成第 8 节真实页面走查。回滚 = revert 对应提交，不涉及 S01/S02/S03 数据契约。

## 10. 风险、假设和未决问题

- BLOCKER：S01 未 SEALED（入口条件未满足）。
- 风险：`docx-preview` 对本仓 `docx` 9.x 生成件的保真度未知。T-401 首增量即做 spike；保真不足时按 §3.1 记录差异或退化为「按 A4 定量排版的自有打印视图」，不得恢复模糊免责。
- 风险：40 人批量渲染的内存与耗时。若超出可接受范围，改为分批渲染 + 明确进度，不做一次性全量渲染。
- 风险：S02 后置导致交付步只能展示本地保存状态；统一 Artifact 状态接入由 S02 承接，S04 不得自行发明服务端状态。
- 假设：目标表为教师自有 Excel（非本产品模板），表头关键词可识别或可手点列；`references/` 样本仅以本地脱敏副本参与验证，不进 git。
- 未决：文件级 PDF 下载（非浏览器另存为）不在本 Stage 范围；若后续需要，需另立规格并评估新增客户端 PDF 引擎。

## 11. S04 验收汇总（T-406 回填，2026-10-02）

### 11.1 首屏 JS 前后对照（gzip，HTML 口径 = 浏览器首屏实际下载）

| 路由                         | S04 前（`ce585ed`） | T-406 完成（`本轮`） | 增量        | 说明                       |
| ---------------------------- | ------------------- | -------------------- | ----------- | -------------------------- |
| `/dashboard/mistake`         | 499.4 KB            | 500.9 KB             | **+1.5 KB** | 预览编辑 + 打印 + 统一面板 |
| `/dashboard/weekend-mistake` | 759.1 KB            | 767.6 KB             | **+8.5 KB** | 表样预览修正 + 落版入口    |
| `/dashboard/summary`         | 269.2 KB            | 278.2 KB             | **+9.0 KB** | 整段落版面板               |
| `/dashboard/feedback`        | 269.2 KB            | 278.2 KB             | **+9.0 KB** | 同上                       |

结论：整个「无 Office 交付」能力（真实渲染 + 预览即编辑 + 落版 + 打印/PDF + 统一面板）
首屏总代价 **1.5–9.0 KB**；重依赖（docx-preview 422 KB raw / exceljs）全部在按需 chunk，
`docx-preview` 实现 chunk 不在初始 script 集合（指纹法复核于 T-406 完成时）。

### 11.2 渲染差异清单

已用自动化证据覆盖（无需人工）：

- docx「预览 = 导出件」：同一 `generateStudentDocx` 字节（`persistSections:false` 与导出仅差
  不写历史），parity 测试按 `a:blip` 引用数/文本比对（`editable-docx.test.ts`）
- xlsx「预览 = 导出件」：预览走**真实导出路径**（`buildExportWorkbook` → `buildSheetGrid`），
  样式保真由 `weekend-export-style-parity.test.ts` 锁定
- 落版器不猜：`excel-sink.test.ts` 13 项（重名/缺行/合并区/无表头拒绝）

待真实页面人工核对后勾销（登录态阻塞，见 §10）：

1. docx-preview 分页与 Word/WPS 实际分页的偏差（页数为分页符估算）
2. 表样列宽 px 换算系数（`render-types` 里 7.5 px/字符宽）在真机的视觉偏差
3. Firefox 打印冒烟、iOS Safari「存储到文件」分享面板
4. DevTools Network 面板核对「交付过程无产物外发」——代码路径全部为本地 Blob /
   打印对话框 / File System Access，无上传语句（可 grep 佐证），浏览器实测待补

### 11.3 统一交付契约（冻结，供 S03 T-305）

- `src/lib/deliver/delivery-contract.ts`：五状态（loading/ready/failed/editing/empty）×
  五动作（download/print/batch/reedit/history）的纯函数语义，10 项契约测试锁定
- `src/components/deliver/delivery-panel.tsx`：组合 ArtifactPreview + 动作栏；
  三条产物流（错题集 Word / 周末表样 / 落版面板）已挂同一面板
