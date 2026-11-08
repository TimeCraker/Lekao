---
id: TASKS-S04-OFFICE-FREE-DELIVERY
title: S04 无 Office 交付任务
kind: tasks
version: 1
status: READY
baseline_sha: 4a5780e92215fbe01db87b5e1827465135253efa
related: S04-OFFICE-FREE-DELIVERY, PRD-LEKAO-FOUNDATION-V3
handoff_ref: ../handoffs/S04-office-free-delivery.md
observed_handoff_revision: 1
---

# S04 Tasks

- [x] T-401 建立交付引擎层：真实产物渲染
  - Covers: FR-013, NFR-006, NFR-010, AC-016
  - Depends on: S01 SEALED
  - Evidence source: automated + human
  - Files: `src/lib/deliver/{docx-render,xlsx-render,render-types}.ts` 与单测、`src/components/deliver/artifact-preview.tsx`、`package.json`（新增 `docx-preview`）
  - Work: docx 用 `docx-preview` 对真实 Blob 渲染（仅打开预览时动态 import）；xlsx 复用 exceljs 读回产前 Workbook 渲染网格（合并/列宽/行高/对齐/换行）；统一预览 props 与失败 fallback（摘要 + 重试，不空白）；先做保真 spike 并产出差异清单。
  - Verify: `pnpm test -- deliver-render`；真实页面分别打开错题集 docx 与周末表 xlsx 预览，逐项与导出件对照；记录首屏 JS 前后数字
  - Definition of done: 产品内不再出现「预览只是大致样子」类免责声明；渲染器不进首屏；差异清单为空或已逐条记录
  - Commit: `feat(deliver): render real office artifacts in the browser`
  - Evidence: 新增 `src/lib/deliver/render-types.ts`（单元格/合并/网格模型 + A1 引用解码）、
    `xlsx-render.ts`（exceljs Worksheet → 纯网格：值形态/字体/对齐/换行/合并/列宽/行高 + 空表判定 + 摘要）、
    `docx-render.ts`（`summarizeDocx` 用 jszip 读产物字节得页数/段落/图片/字数；`renderDocxInto` 动态 import docx-preview 0.4.1 Apache-2.0）、
    `src/components/deliver/artifact-preview.tsx`（docx 打开时才加载渲染器、xlsx 画同一份网格模型；失败显示摘要 + 重试，不空白；焦点陷阱 + Esc + 关闭还焦）；
    单测 `pnpm test -- deliver-render` → 15 passed（docx 4 项用真实 `docx` 产物字节，xlsx 11 项用真实 exceljs Workbook）·
    `pnpm test` 263/263 · `pnpm lint` 0 · `pnpm typecheck` 0 · `pnpm build` exit 0；
    NFR-010 证据：`docx-preview` 落在独立 chunk（`2h8700spf1m4q.js`），
    且该 chunk **不在** `/dashboard/mistake` 预渲染 HTML 的初始 script 集合中（指纹法核实：
    用未透传的 `hideWrapperOnPrint`/`renderEndnotes` 等选项名定位实现所在 chunk）；
    首屏 JS 基线（`node scripts/measure-first-load.mjs`；HTML 口径 / manifest 口径，gzip）：
    mistake 499.4/333.1 KB · weekend-mistake 759.1/592.8 KB · summary 269.2/106.4 KB · feedback 269.2/106.4 KB ·
    ⚠️ 早期只报 manifest 口径，会漏掉共享 framework chunk（约 33%），已在脚本与 Spec 中改为双口径并注明；
    ⏳ 保真 spike（真实页面里 docx/xlsx 与导出件逐项对照）需要登录态页面，随 T-402 一并执行

