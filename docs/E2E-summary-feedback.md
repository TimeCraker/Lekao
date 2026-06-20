# E2E 报告 · 课堂小结 / 课堂反馈（Phase 2 · T26-T35）

> **生成时间**：2026-06-20
> **页面**：`/dashboard/summary` + `/api/lekao/summarize`
> **测试维度**：Lighthouse mobile（本地 + 生产）+ 5 学科真实讲义 + 扣费/落盘 路径 E2E

---

## 1. Lighthouse Mobile · 4-Run Avg（阶段 5 验收）

### 1.1 本地（:3000）跑分结果

| Run | Performance | A11y | Best Practices | SEO | LCP | TBT | CLS |
|-----|-------------|------|----------------|-----|-----|-----|-----|
| 1   | 99          | 100  | 100            | 100 | 1.8s | 90ms | 0 |
| 2   | 99          | 100  | 100            | 100 | 1.8s | 80ms | 0 |
| 3   | 99          | 100  | 100            | 100 | 1.8s | 80ms | 0 |
| 4   | 99          | 100  | 100            | 100 | 1.8s | 70ms | 0 |
| **Avg** | **99** | **100** | **100** | **100** | **1.8s** | **80ms** | **0** |

### 1.2 生产（https://lekao.asterforge.top）跑分结果

| Run | Performance | A11y | Best Practices | SEO | LCP | TBT | CLS |
|-----|-------------|------|----------------|-----|-----|-----|-----|
| 1   | 99          | 100  | 100            | 100 | 2.0s | 40ms | 0 |
| 2   | 100         | 100  | 100            | 100 | 1.5s | 40ms | 0 |
| 3   | 99          | 100  | 100            | 100 | 2.0s | 40ms | 0 |
| 4   | 100         | 100  | 100            | 100 | 1.7s | 40ms | 0 |
| **Avg** | **99.5** | **100** | **100** | **100** | **1.8s** | **40ms** | **0** |

生产 TBT 40ms（比本地 80ms 更低）— nginx 公网响应比 next start 直连快。

### 1.3 重构后（2026-06-20 · commit `9f7484f`）跑分验证

UI 重构（拆独立入口 + 改名"家长反馈"→"堂测反馈"）后单次跑分验证：

| 页面 | Performance | A11y | Best Practices | SEO | LCP | TBT | CLS |
|------|-------------|------|----------------|-----|-----|-----|-----|
| /dashboard/summary | 99 | 100 | 100 | 100 | 2.0s | 30ms | 0 |
| /dashboard/feedback | 100 | 100 | 100 | 100 | 1.7s | 50ms | 0 |

重构无任何性能回退，A11y 维持 100。

### 1.2 spec 对照

| 指标 | 阈值 (mobile) | 4-run avg | 状态 |
|------|--------------|-----------|------|
| **Performance** | ≥ 80 | 99 | ✅ +19 |
| **A11y** | ≥ 95 | 100 | ✅ +5 |
| **Best Practices** | ≥ 90 | 100 | ✅ +10 |
| **SEO** | ≥ 90 | 100 | ✅ +10 |
| **LCP** | < 2.5s | 1.8s | ✅ |
| **TBT** | < 200ms | 80ms | ✅ |
| **CLS** | < 0.1 | 0 | ✅ |

### 1.3 A11y hotfix 历程

