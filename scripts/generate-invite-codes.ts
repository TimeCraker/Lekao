/**
 * 邀请码批量生成脚本
 *
 * 用法:
 *   cd lekao
 *   pnpm tsx scripts/generate-invite-codes.ts <数量> [前缀]
 *
 * 示例:
 *   pnpm tsx scripts/generate-invite-codes.ts 20        # 生成 20 个随机 8 位码
 *   pnpm tsx scripts/generate-invite-codes.ts 10 LEKAO   # LEKAO-XXXX 前缀
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function randomCode(prefix?: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 去掉易混淆的 0/O/1/I
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return prefix ? `${prefix}-${code}` : code;
}

async function main() {
  const count = parseInt(process.argv[2] || "10", 10);
  const prefix = process.argv[3];

  console.log(`生成 ${count} 个邀请码${prefix ? ` (前缀: ${prefix})` : ""}...`);

  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    let code: string;
    let exists = true;
    // 去重
    do {
      code = randomCode(prefix);
      const existing = await prisma.invitationCode.findUnique({
        where: { code },
      });
      exists = !!existing;
    } while (exists);

    await prisma.invitationCode.create({
      data: { code },
    });
    codes.push(code);
    console.log(`  ${i + 1}. ${code}`);
  }

  console.log(`\n完成! 共生成 ${codes.length} 个邀请码`);
  console.log("---");
  console.log(codes.join("\n"));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
