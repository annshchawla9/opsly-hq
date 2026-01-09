import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  ClipboardList,
  TrendingUp,
  Users,
  LogOut,
  Building2,
  Inbox,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Communications", href: "/communications", icon: MessageSquare },
  { name: "Inbox", href: "/inbox", icon: Inbox },
  { name: "Tasks & Campaigns", href: "/tasks", icon: ClipboardList },
  { name: "Performance", href: "/performance", icon: TrendingUp },
  { name: "Users & Stores", href: "/management", icon: Users },
];

export function AppSidebar() {
  const location = useLocation();
  const { appUser, user, signOut } = useAuth();

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      {/* Header */}
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg opsly-gradient">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>

          {/* Auto-hides in collapsed mode */}
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-sidebar-foreground truncate">
              Opsly HQ
            </h1>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              Control Center
            </p>
          </div>
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent>
        <SidebarMenu className="px-2 py-2">
          {navigation.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.name}
                >
                  <NavLink
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3",
                      isActive
                        ? "text-sidebar-primary"
                        : "text-sidebar-foreground/80"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-sidebar-border">
        {/* User mini card */}
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-primary font-medium">
            {appUser?.name?.charAt(0) || "U"}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {appUser?.name || "User"}
            </p>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              {user?.email || ""}
            </p>
          </div>
        </div>

        {/* ✅ Sign out as SidebarMenuButton so it collapses properly */}
        <SidebarMenu className="px-2 pb-2">
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sign Out"
              onClick={signOut}
              className="text-sidebar-foreground/80 hover:text-sidebar-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
