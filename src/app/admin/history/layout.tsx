import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "内容历史",
};

export default function historyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
