// ============================================
// Lekao · 自定义模板删除 API（2026-08-18 · Stage B）
// ============================================
// DELETE /api/lekao/templates/[id] — 仅本人的模板可删（userId 匹配）

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  const userId = session.user.id;

  const { id } = await params;

  // userId 匹配 = 只能删自己的（不匹配按 404 处理，不泄露他人模板存在性）
  const deleted = await prisma.lekaoTemplate.deleteMany({
    where: { id, userId },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: "模板不存在" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
