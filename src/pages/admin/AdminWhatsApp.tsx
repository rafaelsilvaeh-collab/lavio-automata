import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, Send } from "lucide-react";

interface InstanceRow {
  instance_name: string;
  state: string;
  owner_user_id: string | null;
  owner_business_name: string | null;
}

export function AdminWhatsApp() {
  const [status, setStatus] = useState<{ ok: boolean; host: string; version: string | null } | null>(null);
  const [instances, setInstances] = useState<InstanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ instanceName: "", phone: "", message: "Teste do painel admin" });
  const [response, setResponse] = useState<string>("");
  const [sending, setSending] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    const [s, i] = await Promise.all([
      supabase.functions.invoke("admin-evolution", { body: { action: "get-status" } }),
      supabase.functions.invoke("admin-evolution", { body: { action: "list-instances" } }),
    ]);
    if (!s.error && s.data) setStatus({ ok: s.data.ok, host: s.data.host, version: s.data.version });
    if (!i.error && i.data) setInstances(i.data.instances || []);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const sendTest = async () => {
    if (!form.instanceName || !form.phone || !form.message) {
      toast.error("Preencha todos os campos");
      return;
    }
    setSending(true);
    setResponse("");
    const { data, error } = await supabase.functions.invoke("admin-evolution", {
      body: { action: "send-test", ...form },
    });
    setSending(false);
    if (error) {
      setResponse(JSON.stringify({ error: error.message }, null, 2));
      toast.error("Falha ao enviar");
      return;
    }
    setResponse(JSON.stringify(data, null, 2));
    if (data?.send_ok) toast.success("Mensagem enviada");
    else toast.error("Resposta da API indica falha — veja o body abaixo");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Status da Evolution API</CardTitle>
          <Button variant="ghost" size="sm" onClick={loadAll} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          {status ? (
            <div className="flex flex-wrap gap-3 items-center">
              <Badge className={status.ok ? "bg-success/15 text-success border-success/30" : "bg-destructive/15 text-destructive border-destructive/30"} variant="outline">
                {status.ok ? "Online" : "Offline"}
              </Badge>
              <span className="text-sm text-muted-foreground">Host: <code>{status.host}</code></span>
              {status.version && <span className="text-sm text-muted-foreground">Versão: <code>{status.version}</code></span>}
            </div>
          ) : <p className="text-sm text-muted-foreground">{loading ? "Carregando…" : "Sem dados"}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Teste de envio manual</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Instância</Label>
              <Input placeholder="ex: lavgo_xxxxxxxx" value={form.instanceName} onChange={(e) => setForm({ ...form, instanceName: e.target.value })} />
            </div>
            <div>
              <Label>Número destino</Label>
              <Input placeholder="5511999990000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Mensagem</Label>
            <Textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          </div>
          <Button onClick={sendTest} disabled={sending}>
            <Send className="mr-2 h-4 w-4" /> {sending ? "Enviando…" : "Enviar mensagem de teste"}
          </Button>
          {response && (
            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto max-h-80">{response}</pre>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Instâncias ativas ({instances.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Instância</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Estabelecimento vinculado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instances.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Nenhuma instância encontrada</TableCell></TableRow>
              )}
              {instances.map((i) => (
                <TableRow key={i.instance_name || Math.random()}>
                  <TableCell><code className="text-xs">{i.instance_name || "—"}</code></TableCell>
                  <TableCell>
                    <Badge variant="outline" className={i.state === "open" ? "bg-success/15 text-success border-success/30" : "text-muted-foreground"}>
                      {i.state}
                    </Badge>
                  </TableCell>
                  <TableCell>{i.owner_business_name || <span className="text-muted-foreground">(não vinculado)</span>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
