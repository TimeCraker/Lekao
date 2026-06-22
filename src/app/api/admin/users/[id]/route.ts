import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const { id } = await params;
    const body = await req.json();
    const { name, role } = body;

    const data: Record<string, unknown> = {};
    if (typeof name === "string") data.name = name;
    if (role === "USER" || role === "ADMIN") data.role = role;

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true },
    });

    return NextResponse.json(user);
  } catch (e) {
    console.error("[admin/users/id] error:", e);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
