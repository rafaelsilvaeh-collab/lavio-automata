import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, QrCode, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatPhoneInput, toStorage } from "@/lib/phone";

interface OnboardingModalProps {
  open: boolean;
  onComplete: () => void;
}

interface ServiceOption {
  emoji: string;
  name: string;
  price: number;
  selected: boolean;
}

const DEFAULT_SERVICES: ServiceOption[] = [
  { emoji: "🚿", name: "Simples", price: 80, selected: false },
  { emoji: "✨", name: "Completa", price: 100, selected: false },
  { emoji: "💎", name: "Polimento", price: 150, selected: false },
  { emoji: "🧴", name: "Higienização", price: 200, selected: false },
];

const formatPlate = (raw: string) => {
  const v = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
  if (v.length <= 3) return v;
  return `${v.slice(0, 3)}-${v.slice(3)}`;
};

export const OnboardingModal = ({ open, onComplete }: OnboardingModalProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [services, setServices] = useState<ServiceOption[]>(DEFAULT_SERVICES);
  const [extras, setExtras] = useState<{ name: string; price: string }[]>([]);

  // Step 2
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custPlate, setCustPlate] = useState("");
  const [custModel, setCustModel] = useState("");

  // Step 3
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [connected, setConnected] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const invokeWhatsApp = async (action: string, extra: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke("whatsapp", { body: { action, ...extra } });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (step !== 3 || !qrCodeBase64 || connected) {
      stopPolling();
      return;
    }
    pollingRef.current = setInterval(async () => {
      try {
        const data = await invokeWhatsApp("check-status");
        if (data?.conectado === true) {
          setConnected(true);
          setQrCodeBase64(null);
          stopPolling();
          toast.success("WhatsApp conectado!");
        }
      } catch { /* ignore */ }
    }, 5000);
    return stopPolling;
  }, [step, qrCodeBase64, connected, stopPolling]);

  const finishOnboarding = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ onboarding_completed: true }).eq("user_id", user.id);
    onComplete();
  };

  const handleStep1 = async (skip = false) => {
    if (skip) { setStep(2); return; }
    if (!user) return;
    setSaving(true);
    const toInsert = [
      ...services.filter(s => s.selected).map(s => ({
        user_id: user.id, name: s.name, price: s.price, duration_minutes: 30,
      })),
      ...extras.filter(e => e.name.trim() && Number(e.price) > 0).map(e => ({
        user_id: user.id, name: e.name.trim(), price: Number(e.price), duration_minutes: 30,
      })),
    ];
    if (toInsert.length > 0) {
      const { error } = await supabase.from("services").insert(toInsert);
      if (error) { toast.error("Erro ao salvar serviços"); setSaving(false); return; }
      toast.success(`${toInsert.length} serviço(s) cadastrado(s)`);
    }
    setSaving(false);
    setStep(2);
  };

  const handleStep2 = async (skip = false) => {
    if (skip) { setStep(3); return; }
    if (!user) return;
    if (!custName.trim() || !custPhone.trim() || !custPlate.trim()) {
      toast.error("Preencha nome, WhatsApp e placa");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("customers").insert({
      user_id: user.id,
      name: custName.trim(),
      phone: toStorage(custPhone),
      plate: custPlate,
      car_model: custModel.trim() || null,
    });
    if (error) { toast.error("Erro ao salvar cliente"); setSaving(false); return; }
    toast.success("Cliente cadastrado!");
    setSaving(false);
    setStep(3);
  };

  const handleConnectWhatsApp = async () => {
    setLoadingQr(true);
    setQrCodeBase64(null);
    try {
      await invokeWhatsApp("create-instance");
      const data = await invokeWhatsApp("get-qrcode");
      const base64 = data?.qrcode?.base64 || data?.base64;
      if (base64) setQrCodeBase64(base64);
      else toast.info("QR Code não disponível. Tente novamente.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao conectar WhatsApp");
    }
    setLoadingQr(false);
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Passo {step} de 3</span>
            <div className="flex gap-1">
              {[1, 2, 3].map(n => (
                <div key={n} className={`h-1.5 w-8 rounded-full ${n <= step ? "bg-primary" : "bg-border"}`} />
              ))}
            </div>
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-4xl mb-2">🛠️</div>
                <h2 className="text-xl font-bold text-foreground">Quais serviços você oferece?</h2>
                <p className="text-sm text-muted-foreground">Toque para selecionar e ajuste o preço se quiser.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {services.map((s, i) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => setServices(prev => prev.map((p, j) => j === i ? { ...p, selected: !p.selected } : p))}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${s.selected ? "border-primary bg-primary/5" : "border-border bg-background"}`}
                  >
                    <div className="text-2xl">{s.emoji}</div>
                    <div className="font-semibold text-sm text-foreground mt-1">{s.name}</div>
                    <div className="mt-2 flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <span className="text-xs text-muted-foreground">R$</span>
                      <input
                        type="number"
                        value={s.price}
                        onChange={(e) => setServices(prev => prev.map((p, j) => j === i ? { ...p, price: Number(e.target.value) } : p))}
                        className="w-14 text-center text-sm font-bold bg-transparent border-b border-border focus:outline-none focus:border-primary"
                      />
                    </div>
                  </button>
                ))}
              </div>
              {extras.map((e, i) => (
                <div key={i} className="grid grid-cols-[1fr_100px] gap-2">
                  <Input placeholder="Nome do serviço" value={e.name} onChange={(ev) => setExtras(prev => prev.map((p, j) => j === i ? { ...p, name: ev.target.value } : p))} />
                  <Input type="number" placeholder="Preço" value={e.price} onChange={(ev) => setExtras(prev => prev.map((p, j) => j === i ? { ...p, price: ev.target.value } : p))} />
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setExtras(prev => [...prev, { name: "", price: "" }])}>
                + Adicionar outro serviço
              </Button>
              <Button onClick={() => handleStep1(false)} disabled={saving} className="w-full gradient-primary border-0">
                Continuar →
              </Button>
              <button type="button" onClick={() => handleStep1(true)} className="w-full text-sm text-muted-foreground hover:text-foreground">
                Pular por agora
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-4xl mb-2">👤</div>
                <h2 className="text-xl font-bold text-foreground">Cadastre seu primeiro cliente</h2>
                <p className="text-sm text-muted-foreground">Você vai precisar disso para registrar uma lavagem.</p>
              </div>
              <div className="space-y-3">
                <div>
                  <Label>Nome do cliente *</Label>
                  <Input value={custName} onChange={(e) => setCustName(e.target.value)} placeholder="Ex: João Silva" />
                </div>
                <div>
                  <Label>WhatsApp *</Label>
                  <Input value={custPhone} onChange={(e) => setCustPhone(formatPhoneInput(e.target.value))} placeholder="(15) 99999-9999" />
                </div>
                <div>
                  <Label>Placa *</Label>
                  <Input value={custPlate} onChange={(e) => setCustPlate(formatPlate(e.target.value))} placeholder="ABC-1D23" />
                </div>
                <div>
                  <Label>Modelo do veículo</Label>
                  <Input value={custModel} onChange={(e) => setCustModel(e.target.value)} placeholder="Ex: Honda Civic" />
                </div>
              </div>
              <Button onClick={() => handleStep2(false)} disabled={saving} className="w-full gradient-primary border-0">
                Continuar →
              </Button>
              <button type="button" onClick={() => handleStep2(true)} className="w-full text-sm text-muted-foreground hover:text-foreground">
                Pular por agora
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-4xl mb-2">💬</div>
                <h2 className="text-xl font-bold text-foreground">Conecte seu WhatsApp</h2>
                <p className="text-sm text-muted-foreground">As mensagens automáticas saem do seu próprio número.</p>
              </div>

              <div className="w-56 h-56 mx-auto bg-secondary rounded-2xl flex items-center justify-center border-2 border-dashed border-border overflow-hidden">
                {loadingQr ? (
                  <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                ) : connected ? (
                  <div className="text-center text-success">
                    <Check className="h-16 w-16 mx-auto" />
                    <p className="text-sm font-semibold mt-2">Conectado!</p>
                  </div>
                ) : qrCodeBase64 ? (
                  <img src={qrCodeBase64} alt="QR Code" className="w-full h-full object-contain p-2" />
                ) : (
                  <div className="text-center">
                    <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Clique abaixo para gerar</p>
                  </div>
                )}
              </div>

              {!connected && !qrCodeBase64 && (
                <Button onClick={handleConnectWhatsApp} disabled={loadingQr} className="w-full gradient-primary border-0">
                  {loadingQr ? "Carregando..." : "Gerar QR Code"}
                </Button>
              )}

              {qrCodeBase64 && !connected && (
                <div className="text-xs text-muted-foreground space-y-1 bg-secondary/50 p-3 rounded-lg">
                  <p>1. Abra o WhatsApp no seu celular</p>
                  <p>2. Toque em Menu → Aparelhos conectados</p>
                  <p>3. Aponte a câmera para este QR Code</p>
                  <p className="text-primary mt-2">Verificando conexão...</p>
                </div>
              )}

              {connected && (
                <Button onClick={finishOnboarding} className="w-full gradient-primary border-0">
                  Começar a usar o Lavgo ✅
                </Button>
              )}

              <button type="button" onClick={finishOnboarding} className="w-full text-sm text-muted-foreground hover:text-foreground">
                Conectar depois
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
