import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// 与 tsconfig.json paths 对齐：@/* -> ./src/*
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
