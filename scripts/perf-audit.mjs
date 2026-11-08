#!/usr/bin/env node
/**
 * S03 T-306 脚手架 · 路由性能审计（perf:audit）
 *
 * 用 Playwright（系统 Edge，与 e2e 同渠道，不额外下载浏览器）对给定 URL 跑 N 次，
 * 汇总 LCP / DOMContentLoaded / load / CLS / 请求数 / 传输字节的**中位数**，
 * 供 T-306 的性能预算验收使用。
 *
 * 用法：
 *   node scripts/perf-audit.mjs --url http://127.0.0.1:3000/login --runs 3
 *   node scripts/perf-audit.mjs --url http://127.0.0.1:3000/ --mobile
 *
 * 说明：
 * - /dashboard/** 需要登录：未登录访问会 307 到 /login，脚本按**最终 URL**如实报告，
 *   不伪造登录态。
 * - 只输出聚合指标，不打印页面内容。
 */

import { chromium } from "@playwright/test";

function argOf(name, fallback) {
  const argv = process.argv;
  // 同时支持 --url=value 与 --url value 两种写法
  const inline = argv.find((a) => a.startsWith(`--${name}=`));
  if (inline) return inline.split("=").slice(1).join("=");
  const index = argv.indexOf(`--${name}`);
  if (index >= 0 && argv[index + 1] && !argv[index + 1].startsWith("--")) {
    return argv[index + 1];
  }
  return fallback;
}

const url = argOf("url", "http://127.0.0.1:3000/login");
const runs = Math.max(1, Number(argOf("runs", "3")));
const mobile = process.argv.includes("--mobile");
// 登录态测量：--state e2e/.auth/state.json（由 pnpm test:e2e 的 globalSetup 生成）
const statePath = argOf("state", null);

const INIT_SCRIPT = `
window.__lekaoPerf = { lcp: 0, cls: 0 };
new PerformanceObserver((list) => {
  const entries = list.getEntries();
  const last = entries[entries.length - 1];
  if (last) window.__lekaoPerf.lcp = last.startTime;
}).observe({ type: "largest-contentful-paint", buffered: true });
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (!entry.hadRecentInput) window.__lekaoPerf.cls += entry.value;
  }
}).observe({ type: "layout-shift", buffered: true });
`;

async function measureOnce(browser) {
  const contextOptions = mobile
    ? {
        viewport: { width: 390, height: 844 },
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        isMobile: true,
        hasTouch: true,
      }
    : { viewport: { width: 1440, height: 900 } };
  if (statePath) contextOptions.storageState = statePath;
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  await page.addInitScript(INIT_SCRIPT);

  const started = Date.now();
  const response = await page.goto(url, {
    waitUntil: "load",
    timeout: 60_000,
  });
  // 给 LCP/CLS 观察一点收敛时间
  await page.waitForTimeout(1500);

  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const resources = performance.getEntriesByType("resource") ?? [];
    return {
      lcp: Math.round(window.__lekaoPerf?.lcp ?? 0),
      cls: Number((window.__lekaoPerf?.cls ?? 0).toFixed(4)),
      domContentLoaded: Math.round(nav?.domContentLoadedEventEnd ?? 0),
      load: Math.round(nav?.loadEventEnd ?? 0),
      requests: resources.length + 1,
      transferredBytes: resources.reduce(
        (sum, entry) => sum + (entry.transferSize ?? 0),
        nav?.transferSize ?? 0,
      ),
    };
  });
  const finalUrl = page.url();
  await context.close();

  return {
    status: response?.status() ?? 0,
    finalUrl,
    wallClockMs: Date.now() - started,
    ...metrics,
  };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

console.log("== perf:audit ==");
console.log(
  `url: ${url}  runs: ${runs}  viewport: ${mobile ? "390x844 (mobile)" : "1440x900 (desktop)"}`,
);

const browser = await chromium.launch({ channel: "msedge", headless: true });
const samples = [];
try {
  for (let i = 0; i < runs; i++) {
    const sample = await measureOnce(browser);
    samples.push(sample);
    console.log(
      `#${i + 1} status=${sample.status} final=${sample.finalUrl} ` +
        `LCP=${sample.lcp}ms DCL=${sample.domContentLoaded}ms load=${sample.load}ms ` +
        `CLS=${sample.cls} req=${sample.requests} bytes=${(sample.transferredBytes / 1024).toFixed(0)}KB`,
    );
  }
} finally {
  await browser.close();
}

console.log("\n== 中位汇总 ==");
console.log(`LCP 中位: ${median(samples.map((s) => s.lcp))} ms`);
console.log(`DCL 中位: ${median(samples.map((s) => s.domContentLoaded))} ms`);
console.log(`load 中位: ${median(samples.map((s) => s.load))} ms`);
console.log(`CLS 中位: ${median(samples.map((s) => s.cls))}`);
console.log(`请求数中位: ${median(samples.map((s) => s.requests))}`);
console.log(
  `传输字节中位: ${(median(samples.map((s) => s.transferredBytes)) / 1024).toFixed(0)} KB`,
);
console.log(
  "\n注：/dashboard/** 未登录会 307 到 /login，以上按最终 URL 如实统计；T-306 预算验收请用登录态会话。",
);
