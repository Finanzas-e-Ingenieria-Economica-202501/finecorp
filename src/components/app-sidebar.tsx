"use client";
import { DollarSign } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./ui/sidebar";
import NavMain from "./nav-main";
import { useRouter } from "next/navigation";
import { logoutUser } from "@/services/auth.service";
import { Button } from "./ui/button";

export function AppSidebar({ username }: { username?: string }) {
  const router = useRouter();

  const handleSignOut = async () => {
    await logoutUser();
    router.push("/login");
  };

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <DollarSign className="!size-5" />
                <span className="text-base font-semibold">
                  Bienvenido {username}
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain />
      </SidebarContent>

      <SidebarFooter>
        <Button variant="outline" className="w-full" onClick={handleSignOut}>
          Cerrar sesión
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
