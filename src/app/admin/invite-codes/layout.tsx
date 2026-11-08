import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "邀请码管理",
};

export default function invitecodesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
