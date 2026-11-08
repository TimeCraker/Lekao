import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CAPABILITIES, coinAmounts, coinCapabilities } from "./capabilities";

/**
 * S01 T-007 / AC-010 · 能力真值与公开文案一致性
 *
 * 规格 §3.2：营销/帮助文案要么接到 registry，要么与之做静态一致性测试（本文件是后者）。
 * 校验三件事：
 * 1. registry 结构完整（字段固定、id 唯一、必填非空）
 * 2. 文案中的「收费数字」必须落在 registry 的计费金额集合内（防私自涨价/写错）
 * 3. 公开文案不出现内部术语与无证据声明
 */
const COPY_FILES = [
  "src/components/usage-guide/content.tsx",
  "src/components/landing/faq.tsx",
  "src/components/landing/hero.tsx",
  "src/components/landing/workflow.tsx",
  "src/components/landing/stats.tsx",
  "src/app/(marketing)/page.tsx",
];

const REQUIRED_FIELDS = [
  "id",
  "label",
  "platforms",
  "status",
  "inputs",
  "outputs",
  "billing",
  "limits",
  "recovery",
] as const;

/** 收费上下文关键词：命中这些词的行里的币数才算「收费声明」 */
const CHARGE_HINTS = ["消耗", "扣费", "扣 1", "每次", "每份", "费用", "Sheet"];
const FORBIDDEN_TERMS = ["BRD", "硬约束", "AI 自动整理", "aggregateRating"];

function readCopy(): { file: string; lines: string[] }[] {
  return COPY_FILES.map((file) => ({
    file,
    lines: readFileSync(resolve(process.cwd(), file), "utf8").split(/\r?\n/),
  }));
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

describe("能力真值 registry", () => {
  it("五条能力都在，字段齐全且必填非空", () => {
    expect(Object.keys(CAPABILITIES).sort()).toEqual([
      "checkin",
      "feedback",
      "mistake",
      "summary",
      "weekend-mistake",
    ]);

    const ids = new Set<string>();
    for (const [key, cap] of Object.entries(CAPABILITIES)) {
      expect(cap.id, `${key} 的 id 必须与键一致`).toBe(key);
      expect(ids.has(cap.id)).toBe(false);
      ids.add(cap.id);

      for (const field of REQUIRED_FIELDS) {
        expect(cap, `${key} 缺少 ${field}`).toHaveProperty(field);
      }
      expect(cap.label.length).toBeGreaterThan(0);
      expect(cap.platforms.length).toBeGreaterThan(0);
      expect(["available", "disabled"]).toContain(cap.status);
      expect(cap.inputs.length).toBeGreaterThan(0);
      expect(cap.outputs.length).toBeGreaterThan(0);
      expect(cap.limits.length).toBeGreaterThan(0);
      expect(cap.recovery.length).toBeGreaterThan(0);
    }
  });

  it("收费能力恰好是三条 AI 生成流程，且单价 1 币", () => {
    const ids = coinCapabilities()
      .map((c) => c.id)
      .sort();
    expect(ids).toEqual(["feedback", "summary", "weekend-mistake"]);
    expect(coinAmounts()).toEqual([1]);
    for (const cap of coinCapabilities()) {
      if (cap.billing.kind !== "coin") continue;
      expect(cap.billing.amount).toBe(1);
      expect(cap.limits.join(" ")).toMatch(/成功才结算|自动释放/);
    }
  });

  it("错题集是免费能力，签到是奖励能力", () => {
    expect(CAPABILITIES.mistake.billing.kind).toBe("free");
    expect(CAPABILITIES.checkin.billing.kind).toBe("reward");
    expect(CAPABILITIES.mistake.limits.join(" ")).toContain("不调用 AI");
  });

  it('2026-10-03 owner 决策：移动端只用网页（全能力 platforms 恒为 ["web"]，无 APP）', () => {
    for (const cap of Object.values(CAPABILITIES)) {
      expect(cap.platforms).toEqual(["web"]);
    }
    expect(CAPABILITIES.mistake.platforms).toEqual(["web"]);
    expect(CAPABILITIES["weekend-mistake"].platforms).toEqual(["web"]);
  });
});

describe("公开文案与能力真值一致（AC-010）", () => {
  it("文案里的收费数字必须落在 registry 的计费金额内", () => {
    const allowed = new Set(coinAmounts());
    const offenders: string[] = [];

    for (const { file, lines } of readCopy()) {
      lines.forEach((raw, index) => {
        const line = raw.replace(/(^|[^:])\/\/.*$/, "$1");
        if (!CHARGE_HINTS.some((hint) => line.includes(hint))) return;
        // 收费上下文里出现的 N 枚 T-Coin / N 币
        for (const m of line.matchAll(/(\d+)\s*(?:枚\s*)?(?:T-Coin|币)/g)) {
          // 数字紧邻的前文若是赠送/奖励语义，则属发放而非收费（如「注册赠送 5 枚 T-Coin」）
          const before = line.slice(Math.max(0, (m.index ?? 0) - 12), m.index);
          if (/赠送|奖励|领|送/.test(before)) continue;
          const amount = Number(m[1]);
          if (!allowed.has(amount)) {
            offenders.push(
              `${file}:${index + 1} → ${amount} 币（registry 只允许 ${[...allowed].join("/")}）`,
            );
          }
        }
      });
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("公开文案不含内部术语或无证据声明", () => {
    const offenders: string[] = [];
    for (const { file, lines } of readCopy()) {
      lines.forEach((line, index) => {
        for (const term of FORBIDDEN_TERMS) {
          if (line.includes(term))
            offenders.push(`${file}:${index + 1} → ${term}`);
        }
      });
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("每条能力的名称都在站点源码里出现过（真值不能脱离对外声明）", () => {
    const all = walk(resolve(process.cwd(), "src"))
      .filter((f) => !f.includes(join("config", "capabilities")))
      .map((f) => readFileSync(f, "utf8"))
      .join("\n");

    for (const cap of Object.values(CAPABILITIES)) {
      expect(all, `没有页面声明能力「${cap.label}」`).toContain(cap.label);
    }
  });
});
