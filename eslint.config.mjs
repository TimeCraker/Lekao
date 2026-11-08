import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // scripts/archive 为一次性调试脚本归档（CLAUDE.md：不参与构建、无代码依赖），
    // tsconfig 已排除；.cjs 使用 require 是其合法形态，移出 lint 范围。
    "scripts/archive/**",
  ]),
]);

export default eslintConfig;
