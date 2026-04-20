import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Phone, Car, User, X, History, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";
import { formatPhoneInput, fromStorage, toStorage } from "@/lib/phone";

type Customer = Tables<"customers">;

interface ServiceHistory {
  id: string;
  serviceName: string | null;
  date: string;
  status: string;
}

const Customers = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerHistory, setCustomerHistory] = useState<ServiceHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [form, setForm] = useState({ name: "", phone: "", car_model: "", plate: "", notes: "" });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchCustomers = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar clientes");
      console.error(error);
    } else {
      setCustomers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCustomers(); }, [user]);

  const filtered = useMemo(() => {
    if (!debouncedSearch) return customers;
    const q = debouncedSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.plate || "").toLowerCase().includes(q) ||
        (c.phone || "").includes(q)
    );
  }, [customers, debouncedSearch]);

  const resetForm = () => {
    setForm({ name: "", phone: "", car_model: "", plate: "", notes: "" });
    setEditingId(null);
  };

  const openNew = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (c: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(c.id);
    setForm({
      name: c.name,
      phone: fromStorage(c.phone),
      car_model: c.car_model || "",
      plate: c.plate || "",
      notes: c.notes || "",
    });
    setOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const payload = {
      name: form.name,
      phone: form.phone ? toStorage(form.phone) : null,
      car_model: form.car_model || null,
      plate: form.plate || null,
      notes: form.notes || null,
    };
    const { error } = editingId
      ? await supabase.from("customers").update(payload).eq("id", editingId)
      : await supabase.from("customers").insert({ ...payload, user_id: user.id });

    if (error) {
      toast.error(editingId ? "Erro ao atualizar cliente" : "Erro ao salvar cliente");
      console.error(error);
    } else {
      toast.success(editingId ? "Cliente atualizado!" : "Cliente salvo com sucesso!");
      resetForm();
      setOpen(false);
      fetchCustomers();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!user || !deleteId) return;
    const customer = customers.find((c) => c.id === deleteId);
    if (!customer) return;

    // Guard: check history in cash_flow_entries by name match
    const { count } = await supabase
      .from("cash_flow_entries")
      .select("id", { count: "exact", head: true })
      .ilike("description", `%${customer.name}%`);

    if ((count ?? 0) > 0) {
      toast.error("Cliente possui histórico e não pode ser excluído.");
      setDeleteId(null);
      return;
    }

    // Delete active yard records first
    await supabase.from("cars_in_yard").delete().eq("customer_id", deleteId);
    const { error } = await supabase.from("customers").delete().eq("id", deleteId);
    if (error) {
      toast.error("Erro ao excluir cliente");
    } else {
      toast.success("Cliente excluído");
      fetchCustomers();
    }
    setDeleteId(null);
  };

  const openCustomerDetail = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setHistoryLoading(true);

    const { data } = await supabase
      .from("cars_in_yard")
      .select("id, status, created_at, services(name), ad_hoc_service_name")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false })
      .limit(10);

    setCustomerHistory((data || []).map((d: any) => ({
      id: d.id,
      serviceName: d.services?.name || d.ad_hoc_service_name || "Serviço não especificado",
      date: d.created_at,
      status: d.status,
    })));
    setHistoryLoading(false);
  };

  const getReturnStatus = (lastWashDate: string | null) => {
    if (!lastWashDate) return { color: "bg-muted text-muted-foreground", label: "Sem visita", emoji: "⚪" };
    const days = Math.floor((Date.now() - new Date(lastWashDate).getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 21) return { color: "bg-success/10 text-success", label: `Há ${days} dias`, emoji: "🟢" };
    if (days <= 35) return { color: "bg-warning/10 text-warning", label: `Há ${days} dias`, emoji: "🟡" };
    return { color: "bg-destructive/10 text-destructive", label: `Há ${days} dias — em risco`, emoji: "🔴" };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground text-sm">{customers.length} clientes cadastrados</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gradient-primary border-0" onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Novo cliente</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editingId ? "Editar cliente" : "Novo cliente"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div><Label>Nome</Label><Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>WhatsApp</Label><Input placeholder="(15) 99999-9999" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: formatPhoneInput(e.target.value) }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Modelo do carro</Label><Input placeholder="Ex: Civic 2022" value={form.car_model} onChange={e => setForm(f => ({ ...f, car_model: e.target.value }))} /></div>
                <div><Label>Placa</Label><Input placeholder="ABC-1234" value={form.plate} onChange={e => setForm(f => ({ ...f, plate: e.target.value.toUpperCase() }))} /></div>
              </div>
              <div><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <Button type="submit" className="w-full gradient-primary border-0" disabled={saving}>
                {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Salvar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9 pr-9"
          placeholder="Buscar por nome, placa ou telefone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="grid gap-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : filtered.length > 0 ? (
          filtered.map((customer) => {
            const returnStatus = getReturnStatus(customer.last_wash_date);
            return (
              <Card
                key={customer.id}
                className="border-border/50 cursor-pointer hover:bg-secondary/30 transition-colors"
                onClick={() => openCustomerDetail(customer)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="gradient-primary w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">{customer.name}</h3>
                          {customer.is_recurring && <Badge variant="secondary" className="text-[10px]">Recorrente</Badge>}
                          {!customer.is_active && <Badge variant="destructive" className="text-[10px]">Inativo</Badge>}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {customer.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{fromStorage(customer.phone)}</span>}
                          {(customer.car_model || customer.plate) && (
                            <span className="flex items-center gap-1">
                              <Car className="h-3 w-3" />
                              {[customer.car_model, customer.plate].filter(Boolean).join(" • ")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Badge className={`text-[10px] ${returnStatus.color} border-0`}>
                        {returnStatus.emoji} {returnStatus.label}
                      </Badge>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => openEdit(customer, e)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); setDeleteId(customer.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{customers.length === 0 ? "Nenhum cliente cadastrado ainda. Registre seu primeiro cliente para começar." : "Nenhum cliente encontrado"}</p>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Clientes com histórico de serviços finalizados não podem ser excluídos.
              Registros ativos no pátio serão removidos junto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={!!selectedCustomer} onOpenChange={(open) => { if (!open) setSelectedCustomer(null); }}>
        <SheetContent className="overflow-y-auto">
          {selectedCustomer && (
            <div className="space-y-6 mt-4">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {selectedCustomer.name}
                </SheetTitle>
              </SheetHeader>

              {selectedCustomer.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {fromStorage(selectedCustomer.phone)}
                </div>
              )}

              {(selectedCustomer.car_model || selectedCustomer.plate) && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-1">🚗 Veículo cadastrado</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedCustomer.plate && <span className="font-medium">{selectedCustomer.plate}</span>}
                    {selectedCustomer.plate && selectedCustomer.car_model && " — "}
                    {selectedCustomer.car_model}
                  </p>
                </div>
              )}

              {(() => {
                const rs = getReturnStatus(selectedCustomer.last_wash_date);
                return (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-1">Status de retorno</h4>
                    <Badge className={`${rs.color} border-0`}>{rs.emoji} {rs.label}</Badge>
                  </div>
                );
              })()}

              {customerHistory.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">📋 Último serviço</h4>
                  <div className="p-3 rounded-lg bg-secondary/50 space-y-1">
                    <p className="text-sm"><span className="text-muted-foreground">Tipo:</span> {customerHistory[0].serviceName}</p>
                    <p className="text-sm"><span className="text-muted-foreground">Data:</span> {new Date(customerHistory[0].date).toLocaleDateString("pt-BR")}</p>
                    <p className="text-sm"><span className="text-muted-foreground">Status:</span> {customerHistory[0].status}</p>
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1">
                  <History className="h-4 w-4" /> Histórico completo
                </h4>
                {historyLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
                  </div>
                ) : customerHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum serviço registrado ainda.</p>
                ) : (
                  <div className="space-y-2">
                    {customerHistory.map(h => (
                      <div key={h.id} className="flex items-center justify-between p-2 rounded bg-secondary/30 text-sm">
                        <div>
                          <p className="font-medium text-foreground">{h.serviceName}</p>
                          <p className="text-xs text-muted-foreground">{new Date(h.date).toLocaleDateString("pt-BR")}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">{h.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedCustomer.notes && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-1">Observações</h4>
                  <p className="text-sm text-muted-foreground italic">{selectedCustomer.notes}</p>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Customers;
