import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += CHARS[randomInt(0, CHARS.length)];
  }
  return code;
}

// GET: list all invite codes
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const [codes, total, used] = await Promise.all([
      prisma.invitationCode.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.invitationCode.count(),
      prisma.invitationCode.count({ where: { used: true } }),
    ]);

    return NextResponse.json({
      codes,
      total,
      used,
    });
  } catch (e) {
    console.error("[admin/invite-codes] error:", e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// POST: generate new codes
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const { count, prefix } = await req.json();
    const n = Math.min(100, Math.max(1, parseInt(count ?? "1")));

    const codes: string[] = [];
    for (let i = 0; i < n; i++) {
      let code: string;
      let exists = true;
      do {
        code = prefix ? `${prefix}-${randomCode()}` : randomCode();
        const existing = await prisma.invitationCode.findUnique({
          where: { code },
        });
        exists = !!existing;
      } while (exists);

      await prisma.invitationCode.create({ data: { code } });
      codes.push(code);
    }

    return NextResponse.json({ codes, count: codes.length });
  } catch (e) {
    console.error("[admin/invite-codes] generate error:", e);
    return NextResponse.json({ error: "生成失败" }, { status: 500 });
  }
}
