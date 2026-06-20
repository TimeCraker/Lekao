import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className="min-h-screen flex bg-canvas-alt">
        <Sidebar />
        <main className="flex-1 md:ml-64 min-w-0">{children}</main>
      </div>
    </Providers>
  );
}