import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { BottomNav } from "@/components/BottomNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const isMobile = useIsMobile();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {!isMobile && <AppSidebar />}
        <div className="flex-1 flex flex-col min-w-0">
          {!isMobile && (
            <header className="h-14 flex items-center border-b px-4">
              <SidebarTrigger />
            </header>
          )}
          <main className={`flex-1 p-4 md:p-6 ${isMobile ? 'pb-20' : ''}`}>
            {children}
          </main>
          {isMobile && <BottomNav />}
        </div>
      </div>
    </SidebarProvider>
  );
};
