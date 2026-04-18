import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { BottomNav } from "@/components/BottomNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { MoreVertical, MessageSquare, Settings, LogOut } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Droplets } from "lucide-react";
import { OnboardingModal } from "@/components/OnboardingModal";
import { supabase } from "@/integrations/supabase/client";

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const isMobile = useIsMobile();
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled && data && data.onboarding_completed === false) {
        setShowOnboarding(true);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

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
          {isMobile ? (
            <header className="h-14 flex items-center justify-between border-b px-4">
              <div className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-primary" />
                <span className="font-bold text-foreground">Lavgo</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate("/whatsapp")}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Conectar WhatsApp
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    <Settings className="mr-2 h-4 w-4" />
                    Configurações
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </header>
          ) : (
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
      <OnboardingModal open={showOnboarding} onComplete={() => setShowOnboarding(false)} />
    </SidebarProvider>
  );
};
