import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const paymentMethods = [
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao", label: "Cartão" },
];

interface FinalizeCarDialogProps {
  carId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface CarData {
  id: string;
  service_id: string | null;
  ad_hoc_service_name: string | null;
  final_price: number | null;
  customer_id: string;
  photo_url: string | null;
  customers?: { name: string; plate: string | null } | null;
  services?: { name: string; price: number } | null;
}

export const FinalizeCarDialog = ({ carId, open, onOpenChange, onSuccess }: FinalizeCarDialogProps) => {
  const { user } = useAuth();
  const [car, setCar] = useState<CarData | null>(null);
  const [amount, setAmount] = useState("");
  const [payment, setPayment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!carId || !open) return;
    (async () => {
      const { data } = await supabase
        .from("cars_in_yard")
        .select("id, service_id, ad_hoc_service_name, final_price, customer_id, photo_url, customers(name, plate), services(name, price)")
        .eq("id", carId)
        .maybeSingle();
      if (data) {
        setCar(data as any);
        const initialPrice =
          data.final_price != null
            ? Number(data.final_price)
            : (data as any).services?.price != null
            ? Number((data as any).services.price)
            : 0;
        setAmount(String(initialPrice));
      }
    })();
  }, [carId, open]);

  const reset = () => {
    setCar(null);
    setAmount("");
    setPayment("");
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const serviceName = car?.services?.name ?? car?.ad_hoc_service_name ?? "Serviço";
  const customerName = car?.customers?.name ?? "Cliente";
  const customerPlate = car?.customers?.plate ?? "";

  const handleFinalize = async () => {
    if (!user || !car) return;
    const value = parseFloat(amount.replace(",", "."));
    if (!value || value <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    if (!payment) {
      toast.error("Selecione a forma de pagamento");
      return;
    }
    setSaving(true);
    const today = new Date().toISOString().split("T")[0];
    const isTest = typeof window !== "undefined" && localStorage.getItem("modoTreino") === "true";
    const payLabel = paymentMethods.find((p) => p.value === payment)?.label;
    const description = `${serviceName} — ${customerName}${customerPlate ? ` (${customerPlate})` : ""}${payLabel ? ` (${payLabel})` : ""}`;

    const { error: cashErr } = await supabase.from("cash_flow_entries").insert({
      user_id: user.id,
      type: "entrada" as const,
      category: serviceName,
      description,
      amount: value,
      entry_date: today,
      is_test: isTest,
    });
    if (cashErr) {
      toast.error("Erro ao lançar no caixa");
      console.error(cashErr);
      setSaving(false);
      return;
    }

    const { error: upErr } = await supabase
      .from("cars_in_yard")
      .update({ status: "entregue", final_price: value })
      .eq("id", car.id);

    setSaving(false);
    if (upErr) {
      toast.error("Erro ao finalizar carro");
      return;
    }
    toast.success("Serviço finalizado ✅");
    reset();
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Finalizar serviço</DialogTitle>
        </DialogHeader>
        {car && (
          <div className="space-y-4">
            <div>
              <Label>Serviço</Label>
              <Input value={serviceName} readOnly className="bg-muted" />
            </div>
            <div>
              <Label>Cliente</Label>
              <Input value={`${customerName}${customerPlate ? ` (${customerPlate})` : ""}`} readOnly className="bg-muted" />
            </div>
            <div>
              <Label>Valor cobrado (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>Forma de pagamento</Label>
              <div className="flex gap-2 mt-1">
                {paymentMethods.map((m) => (
                  <Button
                    key={m.value}
                    type="button"
                    variant={payment === m.value ? "default" : "outline"}
                    className={`flex-1 ${payment === m.value ? "gradient-primary border-0" : ""}`}
                    onClick={() => setPayment(m.value)}
                  >
                    {m.label}
                  </Button>
                ))}
              </div>
            </div>
            <Button
              className="w-full gradient-primary border-0"
              onClick={handleFinalize}
              disabled={saving}
            >
              {saving ? "Finalizando..." : "Finalizar e lançar no caixa"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
