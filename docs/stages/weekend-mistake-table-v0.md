# STAGE · 周末错题反馈表 v0（Phase 3 · 新主功能）

> **阶段代号**：Phase 3 · 周末错题表
> **起始日期**：2026-06-26
> **业务定位**：Lekao 新的主流程（周末用 · 高频 · 直接发家长群）
> **核心价值闭环**：Excel 导入 → 网页编辑 → AI 反馈（D 列）→ Excel 导出 → 粘贴/直接发
> **与现有功能关系**：
>
> - `/dashboard/mistake`（现有课堂错题集 · docx 输出）维持不变
> - `/dashboard/summary` + `/dashboard/feedback`（现有 AI 助手）**降级为辅助**，折叠到周末错题表底部

---

## 🎯 用户已确认的 4 个核心决策（2026-06-26 苏格拉底对完）

| #   | 决策点           | 用户选择                                                                | 落地                                           |
| --- | ---------------- | ----------------------------------------------------------------------- | ---------------------------------------------- |
| 1   | 特殊情况状态清单 | **完全按模板实际值**                                                    | 5 个固定值 + 其他（可填）                      |
| 2   | D 列 AI 反馈生成 | **复用现有作业反馈 API**（1 张讲义图 → AI 按学生名 + 错题生成每生反馈） | 新建 `/api/lekao/feedback/batch` 接 batch 模式 |
| 3   | 多 Sheet 处理    | **1 个流程处理 3 个 Sheet**                                             | UI 显示进度 + 上一张/下一张 Sheet 切换         |
| 4   | R1 表头          | **改日期，其他完全不动**                                                | 自动识别日期字符串 → 替换成本周日期            |

---

## 📊 模板结构（实测 · 数学 6.14 + 物理化学 6.14/6.21）

```
R1:  (空) | {标题含日期}                  ← 合并 B1 单元格
R2:  序号 | 姓名 | 课后作业错题 | 课后作业反馈
R3+: 数据行
```

**关键发现**：

- **C 列（错题）有 7 种值**：题号列表 "3，6" / 全对 / 网课 / 网课回放 / 上次课网课 / 作业未交 / 留空
- **D 列（反馈）有 3 种填充模式**：
  1. 全对 → 随机话术（"作业完成的非常好，再接再厉！" / "继续加油"）
  2. 有错题 → AI 生成（"巩固 XXX 知识点..."）
  3. **第一个特殊情况学生** → "本次作业总体小结"（其他特殊情况留空 → 用户手动合并单元格）
- **文件名格式**：`{年份}超火{班级}{学科}{日期}【反馈表】.xlsx`（用户要求可改）
- **Sheet 名**：`超火1班数学`（含班级+学科）
- **R1 标题格式不统一**：数学"6月14日"（中文）/ 物理化学"6.14"（点号）→ **保留原文，只动日期**

---

## 🏗 架构设计

### 页面集成（方案 A · 扩展 mistake 页）

```
/dashboard/mistake  （现有 · 不破坏）
├ Step 1 上传 Excel          ← 现有
├ Step 2 选学科              ← 现有
├ Step 2.5 确认封面          ← 现有
├ Step 3 填错题槽位          ← 现有
└ Step 4 导出 docx           ← 现有

+ Step 5 🆕 周末错题反馈表（独立子流程 · 不依赖 Step 1-4 数据）
   ├ Step 5.1 上传周末 Excel（多 Sheet）
   ├ Step 5.2 改 R1 表头日期（自动识别 + 用户确认）
   ├ Step 5.3 学生表视图（按 Sheet 切换 · 特殊情况 dropdown）
   ├ Step 5.4 上传讲义图 → AI 反馈（复用 vision + text 模块）
   ├ Step 5.5 导出 Excel（用户改文件名）
   └ 折叠区「AI 助手」
      ├ 课堂小结（嵌入 SummaryWorkflow template=summary）
      └ 作业反馈（嵌入 SummaryWorkflow template=feedback）
```

### 关键架构决策

