/**
 * fs-access.ts sanitizeFsName 单元测试
 * Round 2026-06-20
 */

import { sanitizeFsName } from "../src/lib/mistake/fs-access.ts";

const cases = [
  // [input, expected, description]
  ["化学", "化学", "纯中文（合法）"],
  ["物理", "物理", "纯中文"],
  ["math", "math", "纯英文"],
  ["化学 / 物理", "化学 _ 物理", "含 / 替换为 _"],
  ["数学·冲刺班", "数学·冲刺班", "中文·合法保留"],
  ["test/name", "test_name", "英文 /"],
  ["test\\name", "test_name", "英文 \\"],
  ["test:name", "test_name", "英文 :"],
  ["test*name", "test_name", "英文 *"],
  ["test?name", "test_name", "英文 ?"],
  ["test\"name", "test_name", "英文 双引号"],
  ["test<name>", "test_name_", "英文 < >"],
  ["test|name", "test_name", "英文 |"],
  ["  化学  ", "化学", "首尾空格去"],
  ["化学.", "化学", "末尾点去"],
  ["化学 ", "化学", "末尾空格去"],
  ["化学​物理", "化学_物理", "U+200B 零宽 → _"],
  ["化学﻿物理", "化学_物理", "U+FEFF BOM → _"],
  ["化学‏物理", "化学_物理", "U+200F RTL → _"],
  ["a".repeat(120), "a".repeat(100), "截断到 100"],
];

let passed = 0;
let failed = 0;

for (const [input, expected, desc] of cases) {
  try {
    const actual = sanitizeFsName(input);
    if (actual === expected) {
      console.log(`✅ ${desc}: ${JSON.stringify(input)} → ${JSON.stringify(actual)}`);
      passed++;
    } else {
      console.log(
        `❌ ${desc}: ${JSON.stringify(input)} → ${JSON.stringify(actual)} (expected ${JSON.stringify(expected)})`,
      );
      failed++;
    }
  } catch (e) {
    console.log(`💥 ${desc}: ${JSON.stringify(input)} threw ${e.message}`);
    failed++;
  }
}

// 异常情况
const errorCases = [
  ["", "empty string"],
  ["   ", "only whitespace"],
  [null, "null"],
  [undefined, "undefined"],
];

for (const [input, desc] of errorCases) {
  try {
    sanitizeFsName(input);
    console.log(`❌ ${desc}: should have thrown but didn't`);
    failed++;
  } catch (e) {
    console.log(`✅ ${desc}: throws "${e.message}"`);
    passed++;
  }
}

// "." 和 ".." 兜底测试
try {
  console.log(`✅ ".": ${JSON.stringify(sanitizeFsName("."))}`);
  passed++;
} catch (e) {
  console.log(`❌ ".": threw ${e.message}`);
  failed++;
}

try {
  console.log(`✅ "..": ${JSON.stringify(sanitizeFsName(".."))}`);
  passed++;
} catch (e) {
  console.log(`❌ "..": threw ${e.message}`);
  failed++;
}

console.log(`\n📊 测试结果：${passed} pass / ${failed} fail`);
process.exit(failed > 0 ? 1 : 0);