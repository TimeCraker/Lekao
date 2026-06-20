# STAGE · 课堂小结 + 课堂反馈（Phase 2 · T26-T35）

> **阶段代号**：Phase 2 · 小结/反馈
> **起始日期**：2026-06-20
> **任务范围**：T26-T35（PRD §4.1.2）
> **业务定位**：Lekao 唯一的付费功能（T-Coin 扣 1 枚/次）
> **核心价值闭环**：错题集免费引流 → 小结/反馈变现

---

## 🎯 用户最新意图（2026-06-20 · 与 PRD §4 对齐后简化）

| 维度 | PRD §4 原案 | 用户最新决策 | 落地 |
|------|------------|------------|------|
| 学科识别 | 用户手动选 / 模板预设 | **AI 自动**（视觉读图判断） | ✅ LLM 自动 |
| 章节识别 | 未提 | **AI 自动**（高中数学→平面向量 / 化学→氧化还原） | ✅ LLM 推断 |
| 输出重点 | 10 条建议 + 三段式 + 催交尾注 | **围绕知识点写** | ✅ 保留 10 条 + 一段小结结构（助教贴 Excel 一列方便） |
| Prompt 约束 | 7 动词 8 鼓励语枚举 | **"没那么麻烦"** | ✅ 简化（保留结构不锁死动词） |
| Markdown 编辑器 | 在线编辑 | 未提 | ❌ 不做 |
| 模板数量 | 2 套（小结/反馈） | 同上 | ✅ 2 套 system prompt（同一 AI 调用换语气） |
| 分流复制 | 必须 | 必须 | ✅ 保留（贴 Excel / 发家长群） |
| AI 模型 | 单模型 | **双模型分工**（视觉 + 文本分开） | ✅ Qwen3-VL + DeepSeek V4 Flash |

---

## 🏗 技术栈（用户已拍板）

| 用途 | 模型 | Provider | Key 环境变量 | 理由 |
|------|------|----------|-------------|------|
| **视觉**（读图） | Qwen3-VL-8B-Instruct | 硅基流动 | `SILICONFLOW_API_KEY` | 用户原话"越快越好"，8B 轻量快、非旗舰热门 |
| **文本**（生成） | DeepSeek V4 Flash | DeepSeek 官方 | `DEEPSEEK_API_KEY` | 用户原话"快一点，标准一点"，官方 V4 Flash |

**调用链路**：
```
用户上传讲义图
  ↓
硅基流动 Qwen3-VL-8B-Instruct 读图
  ↓ 返回 JSON：{subject, topic, keyPoints: [...], rawText}
DeepSeek V4 Flash 拿 keyPoints + 模板 system prompt
  ↓ 流式返回：feedback (10 条建议) + summary (一段小结)
前端展示 + 分流复制按钮
```

**SDK**：两个 provider 都支持 OpenAI-compatible 协议，统一用 `openai` 包（4.x）。

---

## 📦 5 阶段拆分（大阶段一次性 commit）

### 阶段 1 · AI 接入（视觉 + 文本 + API 路由）
**估时**：≈2h
**产出**：
- `src/lib/ai/vision.ts`（硅基流动 Qwen3-VL-8B-Instruct 读图封装）
- `src/lib/ai/text.ts`（DeepSeek V4 Flash 文本生成封装）
- `src/lib/ai/prompts.ts`（视觉读图 prompt + 文本生成 prompt 模板）
- `src/app/api/lekao/summarize/route.ts`（POST 路由：接图 → 视觉 → 文本 → 流式返回）
- `.env` 配两个 API key（不 commit）
- `.env.example` 更新（commit，标记密钥名）

**验收**：
- `pnpm build` 通过
- 本地 `curl` 上传一张测试图 → 返回 JSON `{subject, topic, keyPoints, feedback, summary}`
- 流式响应在 SSE 中正常推送

### 阶段 2 · 上传 UI + 模板选择
**估时**：≈1.5h
**产出**：
- 替换 `/dashboard/summary` 占位页
- `src/components/summary/uploader.tsx`（拖拽 + 选文件，多图）
- `src/components/summary/template-tabs.tsx`（📝 课堂小结 / 💬 家长反馈 tab 切换）
- `src/components/summary/generate-button.tsx`（调 API + loading 状态）

