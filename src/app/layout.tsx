import type { Metadata, Viewport } from "next";
import "./globals.css";

// ⭐ 2026-06-22 收尾：完整 SEO + 多尺寸图标 + OpenGraph + Twitter Card
// 关键决策：
// - 标题用模板（页面级 title 会自动拼后缀）
// - 关键词覆盖搜索场景（"AI 助教""错题集"等）
// - icons 数组包含 .svg + 多尺寸 .png，Next 16 自动选最优
// - canonical 强制 https://lekao.asterforge.top（避免多域名被搜索引擎分散权重）
export const metadata: Metadata = {
  title: {
    default: "Lekao Agent · AI 教学工作台",
    template: "%s · Lekao Agent",
  },
  description:
    "Lekao Agent 是给助教的 AI 教学工作台：上传表格和错题图片，自动生成全班 Word 错题本，也能生成课堂小结、作业反馈与周末错题表。",
  keywords: [
    "AI 助教",
    "智能助教",
    "课堂小结 AI",
    "作业反馈 AI",
    "错题集生成",
    "教培机构工具",
    "教师 AI 助手",
    "Lekao Agent",
    "错题整理",
    "家校沟通",
  ],
  authors: [{ name: "Lekao Agent" }],
  creator: "Lekao Agent",
  applicationName: "Lekao Agent",
  // ⭐ 多平台图标（Next 16 自动识别 /icon /apple-icon /opengraph-image）
  icons: {
    icon: [
      { url: "/icon", type: "image/png", sizes: "any" },
      { url: "/lekao-mark.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
  // ⭐ OpenGraph（微信/微博/LinkedIn 分享卡片）
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: "https://lekao.asterforge.top",
    siteName: "Lekao Agent",
    title: "Lekao Agent · AI 教学工作台",
    description:
      "上传表格和错题图片，自动生成全班 Word 错题本，也能生成课堂小结、作业反馈。",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Lekao Agent · AI 教学工作台",
      },
    ],
  },
  // ⭐ Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "Lekao Agent · AI 教学工作台",
    description: "AI 教学工作台：生成错题本、课堂小结、作业反馈与周末错题表。",
    images: ["/opengraph-image"],
  },
  // ⭐ 搜索引擎
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  // ⭐ canonical 防多域名权重分散
  alternates: {
    canonical: "https://lekao.asterforge.top",
  },
  metadataBase: new URL("https://lekao.asterforge.top"),
};

// ⭐ 移动端 viewport（亮/暗色适配 + theme color 配 favicon）
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8F6F1" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a1a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-canvas text-ink">
        {children}
      </body>
    </html>
  );
}
