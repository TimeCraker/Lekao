import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "审计日志",
};

export default function auditlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
