import { AppSidebar } from "@/components/app-sidebar";
import HeaderSidebarContent from "@/components/header-sidebar-content";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { getCurrentUser } from "@/services/auth.service";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar username={user?.username} />
      <SidebarInset>
        <main className="w-full">
          <HeaderSidebarContent />
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
