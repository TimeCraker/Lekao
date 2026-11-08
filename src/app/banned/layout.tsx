import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "账号已被封禁",
};

export default function BannedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