**交互**：
```
┌────────────────────────────────────────┐
│  ← 返回工作台                           │
│  📝 课堂小结 / 💬 家长反馈  ← tab 切换   │
│  ─────────────                         │
│  ┌──────────────────────────────┐    │
│  │  拖拽讲义图片到这里 / 点击选择   │    │
│  │  支持 PNG / JPG / JPEG（自动压缩）│    │
│  └──────────────────────────────┘    │
│  [🤖 一键生成]  ← loading 状态          │
└────────────────────────────────────────┘
```

**验收**：
- 拖拽上传 + 点击选文件都能用
- 多图并行预览
- 生成按钮点击后 loading + 调 API

### 阶段 3 · 输出展示 + 分流复制
**估时**：≈1h
**产出**：
- `src/components/summary/output-card.tsx`（Apple-style 高亮 Card 展示 feedback + summary）
- `src/components/summary/split-copy-buttons.tsx`（分流复制）
- `src/lib/summary/parser.ts`（按 `本次XX反馈` / `本次XX总体小结` 切分两段）

**复制逻辑**：
- 「📋 复制反馈（贴 Excel 用）」→ 取 feedback 段（10 条建议，每条独占一行）
- 「📱 复制小结（发家长群用）」→ 取 summary 段（一段紧凑文字 + 催交尾注）
- 复制时**去除 Markdown 符号**（保留换行）
- 写入剪贴板用 `navigator.clipboard.writeText` + 降级 `document.execCommand('copy')`

**验收**：
- 输出 Card 排版清晰（feedback 段 + summary 段分明显分隔）
- 两个复制按钮独立工作
- 粘贴到 Excel：10 条建议自动分行（无序号无列表符号）
- 粘贴到微信：summary 段紧凑一段

### 阶段 4 · T-Coin 扣费 + 落盘
**估时**：≈1h
**产出**：
- `src/lib/coin.ts`（扣费函数 `deductCoin`：先 lekao_gift_coin → 再 t_coin）
- API 路由集成：生成前先扣费 → 失败返回友好错误 → 成功落盘
- `lekao_class_summaries` / `lekao_class_feedbacks` 写入（Prisma）

**扣费规则**（PRD §5.2.2）：
```ts
// 先扣赠送 → 再扣充值
if (user.lekao_gift_coin > 0) {
  await prisma.user.update({
    where: { id: userId },
    data: { lekao_gift_coin: { decrement: 1 } }
  });
} else if (user.t_coin > 0) {
  await prisma.user.update({
    where: { id: userId },
    data: { t_coin: { decrement: 1 } }
  });
} else {
  throw new InsufficientCoinError();
}
```

**落盘字段**：
- summary 模板 → `lekao_class_summaries`（subject, topic, feedbackText=feedback, summaryText=summary, tCoinUsed=1, inputImages=url[]）
- feedback 模板 → `lekao_class_feedbacks`（同上 + description）

**验收**：
- 余额 5（lekao_gift_coin）→ 生成 5 次 → 第 6 次报余额不足
- 余额 0（lekao_gift_coin）+ 5（t_coin）→ 第 6 次扣 t_coin → 第 11 次报余额不足
- 生成成功后 PG 中能看到新行

**实施状态（2026-06-20 完成）**：
- ✅ `src/lib/coin.ts`：`deductCoin(userId)` 用 `prisma.$transaction` 原子扣费（先 gift → 再 paid），返回 `{success, source, newGift, newPaid}` 或 `{success:false, reason}`
- ✅ `src/lib/coin.ts`：`getCoinBalance(userId)` 查余额
- ✅ API 路由集成：参数校验后立即扣费 → 余额不足返 402 + 友好提示 → 不调 AI
- ✅ 流式响应包裹 `__META__` 含 `coinDeducted` 信息
- ✅ 流结束后调用 `parseSummaryOutput` 落盘 `lekao_classSummaries` / `lekaoClassFeedbacks`
- ✅ 落盘失败仅 console.error（用户已得到输出，不回滚扣费）
- ⏳ 客户端 402 处理已具备（throw → error 状态显示余额不足文案）

### 阶段 5 · Lighthouse + 真实讲义 E2E
**估时**：≈1.5h
**产出**：
- Lighthouse mobile 4-run avg 报告（per ≥ 80）
- E2E 测试报告（5 个学科真实样例：数学/物理/化学/英语/语文）
- `docs/E2E-summary-feedback.md`

**E2E 用例**：
| # | 学科 | 章节 | 模板 | 期望输出 |
|---|------|------|------|---------|
| 1 | 数学 | 平面向量 | 课堂小结 | 10 条围绕平面向量的建议 + 一段小结 |
| 2 | 物理 | 力学 · 受力分析 | 家长反馈 | 亲切语气反馈 + 一段总结 |
| 3 | 化学 | 氧化还原反应 | 课堂小结 | 围绕氧化还原的知识点 |
| 4 | 英语 | 完形填空 · 动词时态 | 家长反馈 | 英语学科建议 |
| 5 | 语文 | 文言文 · 虚词 | 课堂小结 | 文言文专题 |

