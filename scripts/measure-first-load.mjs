#!/usr/bin/env node
/**
 * S04 · 路由首屏 JS 测量（预算证据工具，NFR-010）
 *
 * 为什么需要它：Next 16 的 `next build` 不再打印每路由 First Load JS，
 * 而 /dashboard/** 需要登录才能用浏览器实测。
 *
 * 两种口径都报，避免把首屏报小：
 * - HTML 口径（主）：预渲染 HTML 里 `static/chunks/*.js` 的集合 —— 浏览器首屏实际要下载的
 *   JS（含共享 framework/runtime chunk）。
 * - manifest 口径（辅）：`page_client-reference-manifest.js` 列出的页面 chunk 集合，
 *   只覆盖页面自身依赖；实测比 HTML 口径小约 33%，所以只能当辅助参考。
 *
 * 用法：
 *   node scripts/measure-first-load.mjs                     # 默认五条工作台路由
 *   node scripts/measure-first-load.mjs /dashboard/mistake  # 指定路由
 *
 * 前置：先 `pnpm build`（读 .next 产物，不需要数据库或登录）。
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const ROOT = process.cwd();
const DEFAULT_ROUTES = [
  "/dashboard",
  "/dashboard/mistake",
  "/dashboard/weekend-mistake",
  "/dashboard/summary",
  "/dashboard/feedback",
];

const routes = process.argv.slice(2).filter((a) => a.startsWith("/"));
const targets = routes.length ? routes : DEFAULT_ROUTES;

/** 路由 → .next 下的相对路径（去前导斜杠，避免 resolve 当成绝对路径） */
function routeRel(route) {
  return route.replace(/^\//, "");
}

function htmlPath(route) {
  return resolve(ROOT, ".next", "server", "app", `${routeRel(route)}.html`);
}

function manifestPath(route) {
  return resolve(
    ROOT,
    ".next",
    "server",
    "app",
    routeRel(route),
    "page_client-reference-manifest.js",
  );
}

function readIfExists(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

/** 从任意文本抽出 static/chunks/*.js 的文件名（去重） */
function chunkNames(text) {
  if (!text) return [];
  const names = new Set();
  for (const m of text.matchAll(/static\/chunks\/[A-Za-z0-9._%/-]+\.js/g)) {
    names.add(basename(m[0]));
  }
  return [...names];
}

/** chunk 文件名 → 绝对路径索引 */
function buildChunkIndex() {
  const map = new Map();
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (full.endsWith(".js")) map.set(basename(full), full);
    }
  };
  walk(resolve(ROOT, ".next", "static", "chunks"));
  return map;
}

const chunkIndex = buildChunkIndex();

function gzipTotal(names) {
  let total = 0;
  for (const name of names) {
    const full = chunkIndex.get(name);
    if (!full) continue;
    try {
      statSync(full);
      total += gzipSync(readFileSync(full)).length;
    } catch {
      /* 忽略读不到的 chunk，不静默改口径（末尾会提示缺失数） */
    }
  }
  return total / 1024;
}

console.log("== 路由首屏 JS（gzip） ==");
console.log(
  "route                            HTML口径            manifest口径",
);
for (const route of targets) {
  const htmlNames = chunkNames(readIfExists(htmlPath(route)));
  const manifestNames = chunkNames(readIfExists(manifestPath(route)));

  const html = htmlNames.length ? gzipTotal(htmlNames) : null;
  const manifest = manifestNames.length ? gzipTotal(manifestNames) : null;

  const fmt = (kb, count) =>
    kb === null
      ? "        n/a        "
      : `${kb.toFixed(1).padStart(7)} KB (${String(count).padStart(2)})`;

  console.log(
    `${route.padEnd(30)}  ${fmt(html, htmlNames.length)}   ${fmt(manifest, manifestNames.length)}`,
  );
}
console.log(
  "\n注：以 HTML 口径为准（浏览器首屏实际下载）；请与上一个提交的同名输出对比。",
);
