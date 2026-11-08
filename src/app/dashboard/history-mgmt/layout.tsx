import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "历史管理",
};

export default function historymgmtLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
