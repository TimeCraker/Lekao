---
id: UX-LEKAO-ROUTE-MATRIX
title: LeKao 路由、状态与体验验收矩阵
kind: ux-spec
version: 2
status: READY
baseline_sha: 4a5780e92215fbe01db87b5e1827465135253efa
related: PRD-LEKAO-FOUNDATION-V3, DESIGN-LEKAO-EDITORIAL-INTELLIGENCE, S04-OFFICE-FREE-DELIVERY
handoff_ref: ../handoffs/S03-advanced-experience.md
observed_handoff_revision: 3
---

# LeKao 路由、状态与体验验收矩阵

## 1. 全局任务模型

所有教学流程统一为：`导入 → 校对 → 生成 → 交付`。不适用 AI 的流程仍保留“生成”，但语义为本地文档生成，不得显示扣币状态。

全局状态：`empty | editing | saving | ready | processing | success | recoverable-error | blocking-error`。离开页面前若有未持久化内容必须提示；错误不得清空已录入数据。

交付步契约（S04）：`交付 = 真实预览 → 就地编辑 → 下载 / 打印 / 另存 PDF / 批量`。预览必须渲染真实产物（与导出件同源），编辑只改源模型再经既有生成器重导出；交付全过程不得出现携带产物的网络请求。交付步状态额外要求 `preview-loading | preview-ready | preview-failed | printing | delivered`，且 `preview-failed` 必须给出非空白摘要与重试。

## 2. 路由矩阵

| 路由                         | 首要用户目标         | 主动作         | 必需状态                                   | Mobile 要求                |
| ---------------------------- | -------------------- | -------------- | ------------------------------------------ | -------------------------- |
| `/`                          | 判断产品是否适合自己 | 免费创建工作台 | session unknown、capability unavailable    | 主 CTA 首屏可见            |
| `/login`                     | 回到已有工作         | 登录           | password/code、sending、error              | 320px 无溢出               |
| `/register`                  | 创建账户             | 创建账号       | code cooldown、validation、partial success | 验证码区可纵向             |
| `/dashboard`                 | 继续或新建任务       | 继续最近工作   | empty/recent/pending                       | 任务优先于资产             |
| `/dashboard/mistake`         | 生成 Word 错题集     | 导入学生表     | parsing/mapping/images/preview/export      | 单步全屏，不缩表           |
| `/dashboard/weekend-mistake` | 生成周末反馈表       | 导入周末表     | sheets/editing/AI/preview/export           | 学生卡逐条编辑             |
| `/dashboard/summary`         | 生成课堂小结         | 导入讲义       | cost preview/processing/retry/result/sink  | sticky 主动作              |
| `/dashboard/feedback`        | 批量生成反馈         | 导入讲义/表格  | sheet progress/partial failure/result/sink | 进度与失败学生可定位       |
| `/dashboard/history*`        | 找回和继续工作       | 打开任务       | empty/loading/corrupt/local-only           | 筛选可折叠                 |
| `/dashboard/profile`         | 查看账户与资产       | 保存资料       | dirty/saving/success/error                 | 不显示伪充值入口           |
| `/dashboard/ideas`           | 提交和追踪建议       | 提交建议       | empty/loading/error/moderation status      | 输入不因关闭丢失           |
| `/admin/**`                  | 管理产品运行         | 依页面而定     | loading/empty/error/permission             | 非核心移动优化，仍不得溢出 |

## 3. Dashboard 信息优先级

1. 继续最近工作：最多 3 项，展示名称、流程、保存状态、更新时间、下一动作。
2. 新建教学任务：四项能力，描述输入、输出、费用。
3. 待处理：同步失败、未完成导出、批量部分失败。
4. T-Coin 与签到：辅助区，不占最大面积。
5. 灵感与帮助：低频入口。

## 4. 关键边界用例

- 新用户、无历史、0 T-Coin、未初始化赠币。
- 40 字用户名、极长文件名、30 个 Sheet、100 名学生、缺列 Excel。
- IndexedDB/localStorage 不可用、空间不足、导入包损坏、图片缺失。
- AI timeout、部分批量失败、用户取消、重复提交、网络恢复。
- 320px 宽度、200% zoom、键盘、reduced motion、粗指针设备。
- 交付边界：40 人批量渲染内存与耗时、40 人批量打印分页、目标表无反馈列/重名/缺行、超长反馈文本换行、模板合并单元格冲突、移动端无 File System Access、打印被取消、渲染器动态加载失败。

## 5. 体验指标

- 新用户 10 秒内能复述：适用人群、输入、输出、费用边界。
- 任一 dashboard 路由最多两次操作到达四项核心能力、历史、个人中心。
- 从打开 dashboard 到继续最近工作最多一次主点击。
- 所有成功态能指向持久化对象、导出文件或结算记录。
- 所有 recoverable error 至少提供一个当前可执行动作。

## 6. 验证矩阵

| 门禁     | 方法                                             | 通过标准                                         |
| -------- | ------------------------------------------------ | ------------------------------------------------ |
| 响应式   | Playwright 320/390/768/1440 截图 + overflow 断言 | 无非预期横向滚动                                 |
| 可访问性 | axe + 键盘脚本 + 200% zoom                       | 0 serious/critical，主路径完成                   |
| 内容     | capability/copy 静态测试                         | 禁词与漂移为 0                                   |
| 状态     | unit/component/E2E                               | 每条核心流程覆盖 empty/loading/error/success     |
| 视觉     | hash-bound baselines + 人工 review               | 无意外差异；四项评分均 ≥4/5                      |
| 性能     | 生产构建移动 3 runs                              | LCP ≤2.5s、CLS ≤0.1、TBT ≤200ms、Performance ≥90 |
| 交付     | 真实浏览器预览/编辑/打印走查 + Network 面板      | 预览=导出件；A4 无溢出；无携带产物的网络请求     |
