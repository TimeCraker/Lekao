import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";

// ⭐ 2026-06-22 收尾：marketing 路由组共享 metadata
// 根 layout 已定义 title.default / openGraph / twitter，这里 override description + keywords
// 让 marketing 页 SEO 更精准（dashboard / login 不需要这些关键词）
export const metadata: Metadata = {
  title: {
    default: "LeKao · AI 智能助教助手",
    template: "%s · LeKao",
  },
  description:
    "AI 智能助教：自动生成课堂小结、作业堂测反馈、错题集 Word 文档。每节课省 1-2 小时，专注学生成长。免费注册即送 5 T-Coin。",
  keywords: [
    "AI 助教",
    "智能助教",
    "课堂小结 AI",
    "作业反馈 AI",
    "错题集生成",
    "错题集 Word",
    "教培机构工具",
    "教师 AI 助手",
    "培训机构",
    "LeKao",
    "家校沟通",
    "助教神器",
  ],
};

// ⭐ JSON-LD 结构化数据（让 Google Rich Result 能展示产品信息）
// SoftwareApplication + Organization 双 schema，覆盖搜索结果增强展示
// ⚠️ 安全前提：必须保持纯字面量，禁止拼入任何用户输入/外部 API 数据
//    （Google 推荐用 dangerouslySetInnerHTML 注入 JSON-LD，参考 Next.js 官方文档）
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "LeKao",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      description:
        "AI 智能助教助手：自动生成课堂小结、作业堂测反馈、错题集 Word 文档。让培训机构助教从抄错题、写小结、写反馈的重复工作里解放出来。",
      url: "https://lekao.asterforge.top",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "CNY",
        description: "免费注册即送 5 T-Coin，永久免费基础功能",
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "5",
        ratingCount: "1",
      },
    },
    {
      "@type": "Organization",
      name: "LeKao",
      url: "https://lekao.asterforge.top",
      logo: "https://lekao.asterforge.top/lekao-mark.svg",
      sameAs: ["https://lekao.asterforge.top"],
    },
  ],
};

/**
 * Marketing layout · 共享 Navbar + Footer
 * 包含: / (landing) / /about / /privacy / /terms
 *
 * URL 路径不变 — Next.js route group (marketing) 不出现在 URL
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      {/* ⭐ JSON-LD 结构化数据 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <main className="pt-16">{children}</main>
      <Footer />
    </Providers>
  );
}
