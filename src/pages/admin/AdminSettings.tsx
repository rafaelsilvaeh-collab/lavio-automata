import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save } from "lucide-react";

interface Settings {
  plan_monthly_price: number;
  plan_semiannual_price: number;
  plan_semiannual_discount: number;
  plan_annual_price: number;
  plan_annual_discount: number;
  trial_days: number;
  msg_completion_default: string;
  msg_reactivation_default: string;
}

const renderPreview = (tpl: string) =>
  tpl.replace(/\{nome\}/g, "João").replace(/\{modelo\}/g, "Gol").replace(/\{placa\}/g, "ABC-1234");

export function AdminSettings() {
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("app_settings").select("*").eq("id", 1).maybeSingle();
      if (data) setS(data as Settings);
    })();
  }, []);

  const save = async () => {
    if (!s) return;
    setSaving(true);
    const { error } = await supabase.from("app_settings").update(s as any).eq("id", 1);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Configurações salvas");
  };

  if (!s) return <div className="text-muted-foreground">Carregando…</div>;

  const upd = <K extends keyof Settings>(k: K, v: Settings[K]) => setS({ ...s, [k]: v });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Preços e trial</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Preço mensal (R$)</Label>
              <Input type="number" step="0.01" value={s.plan_monthly_price}
                onChange={(e) => upd("plan_monthly_price", +e.target.value)} />
            </div>
            <div>
              <Label>Preço semestral (R$)</Label>
              <Input type="number" step="0.01" value={s.plan_semiannual_price}
                onChange={(e) => upd("plan_semiannual_price", +e.target.value)} />
            </div>
            <div>
              <Label>Desconto semestral (%)</Label>
              <Input type="number" value={s.plan_semiannual_discount}
                onChange={(e) => upd("plan_semiannual_discount", +e.target.value)} />
            </div>
            <div>
              <Label>Preço anual (R$)</Label>
              <Input type="number" step="0.01" value={s.plan_annual_price}
                onChange={(e) => upd("plan_annual_price", +e.target.value)} />
            </div>
            <div>
              <Label>Desconto anual (%)</Label>
              <Input type="number" value={s.plan_annual_discount}
                onChange={(e) => upd("plan_annual_discount", +e.target.value)} />
            </div>
            <div>
              <Label>Dias de trial</Label>
              <Input type="number" value={s.trial_days}
                onChange={(e) => upd("trial_days", +e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Mensagens padrão (WhatsApp)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Mensagem de conclusão</Label>
              <Textarea rows={4} value={s.msg_completion_default}
                onChange={(e) => upd("msg_completion_default", e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Variáveis: {`{nome}`} {`{modelo}`} {`{placa}`}</p>
            </div>
            <div>
              <Label>Preview</Label>
              <div className="bg-muted p-3 rounded text-sm min-h-[100px] whitespace-pre-wrap">
                {renderPreview(s.msg_completion_default)}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Mensagem de reativação</Label>
              <Textarea rows={4} value={s.msg_reactivation_default}
                onChange={(e) => upd("msg_reactivation_default", e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Variáveis: {`{nome}`} {`{modelo}`}</p>
            </div>
            <div>
              <Label>Preview</Label>
              <div className="bg-muted p-3 rounded text-sm min-h-[100px] whitespace-pre-wrap">
                {renderPreview(s.msg_reactivation_default)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="gradient-primary border-0">
          <Save className="mr-2 h-4 w-4" /> {saving ? "Salvando…" : "Salvar configurações"}
        </Button>
      </div>
    </div>
  );
}
