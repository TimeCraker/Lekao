import { readFileSync } from "node:fs";
import type { NextConfig } from "next";

// S01 T-006：产品版本单一真值来自 package.json，构建期注入 NEXT_PUBLIC_APP_VERSION。
// 页面/组件只允许消费 src/lib/version.ts 的 APP_VERSION，禁止手写版本号。
const pkg = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as { version: string };

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  // ⭐ 2026-07-17 性能优化（纯架构层，不降特效/不改功能）
  // - optimizePackageImports: motion 库按需 tree-shake，减首屏 JS（打 TBT 300ms）
  // - removeConsole: 生产移除 console.log/info/debug/warn（保留 error），减 JS + 防 leak
  experimental: {
    optimizePackageImports: ["motion"],
  },
  compiler: {
    removeConsole: { exclude: ["error"] },
  },
};

export default nextConfig;
