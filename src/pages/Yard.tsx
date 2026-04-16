import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Clock, Car, MessageSquare, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

type CarStatus = "aguardando" | "em_lavagem" | "finalizado" | "cliente_avisado" | "entregue";

const statusConfig: Record<CarStatus, { label: string; className: string }> = {
  aguardando: { label: "Aguardando", className: "bg-warning/10 text-warning" },
  em_lavagem: { label: "Em lavagem", className: "bg-primary/10 text-primary" },
  finalizado: { label: "Finalizado", className: "bg-success/10 text-success" },
  cliente_avisado: { label: "Cliente avisado", className: "bg-accent/10 text-accent" },
  entregue: { label: "Entregue", className: "bg-muted text-muted-foreground" },
};

const statusOrder: CarStatus[] = ["aguardando", "em_lavagem", "finalizado", "cliente_avisado", "entregue"];

const paymentMethods = [
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao", label: "Cartão" },
];

interface YardCarFull {
  id: string;
  status: CarStatus;
  entry_time: string;
  estimated_duration: number | null;
  scheduled_notification_time: string | null;
  notes: string | null;
  customer_id: string;
  service_id: string | null;
  customerName: string;
  customerPlate: string | null;
  serviceName: string | null;
}

const Yard = () => {
  const { user } = useAuth();
  const [cars, setCars] = useState<YardCarFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editNotifyId, setEditNotifyId] = useState<string | null>(null);
  const [newNotifyTime, setNewNotifyTime] = useState("");

  // Form state
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("40");
  const [notifyTime, setNotifyTime] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  // Dropdown data
  const [customers, setCustomers] = useState<Tables<"customers">[]>([]);
  const [services, setServices] = useState<Tables<"services">[]>([]);

  // Derived read-only price
  const selectedServiceData = services.find((s) => s.id === selectedService);
  const servicePrice = selectedServiceData ? Number(selectedServiceData.price) : null;

  const fetchCars = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("cars_in_yard")
      .select("*, customers(name, plate), services(name)")
      .neq("status", "entregue")
      .order("entry_time", { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setCars((data || []).map((c: any) => ({
        id: c.id,
        status: c.status,
        entry_time: c.entry_time,
        estimated_duration: c.estimated_duration,
        scheduled_notification_time: c.scheduled_notification_time,
        notes: c.notes,
        customer_id: c.customer_id,
        service_id: c.service_id,
        customerName: c.customers?.name || "Sem nome",
        customerPlate: c.customers?.plate || null,
        serviceName: c.services?.name || null,
      })));
    }
    setLoading(false);
  };

  const fetchDropdowns = async () => {
    if (!user) return;
    const [{ data: c }, { data: s }] = await Promise.all([
      supabase.from("customers").select("*").order("name"),
      supabase.from("services").select("*").order("name"),
    ]);
    setCustomers(c || []);
    setServices(s || []);
  };

  useEffect(() => {
    fetchCars();
    fetchDropdowns();
  }, [user]);

  const advanceStatus = async (id: string, currentStatus: CarStatus) => {
    const idx = statusOrder.indexOf(currentStatus);
    if (idx >= statusOrder.length - 1) return;
    const next = statusOrder[idx + 1];

    const { error } = await supabase
      .from("cars_in_yard")
      .update({ status: next })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      if (next === "cliente_avisado") {
        toast.success("Status atualizado! Cliente será avisado.");
      } else {
        toast.success("Status atualizado!");
      }
      fetchCars();
    }
  };

  const updateNotifyTime = async (id: string) => {
    const today = new Date().toISOString().split("T")[0];
    const { error } = await supabase
      .from("cars_in_yard")
      .update({ scheduled_notification_time: `${today}T${newNotifyTime}:00` })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar horário");
    } else {
      setEditNotifyId(null);
      toast.success("Horário do aviso atualizado!");
      fetchCars();
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedCustomer) {
      toast.error("Selecione um cliente");
      return;
    }
    setSaving(true);

    const today = new Date().toISOString().split("T")[0];
    const { error } = await supabase.from("cars_in_yard").insert({
      user_id: user.id,
      customer_id: selectedCustomer,
      service_id: selectedService || null,
      estimated_duration: parseInt(estimatedMinutes) || null,
      scheduled_notification_time: notifyTime ? `${today}T${notifyTime}:00` : null,
    });

    if (error) {
      toast.error("Erro ao registrar carro");
      console.error(error);
    } else {
      // Auto-create cash flow entry if service selected
      if (selectedService && selectedServiceData && servicePrice && servicePrice > 0) {
        const customer = customers.find((c) => c.id === selectedCustomer);
        const payLabel = paymentMethods.find((p) => p.value === paymentMethod)?.label;
        const desc = [
          customer ? `${customer.name}${customer.plate ? ` - ${customer.plate}` : ""}` : "",
          payLabel ? `(${payLabel})` : "",
        ].filter(Boolean).join(" ");

        await supabase.from("cash_flow_entries").insert({
          user_id: user.id,
          type: "entrada" as const,
          amount: servicePrice,
          category: selectedServiceData.name,
          description: desc || undefined,
          entry_date: today,
        });
      }
      toast.success("Carro registrado e lançado no caixa ✅");
      setOpen(false);
      setSelectedCustomer("");
      setSelectedService("");
      setEstimatedMinutes("40");
      setNotifyTime("");
      setPaymentMethod("");
      fetchCars();
    }
    setSaving(false);
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return "--:--";
    try {
      return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "--:--";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div><Skeleton className="h-8 w-32" /><Skeleton className="h-4 w-48 mt-2" /></div>
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pátio</h1>
          <p className="text-muted-foreground text-sm">{cars.length} carros no pátio</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary border-0"><Plus className="mr-2 h-4 w-4" /> Registrar carro</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Registrar carro</DialogTitle></DialogHeader>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <Label>Cliente</Label>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
                  <SelectContent>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}{c.plate ? ` - ${c.plate}` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Serviço</Label>
                <Select value={selectedService} onValueChange={setSelectedService}>
                  <SelectTrigger><SelectValue placeholder="Selecionar serviço" /></SelectTrigger>
                  <SelectContent>
                    {services.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name} — R${Number(s.price).toFixed(2)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {servicePrice !== null && (
                <div>
                  <Label>Preço (R$)</Label>
                  <Input
                    type="text"
                    value={`R$ ${servicePrice.toFixed(2)}`}
                    readOnly
                    className="bg-muted cursor-not-allowed"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">Para alterar o preço, edite em Serviços.</p>
                </div>
              )}
              <div>
                <Label>Forma de pagamento</Label>
                <div className="flex gap-2 mt-1">
                  {paymentMethods.map((m) => (
                    <Button
                      key={m.value}
                      type="button"
                      size="sm"
                      variant={paymentMethod === m.value ? "default" : "outline"}
                      className={paymentMethod === m.value ? "gradient-primary border-0" : ""}
                      onClick={() => setPaymentMethod(m.value)}
                    >
                      {m.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Tempo estimado (min)</Label><Input type="number" value={estimatedMinutes} onChange={e => setEstimatedMinutes(e.target.value)} /></div>
                <div><Label>Horário do aviso</Label><Input type="time" value={notifyTime} onChange={e => setNotifyTime(e.target.value)} /></div>
              </div>
              <Button type="submit" className="w-full gradient-primary border-0" disabled={saving}>
                {saving ? "Registrando..." : "Registrar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {cars.map((car) => {
          const config = statusConfig[car.status];
          const nextIdx = statusOrder.indexOf(car.status) + 1;
          const nextStatus = nextIdx < statusOrder.length ? statusConfig[statusOrder[nextIdx]] : null;

          return (
            <Card key={car.id} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{car.customerName}</h3>
                      <Badge className={`text-[10px] ${config.className} border-0`}>{config.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      <Car className="h-3 w-3 inline mr-1" />{car.customerPlate || "Sem placa"} • {car.serviceName || "Sem serviço"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 mb-3 overflow-x-auto">
                  {statusOrder.map((s, i) => {
                    const reached = statusOrder.indexOf(car.status) >= i;
                    return (
                      <div key={s} className="flex items-center">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${reached ? "bg-primary" : "bg-border"}`} />
                        {i < statusOrder.length - 1 && (
                          <div className={`w-6 h-0.5 ${reached && statusOrder.indexOf(car.status) > i ? "bg-primary" : "bg-border"}`} />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-3">
                  <span><Clock className="h-3 w-3 inline mr-1" />Entrada: {formatTime(car.entry_time)}</span>
                  <span>•</span>
                  <span>{car.estimated_duration || "?"}min estimados</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    Aviso: {formatTime(car.scheduled_notification_time)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {nextStatus && (
                    <Button size="sm" className="gradient-primary border-0 text-xs" onClick={() => advanceStatus(car.id, car.status)}>
                      {nextStatus.label} <ChevronRight className="ml-1 h-3 w-3" />
                    </Button>
                  )}
                  {editNotifyId === car.id ? (
                    <div className="flex gap-2 items-center">
                      <Input type="time" className="h-8 w-28 text-xs" value={newNotifyTime} onChange={e => setNewNotifyTime(e.target.value)} />
                      <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => updateNotifyTime(car.id)}>Salvar</Button>
                      <Button size="sm" variant="ghost" className="text-xs h-8" onClick={() => setEditNotifyId(null)}>Cancelar</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => { setEditNotifyId(car.id); setNewNotifyTime(""); }}>
                      Alterar horário do aviso
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {cars.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Car className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum veículo no pátio. Os veículos aparecem aqui quando uma lavagem é registrada.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Yard;
