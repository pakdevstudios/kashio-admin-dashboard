import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-shell p-2 sm:p-3">
        <div className="flex min-h-[calc(100vh-1rem)] overflow-hidden rounded-2xl bg-white sm:min-h-[calc(100vh-1.5rem)]">
          <Sidebar />
          <main className="flex-1 overflow-x-hidden bg-white">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
