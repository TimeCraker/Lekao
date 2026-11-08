import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "作业/堂测反馈",
};

export default function feedbackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
