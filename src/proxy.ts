import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * Next.js 16 proxy.ts (前身 middleware.ts)
 *
 * 1. withAuth 自动拦截：未登录访问 /dashboard / /admin → 跳 /login
 * 2. /admin 必须 ADMIN 角色
 * 3. ⭐ P0#3 banned 拦截：token.banned=true → 跳 /banned（封禁用户已签发的 JWT
 *    仍能用 30 天, 必须 proxy 主动踢；signIn callback 拒登录只能拦"重登"）
 */
export default withAuth(
  function middleware(req) {
    if (req.nextauth.token?.banned === true) {
      return NextResponse.redirect(new URL("/banned", req.url));
    }
    return NextResponse.next();
  },
  {
    pages: { signIn: "/login" },
    callbacks: {
      authorized: ({ token, req }) => {
        // /admin 必须 admin 角色
        if (req.nextUrl.pathname.startsWith("/admin")) {
          return token?.role === "ADMIN";
        }
        // /dashboard 任意登录用户
        return !!token;
      },
    },
  },
);

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};