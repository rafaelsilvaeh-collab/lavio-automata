import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

const paymentMethods = [
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao", label: "Cartão" },
];

interface RegisterCarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const RegisterCarDialog = ({ open, onOpenChange, onSuccess }: RegisterCarDialogProps) => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("40");
  const [notifyTime, setNotifyTime] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [customers, setCustomers] = useState<Tables<"customers">[]>([]);
  const [services, setServices] = useState<Tables<"services">[]>([]);

  const selectedServiceData = services.find((s) => s.id === selectedService);
  const servicePrice = selectedServiceData ? Number(selectedServiceData.price) : null;

  useEffect(() => {
    if (!user || !open) return;
    const load = async () => {
      const [{ data: c }, { data: s }] = await Promise.all([
        supabase.from("customers").select("*").order("name"),
        supabase.from("services").select("*").order("name"),
      ]);
      setCustomers(c || []);
      setServices(s || []);
    };
    load();
  }, [user, open]);

  const reset = () => {
    setSelectedCustomer("");
    setSelectedService("");
    setEstimatedMinutes("40");
    setNotifyTime("");
    setPaymentMethod("");
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
      reset();
      onOpenChange(false);
      onSuccess?.();
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              <Input type="text" value={`R$ ${servicePrice.toFixed(2)}`} readOnly className="bg-muted cursor-not-allowed" />
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
  );
};