| 决策点                                             | 选择                                                                                               | 理由                                                                                                      |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Excel 解析                                         | **新建** `lib/mistake/weekend-parser.ts`                                                           | 跟现有 mistake 表格格式完全不同（一个是"姓名 + 堂测 + 作业 3 列"vs "姓名 + 错题字符串 + 反馈"），不能复用 |
| Excel 导出                                         | **新建** `lib/mistake/weekend-exporter.ts`                                                         | 保留原 R1 + R2 结构 + 学生行 + D 列内容                                                                   |
| AI 反馈 API                                        | **新建** `/api/lekao/feedback/batch/route.ts`                                                      | 现有 summarize 是 "1 张图 → 1 段反馈"，新需求是 "1 张图 + N 学生 → N 段反馈"，模式不同                    |
| **学生上限（用户确认 2026-06-26）**                | **60 人/Sheet**                                                                                    | 用户原话"学生上线可以收到 60 个人" → AI 批拆成 2 批（30+30），防 token 超限                               |
| **C 列默认空 + 用户手动填（用户确认 2026-06-26）** | 周末拿到的表格 C 列是空的，批改完用户在网页里**手动填**每个学生错题号                              | 不预填，不读 Excel C 列已存在的错题（模板的"3，6"仅作参考样式）                                           |
| 草稿存储                                           | **localStorage**（key=`weekend:{fileHash}`）                                                       | 周末流程一次性，不需要持久化到 DB                                                                         |
| 图片存储                                           | **不需要**（每生一张图太重，跟现有 mistake 区分）                                                  | 讲义图全班共用 1 张，AI 直接读                                                                            |
| UI 组件                                            | **新建** `WeekendMistakeWorkflow.tsx`（核心） + `WeekendStudentTable.tsx` + `WeekendExportBar.tsx` | 跟现有 mistake-workflow 不耦合                                                                            |

---

## 📦 5 阶段拆分（每个阶段 1 个 commit + 部署）

### 阶段 1 · Excel 解析 + 学生表视图（v0.1）

**估时**：≈ 4h
**产出**：

- `src/lib/mistake/weekend-parser.ts`（parseWeekendExcel 函数）
- `src/components/mistake/weekend/weekend-mistake-workflow.tsx`（主容器）
- `src/components/mistake/weekend/weekend-student-table.tsx`（学生表视图）
- `src/components/mistake/weekend/weekend-sheet-tabs.tsx`（多 Sheet 切换 tabs）
- `src/lib/mistake/weekend-types.ts`（WeekendSheet / WeekendStudent / WeekendCell 类型）
- 在 `/dashboard/mistake` 加 Step 5 入口（折叠面板"周末错题反馈表"）

**关键实现**：

- 解析 R1 标题 → 识别日期字符串（支持"6月14日" / "6.14" / "2026-06-14"）
- 自动改日期成"本周六/日"（按系统时间计算本周范围）
- 每个学生行：序号 | 姓名 | 特殊情况 dropdown | 错题 textarea（仅"正常/全对"可编辑）
- 特殊情况选项：正常 / 全对 / 网课 / 网课回放 / 上次课网课 / 作业未交 / 其他（input 弹出）
- localStorage 草稿：key=`weekend:{fileHash}:{sheetName}`
- 多 Sheet：顶部 tabs + 当前 sheet indicator

**验收**：

- 上传 `2026超火1班数学6.14【反馈表】.xlsx` → 解析出 3 个 Sheet（数学/物理/化学）
- R1 日期自动改为本周日期
- 每个 Sheet 学生行正确显示，特殊情况 dropdown 可切换
- 刷新页面草稿保留
- 移动端可正常操作（dropdown 不被遮挡）

**Commit**：`feat(weekend-mistake): Stage 1 Excel 解析 + 学生表视图`

---

### 阶段 2 · Excel 导出（v0.2）

**估时**：≈ 3h
**产出**：

- `src/lib/mistake/weekend-exporter.ts`（exportWeekendExcel 函数）
- `src/components/mistake/weekend/weekend-export-bar.tsx`（导出工具栏）
- 文件名生成器（默认 `{年份}超火{班级}{学科}{日期}【反馈表】.xlsx` + 用户可改 input）
- D 列内容来源：手动填写 / AI 生成（Stage 3 接入）

**关键实现**：

- SheetJS 写回 Excel（保留原 R1 + R2 结构 + 学生行）
- 多 Sheet 合并导出（1 个下载文件含全部 Sheet）
- 文件名 input（默认值 + 用户改）
- 文件保存走浏览器 `saveAs`（file-saver 已装）
- 导出前预览（哪 Sheet 哪学生 D 列填充预览）
- 序号列（A 列）保留原值（如有）+ 用户可编辑

**验收**：

