/**
 * 全局 middleware
 *
 * 1. withAuth 自动拦截：未登录访问 /dashboard / /admin → 跳 /login
 * 2. 自定义 banned 检查：session.banned === true → 跳 /banned
 *
 * Why: 封禁用户已签发的 JWT 仍能用 30 天，必须 middleware 主动踢。
 *      signIn callback 拒登录只能拦"重登"，拦不住"已登录继续用"。
 */
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    if (token?.banned === true) {
      return NextResponse.redirect(new URL("/banned", req.url));
    }
    return NextResponse.next();
  },
  {
    pages: { signIn: "/login" },
  },
);

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};