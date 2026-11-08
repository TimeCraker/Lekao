import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "系统设置",
};

export default function settingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
