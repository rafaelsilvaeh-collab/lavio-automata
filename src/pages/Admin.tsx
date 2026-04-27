import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { AdminOverview } from "./admin/AdminOverview";
import { AdminUsers } from "./admin/AdminUsers";
import { AdminWhatsApp } from "./admin/AdminWhatsApp";
import { AdminSettings } from "./admin/AdminSettings";
import { AdminLanding } from "./admin/AdminLanding";

const Admin = () => {
  const { isAdmin, loading } = useIsAdmin();
  const { user } = useAuth();

  if (loading) {
    return <div className="text-muted-foreground">Verificando permissões…</div>;
  }
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Painel Admin</h1>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
          <TabsTrigger value="landing">Landing Page</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4"><AdminOverview /></TabsContent>
        <TabsContent value="users" className="mt-4"><AdminUsers /></TabsContent>
        <TabsContent value="whatsapp" className="mt-4"><AdminWhatsApp /></TabsContent>
        <TabsContent value="settings" className="mt-4"><AdminSettings /></TabsContent>
        <TabsContent value="landing" className="mt-4"><AdminLanding /></TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
