import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * S01 AC-010 · 能力真值 registry 出口契约（T-007 已实施 → 本文件已转绿）
 *
 * 行为级覆盖（结构完整性、收费金额与文案一致性）在 `src/config/capability-copy.test.ts`。
 * 这里只锁住「registry 存在且字段齐全」这一最低契约，防止被删除或改名。
 */
const REGISTRY_PATH = resolve(process.cwd(), "src/config/capabilities.ts");

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

describe("S01 AC-010 能力真值 registry", () => {
  it("存在 src/config/capabilities.ts", () => {
    expect(
      existsSync(REGISTRY_PATH),
      "src/config/capabilities.ts 缺失（S01 T-007）",
    ).toBe(true);
  });

  it("每条能力声明都包含规格要求的全部字段", async () => {
    if (!existsSync(REGISTRY_PATH)) {
      expect.fail(
        "src/config/capabilities.ts 不存在：能力真值尚未建立（S01 T-007）",
      );
    }
    const mod = (await import(pathToFileURL(REGISTRY_PATH).href)) as {
      CAPABILITIES?: Record<string, Record<string, unknown>>;
    };
    const caps = mod.CAPABILITIES ?? {};
    expect(Object.keys(caps).length, "能力真值不能为空").toBeGreaterThan(0);
    for (const [id, cap] of Object.entries(caps)) {
      for (const field of REQUIRED_FIELDS) {
        expect(cap, `能力 ${id} 缺少字段 ${field}`).toHaveProperty(field);
      }
    }
  });
});
