/**
 * S01 T-006 · 产品版本真值
 *
 * 构建期由 next.config.ts 从 package.json 注入 `NEXT_PUBLIC_APP_VERSION`；
 * 页面与组件禁止手写版本号（由 src/lib/version.test.ts 的源码扫描断言锁定）。
 * 注：history-mgmt 的 HISTORY_JSON_VERSION 是「本地数据结构版本」，与产品版本无关。
 */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "unknown";