- 导出 1 个含 3 Sheet 的 xlsx 文件
- 文件名格式正确（默认 + 用户改）
- 序号 / 姓名 / 错题 / 特殊情况 全部填回正确单元格
- D 列内容（如有）填到正确位置
- 6.21 化学表 A:I 9 列宽保留（不破坏原结构）

**Commit**：`feat(weekend-mistake): Stage 2 Excel 导出`

---

### 阶段 3 · AI 反馈集成（v0.3）

**估时**：≈ 5h
**产出**：

- `src/app/api/lekao/feedback/batch/route.ts`（新 API）
- `src/lib/ai/batch-feedback.ts`（vision + text 串联封装）
- `src/lib/ai/prompts.ts` 加 `batchFeedbackPrompt` 模板
- `src/components/mistake/weekend/weekend-ai-feedback-panel.tsx`（讲义图上传 + 生成按钮）
- 学生表 D 列展示 AI 生成的反馈 + 复制按钮

**API 设计**（`/api/lekao/feedback/batch`）：

```ts
POST /api/lekao/feedback/batch
Body: {
  lectureImage: string (base64),     // 全班共享 1 张讲义图
  sheetName: string,                 // "超火1班数学"
  date: string,                      // "2026-06-14"
  students: Array<{
    name: string,
    qNumbers: string[],              // ["3", "6"] · 空数组 = 全对/无错题
  }>,
  existingFeedbacks?: string[],      // 已生成的反馈（避免重复调 AI）
}
Response: {
  feedbacks: Array<{
    studentName: string,
    feedback: string,                // AI 生成的 D 列文本
    tokensUsed: number,
  }>,
  summary: string,                   // "本次作业总体小结"（填到第一个特殊情况学生位置）
  totalTokens: number,
  coinCost: number,
}
```

**关键实现**：

- 单次 API 调用 = 1 张讲义图 + 全部学生（**不每生调 AI**，避免 1 表几十币）
- Vision 模型（Qwen3-VL）读图 → 提取关键知识点（keyPoints）
- Text 模型（DeepSeek）拿 keyPoints + 学生错题列表 → 批量生成 N 段反馈 + 1 段总体小结
- Prompt 模板参考现有 `prompts.ts` 但改 batch 模式
- 1 币/Sheet（不是 1 币/生），保护 T-Coin 体验
- 特殊情况学生跳过生成（第一个例外）

**验收**：

- 上传 1 张讲义图 + 30 个学生 → 30 段反馈 + 1 段总体小结，扣 1 币
- AI 反馈填入 D 列，"全对" 学生用模板话术
- 第一个特殊情况学生位置填"本次作业总体小结"，其他留空
- 复制按钮可复制每段反馈（贴家长群）

**Commit**：`feat(weekend-mistake): Stage 3 AI 反馈集成`

---

### 阶段 4 · 折叠 AI 助手（v0.4）

**估时**：≈ 2h
**产出**：

- `src/components/mistake/weekend/weekend-ai-assistant-section.tsx`
- 在周末错题表底部加折叠区"AI 助手（课堂小结 + 作业反馈）"
- 嵌入现有 `SummaryWorkflow` 组件（template="summary" / template="feedback"）

**关键实现**：

- 折叠区 `<details>` 默认收起，标题"🤖 AI 助手（点击展开）"
- 展开后两个 tab：「课堂小结」「作业反馈」
- 每个 tab 内嵌现有 SummaryWorkflow（client 组件，传入 template prop）
- 复用现有 summarize API

**验收**：

- 折叠区可正常展开/收起
- 「课堂小结」tab → 上传讲义图 → AI 生成课堂小结
- 「作业反馈」tab → 上传讲义图 → AI 生成作业反馈（不带学生名，1 张图 1 段反馈）
- 跟 `/dashboard/summary` + `/dashboard/feedback` 表现一致

**Commit**：`feat(weekend-mistake): Stage 4 折叠 AI 助手`

---

### 阶段 5 · 优化 + 部署（v0.5）

**估时**：≈ 2h
**产出**：

- 移动端适配（touch 友好 · dropdown 不被遮挡 · 表格可横滑）
- Lighthouse mobile 验证（perf 不能降 ≥ 3 分）
- CHANGELOG 更新
- 部署 + 真机验证（上传 6.14 模板，3 个 Sheet 全流程跑通）

**验收**：

