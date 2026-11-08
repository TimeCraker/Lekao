# 2026-08-29 · lib 纯函数单测验收报告

> Spec: `docs/2026-08-29-lib-unit-tests-spec.md` · 执行:Zcode(GLM-5.3-Flash)
> 性质:只加测试与 dev 依赖,不改业务代码。状态:**已完成,Stage 3 三级自验收全绿,待用户确认**

## §0 结论速览

- 新增 14 个测试文件 / **197 个用例,全部通过**(`pnpm test` exit 0)。
- `pnpm lint` 总量 92 problems(54 errors / 38 warnings)与基线**完全一致,零新增**;`pnpm build` exit 0,无需 tsconfig exclude。
- `src/` 业务文件 diff = **0**;运行时 `dependencies` 零变动(devDependencies 仅 +vitest ^4.1.11)。
- 发现疑似 bug 1 个(sensitive-words 带空格词表词失效,只记未修)、观察项 2 个。
- 共 8 个本地 commit(未 push,遵守 spec)。

## §1 Stage 0 盘点结果

### 已测清单(14 模块,按 spec 优先级)

| #   | 模块                                          | 用例数 | 内容                                                                                                                                              | 优先级依据                                |
| --- | --------------------------------------------- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 1   | `src/lib/checkin.ts`(纯函数部分)              |     17 | `AWARD_BY_DAY`/`CHECKIN_DAYS` 常量、`dayKeyOf`(Asia/Shanghai 自然日)、`calcStreakDay`(七日连签)、`computeCheckinState`(mock prisma + fake timers) | ⭐ T-Coin 签到发放计算核心                |
| 2   | `src/lib/templates.ts`                        |     23 | 常量表、`parseStyle`/`serializeStyle`/`validateTemplateInput`/`isPresetTemplateId`                                                                | 校验类,自定义模板核心                     |
| 3   | `src/lib/utils.ts`                            |      9 | `cn`、`formatBytes`(含 KB/MB 进位边界)                                                                                                            | 格式化类                                  |
| 4   | `src/lib/sensitive-words.ts`                  |     14 | 三个过滤/校验函数,含绕过防线与 bug 现状钉住                                                                                                       | 校验类,灵感墙防线                         |
| 5   | `src/lib/summary/parser.ts`                   |     12 | `parseSummaryOutput`(三模板形态)、`stripMarkdown`                                                                                                 | 解析类,AI 输出切分                        |
| 6   | `src/lib/mistake/weekend-types.ts`            |     17 | `classifyCellValue`/`shouldSkipAiFeedback`/`sortStudentsByCellValue`/`QUICK_FILL_OPTIONS`                                                         | 周末表运行时分类与排序                    |
| 7   | `src/lib/mistake/weekend-types-base.ts`       |      5 | `getQNumberLabels`、`WEEKEND_STUDENT_LIMIT` 等常量                                                                                                | 表头标签生成                              |
| 8   | `src/lib/mistake/weekend-headers.ts`          |     22 | `matchField`/`parseR2Headers`/`readCell`(反馈列优先级、降级布局)                                                                                  | 解析类,R2 表头动态识别                    |
| 9   | `src/lib/mistake/qnumber-dedup.ts`            |     11 | `naturalCompare`/`dedupQNumbers`/`getErrorCount`/`summarizeCollection`                                                                            | 错题号去重+排序                           |
| 10  | `src/lib/mistake/types.ts`(函数部分)          |      6 | `getImageIds`(v0/v2 兼容)、`hasImages`、`MAX_IMAGES_PER_SLOT`                                                                                     | 数据兼容逻辑                              |
| 11  | `src/lib/mistake/student-search.ts`           |      8 | `matchStudent`(中文+拼音首字母+降级)、`findFirstMatch`                                                                                            | 校验类;pinyin-pro 纯 JS                   |
| 12  | `src/lib/email-templates.ts`                  |      7 | `renderVerificationCodeEmail`(占位符/HTML 结构/兼容要求)                                                                                          | 格式化类;type-only import 不引 nodemailer |
| 13  | `src/lib/ai/prompts.ts`                       |     21 | 三个 prompt builder、`TEXT_PROMPT` 路由、字数 5 挡、style 注入                                                                                    | 格式化类,prompt 组装                      |
| 14  | `src/lib/mistake/excel-parser.ts`(纯函数部分) |     25 | `splitQNumbers`/`detectColumns`/`extractHeaderInfo`/`parseSheet`/`scanHeaders`/`listSheets`;XLSX.utils 纯 JS 构造 workbook,不碰 fs/File           | 解析类核心                                |

