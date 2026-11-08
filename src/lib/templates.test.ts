import { describe, expect, it } from "vitest";
import {
  PRESET_TEMPLATES,
  TEMPLATE_LIMITS,
  TEMPLATE_TONES,
  isPresetTemplateId,
  parseStyle,
  serializeStyle,
  validateTemplateInput,
  type TemplateStyle,
} from "./templates";

// Stage 1 smoke：常量模块断言（框架联通验证），函数级用例在 Stage 2 补全
describe("templates 常量表", () => {
  it("TEMPLATE_LIMITS 限制值符合规格", () => {
    expect(TEMPLATE_LIMITS).toEqual({
      nameMax: 20,
      greetingMax: 30,
      signatureMax: 30,
      extraNoteMax: 100,
      maxPerUserType: 5,
    });
  });

  it("预设模板 id 不含 cuid 格式，与 DB 模板天然隔离", () => {
    expect(PRESET_TEMPLATES.map((p) => p.id)).toEqual(["standard", "concise"]);
    expect(PRESET_TEMPLATES[1].style).toEqual({ tone: "concise" });
  });

  it("TEMPLATE_TONES 覆盖全部 tone 枚举值", () => {
    expect(TEMPLATE_TONES.map((t) => t.value)).toEqual([
      "professional",
      "friendly",
      "concise",
    ]);
  });

  it("isPresetTemplateId：预设命中、DB 模板 id 不命中", () => {
    expect(isPresetTemplateId("standard")).toBe(true);
    expect(isPresetTemplateId("concise")).toBe(true);
    expect(isPresetTemplateId("cmcx9ab12cd34efgh56ij")); // cuid 形态的 DB 模板 id
    expect(isPresetTemplateId("")).toBe(false);
  });
});

describe("serializeStyle / parseStyle", () => {
  it("style → JSON 字符串 → style 保持 roundtrip", () => {
    const style: TemplateStyle = {
      greeting: "各位家长：",
      tone: "friendly",
      signature: "——李老师",
      extraNote: "重点表扬进步学生",
    };
    expect(parseStyle(serializeStyle(style))).toEqual(style);
  });

  it("非法 JSON → null（调用方回退标准）", () => {
    expect(parseStyle("not-json{")).toBeNull();
    expect(parseStyle("")).toBeNull();
  });

  it("空对象 JSON → 空风格对象（不是 null）", () => {
    expect(parseStyle("{}")).toEqual({});
  });

  it.each([
    ["tone 非法值被忽略", '{"tone":"angry"}', {}],
    ["greeting 非字符串被忽略", '{"greeting":123}', {}],
    ["纯空白字段被忽略", '{"greeting":"   ","signature":"\\t"}', {}],
  ])("%s", (_name, content, expected) => {
    expect(parseStyle(content)).toEqual(expected);
  });

  it("字段超长按 TEMPLATE_LIMITS 截断，前后空白 trim", () => {
    const content = JSON.stringify({
      greeting: `  ${"呼".repeat(35)}  `,
      extraNote: "注".repeat(120),
    });
    const style = parseStyle(content);
    expect(style?.greeting).toBe("呼".repeat(TEMPLATE_LIMITS.greetingMax));
    expect(style?.extraNote).toBe("注".repeat(TEMPLATE_LIMITS.extraNoteMax));
  });
});

describe("validateTemplateInput", () => {
  const validBody = {
    name: "我的模板",
    type: "summary",
    greeting: "各位家长：",
    tone: "friendly",
    signature: "——李老师",
    extraNote: "多提建议",
  };

  it("全部字段合法 → ok，style 保留全部字段，name trim", () => {
    const r = validateTemplateInput({
      ...validBody,
      name: `  ${validBody.name}  `,
    });
    expect(r).toEqual({
      ok: true,
      name: "我的模板",
      type: "summary",
      style: {
        greeting: "各位家长：",
        tone: "friendly",
        signature: "——李老师",
        extraNote: "多提建议",
      },
    });
  });

  it.each([
    ["名称为空", { name: "   " }, "模板名称不能为空"],
    ["名称缺失", { name: undefined }, "模板名称不能为空"],
    [
      "名称超长",
      { name: "名".repeat(21) },
      `模板名称最多 ${TEMPLATE_LIMITS.nameMax} 字`,
    ],
    ["type 非法", { type: "weekly" }, "type 必须是 summary 或 feedback"],
    ["type 缺失", { type: undefined }, "type 必须是 summary 或 feedback"],
    [
      "greeting 超长",
      { greeting: "呼".repeat(31) },
      `开头称呼最多 ${TEMPLATE_LIMITS.greetingMax} 字`,
    ],
    [
      "signature 超长",
      { signature: "签".repeat(31) },
      `结尾签名最多 ${TEMPLATE_LIMITS.signatureMax} 字`,
    ],
    [
      "extraNote 超长",
      { extraNote: "注".repeat(101) },
      `附加要求最多 ${TEMPLATE_LIMITS.extraNoteMax} 字`,
    ],
  ])("%s → ok:false", (_name, patch, expectedError) => {
    const r = validateTemplateInput({ ...validBody, ...patch });
    expect(r).toEqual({ ok: false, error: expectedError });
  });

  it("四个风格字段全空 → 要求至少填一项", () => {
    const r = validateTemplateInput({ name: "模板", type: "feedback" });
    expect(r).toEqual({
      ok: false,
      error: "至少填写一项风格设置（称呼/语气/签名/附加要求）",
    });
  });

  it("tone 非法但其余合法 → 忽略 tone，仅保留合法字段", () => {
    const r = validateTemplateInput({
      name: "模板",
      type: "summary",
      tone: "angry",
      greeting: "Hi：",
    });
    expect(r).toEqual({
      ok: true,
      name: "模板",
      type: "summary",
      style: { greeting: "Hi：" },
    });
  });

  it("纯空白风格字段视同未填 → 要求至少填一项", () => {
    const r = validateTemplateInput({
      name: "模板",
      type: "summary",
      greeting: "  ",
      extraNote: "\n\t",
    });
    expect(r.ok).toBe(false);
  });
});
