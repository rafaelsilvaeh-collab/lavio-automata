import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, Car, MessageSquare, ChevronRight, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";
import { RegisterCarDialog } from "@/components/RegisterCarDialog";

type CarStatus = "aguardando" | "em_lavagem" | "finalizado" | "cliente_avisado" | "entregue";

// Simplified visual statuses (3 states)
type SimpleStatus = "chegou" | "lavando" | "pronto";

const toSimple = (s: CarStatus): SimpleStatus => {
  if (s === "aguardando") return "chegou";
  if (s === "em_lavagem") return "lavando";
  return "pronto"; // finalizado | cliente_avisado
};

const simpleConfig: Record<SimpleStatus, { label: string; emoji: string; className: string; dot: string }> = {
  chegou:  { label: "Chegou",            emoji: "🟡", className: "bg-[#fef9c3] text-[#854d0e]", dot: "bg-[#f59e0b]" },
  lavando: { label: "Lavando",           emoji: "🔵", className: "bg-[#dbeafe] text-[#1e40af]", dot: "bg-[#3b82f6]" },
  pronto:  { label: "Pronto pra retirar", emoji: "✅", className: "bg-[#dcfce7] text-[#15803d]", dot: "bg-[#22c55e]" },
};

const simpleOrder: SimpleStatus[] = ["chegou", "lavando", "pronto"];

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
  const [services, setServices] = useState<Tables<"services">[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editNotifyId, setEditNotifyId] = useState<string | null>(null);
  const [newNotifyTime, setNewNotifyTime] = useState("");

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

  const fetchServices = async () => {
    if (!user) return;
    const { data } = await supabase.from("services").select("*").order("name");
    setServices(data || []);
  };

  useEffect(() => {
    fetchCars();
    fetchServices();
  }, [user]);

  // Move a car to next simple state by updating db status
  const advance = async (id: string, current: CarStatus) => {
    let next: CarStatus | null = null;
    if (current === "aguardando") next = "em_lavagem";
    else if (current === "em_lavagem") next = "cliente_avisado";
    else if (current === "finalizado" || current === "cliente_avisado") next = "entregue";
    if (!next) return;

    const { error } = await supabase.from("cars_in_yard").update({ status: next }).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      if (next === "cliente_avisado") toast.success("Carro pronto! Cliente será avisado.");
      else if (next === "em_lavagem") toast.success("Lavagem iniciada!");
      else if (next === "entregue") toast.success("Carro entregue! ✅");
      fetchCars();
    }
  };

  const advanceLabel = (current: CarStatus) => {
    if (current === "aguardando") return "▶ Iniciou lavagem";
    if (current === "em_lavagem") return "✅ Carro pronto";
    return "Entregar e finalizar";
  };

  const updateNotifyTime = async (id: string) => {
    const today = new Date().toISOString().split("T")[0];
    const { error } = await supabase
      .from("cars_in_yard")
      .update({ scheduled_notification_time: `${today}T${newNotifyTime}:00` })
      .eq("id", id);
    if (error) toast.error("Erro ao atualizar horário");
    else { setEditNotifyId(null); toast.success("Horário do aviso atualizado!"); fetchCars(); }
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return "--:--";
    try { return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); }
    catch { return "--:--"; }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div><Skeleton className="h-8 w-32" /><Skeleton className="h-4 w-48 mt-2" /></div>
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  const noServices = services.length === 0;

  return (
    <div className="space-y-6">
      {noServices && (
        <div className="bg-[#fef9c3] border-l-4 border-[#eab308] text-[#854d0e] rounded-lg p-3 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-medium">Configure seus serviços antes de registrar um carro.</p>
            <Link to="/services" className="underline font-semibold inline-block mt-1">Ir para Serviços →</Link>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pátio</h1>
          <p className="text-muted-foreground text-sm">{cars.length} carros no pátio</p>
        </div>
        <Button className="gradient-primary border-0" onClick={() => setOpen(true)} disabled={noServices}>
          <Plus className="mr-2 h-4 w-4" /> Registrar carro
        </Button>
        <RegisterCarDialog open={open} onOpenChange={setOpen} onSuccess={fetchCars} />
      </div>

      <div className="grid gap-3">
        {cars.map((car) => {
          const simple = toSimple(car.status);
          const config = simpleConfig[simple];

          return (
            <Card key={car.id} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{car.customerName}</h3>
                      <Badge className={`text-[10px] ${config.className} border-0`}>{config.emoji} {config.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      <Car className="h-3 w-3 inline mr-1" />{car.customerPlate || "Sem placa"} • {car.serviceName || "Sem serviço"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 mb-3">
                  {simpleOrder.map((s, i) => {
                    const reached = simpleOrder.indexOf(simple) >= i;
                    return (
                      <div key={s} className="flex items-center">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${reached ? simpleConfig[s].dot : "bg-border"}`} />
                        {i < simpleOrder.length - 1 && (
                          <div className={`w-8 h-0.5 ${simpleOrder.indexOf(simple) > i ? "bg-primary" : "bg-border"}`} />
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
                  <Button size="sm" className="gradient-primary border-0 text-xs" onClick={() => advance(car.id, car.status)}>
                    {advanceLabel(car.status)} <ChevronRight className="ml-1 h-3 w-3" />
                  </Button>
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