- Lighthouse mobile 4-run avg ≥ 现有 baseline -3 分
- 移动端 Chrome 实测：上传 Excel → 编辑 → AI 反馈 → 导出 Excel 全流程
- 三端 commit 一致（local / origin / PROD）
- CHANGELOG 标记 v0.5 release

**Commit**：`chore(release): weekend-mistake v0.5`

---

## ⚠️ 风险与约束

| 风险                                                 | 影响                     | 缓解                                                     |
| ---------------------------------------------------- | ------------------------ | -------------------------------------------------------- |
| **batch API 1 次调 AI 输出 30+ 段可能超 token 限制** | API 失败 / 反馈截断      | 限制单 Sheet ≤ 40 学生；超 40 拆批调                     |
| **讲义图 base64 上传体积大**                         | 网络慢 / 超 4MB API 限制 | 客户端压缩到 ≤ 1MB（复用 `image-compress.ts`）           |
| **AI 反馈质量不一致**（错题号多 vs 少）              | 用户体验差               | Prompt 加约束："错题 ≥ 5 道时按 3 道重点讲解 + 2 道简略" |
| **6.21 化学表 A:I 9 列宽破坏导出**                   | 格式异常                 | exporter 保留原 cols 数量，不强制 4 列                   |
| **多 Sheet 顺序处理时草稿混乱**                      | 切 Sheet 丢数据          | localStorage key 含 sheetName，独立存储                  |

---

## 🔗 关联沉淀

- **架构原则**：`~/.claude/feedback_architecture.md`（YAGNI + 反过度架构）
- **测试模式**：`~/.claude/rules/reusable-test-patterns.md`（mock + real 双模式）
- **AI 反馈 prompt 诱饵**：`~/.claude/rules/feedback-prompt-bait-text.md`（开关关闭时诱饵清干净）
- **Edit 工具中文 emoji 坑**：`~/.claude/rules/feedback-edit-tool-cjk-emoji.md`（改含 emoji 行用 sed -i）

---

## 📋 v0 完成后待评估

- v1.0 是否要把 `/dashboard/summary` + `/dashboard/feedback` 永久折叠到周末表底部
- v1.0 是否要把"周末错题表"作为 Dashboard 主页入口（替换默认页）
- T-Coin 扣费策略（1 币/Sheet vs 1 币/生 vs 包月）需用户决定

---

## 🔄 v0.2 修订（2026-06-26 用户 4 点反馈后）

> **背景**：v0.1 部署后用户实测提出 4 点反馈，方向性调整如下。

### 4 个核心调整

| #                | v0.1 原方案                                                         | v0.2 修订                                                                                                                           | 用户原话                                                                         |
| ---------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **1 · 位置**     | 把周末错题表**折叠**到 `/dashboard/mistake` 底部（mistake 为主）    | **周末反馈表为主**，独立路由 `/dashboard/weekend-mistake` + sidebar 新导航项 + Dashboard 第 2 个 QuickCard；AI 助手折叠到周末表底部 | "之前计划里面有... 把他放到该放的地方... 把之前的两个 AI 生成的功能给它做主"     |
| **2 · 日期**     | "最近周六/周日"（自动算本周六/日）                                  | **今天**（直接用系统日期，用户上传时是什么日期就改成什么日期）                                                                      | "好像不是很智能... 我想要的是当天"                                               |
| **3 · 特殊情况** | 单独 dropdown 列（status: normal/网课/请假/未交/其他 + statusNote） | **去掉 dropdown**。C 列改成"单一 input + 5 个特殊值快捷按钮组"。特殊情况直接填到 C 列（如"网课"），跟题号 "3，6" 共享同一列         | "特殊情况不用单独去列一列... 到时候可能就会填到这个题号里面，让题号去选是最好的" |
| **4 · 自动排序** | 无（保持原 Excel 顺序）                                             | 加"↕️ 自动排序"按钮，按 C 列值自动分组：题号(数字升序) → 全对 → 网课 → 网课回放 → 上次课网课 → 作业未交 → 其他 → 留空               | "有了题号的就自动往上面排... 特殊情况或者作业未交的就把它往下面放"               |

### v0.2 文件改动清单

#### 新增

- `src/lib/mistake/weekend-types-base.ts`（拆出基础类型，避免循环引用）
- `src/app/dashboard/weekend-mistake/page.tsx`（独立路由页）
- `WeekendIcon` / `SortIcon` 加到 `src/components/icons/index.tsx`

#### 修改

