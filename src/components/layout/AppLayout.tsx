import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { StoreFilterBar } from "./StoreFilterBar";
import { StoreFilterProvider } from "@/contexts/StoreFilterContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export function AppLayout() {
  const { isLoading, appUser, role, stores, signOut } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  // If not HQ, AuthContext already signed out. This is just defensive.
  if (!appUser || role !== "hq_admin") {
    return null;
  }

  return (
    <StoreFilterProvider>
      <div className="flex h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Current Context */}
          <div className="flex items-center justify-between border-b bg-background px-6 py-3">
            <div className="flex flex-col">
              <div className="text-sm font-medium">{appUser.name}</div>
              <div className="text-xs text-muted-foreground">
                Role: {role} • Access: All stores ({stores.length})
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </div>

          <StoreFilterBar />
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </StoreFilterProvider>
  );
}
