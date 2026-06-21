import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    // Test DB connection
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      db: "PostgreSQL (connected)",
      node: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memory: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB`,
    });
  } catch {
    return NextResponse.json({
      db: "Disconnected",
      node: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memory: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB`,
    });
  }
}
