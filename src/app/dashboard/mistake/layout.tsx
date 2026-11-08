import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "错题集",
};

export default function mistakeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
