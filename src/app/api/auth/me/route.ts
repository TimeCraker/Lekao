// ============================================
// Lekao · 当前用户信息 API
// ============================================
// PATCH /api/auth/me { name } — 修改用户名
//
// ⚠️ users 表归 ResumeAIX 仓库管（Lekao 只读引用），
//    本端点是 Lekao 唯一允许的 users 写操作，且只 UPDATE name 一个字段。
// ⭐ 成功后前端调 next-auth session.update() → jwt callback 重查 DB 刷新 token.name
//

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/error-envelope";

export const runtime = "nodejs";

const NAME_MIN = 1;
const NAME_MAX = 40;

export async function PATCH(req: NextRequest) {
  const correlationId = `lekao-profile-${randomUUID()}`;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return errorResponse(401, {
      message: "请先登录",
      code: "UNAUTHENTICATED",
      correlationId,
    });
  }
  const userId = session.user.id;

  let body: { name?: unknown };
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, {
      message: "请求体不是合法 JSON",
      code: "INVALID_REQUEST",
      correlationId,
    });
  }

  if (typeof body.name !== "string") {
    return errorResponse(400, {
      message: "name 必须是字符串",
      code: "INVALID_REQUEST",
      correlationId,
    });
  }

  const name = body.name.trim();
  if (name.length < NAME_MIN) {
    return errorResponse(400, {
      message: "用户名不能为空",
      code: "INVALID_REQUEST",
      correlationId,
    });
  }
  if (name.length > NAME_MAX) {
    return errorResponse(400, {
      message: `用户名最多 ${NAME_MAX} 个字符`,
      code: "INVALID_REQUEST",
      correlationId,
    });
  }

  try {
    // ⭐ 只更新 name 字段，其余一概不动（共享 users 表红线）
    const user = await prisma.user.update({
      where: { id: userId },
      data: { name },
      select: { id: true, email: true, name: true },
    });
    // 成功响应：规格 §4 要求 user + correlationId；
    // 保留旧字段 ok/name 以免打断已发布的 Android 客户端。
    return NextResponse.json({
      ok: true,
      name: user.name ?? name,
      user,
      correlationId,
    });
  } catch (e) {
    console.error("[auth/me] 更新用户名失败:", e);
    return errorResponse(500, {
      message: "保存失败，请稍后重试",
      code: "INTERNAL",
      correlationId,
    });
  }
}
