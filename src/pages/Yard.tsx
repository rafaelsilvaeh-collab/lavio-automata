import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, Car, MessageSquare, ChevronRight, AlertTriangle, Trash2, Pencil, ImageIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";
import { RegisterCarDialog } from "@/components/RegisterCarDialog";
import { FinalizeCarDialog } from "@/components/FinalizeCarDialog";
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
import { Dialog, DialogContent } from "@/components/ui/dialog";

type CarStatus = "aguardando" | "em_lavagem" | "finalizado" | "cliente_avisado" | "entregue";

type SimpleStatus = "chegou" | "lavando" | "pronto";

const toSimple = (s: CarStatus): SimpleStatus => {
  if (s === "aguardando") return "chegou";
  if (s === "em_lavagem") return "lavando";
  return "pronto";
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
  entry_notes: string | null;
  photo_url: string | null;
  customer_id: string;
  service_id: string | null;
  ad_hoc_service_name: string | null;
  final_price: number | null;
  customerName: string;
  customerPlate: string | null;
  serviceName: string | null;
  signedPhotoUrl?: string | null;
}

const Yard = () => {
  const { user } = useAuth();
  const [cars, setCars] = useState<YardCarFull[]>([]);
  const [services, setServices] = useState<Tables<"services">[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [finalizeId, setFinalizeId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
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
      setLoading(false);
      return;
    }
    const list: YardCarFull[] = (data || []).map((c: any) => ({
      id: c.id,
      status: c.status,
      entry_time: c.entry_time,
      estimated_duration: c.estimated_duration,
      scheduled_notification_time: c.scheduled_notification_time,
      notes: c.notes,
      entry_notes: c.entry_notes,
      photo_url: c.photo_url,
      customer_id: c.customer_id,
      service_id: c.service_id,
      ad_hoc_service_name: c.ad_hoc_service_name,
      final_price: c.final_price,
      customerName: c.customers?.name || "Sem nome",
      customerPlate: c.customers?.plate || null,
      serviceName: c.services?.name || c.ad_hoc_service_name || null,
    }));

    // Sign photo URLs
    await Promise.all(
      list.map(async (c) => {
        if (c.photo_url) {
          const { data: signed } = await supabase.storage
            .from("vehicle-photos")
            .createSignedUrl(c.photo_url, 3600);
          c.signedPhotoUrl = signed?.signedUrl || null;
        }
      })
    );
    setCars(list);
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

  const advance = async (id: string, current: CarStatus) => {
    if (current === "em_lavagem") {
      setFinalizeId(id);
      return;
    }
    let next: CarStatus | null = null;
    if (current === "aguardando") next = "em_lavagem";
    else if (current === "finalizado" || current === "cliente_avisado") next = "entregue";
    if (!next) return;

    const { error } = await supabase.from("cars_in_yard").update({ status: next }).eq("id", id);
    if (error) toast.error("Erro ao atualizar status");
    else {
      if (next === "em_lavagem") toast.success("Lavagem iniciada!");
      else if (next === "entregue") toast.success("Carro entregue! ✅");
      fetchCars();
    }
  };

  const advanceLabel = (current: CarStatus) => {
    if (current === "aguardando") return "▶ Iniciou lavagem";
    if (current === "em_lavagem") return "✅ Carro pronto";
    return "Entregar e finalizar";
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const car = cars.find((c) => c.id === deleteId);
    const { error } = await supabase.from("cars_in_yard").delete().eq("id", deleteId);
    if (error) {
      toast.error("Erro ao excluir registro");
    } else {
      if (car?.photo_url) {
        await supabase.storage.from("vehicle-photos").remove([car.photo_url]);
      }
      toast.success("Registro excluído");
      fetchCars();
    }
    setDeleteId(null);
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
        <Button className="gradient-primary border-0" onClick={() => { setEditId(null); setOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Registrar carro
        </Button>
      </div>

      <RegisterCarDialog
        open={open}
        onOpenChange={(v) => { setOpen(v); if (!v) setEditId(null); }}
        onSuccess={fetchCars}
        editId={editId}
      />
      <FinalizeCarDialog
        carId={finalizeId}
        open={!!finalizeId}
        onOpenChange={(v) => { if (!v) setFinalizeId(null); }}
        onSuccess={fetchCars}
      />

      <div className="grid gap-3">
        {cars.map((car) => {
          const simple = toSimple(car.status);
          const config = simpleConfig[simple];

          return (
            <Card key={car.id} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {car.signedPhotoUrl ? (
                      <button
                        type="button"
                        onClick={() => setPhotoPreview(car.signedPhotoUrl!)}
                        className="w-14 h-14 rounded-lg overflow-hidden border border-border flex-shrink-0"
                      >
                        <img src={car.signedPhotoUrl} alt="Veículo" className="w-full h-full object-cover" />
                      </button>
                    ) : (
                      <div className="w-14 h-14 rounded-lg border border-border bg-muted flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">{car.customerName}</h3>
                        <Badge className={`text-[10px] ${config.className} border-0`}>{config.emoji} {config.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        <Car className="h-3 w-3 inline mr-1" />{car.customerPlate || "Sem placa"} • {car.serviceName || "Sem serviço"}
                      </p>
                      {car.entry_notes && !car.signedPhotoUrl && (
                        <p className="text-xs text-muted-foreground mt-1 italic">📝 {car.entry_notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {(car.status === "aguardando" || car.status === "em_lavagem") && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => { setEditId(car.id); setOpen(true); }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(car.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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

      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove o carro do pátio e apaga a foto associada. Não afeta o caixa.
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

      <Dialog open={!!photoPreview} onOpenChange={(v) => { if (!v) setPhotoPreview(null); }}>
        <DialogContent className="max-w-2xl p-2">
          {photoPreview && <img src={photoPreview} alt="Veículo" className="w-full h-auto rounded" />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Yard;
