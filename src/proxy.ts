import { withAuth } from "next-auth/middleware";

export default withAuth({
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
});

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};