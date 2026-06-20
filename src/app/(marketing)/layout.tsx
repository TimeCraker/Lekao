import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";

/**
 * Marketing layout · 共享 Navbar + Footer
 * 包含: / (landing) / /about / /privacy / /terms
 *
 * URL 路径不变 — Next.js route group (marketing) 不出现在 URL
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="pt-16">{children}</main>
      <Footer />
    </>
  );
}