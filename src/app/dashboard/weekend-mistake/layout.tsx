import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "周末反馈表",
};

export default function weekendmistakeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
