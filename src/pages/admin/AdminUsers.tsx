import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MoreVertical, Search, KeyRound, Lock, Unlock, UserCog, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserDetailsDrawer } from "./UserDetailsDrawer";

export interface AdminUserRow {
  user_id: string;
  email: string | null;
  business_name: string | null;
  phone: string | null;
  created_at: string;
  last_seen_at: string | null;
  onboarding_completed: boolean;
  is_blocked: boolean;
  customers_count: number;
  cars_count: number;
  last_service_at: string | null;
  whatsapp_connected: boolean;
}

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<AdminUserRow | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_users");
    if (error) toast.error(error.message);
    else setUsers((data as AdminUserRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (statusFilter === "blocked" && !u.is_blocked) return false;
      if (statusFilter === "active" && u.is_blocked) return false;
      if (statusFilter === "no_onboarding" && u.onboarding_completed) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${u.business_name ?? ""} ${u.email ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [users, search, statusFilter]);

  const handleResetPassword = async (u: AdminUserRow) => {
    const { data, error } = await supabase.functions.invoke("admin-actions", {
      body: { action: "reset-password", target_user_id: u.user_id },
    });
    if (error || data?.error) {
      toast.error(error?.message || data?.error || "Falha ao gerar link");
      return;
    }
    if (data?.link) {
      await navigator.clipboard.writeText(data.link);
      toast.success("Link copiado para a área de transferência", { description: data.email });
    }
  };

  const handleToggleBlock = async (u: AdminUserRow) => {
    const { data, error } = await supabase.functions.invoke("admin-actions", {
      body: { action: "set-blocked", target_user_id: u.user_id, is_blocked: !u.is_blocked },
    });
    if (error || data?.error) {
      toast.error(error?.message || data?.error || "Falha");
      return;
    }
    toast.success(u.is_blocked ? "Usuário desbloqueado" : "Usuário bloqueado");
    load();
  };

  const handleImpersonate = async (u: AdminUserRow) => {
    const { data, error } = await supabase.functions.invoke("admin-actions", {
      body: { action: "impersonate", target_user_id: u.user_id },
    });
    if (error || data?.error) {
      toast.error(error?.message || data?.error || "Falha");
      return;
    }
    if (data?.link) {
      window.open(data.link, "_blank", "noopener,noreferrer");
      toast.success("Sessão de impersonação aberta em nova aba");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-2 md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os usuários</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="blocked">Bloqueados</SelectItem>
            <SelectItem value="no_onboarding">Sem onboarding</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estabelecimento</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="hidden md:table-cell">Cadastro</TableHead>
                <TableHead className="hidden lg:table-cell">Último acesso</TableHead>
                <TableHead className="hidden lg:table-cell">Clientes</TableHead>
                <TableHead className="hidden lg:table-cell">Carros</TableHead>
                <TableHead>WA</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Carregando…</TableCell></TableRow>
              )}
              {!loading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhum usuário encontrado</TableCell></TableRow>
              )}
              {filtered.map((u) => (
                <TableRow key={u.user_id}>
                  <TableCell className="font-medium">{u.business_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {u.last_seen_at ? new Date(u.last_seen_at).toLocaleDateString("pt-BR") : "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">{u.customers_count}</TableCell>
                  <TableCell className="hidden lg:table-cell">{u.cars_count}</TableCell>
                  <TableCell>
                    {u.whatsapp_connected
                      ? <Badge className="bg-success/15 text-success border-success/30" variant="outline">on</Badge>
                      : <Badge variant="outline" className="text-muted-foreground">off</Badge>}
                  </TableCell>
                  <TableCell>
                    {u.is_blocked
                      ? <Badge variant="destructive">Bloqueado</Badge>
                      : !u.onboarding_completed
                        ? <Badge variant="outline" className="text-warning border-warning/30">Sem onboarding</Badge>
                        : <Badge variant="outline" className="text-success border-success/30">Ativo</Badge>}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelected(u)}>
                          <Eye className="mr-2 h-4 w-4" /> Ver detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleResetPassword(u)}>
                          <KeyRound className="mr-2 h-4 w-4" /> Redefinir senha
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleBlock(u)}>
                          {u.is_blocked
                            ? <><Unlock className="mr-2 h-4 w-4" /> Desbloquear</>
                            : <><Lock className="mr-2 h-4 w-4" /> Bloquear</>}
                        </DropdownMenuItem>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <UserCog className="mr-2 h-4 w-4" /> Impersonar
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Entrar como este usuário?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Isso abrirá uma sessão real autenticada como <strong>{u.email}</strong>. Use apenas para diagnóstico.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleImpersonate(u)}>Confirmar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs text-muted-foreground">Aguardando pagamentos</DropdownMenuLabel>
                        <DropdownMenuItem disabled>Estender trial</DropdownMenuItem>
                        <DropdownMenuItem disabled>Alterar plano</DropdownMenuItem>
                        <DropdownMenuItem disabled>Cancelar conta</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <UserDetailsDrawer user={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
