import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "评论管理",
};

export default function CommentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
