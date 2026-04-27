import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface AppSettings {
  plan_monthly_price: number;
  plan_semiannual_price: number;
  plan_semiannual_discount: number;
  plan_annual_price: number;
  plan_annual_discount: number;
}

interface TrialState {
  trial_ends_at: string | null;
  subscription_status: string | null;
  is_admin: boolean;
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  children: React.ReactNode;
}

export function TrialPaywallGate({ children }: Props) {
  const { user, signOut } = useAuth();
  const [state, setState] = useState<TrialState | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    if (!user) {
      setState(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const [profileRes, roleRes, settingsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("trial_ends_at, subscription_status")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle(),
        supabase
          .from("app_settings")
          .select("plan_monthly_price, plan_semiannual_price, plan_semiannual_discount, plan_annual_price, plan_annual_discount")
          .eq("id", 1)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setState({
        trial_ends_at: (profileRes.data?.trial_ends_at as string | null) ?? null,
        subscription_status: (profileRes.data?.subscription_status as string | null) ?? null,
        is_admin: !!roleRes.data,
      });
      if (settingsRes.data) setSettings(settingsRes.data as AppSettings);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const { expired, daysRemaining } = useMemo(() => {
    if (!state || state.is_admin || state.subscription_status === "active") {
      return { expired: false, daysRemaining: null as number | null };
    }
    if (!state.trial_ends_at) return { expired: false, daysRemaining: null };
    const end = new Date(state.trial_ends_at).getTime();
    const now = Date.now();
    const diffMs = end - now;
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return { expired: diffMs <= 0, daysRemaining: days };
  }, [state]);

  const showWarningBanner =
    !expired && daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 3;

  const handleSubscribeClick = () => {
    toast.info("Pagamentos serão habilitados em breve.", {
      description: "Entre em contato com o suporte para liberar sua conta.",
    });
  };

  const plans = settings && [
    {
      key: "monthly",
      name: "Mensal",
      price: settings.plan_monthly_price,
      suffix: "/mês",
      discount: 0,
    },
    {
      key: "semiannual",
      name: "Semestral",
      price: settings.plan_semiannual_price,
      suffix: "/semestre",
      discount: settings.plan_semiannual_discount,
    },
    {
      key: "annual",
      name: "Anual",
      price: settings.plan_annual_price,
      suffix: "/ano",
      discount: settings.plan_annual_discount,
      highlight: true,
    },
  ];

  return (
    <>
      {showWarningBanner && (
        <div className="bg-warning/10 border-b border-warning/30 px-4 py-2 text-sm text-warning-foreground text-center">
          Seu período de testes termina em{" "}
          <strong>{daysRemaining} {daysRemaining === 1 ? "dia" : "dias"}</strong>.
          Assine um plano para não perder o acesso.
        </div>
      )}
      {children}

      <Dialog open={expired} onOpenChange={() => { /* não dispensável */ }}>
        <DialogContent
          className="max-w-2xl"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl">Seu período de testes terminou</DialogTitle>
            <DialogDescription>
              Escolha um plano para continuar usando o Lavgo. Cancele quando quiser.
            </DialogDescription>
          </DialogHeader>

          {!plans && (
            <p className="text-center text-muted-foreground py-8">Carregando planos…</p>
          )}

          {plans && (
            <div className="grid gap-3 md:grid-cols-3 mt-2">
              {plans.map((p) => (
                <Card
                  key={p.key}
                  className={`p-4 flex flex-col gap-3 ${p.highlight ? "border-primary border-2" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{p.name}</h3>
                    {p.discount > 0 && (
                      <Badge className="bg-success/15 text-success border-success/30" variant="outline">
                        -{p.discount}%
                      </Badge>
                    )}
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{fmtBRL(p.price)}</div>
                    <div className="text-xs text-muted-foreground">{p.suffix}</div>
                  </div>
                  <ul className="text-sm space-y-1 text-muted-foreground flex-1">
                    <li className="flex gap-2"><Check className="h-4 w-4 text-success shrink-0 mt-0.5" /> Notificações WhatsApp</li>
                    <li className="flex gap-2"><Check className="h-4 w-4 text-success shrink-0 mt-0.5" /> Pátio e clientes ilimitados</li>
                    <li className="flex gap-2"><Check className="h-4 w-4 text-success shrink-0 mt-0.5" /> Controle de caixa</li>
                  </ul>
                  <Button onClick={handleSubscribeClick} variant={p.highlight ? "default" : "outline"}>
                    Assinar {p.name}
                  </Button>
                </Card>
              ))}
            </div>
          )}

          <div className="flex justify-center pt-2">
            <button
              onClick={signOut}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              Sair da conta
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
