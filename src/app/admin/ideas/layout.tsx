import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "灵感墙管理",
};

export default function ideasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