- `src/lib/mistake/weekend-types.ts`（删除 status/statusNote 字段 + `WEEKEND_STATUS_OPTIONS` 常量，新增 `classifyCellValue` / `sortStudentsByCellValue` / `shouldSkipAiFeedback`）
- `src/lib/mistake/weekend-parser.ts`（`getThisWeekendDate()` → `formatISO(new Date())` 返回今日 ISO；students init 去掉 status/statusNote）
- `src/components/mistake/weekend/weekend-student-table.tsx`（C 列合并 input + 5 个快捷按钮组，去掉 dropdown 列；顶部加自动排序按钮）
- `src/components/mistake/weekend/weekend-mistake-workflow.tsx`（去掉 WEEKEND_STATUS_OPTIONS 引用；`autoSortSheet` handler 调用 `sortStudentsByCellValue`；步骤指示器文案更新）
- `src/components/dashboard/sidebar.tsx`（NAV_ITEMS 加 `/dashboard/weekend-mistake`，label="周末反馈表"，Icon=WeekendIcon）
- `src/app/dashboard/page.tsx`（QUICK_FEATURES 加 weekend-mistake 第 2 项，tag=免费；grid `md:grid-cols-3` → `md:grid-cols-2 lg:grid-cols-4`）

#### 还原

- `src/app/dashboard/mistake/page.tsx`（**移除** v0.1 加的"周末错题反馈表"折叠 details 区块，恢复原 mistake 页）

### v0.2 排序逻辑（核心代码）

```ts
const CATEGORY_ORDER: Record<CellCategory, number> = {
  qnumber: 0, // 有题号（"3，6"）
  allCorrect: 1, // "全对"
  onlineCourse: 2, // "网课"
  onlineReview: 3, // "网课回放"
  onlineLast: 4, // "上次课网课"
  notSubmitted: 5, // "作业未交"
  other: 6, // 其他文本（"请假/转学..."）
  blank: 7, // 留空
};

// 题号内细分：按第一个数字升序
function extractFirstNumber(v: string): number {
  const m = v.match(/\d+/);
  return m ? parseInt(m[0], 10) : Number.MAX_SAFE_INTEGER;
}

// 主排序：category asc → 同 category 内细分 → 姓名拼音
```

### v0.2 验收（待跑）

- [ ] sidebar 第 2 项 = "周末反馈表"，点击进 `/dashboard/weekend-mistake`
- [ ] Dashboard 4 个 QuickCard，第 2 张 = "周末反馈表"（免费 tag）
- [ ] `/dashboard/mistake` **不再含**"周末错题反馈表"折叠区
- [ ] 上传 Excel → R1 标题日期自动改为今日（不再算"最近周六"）
- [ ] 学生表 C 列：input + 下方 5 个快捷按钮（"全对"/"网课"/"网课回放"/"上次课网课"/"作业未交"）
- [ ] 点 ↕️ 自动排序 → 学生按 category 顺序重排
- [ ] 草稿依然 localStorage 保留

### v0.2 → v0.3 仍待办（Stage 2 + Stage 3）

- **Stage 2**：Excel 导出（SheetJS 写回 + 文件名可改 + file-saver 下载）
- **Stage 3**：AI 反馈集成（`/api/lekao/feedback/batch` + vision 提取 keyPoints + 批量生成 N 段反馈）
- 暂不实现"AI 助手折叠"（Stage 4 原计划）—— **位置修订后 AI 助手不再折叠到周末表下**，保留为独立 sidebar 入口

### v0.2 决策影响

| 维度   | 影响                                                                   |
| ------ | ---------------------------------------------------------------------- |
| 路由   | 新增 `/dashboard/weekend-mistake`（**独立页面**，不再依赖 mistake 页） |
| 数据库 | 不需要新表（依然 localStorage 草稿）                                   |
| API    | 不需要新 API（v0.2 不含 AI）                                           |
| 权限   | 不需要新角色（所有登录用户可用）                                       |
| 移动端 | dashboard grid 改 `lg:grid-cols-4`（桌面 4 列，移动端 1 列）           |
| 视觉   | 新增 `WeekendIcon` / `SortIcon` 两个 SVG icon                          |

### 关联沉淀

- [[feedback_raw_data_preserve]] — 0/异常值原样保留，C 列原始字符串保留（不存 category 字段）
- [[feedback_prompt_bait_text]] — Stage 3 AI prompt 设计时要清干净诱饵
- [[lekao]] skill — 部署流程 / bundle fetch / force-with-lease
