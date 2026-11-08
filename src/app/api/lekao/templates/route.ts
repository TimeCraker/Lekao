// ============================================
// Lekao · 自定义模板 API（2026-08-18 · Stage B）
// ============================================
// GET  /api/lekao/templates?type=summary|feedback → { presets, mine }
// POST /api/lekao/templates { name, type, greeting?, tone?, signature?, extraNote? }
//
// ⭐ 预设（standard/concise）是代码常量，不进 DB
// ⭐ mine 严格按 session userId 过滤（无公开分享，PRD finding #4 RLS 不触发）
// ⭐ 上限每用户每类型 5 个（TEMPLATE_LIMITS.maxPerUserType）

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  PRESET_TEMPLATES,
  TEMPLATE_LIMITS,
  parseStyle,
  serializeStyle,
  validateTemplateInput,
  type LekaoTemplateType,
} from "@/lib/templates";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  const userId = session.user.id;

  const typeParam = req.nextUrl.searchParams.get("type");
  const where =
    typeParam === "summary" || typeParam === "feedback"
      ? { userId, type: typeParam }
      : { userId };

  const rows = await prisma.lekaoTemplate.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, type: true, content: true },
  });

  const mine = rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type as LekaoTemplateType,
    // content 非法时 parseStyle 返回 null → 前端展示空 style（生成时 route 侧也会回退标准）
    style: parseStyle(r.content) ?? {},
  }));

  return NextResponse.json({ presets: PRESET_TEMPLATES, mine });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const validated = validateTemplateInput(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 422 });
  }

  // 上限检查（每用户每类型）
  const count = await prisma.lekaoTemplate.count({
    where: { userId, type: validated.type },
  });
  if (count >= TEMPLATE_LIMITS.maxPerUserType) {
    return NextResponse.json(
      {
        error: `每个类型最多 ${TEMPLATE_LIMITS.maxPerUserType} 个模板，请先删除不用的`,
      },
      { status: 422 },
    );
  }

  const created = await prisma.lekaoTemplate.create({
    data: {
      userId,
      name: validated.name,
      type: validated.type,
      content: serializeStyle(validated.style),
      isPublic: false,
    },
    select: { id: true, name: true, type: true },
  });

  return NextResponse.json({ ok: true, template: created }, { status: 201 });
}