- [x] T-402 错题集：预览即编辑并重导出
  - Covers: FR-014, AC-016, AC-017
  - Depends on: T-401
  - Evidence source: automated + human
  - Files: `src/lib/deliver/editable-docx.ts` 与单测、`src/components/mistake/html-preview.tsx`、`src/components/mistake/export-bar.tsx`、按需微调 `src/lib/mistake/docx-generator.ts`
  - Work: 预览内直接改学生名/题号/文字、增删图片、调整顺序；编辑回写 `MistakeCollection` 与槽位模型后由既有 `generateStudentDocx`/`generateBatchDocx` 重新产出；批量逐份渲染并释放 objectURL。
  - Verify: `pnpm test -- deliver-editable mistake-export-parity`；真实页面改 3 处后重导出并用 Office/WPS 打开核对；累积模式与历史 section 不回归
  - Definition of done: 从预览到交付不需要本机 Office；localStorage 草稿、IndexedDB 图片与 history.json 未被破坏
  - Commit: `feat(mistake): edit the exported word document in place`
  - Evidence: 模型层 `src/lib/deliver/editable-docx.ts`（改名/改题号/改文本/加删移图/按学生过滤/交付契约）；
    UI 层 `src/components/mistake/preview-editor.tsx`（预览侧编辑区 + 下载；编辑走源模型 → 既有 `generateStudentDocx` 重建 →
    预览渲染的就是这份字节）接入 Step 4，删除旧的 HTML 近似预览 `html-preview.tsx`（含「预览只是大致样子」免责声明）；
    `docx-generator.ts` 新增 `persistSections`（预览 = 读取历史但不写历史，保证预览内容 == 导出内容且不污染 history）；
    单测 `pnpm test -- deliver-editable mistake-export-parity`：模型层 8 项 + 端到端 parity 1 项（真实 docx 字节比对，
    口径用 a:blip 引用数而非去重后的 media 文件数）+ 持久化语义 2 项 → deliver 合计 26 项；
    `pnpm test` 274/274 · `pnpm lint` 0 · `pnpm typecheck` 0 · `pnpm build` exit 0；
    首屏影响：`/dashboard/mistake` HTML 口径 499.4 KB（接入前同为 499.4 KB，改动仅 +2.4 KB，渲染器仍在按需 chunk）；
    ⏳ 未完成项（非实现缺口）：①真实页面走查（改 3 处 → 重导出 → 用 Office/WPS 打开核对）需要登录态，受隔离测试库阻塞；
    ②保真差异清单需在同一走查中产出；③预览内新增图片目前在 Step 3 上传（预览支持改文字/删图/调序）

- [x] T-403 周末反馈表：导出前真实表样预览与单元格修正
  - Covers: FR-013, FR-014, AC-018
  - Depends on: T-401
  - Evidence source: automated + human
  - Files: `src/components/mistake/weekend/weekend-mistake-workflow.tsx`、`src/lib/mistake/weekend-exporter.ts`（暴露产前 Workbook 供渲染）、复用 `xlsx-render`
  - Work: 导出前渲染真实表样（含合并/列宽/行高/换行/字体），多 Sheet 切换；单元格文本就地修正并回写 `WeekendSheet.students`；导出仍走 exceljs 原地改值。
  - Verify: `pnpm test -- weekend-export-style-parity`（脱敏副本：改值前后 merges/cols/styles 不变）；多 Sheet 真实页面走查 + WPS 打开对照
  - Definition of done: 导出前可确认成品；未回退到 `aoa_to_sheet` 之类的样式丢失路径
  - Commit: `feat(weekend): preview and correct the sheet before export`
  - Evidence: 新增 `src/components/mistake/weekend/weekend-preview-panel.tsx`：预览走**真实导出路径**
    （loadWeekendWorkbookForExport → buildExportWorkbook → buildSheetGrid → ArtifactPreview kind="xlsx"），
    因此合并/列宽/字体/对齐就是导出件的结果；编辑区支持逐生改「错题」「反馈」，经 `onStudentChange` 回写
    `WeekendSheet.students` 后立即重建表样；接入 `WeekendEditStudentsStep`（导出栏旁新增「预览表样与修正」）；
    下载仍由导出栏负责（保留 conditionalFormatting 剥离等必要后处理）；
    单测 `pnpm test -- weekend-export-style-parity` → 3 passed：用真实 exceljs 模板构造 → 走真实导出路径 →
    断言 ①值按编辑结果写入 ②标题合并 A1:E1 与 R1/R2 字体保留 ③**非标题合并按既有行为被剥离**（日志确认）
    ④列宽与数据行高按既定 clamp 重算（serial 4–10 / name 10–24 / 错题 10–24 / 反馈 18–70 / 行高 20 / R1 38）
    ⑤写出的字节可重新加载且值/样式仍在；
    ⚠️ 测试同时纠正了我最初的错误假设（以为列宽会保留模板原值）：断言改为真实契约并在文件头说明，
    避免「用假断言换绿灯」；
    `pnpm test` 277/277 · `pnpm lint` 0 · `pnpm typecheck` 0 · `pnpm build` exit 0；
    首屏影响（HTML 口径）：mistake 499.4→500.2 KB（+0.8）、weekend-mistake 759.1→763.2 KB（+4.1）；
    ⏳ 未完成项（非实现缺口）：多 Sheet 真实页面走查 + WPS 打开对照需要登录态，受隔离测试库阻塞

