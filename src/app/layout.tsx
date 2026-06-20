import type { Metadata } from "next";
import "./globals.css";
import { LenisProvider } from "@/components/lenis-provider";

export const metadata: Metadata = {
  title: "Lekao Agent - AI 智能助手",
  description:
    "让培训机构助教从抄错题、写小结、写反馈的重复冗余工作里解放出来，专注学生成长。",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-canvas text-ink">
        <LenisProvider>{children}</LenisProvider>
      </body>
    </html>
  );
}