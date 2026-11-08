import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "用户管理",
};

export default function usersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