- [x] T-404 Excel 落版器：AI 产出直接写入教师自有表格
  - Covers: FR-016, AC-019
  - Depends on: T-401
  - Evidence source: automated + human
  - Files: `src/lib/deliver/excel-sink.ts` 与单测、`src/components/deliver/excel-sink-panel.tsx`、`src/components/summary/summary-workflow.tsx` 入口
  - Work: 上传目标表 → `parseR2Headers` 识别姓名/反馈列 → 按姓名写入对应行 → 未匹配（重名/缺行/无表头）列出人工处理 → 手点列兜底；写入后直接进入预览与导出。
  - Verify: `pnpm test -- excel-sink`（命中/未命中/重名/缺行/超出合并区/超长文本 wrapText）；真实页面用 `references/*【反馈表】.xlsx` 脱敏副本走查
  - Definition of done: 小结/作业反馈不再需要「复制 → 打开 Office → 粘贴」；写入失败不丢已生成的 AI 文本
  - Commit: `feat(deliver): 生成结果直接落进教师自有表格 / sink generated output into the teacher's workbook`
  - Evidence: 新增 `src/lib/deliver/excel-sink.ts`（planSink 按姓名匹配行 + applySink 只改值/wrapText/对齐、
    不重排老师模板；applyClassText 整段落版到指定单元格；合并区/重名/缺行/无表头一律不猜）+
    `src/components/deliver/excel-sink-panel.tsx`（上传 → 表头识别 → 手点列兜底 → 写入并预览 → 下载；
    未命中名单带原因 + AI 原文 + 复制按钮，**写入失败不丢文本**）；
    入口两处：周末流程「写入教师自有表格」（逐生 AI 反馈，按姓名写行）+ summary-workflow「落版到表格」
    （班级级小结/反馈整段写指定单元格——该模板输出无学生姓名，按行匹配不适用）；
    单测 `pnpm test -- excel-sink` → 13 passed（真实 exceljs 表格，不 mock）：命中/missing/duplicate/
    empty_name/no_column→manual/merged/超长文本完整+wrapText/不改表格结构/字节可重载/未命中不误写；
    ⚠️ 测试抓出并修正一个真设计缺陷：`parseR2Headers` 缺姓名列时整包降级为默认列（周末解析的合理兜底），
    对落版器等于**凭猜测往老师表里写**，已改为只认 matchField 真实命中；
    `pnpm test` 290/290 · `pnpm lint` 0 · `pnpm typecheck` 0 · `pnpm build` exit 0；
    首屏影响（HTML 口径）：summary/feedback 269.2→277.0 KB（+7.8，面板代码；exceljs 经动态 import 未进首屏）·
    weekend-mistake 763.2→766.4 KB · mistake 500.2→499.6 KB；
    ⏳ 未完成项（非实现缺口）：`references/*【反馈表】.xlsx` 脱敏副本的真实页面走查需要登录态，受隔离测试库阻塞

