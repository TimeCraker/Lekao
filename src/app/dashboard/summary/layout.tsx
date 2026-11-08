import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "课堂小结",
};

export default function summaryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
