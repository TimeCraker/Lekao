# Lekao Web · V1.0.0 (Android release) Lighthouse mobile baseline

> 采集时间：2026-06-27
> 采集人：Claude（自动化）
> 目的：Android V1.0.0 release 时的 web 端性能基线（API 服务性能 + 前端首屏性能）

---

## 跑分环境

- **目标 URL**：`https://lekao.asterforge.top`（首次登录页 + 自动跳转 Dashboard）
- **Lighthouse 版本**：v12.x（Windows npm global）
- **Chrome**：`/c/Program Files/Google/Chrome/Application/chrome.exe`（系统已装）
- **模拟网络**：4G throttling（simulate）
- **模拟 CPU**：4x slowdown（mobile 默认）
- **缓存**：每次 cache bust `?v=<unix_ts><run_no>`
- **temp dir**：`/tmp/lh-tmp`（绕开 Windows EPERM）

## 4-run avg 数据

| Run | Perf | LCP | TBT | CLS | FCP | SI |
|-----|------|-----|-----|-----|-----|-----|
| 1   | 90   | 3.6s | 70ms | 0 | 1.0s | 1.6s |
| 2   | 87   | 3.9s | 80ms | 0 | 1.0s | 3.2s |
| 3   | 90   | 3.7s | 60ms | 0 | 1.0s | 1.8s |
| 4   | 90   | 3.7s | 50ms | 0 | 1.0s | 1.7s |
| **avg** | **89.25** | **3.73s** | **65ms** | **0** | **1.0s** | **2.08s** |

A11y / Best Practices / SEO（run 1 取样）：**100 / 100 / 100**

## 关键判断

| 指标 | 实测 | Web Vitals 阈值 | 评估 |
|------|------|---------------|------|
| **Perf** | 89.25 | ≥ 90 是 "好" | ⚠️ 边缘（波动 87-90，平均差 0.75 分）|
| **LCP** | 3.73s | ≤ 2.5s | ❌ 超 1.23s（主因：登录页跳转 Dashboard + 灵感墙 mockup 图片）|
| **TBT** | 65ms | ≤ 200ms | ✅ 健康 |
| **CLS** | 0 | ≤ 0.1 | ✅ 完美 |
| **FCP** | 1.0s | ≤ 1.8s | ✅ 健康 |
| **SI** | 2.08s | ≤ 3.4s | ✅ 健康 |
| **A11y** | 100 | — | ✅ 完美 |
| **BP** | 100 | — | ✅ 完美 |
| **SEO** | 100 | — | ✅ 完美 |

## 决策

- ✅ **Android V1.0.0 release 不阻塞**（API 性能正常，CLS/TBT/FCP/SI 都过）
- ⚠️ **LCP 是唯一弱项**（3.73s vs 2.5s），但不影响 Android 端体验（Android 不走 web 首屏，只走 API）
- 📝 **后续优化**（V1.1.0+，非阻塞）：
  1. 灵感墙 mockup 图片懒加载 + LCP candidate 替换为本地 SVG 占位
  2. 登录页 redirect Dashboard 改为 SPA 客户端跳转（避免 200 跳转 3xx 再 200）
  3. 把 LCP 元素的 fetchpriority="high" 显式标注

## 数据诚实声明

- 4-run avg 波动：Perf 87↔90（差 3 分），SI 1.6s↔3.2s（差 1.6s）— 符合 lighthouse 偶发波动特征
- Run 2 的 SI 抽到 3.2s 是单次极端值，4-run avg 2.08s 更具代表性
- 报告不含 4-run avg 退步（baseline 是 V1.0.0 首次 release，无对照）

---

**维护者**：Claude
**关联**：[Android V1.0.0 release notes](../release-notes.md) | [Architecture](architecture.md)