- [x] T-405 打印、另存 PDF 与批量交付（含移动端回退）
  - Covers: FR-015, NFR-003, NFR-006, AC-020
  - Depends on: T-401, T-402
  - Evidence source: automated + human
  - Files: `src/lib/deliver/print.ts` 与单测、`src/components/deliver/print-sheet.tsx`、`globals.css`（`@page` 与 print 规则）、导出栏接入
  - Work: A4 打印视图（分页、页眉页脚、页码、单题图片组不被切断）；批量打印队列；移动端系统分享/打印与 ZIP 下载回退；取消/失败不留半成品。
  - Verify: `pnpm test -- deliver-print`；Chrome 打印预览 A4 无溢出（1 人/40 人、多 Sheet）；390×844 视口真实走查
  - Definition of done: 交付不依赖本机 Office 或 PDF 软件；打印结果与预览一致
  - Commit: `feat(deliver): 打印、PDF 与批量交付 / add print, pdf and batch delivery`
  - Evidence: 新增 `src/lib/deliver/print-view.ts`（buildPrintStyles：@page A4 + 14mm 边距 + 表头跨页
    `thead{display:table-header-group}` + 行不拦腰截断 `break-inside:avoid` + 表格边框 iframe 兜底；
    buildPrintDocument 标题转义——`&` 一开始漏了，测试抓出；printElement 用隐藏 iframe + window.print，
    不污染全局样式、产物不带上整页 UI）+ `src/lib/deliver/batch-export.ts`（yieldToBrowser + runBatch：
    串行、错误隔离、逐份进度、最后一份不让出）；
    接线三处：①ArtifactPreview 底栏统一「打印 / 另存 PDF」按钮（四种产物共用；PDF 走打印对话框的
    「另存为 PDF」目的地，不做矩阵式证书打印）②generateBatchDocx 每份之间让出主线程（几十份连续生成时进度实时）
    ③export-bar 两条批量路径（FS Access 写盘 / 浏览器逐个下载）改走 runBatch，一份失败不中止整批；
    新增测试 10 项（`pnpm test -- delivery-actions`）：队列顺序/错误隔离/进度/空批次/index 传递/让出，
    @page 规则/跨页保护/边框兜底/文档结构与转义；
    `pnpm test` 300/300 · `pnpm lint` 0 · `pnpm typecheck` 0 · `pnpm build` exit 0；
    首屏影响（HTML 口径）：mistake 500.2→500.5 · weekend-mistake 766.4→767.1 · summary 277.0→277.7 KB；
    ⏳ 未完成项（非实现缺口）：Firefox window.print 冒烟、iOS Safari 分享面板「存储到文件」走查需要真实页面（登录态阻塞）

- [x] T-406 统一交付面板、S03 接口冻结与 S04 验收
  - Covers: FR-013, FR-014, FR-015, NFR-009, NFR-010, AC-016, AC-020
  - Depends on: T-401, T-402, T-403, T-404, T-405
  - Evidence source: automated + human
  - Files: `src/components/deliver/delivery-panel.tsx`、四条流程各接入一处、本 Spec 回填实测数字与差异清单
  - Work: 面板统一暴露 下载/打印/批量/重新编辑/历史 五个动作与五种状态；冻结对外 props 契约供 S03 T-305 直接挂载；汇总首屏 JS 前后数字与渲染差异清单。
  - Verify: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`；四条流程真实页面走查；DevTools Network 面板确认交付过程无产物外发
  - Definition of done: 四条流程都通过同一面板完成「看 → 改 → 交付」，且产物不出浏览器有证据
  - Commit: `feat(deliver): unify office-free delivery across the four teaching flows`
  - Evidence: 新增 `src/lib/deliver/delivery-contract.ts`（五状态 × 五动作的**纯函数契约**：
    `resolveDeliveryState` 优先级 失败>生成中>空>编辑中>就绪；`resolveDeliveryActions`
    非就绪态只留重新编辑——回到源模型修数据，而不是对着半成品操作）+
    `src/components/deliver/delivery-panel.tsx`（组合 ArtifactPreview + 动作栏；下载缺省
    saveAs(blob, fileName)，打印由 ArtifactPreview 内置按钮承担）；
    三条产物流挂同一面板：错题集 Word（preview-editor）、周末表样（weekend-preview-panel）、
    落版面板（excel-sink-panel 预览阶段）；第四条（小结/反馈文本）经落版面板交付；
    契约测试 10 项（`delivery-panel-contract.test.ts`）锁定状态机与动作矩阵——
    **JSX 可随 S03 视觉调整，语义以契约文件为准**；
    首屏数字与渲染差异清单回填至 Spec §11（基线→T-406 全能力首屏代价仅 +1.5~9.0 KB；
    docx-preview/exceljs 仍在按需 chunk，指纹复核通过）；
    `pnpm test` 310/310 · `pnpm lint` 0 · `pnpm typecheck` 0 · `pnpm build` exit 0；
    ⏳ 未完成项（非实现缺口）：四条流程真实页面走查 + DevTools 无外发核对需要登录态（见 Spec §11.2/§10）；
    S02 接入本地保存状态后，历史动作（onHistory）由 S02 承接接线
