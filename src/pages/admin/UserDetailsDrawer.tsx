import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AdminUserRow } from "./AdminUsers";

interface Props {
  user: AdminUserRow | null;
  onClose: () => void;
}

export function UserDetailsDrawer({ user, onClose }: Props) {
  return (
    <Sheet open={!!user} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{user?.business_name || "Detalhes"}</SheetTitle>
        </SheetHeader>
        {user && (
          <div className="mt-6 space-y-6">
            <section>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">📋 Estabelecimento</h3>
              <dl className="text-sm space-y-1">
                <div className="flex justify-between"><dt className="text-muted-foreground">Nome</dt><dd>{user.business_name || "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Email</dt><dd>{user.email || "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Telefone</dt><dd>{user.phone || "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Cadastro</dt><dd>{new Date(user.created_at).toLocaleDateString("pt-BR")}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Último acesso</dt><dd>{user.last_seen_at ? new Date(user.last_seen_at).toLocaleString("pt-BR") : "—"}</dd></div>
              </dl>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">📊 Uso do produto</h3>
              <dl className="text-sm space-y-1">
                <div className="flex justify-between"><dt className="text-muted-foreground">Clientes cadastrados</dt><dd>{user.customers_count}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Carros registrados</dt><dd>{user.cars_count}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Último serviço</dt><dd>{user.last_service_at ? new Date(user.last_service_at).toLocaleString("pt-BR") : "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Onboarding</dt><dd>{user.onboarding_completed ? "Concluído" : "Pendente"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">WhatsApp conectado</dt><dd>{user.whatsapp_connected ? "Sim" : "Não"}</dd></div>
              </dl>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">💰 Financeiro</h3>
              <p className="text-sm text-muted-foreground">Disponível ao ativar pagamentos (Stripe).</p>
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