---

## 🚫 不做（明确）

| 项 | 原因 |
|----|------|
| Markdown 在线编辑器 | 用户原话"没那么麻烦" |
| 模板自定义 UI | 先 2 套通用够用 |
| 批量并行生成 | 单次流程跑通后再做 |
| 微信 OAuth / 支付 | 阻塞：等公司主体 |
| 移动端 sprint | PRD §6.1.2 明示 Phase 2 单独 sprint |
| 高中知识板块图谱 | DeepSeek 训练数据自带，让它自己判断 |
| T-Coin 流水日志（lekao_coin_log） | 用现有 tCoinUsed 字段追踪够用，不加表 |

---

## ⚠️ 风险与依赖

| 风险 | 影响 | 应对 |
|------|------|------|
| Qwen3-VL-8B 读公式/几何图识别率低 | 视觉模型能力不足 | 备选升 32B-Instruct |
| DeepSeek V4 Flash 输出不符合 10 条结构 | prompt 调优 | 阶段 5 真实样例验证，迭代 prompt |
| 流式响应在 Next.js 16 App Router 兼容 | API 实现踩坑 | 用 `ReadableStream` + `Response.body` 流式 |
| 用户余额不足但已生成 | 扣费失败回滚 | 阶段 4 必须先扣费成功才生成（避免空跑） |
| 服务器 3.6GB OOM（AI 调用内存） | 进程崩溃 | 调用时 `--max-old-space-size=512` + 限并发 |
| **并发扣费 race（PG READ COMMITTED + read-then-write）** | 同一用户并发 5 个请求可能双扣到负数 | ✅ **已修**（阶段 4 hotfix）：改用 `updateMany` + `where lekao_gift_coin > 0` 原子条件 update，PG 保证不会双扣到负数 |
| **Stream 中途失败 lost-coin（已扣未交付）** | vision/stream 失败时 coin 已扣，用户没拿到内容 | 🟡 **已知未修**：需加 `lekao_coin_ledger` 三阶段表（pending → settled / refunded），生产部署前补，超出本阶段范围 |

---

## 📝 验收总标准

| 维度 | 标准 |
|------|------|
| **功能** | 上传图 → AI 读 → 学科/章节/知识点正确 → 生成 10 条 + 小结 → 复制粘贴干净 |
| **性能** | Lighthouse mobile 4-run avg perf ≥ 80 |
| **A11y** | Lighthouse a11y ≥ 95 |
| **代码** | TypeScript 无错误，ESLint 无 error |
| **部署** | `/api/lekao/summarize` 公网可调，密钥在 .env 不进 git |

---

## 🎯 Commit 节奏（用户 2026-06-20 偏好）

- **每个大阶段完成后 1 个 commit**（5 个 commit 对应阶段 1-5）
- 中间小动作（写 spec / 装 SDK / 配 .env）不 commit
- stage spec 与阶段 1 代码一起 commit（spec 是阶段 1 的产物）

---

## 📂 相关文件路径

```
docs/STAGE-summary-feedback.md     ← 本文件
src/lib/ai/
  ├── vision.ts                    ← 阶段 1：硅基流动 Qwen3-VL 封装
  ├── text.ts                      ← 阶段 1：DeepSeek V4 Flash 封装
  └── prompts.ts                   ← 阶段 1：视觉/文本 prompt 模板
src/lib/summary/
  └── parser.ts                    ← 阶段 3：按 "本次XX反馈/小结" 切分
src/lib/coin.ts                    ← 阶段 4：T-Coin 扣费封装
src/components/summary/
  ├── uploader.tsx                 ← 阶段 2：拖拽上传
  ├── template-tabs.tsx            ← 阶段 2：tab 切换
  ├── generate-button.tsx          ← 阶段 2：生成按钮
  ├── output-card.tsx              ← 阶段 3：输出展示
  └── split-copy-buttons.tsx       ← 阶段 3：分流复制
src/app/api/lekao/summarize/
  └── route.ts                     ← 阶段 1：API 路由
src/app/dashboard/summary/
  └── page.tsx                     ← 阶段 2：替换占位页
.env                               ← 不 commit（本地 + 服务器）
.env.example                       ← commit（标记密钥名）
```