| 版本 | A11y | 失败 audit | 原因 |
|------|------|-----------|------|
| v0.1 (阶段 4 commit) | 96 | color-contrast 4 项 | login 页面 `text-accent` (blue-500 #3b82f6) 3.67:1 + `text-ink-subtle` (#94a3b8) 2.47:1 不达 AA |
| v0.2 (本阶段 hotfix) | 100 | 0 | `text-accent` → `text-accent-text` (#1d4ed8 / blue-700 / 5.21:1) + `text-ink-subtle` → `text-ink-muted` (#475569 / slate-600) |

按 `feedback_wcag_aa_token_matrix_pattern`：柔和 brand color 不达标 → 加 `--xxx-text` token（深一档）专供文字使用。

### 1.4 跑分命令（可复现）

```bash
# 1. 杀 stale Chrome（绕开 Windows EPERM 坑）
powershell.exe -NoProfile -Command "Get-Process chrome,chromium -ErrorAction SilentlyContinue | Stop-Process -Force"
sleep 5
powershell.exe -NoProfile -Command "Get-ChildItem -Path 'C:\Users\TimeCraker\AppData\Local\Temp\' -Filter 'lighthouse*' -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue"

# 2. 跑分（用 TMPDIR + max-wait-for-load 防 EPERM 误报）
TMPDIR=/tmp/lh-tmp TMP=/tmp/lh-tmp lighthouse http://localhost:3000/dashboard/summary \
  --form-factor=mobile --throttling-method=simulate \
  --output=json --output-path=/tmp/lh-tmp/v3-run1.json \
  --chrome-flags="--headless --no-sandbox --disable-gpu --disable-dev-shm-usage" \
  --max-wait-for-load=30000 --quiet

# 3. 解析
WIN_JSON=$(cygpath -w /tmp/lh-tmp/v3-run1.json)
node -e "const j = JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));
const c = j.categories; const a = j.audits;
console.log('Perf:', c.performance.score*100, '| A11y:', c.accessibility.score*100,
  '| BP:', c['best-practices'].score*100, '| SEO:', c.seo.score*100,
  '| LCP:', a['largest-contentful-paint'].displayValue,
  '| TBT:', a['total-blocking-time'].displayValue,
  '| CLS:', a['cumulative-layout-shift'].displayValue);" "$WIN_JSON"
```

---

## 2. 5 学科真实讲义 E2E（待用户真实使用后填）

### 2.1 测试方法

每条用例需准备：
1. 1 张真实讲义截图（手机拍/扫描，黑板/PPT 均可）
2. 选定 1 个模板（小结 / 反馈）
3. 上传到 `/dashboard/summary` → 观察输出
4. 复制到 Excel / 微信群 → 验证排版

### 2.2 5 学科用例矩阵

| # | 学科 | 章节 | 模板 | 视觉识别期望 | 文本生成期望 | 用户验证 |
|---|------|------|------|-------------|-------------|---------|
| 1 | 数学 | 平面向量（数量积/夹角） | 课堂小结 | subject=数学, topic=平面向量, keyPoints=[数量积,夹角,投影...] | 10 条围绕平面向量学习建议 + 一段小结 | ☐ |
| 2 | 物理 | 力学·受力分析（牛顿第三定律） | 家长反馈 | subject=物理, topic=受力分析, keyPoints=[作用力反作用力,平衡力...] | 10 条家长视角的反馈 + 亲切语气总结 | ☐ |
| 3 | 化学 | 氧化还原反应（电子转移） | 课堂小结 | subject=化学, topic=氧化还原, keyPoints=[化合价升降,电子转移,氧化剂...] | 10 条围绕氧化还原反应 + 化合价记忆 | ☐ |
| 4 | 英语 | 完形填空·动词时态 | 家长反馈 | subject=英语, topic=完形填空, keyPoints=[时态,动词,语境...] | 10 条英语学科建议（家长群语气） | ☐ |
| 5 | 语文 | 文言文·虚词（之/乎/者/也） | 课堂小结 | subject=语文, topic=文言文虚词, keyPoints=[之,乎,者,也,语境...] | 10 条文言文虚词学习 + 文言文阅读 | ☐ |

### 2.3 评估维度（每条用例按这 6 项打分）

| 维度 | 5 分标准 |
|------|---------|
| 学科判断正确 | subject 在 9 学科 allowlist 内（数学/物理/化学/生物/英语/语文/地理/历史/政治） |
| 章节判断合理 | topic 跟用户预期章节一致（不一定字面相同，方向对即可） |
| 知识点提取 | keyPoints 3-10 个 + 跟讲义内容相关 |
| 建议质量 | feedback 段 10 条具体可执行（不空泛/不堆砌） |
| 小结质量 | summary 段紧凑一段 + 语气对（小结=老师向，feedback=家长向） |
| 复制体验 | 贴 Excel = 10 条分行 + 贴微信 = 紧凑段 + 无 Markdown 符号 |

---

## 3. API 路径 E2E（curl 调用）

### 3.1 准备：构造测试图片 base64

```bash
# 用任意小图（PNG/JPG），最小 1x1 像素即可测试 API 路径
# 视觉模型会读出空内容但 API 不会崩
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" > /tmp/test-1x1.png.b64

# 构造 data URL
DATA_URL="data:image/png;base64,$(cat /tmp/test-1x1.png.b64)"
```

### 3.2 用例 A：登录 + 扣费 + 视觉 + 文本生成 + 落盘

```bash
# 1. 拿 session cookie（用测试账号）
curl -c /tmp/cookies.txt -X POST http://localhost:3000/api/auth/callback/credentials \
  -d "email=test@example.com&password=Test1234&csrfToken=$(curl -s http://localhost:3000/api/auth/csrf | jq -r .csrfToken)"

# 2. 检查余额
curl -b /tmp/cookies.txt http://localhost:3000/api/auth/session

# 3. 调 API（流式）
curl -b /tmp/cookies.txt -N -X POST http://localhost:3000/api/lekao/summarize \
  -H "Content-Type: application/json" \
  -d "{\"images\":[\"$DATA_URL\"],\"template\":\"summary\"}" 2>&1 | head -20
```

**期望输出**：
```
__META__{"subject":"...","topic":"...","keyPoints":[...],"coinDeducted":{...}}

本次XX课堂反馈（XX专题）
1. ...
2. ...
...

本次XX课堂总体小结
[一段小结文字]
```

### 3.3 用例 B：余额不足 → 402

```bash
# 1. 把 user 的 t_coin 和 lekao_gift_coin 设为 0
psql -h localhost -U postgres -d resumeaix -c "UPDATE users SET lekao_gift_coin=0, t_coin=0 WHERE email='test@example.com'"

# 2. 调 API
curl -b /tmp/cookies.txt -X POST http://localhost:3000/api/lekao/summarize \
  -H "Content-Type: application/json" \
  -d "{\"images\":[\"$DATA_URL\"],\"template\":\"summary\"}" -w "\nHTTP %{http_code}\n"
```

**期望输出**：
```
{"error":"T-Coin 余额不足，请充值后再试","correlationId":"lekao-..."}
HTTP 402
```

### 3.4 用例 C：扣费优先级（gift → paid）

```bash
# 1. 设置 gift=2, paid=3
psql -h localhost -U postgres -d resumeaix -c "UPDATE users SET lekao_gift_coin=2, t_coin=3 WHERE email='test@example.com'"

# 2. 连调 3 次 API，每次观察 coinDeducted.source
for i in 1 2 3 4 5 6; do
  echo "=== Call $i ==="
  curl -b /tmp/cookies.txt -N -X POST http://localhost:3000/api/lekao/summarize \
    -H "Content-Type: application/json" \
    -d "{\"images\":[\"$DATA_URL\"],\"template\":\"summary\"}" 2>&1 | head -1
done
```

**期望**：
- Call 1-2: source=gift, newGift 递减 1→0
- Call 3-5: source=paid, newPaid 递减 3→0
- Call 6: HTTP 402（余额耗尽）

### 3.5 用例 D：落盘验证

```bash
# 调用后查 PG
psql -h localhost -U postgres -d resumeaix -c "
SELECT id, subject, topic, t_coin_used, created_at
FROM lekao_class_summaries
WHERE user_id = (SELECT id FROM users WHERE email='test@example.com')
ORDER BY created_at DESC LIMIT 5;"

psql -h localhost -U postgres -d resumeaix -c "
SELECT id, subject, topic, t_coin_used, created_at
FROM lekao_class_feedbacks
WHERE user_id = (SELECT id FROM users WHERE email='test@example.com')
ORDER BY created_at DESC LIMIT 5;"
```

**期望**：每次成功调用都新增 1 行，subject/topic/feedbackText/summaryText 都不为空。

### 3.6 用例 E：并发扣费无 race

```bash
# 设置 gift=1
psql -h localhost -U postgres -d resumeaix -c "UPDATE users SET lekao_gift_coin=1, t_coin=10 WHERE email='test@example.com'"

# 5 个并发请求
for i in 1 2 3 4 5; do
  curl -b /tmp/cookies.txt -X POST http://localhost:3000/api/lekao/summarize \
    -H "Content-Type: application/json" \
    -d "{\"images\":[\"$DATA_URL\"],\"template\":\"summary\"}" -w "Call $i: HTTP %{http_code}\n" -o /tmp/concurrent-$i.txt &
done
wait

# 查最终余额
psql -h localhost -U postgres -d resumeaix -c "SELECT lekao_gift_coin, t_coin FROM users WHERE email='test@example.com'"
```

**期望**：5 个请求全部 HTTP 200（不报 402），最终 `lekao_gift_coin=0, t_coin=10`（1 次 gift 成功，0 次 t_coin 扣，无 race 双扣）。

---

## 4. 验收总览

| 维度 | 状态 | 详情 |
|------|------|------|
| **Lighthouse mobile 4-run avg** | ✅ 通过 | Perf 99 / A11y 100 / BP 100 / SEO 100（超阈值） |
| **A11y hotfix** | ✅ 已修 | login 页面 color-contrast 4 项 → 0 项 |
| **API 路径** | ✅ 设计完整 | 扣费 + 视觉 + 文本 + 落盘 5 用例 |
| **真实讲义 5 学科** | ⏳ 待用户跑 | 表格已就绪，需真实讲义图片 |
| **扣费无 race** | ✅ 已修（阶段 4 hotfix） | `updateMany` + `where > 0` 原子条件 update |

---

## 5. 已知未修（已记入 stage spec 风险表）

| 风险 | 影响 | 解决 |
|------|------|------|
| Stream 中途失败 lost-coin | vision/stream 失败时 coin 已扣用户没拿到内容 | 需加 `lekao_coin_ledger` 三阶段表（pending → settled / refunded），生产部署前补，超出本阶段 |

**判断**：本阶段（Phase 2 上线）属于"功能冻结"前的最后冲刺，已知风险已记录到 `docs/STAGE-summary-feedback.md` 风险表，下一阶段（T-Coin 充值 + admin 后台）一并解决。
