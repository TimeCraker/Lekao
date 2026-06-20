import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lekao - AI 智能助教助手",
  description:
    "让培训机构助教从抄错题、写小结、写反馈里解放出来，每次课省 1-2 小时。",
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
        {children}
      </body>
    </html>
  );
}