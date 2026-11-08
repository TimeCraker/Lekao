import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "数据分析",
};

export default function analyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
