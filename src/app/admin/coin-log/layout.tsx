import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "调币流水",
};

export default function coinlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