### 跳过清单(依赖设施,判据 = spec 铁律二)

| 模块                                                                                     | 跳过原因                                                                                      |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `src/lib/coin.ts`                                                                        | **三个导出函数全部内嵌 prisma 事务**,无可独立 import 的纯函数(见 §4);不为此重构(铁律二)       |
| `src/lib/prisma.ts` / `redis.ts` / `redis-online.ts`                                     | `@prisma/client` / `ioredis`                                                                  |
| `src/lib/auth.ts` / `verification.ts`                                                    | `next-auth` / bcrypt + prisma                                                                 |
| `src/lib/analytics.ts` / `cache-admin.ts` / `email.ts`                                   | prisma+redis / `next/cache` / nodemailer 真实发送                                             |
| `src/lib/image-compress.ts`                                                              | `browser-image-compression`(浏览器 canvas)                                                    |
| `src/lib/checkin.ts` 的 `computeCheckinState` DB 查询                                    | 本身依赖 prisma;其**状态计算逻辑**已用最小 mock 覆盖(见 #1)                                   |
| `src/lib/hooks/motion.ts`                                                                | React hooks(运行时状态)                                                                       |
| `src/lib/ai/text.ts` / `vision.ts` / `batch-feedback.ts`                                 | `openai` 客户端(网络);其 prompt 组装已由 #13 覆盖                                             |
| `src/lib/mistake/docx-generator.ts` / `weekend-exporter.ts`                              | docx+idb / exceljs+file-saver(浏览器下载)                                                     |
| `src/lib/mistake/fs-access.ts` / `history-io.ts` / `image-store.ts` / `section-store.ts` | 浏览器 FSA API / file-saver / IndexedDB                                                       |
| `src/lib/mistake/weekend-draft.ts`                                                       | localStorage(浏览器存储;node 守卫直接 return,无可测行为)                                      |
| `src/lib/mistake/weekend-parser.ts`                                                      | `hashFileContent`/`readWeekendWorkbook` 依赖 File API,主体已在浏览器侧;表头识别逻辑由 #8 覆盖 |
| `src/lib/storage/local-history.ts`                                                       | IndexedDB                                                                                     |
| `src/lib/checkin-types.ts`                                                               | 纯类型文件,无运行时行为                                                                       |

## §2 框架与配置(Stage 1)

- `pnpm add -D vitest` → **vitest 4.1.11**(devDependencies 唯一新增;`dependencies` 零变动)。
- `vitest.config.ts`:node 环境、include `src/lib/**/*.test.ts`、`resolve.alias { "@": <abs>/src }` 与 tsconfig `paths: { "@/*": ["./src/*"] }` 对齐。
- package.json scripts 新增 `"test": "vitest run"`,原四个 scripts(dev/build/start/lint)原样保留。
- commit:`fa7ce43 chore(test): 引入 vitest / introduce vitest`。

## §3 用例统计(Stage 2)

- **14 个测试文件 · 197 用例 · 0 失败 0 跳过**;分 6 批提交(见 git log `test(lib)` 前缀)。
- 风格:同目录 `*.test.ts`;`describe` 分组 + `it`/`it.each` 表驱动;断言外部可见行为(输入 → 输出),非实现细节。
- 设施隔离手段(测试侧,不改业务代码):`vi.mock("@/lib/prisma")`(checkin)、`vi.useFakeTimers + setSystemTime`(checkin/excel-parser 的日期逻辑)、`XLSX.utils` 内存构造 workbook(excel-parser)。
- 测试中发现两处最初预期与实现不符,均按**实现现状**修正断言并记录(见 §5),未放宽任何断言。

## §4 T-Coin 覆盖说明(spec §4 检查项)

- `coin.ts`(deductCoin / getCoinBalance / refundCoin)是 T-Coin 扣费核心,但纯逻辑(如 `initialized = gift !== -1`、`Math.max(0, gift)` 余额夹取)全部内嵌在 prisma 查询/事务函数体内,模块级无可拆纯函数 → 按铁律二跳过,**未重构**(spec §2 明示"不为此重构")。
- 签到发放(T-Coin 免费模式唯一发放口)的纯计算层已覆盖:`AWARD_BY_DAY`(D1=2…D7=8 递增)、`calcStreakDay`(满 7 重置/中断重置)、`dayKeyOf`(Asia/Shanghai 自然日切分,决定"今日已签"判定)、`computeCheckinState` 四分支状态机。
- 若未来要求覆盖 `coin.ts` 本身,属集成测试范畴(需真库或 prisma mock + 事务 mock),建议另立 Stage。

## §5 疑似 bug 清单(只记不修)

1. **`src/lib/sensitive-words.ts` 带空格的词表词永远无法命中**。实现先对输入 `toLowerCase().replace(/\s+/g, "")` 去掉全部空格再 `includes(词表词)`,但词表词 `"fuck you"` 自带空格 → `"fuck you"`、`"FUCK YOU"`、`"f u c k you"` 全部返回 false。文件头注释声称"Why 移除空格:防中间插空格绕过",设计意图与实现不一致;侮辱类英文词实际只剩 `"shit"` 生效。修复方向(供决策):词表词同步去空格,或词表该词条改为无空格形式。测试已钉住现状行为(`sensitive-words.test.ts` 中标注 ⚠️ 的用例),修复后需同步更新。

**观察项(非 bug,仅记录)**

- `src/lib/mistake/qnumber-dedup.ts` `dedupQNumbers` 的副排序(`errorCount` 倒序)仅在 `naturalCompare === 0` 时触发,而 Map 去重保证每个题号只出现一条,该分支实际不可达;排序结果恒等于纯自然序。
- `dedupQNumbers` 计数语义 = 题号**出现次数**而非学生数:同一学生重复列出同题会重复计数。上游 `parseSheet` 每生每题只产一条,正常数据下二者等价;若未来其他入口复用该函数需注意输入契约。
- `parseSheet` 的 `isAllCorrect` 只认"两列全空";单元格显式填「全对」的学生 `isAllCorrect` 为 false(该词作为题号槽保留)。当前数据流靠 `dedupQNumbers` 过滤「全对」保持题号统计正确,但语义上与 `types.ts` 注释"两列都'全对'或空"存在偏差,下游若新依赖 `isAllCorrect` 需先对齐语义。

## §6 三级自验收记录(Stage 3)

| 级别 | 检查项        | 结果                                                                                                                                                                                          |
| ---- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1   | `pnpm test`   | ✅ exit 0,197/197 passed                                                                                                                                                                      |
| L1   | `pnpm lint`   | ✅ 92 problems(54 errors / 38 warnings),与基线完全一致、零新增;14 个测试文件 + vitest.config.ts 单独 eslint 通过(存量问题集中在 `scripts/archive/` 与 `src/app/`,见 §1 基线说明)              |
| L1   | `pnpm build`  | ✅ exit 0,构建不因 `*.test.ts` 报错,**无需** tsconfig exclude                                                                                                                                 |
| L2   | 业务 src diff | ✅ `git diff 3966ac5..HEAD -- src/` 仅 14 个 `*.test.ts` 新增(+1527 行);排除 test 后业务文件改动数 = 0                                                                                        |
| L2   | 运行时依赖    | ✅ `dependencies` 零变动;package.json diff 仅 scripts + test、devDependencies + vitest                                                                                                        |
| L2   | 抽读 3 个测试 | ✅ `checkin.test.ts`(UTC 16:00 翻日/满 7 重置/四分支状态机)、`sensitive-words.test.ts`(bug 现状钉住)、`weekend-headers.test.ts`(「课后作业反馈」优先级防误识)——均为真行为断言,无恒真/放水断言 |
| L3   | 报告成文      | ✅ 本文件                                                                                                                                                                                     |

## §7 复跑命令

```
pnpm test        # vitest run,197 用例
pnpm lint        # 存量 92 problems(零新增即为绿口径)
pnpm build       # 生产构建
```
