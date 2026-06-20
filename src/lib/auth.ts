import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

/**
 * PRD §3.4.1.2 ⭐ 延迟初始化赠币机制
 *
 * 漏洞场景: ResumeAIX 老用户直接登录 Lekao → 不触发注册 → lekao_gift_coin = -1 → 客诉
 * 修复方案: signIn callback 检测 === -1 才补发 5 枚
 * 幂等性:   多次登录不重复发币 (仅 === -1 时触发)
 *
 * 字段默认 -1 而非 0 的关键: 0 可能是"已用完的余额", 不能再次初始化
 */

export const authOptions: NextAuthOptions = {
  // ⭐ 不写 session.strategy: next-auth v4 默认 JWT (PRD §3.3 锁 JWT)
  secret: process.env.NEXTAUTH_SECRET,

  providers: [
    // 邮箱密码登录 (PRD §3.5.2 邮箱密码模式)
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            password: true,
            lekao_gift_coin: true,
            t_coin: true,
          },
        });

        if (!user || !user.password) {
          return null;
        }

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          lekao_gift_coin: user.lekao_gift_coin,
          t_coin: user.t_coin,
        };
      },
    }),
  ],

  pages: {
    signIn: "/login",
  },

  callbacks: {
    /**
     * ⭐ 延迟初始化赠币 (PRD §3.4.1.2)
     * 仅当 lekao_gift_coin === -1 时补发 5 枚
     * 多次登录不会重复发币
     */
    async signIn({ user }) {
      if (!user.id) return false;

      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { lekao_gift_coin: true },
      });

      if (!dbUser) return false;

      if (dbUser.lekao_gift_coin === -1) {
        await prisma.user.update({
          where: { id: user.id },
          data: { lekao_gift_coin: 5 },
        });
        console.log(
          `[Lekao] 延迟初始化赠币: user ${user.email} +5 T-Coin`,
        );
      }

      return true;
    },

    /**
     * 把 role / lekao_gift_coin / tCoin 塞进 JWT token
     * 客户端 useSession() 时通过 session callback 拿到
     */
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "user";
        token.lekao_gift_coin =
          (user as { lekao_gift_coin?: number }).lekao_gift_coin ?? 0;
        token.t_coin = (user as { t_coin?: number }).t_coin ?? 0;
      }

      // ⭐ 刷新机制: 当客户端调用 update() 时重新拉最新余额
      if (trigger === "update" && token.id) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { lekao_gift_coin: true, t_coin: true, role: true },
        });
        if (fresh) {
          token.lekao_gift_coin = fresh.lekao_gift_coin;
          token.t_coin = fresh.t_coin;
          token.role = fresh.role;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.lekao_gift_coin = token.lekao_gift_coin as number;
        session.user.t_coin = token.t_coin as number;
      }
      return session;
    },
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 天
  },
};