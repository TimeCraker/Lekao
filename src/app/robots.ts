// ============================================
// LeKao · robots.txt (Next.js 16 metadata route)
// ============================================
// 公开 marketing 页允许抓取，登录后页面（dashboard/login/register/admin）禁止
// sitemap 指向 sitemap.xml（自动由 sitemap.ts 生成）

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/about", "/privacy", "/terms", "/icon", "/apple-icon", "/opengraph-image", "/lekao-mark.svg"],
        disallow: ["/api/", "/dashboard/", "/login/", "/register/", "/admin/", "/banned/"],
      },
    ],
    sitemap: "https://lekao.asterforge.top/sitemap.xml",
    host: "https://lekao.asterforge.top",
  };
}
