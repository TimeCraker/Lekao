// ============================================
// Lekao · 自定义模板 V1（2026-08-18 · Stage B）
// ============================================
// 结构化字段（称呼/语气/签名/附加要求），非裸 prompt 编辑。
// - 预设（standard/concise）= 代码常量，不进 DB
// - 用户模板 = lekao_templates 表（content 列存 style JSON）
// - 公开分享 / 裸 prompt 编辑 = V2，不做（PRD §8.5 finding #4 RLS 不触发）
//
// 本文件纯类型 + 常量 + 纯函数（无 DB / 无副作用），前后端共用。

export type TemplateTone = "professional" | "friendly" | "concise";

/** 结构化模板风格字段（全部可选；空对象 = 标准输出） */
export type TemplateStyle = {
  /** 开头称呼，如「各位家长：」 */
  greeting?: string;
  tone?: TemplateTone;
  /** 结尾签名，如「——李老师」 */
  signature?: string;
  /** 附加要求（一句话） */
  extraNote?: string;
};

export type LekaoTemplateType = "summary" | "feedback";

/** 字段长度与数量限制（API 与前端表单共用） */
export const TEMPLATE_LIMITS = {
  nameMax: 20,
  greetingMax: 30,
  signatureMax: 30,
  extraNoteMax: 100,
  maxPerUserType: 5,
} as const;

export const TEMPLATE_TONES: {
  value: TemplateTone;
  label: string;
  desc: string;
}[] = [
  {
    value: "professional",
    label: "专业",
    desc: "措辞严谨正式，像教研组书面报告",
  },
  { value: "friendly", label: "亲切", desc: "温暖鼓励，像跟家长面对面聊天" },
  { value: "concise", label: "简洁", desc: "条目更短，去客套话，直击要点" },
];

/** 平台预设（代码常量；id 不含 cuid 格式，与 DB 模板天然隔离） */
export const PRESET_TEMPLATES: {
  id: string;
  name: string;
  style: TemplateStyle;
}[] = [
  { id: "standard", name: "标准", style: {} },
  { id: "concise", name: "简洁", style: { tone: "concise" } },
];

export function isPresetTemplateId(id: string): boolean {
  return PRESET_TEMPLATES.some((p) => p.id === id);
}

/** style → content 列（JSON 字符串） */
export function serializeStyle(style: TemplateStyle): string {
  return JSON.stringify(style);
}

/** content 列 → style（非法 JSON / 字段非法 → null，调用方回退标准） */
export function parseStyle(content: string): TemplateStyle | null {
  try {
    const v = JSON.parse(content) as Record<string, unknown>;
    const style: TemplateStyle = {};
    if (typeof v.greeting === "string" && v.greeting.trim())
      style.greeting = v.greeting.trim().slice(0, TEMPLATE_LIMITS.greetingMax);
    if (
      v.tone === "professional" ||
      v.tone === "friendly" ||
      v.tone === "concise"
    )
      style.tone = v.tone;
    if (typeof v.signature === "string" && v.signature.trim())
      style.signature = v.signature
        .trim()
        .slice(0, TEMPLATE_LIMITS.signatureMax);
    if (typeof v.extraNote === "string" && v.extraNote.trim())
      style.extraNote = v.extraNote
        .trim()
        .slice(0, TEMPLATE_LIMITS.extraNoteMax);
    return style;
  } catch {
    return null;
  }
}

export type StyleValidation =
  | { ok: true; name: string; type: LekaoTemplateType; style: TemplateStyle }
  | { ok: false; error: string };

/** POST 入参校验（API 用；前端表单可直接复用同一规则） */
export function validateTemplateInput(body: {
  name?: unknown;
  type?: unknown;
  greeting?: unknown;
  tone?: unknown;
  signature?: unknown;
  extraNote?: unknown;
}): StyleValidation {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return { ok: false, error: "模板名称不能为空" };
  if (name.length > TEMPLATE_LIMITS.nameMax) {
    return { ok: false, error: `模板名称最多 ${TEMPLATE_LIMITS.nameMax} 字` };
  }
  if (body.type !== "summary" && body.type !== "feedback") {
    return { ok: false, error: "type 必须是 summary 或 feedback" };
  }

  const style: TemplateStyle = {};
  const greeting =
    typeof body.greeting === "string" ? body.greeting.trim() : "";
  if (greeting) {
    if (greeting.length > TEMPLATE_LIMITS.greetingMax) {
      return {
        ok: false,
        error: `开头称呼最多 ${TEMPLATE_LIMITS.greetingMax} 字`,
      };
    }
    style.greeting = greeting;
  }
  if (
    body.tone === "professional" ||
    body.tone === "friendly" ||
    body.tone === "concise"
  ) {
    style.tone = body.tone;
  }
  const signature =
    typeof body.signature === "string" ? body.signature.trim() : "";
  if (signature) {
    if (signature.length > TEMPLATE_LIMITS.signatureMax) {
      return {
        ok: false,
        error: `结尾签名最多 ${TEMPLATE_LIMITS.signatureMax} 字`,
      };
    }
    style.signature = signature;
  }
  const extraNote =
    typeof body.extraNote === "string" ? body.extraNote.trim() : "";
  if (extraNote) {
    if (extraNote.length > TEMPLATE_LIMITS.extraNoteMax) {
      return {
        ok: false,
        error: `附加要求最多 ${TEMPLATE_LIMITS.extraNoteMax} 字`,
      };
    }
    style.extraNote = extraNote;
  }

  if (!style.greeting && !style.tone && !style.signature && !style.extraNote) {
    return {
      ok: false,
      error: "至少填写一项风格设置（称呼/语气/签名/附加要求）",
    };
  }

  return { ok: true, name, type: body.type, style };
}
