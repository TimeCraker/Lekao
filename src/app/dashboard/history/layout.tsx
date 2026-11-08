import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "生成历史",
};

export default function historyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
