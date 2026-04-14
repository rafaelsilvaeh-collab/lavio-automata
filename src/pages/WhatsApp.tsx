import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, QrCode, Wifi, WifiOff, RefreshCw, Power, Edit2, Save, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

type MessageTemplate = Tables<"message_templates">;
type Customer = Tables<"customers">;

const WhatsApp = () => {
  const { user } = useAuth();

  // Connection state
  const [connected, setConnected] = useState(false);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Templates state
  const [templates, setTemplates] = useState<Record<string, MessageTemplate>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Send state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const invokeWhatsApp = async (action: string, extra: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke("whatsapp", {
      body: { action, ...extra },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  };

  // Check initial status
  useEffect(() => {
    if (!user) return;
    const checkInitial = async () => {
      try {
        const data = await invokeWhatsApp("check-status");
        setConnected(data?.conectado === true);
      } catch {
        // Not configured yet, that's fine
      }
      setInitialLoading(false);
    };
    checkInitial();
  }, [user]);

  // Load templates & customers
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: tplData }, { data: custData }] = await Promise.all([
        supabase.from("message_templates").select("*"),
        supabase.from("customers").select("*").eq("is_active", true).order("name"),
      ]);
      if (tplData && tplData.length > 0) {
        const map: Record<string, MessageTemplate> = {};
        tplData.forEach((t) => (map[t.template_type] = t));
        setTemplates(map);
      }
      setCustomers(custData || []);
    };
    load();
  }, [user]);

  // Polling for connection status while QR is showing
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!qrCodeBase64 || connected) {
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
      } catch {
        // ignore polling errors
      }
    }, 5000);

    return stopPolling;
  }, [qrCodeBase64, connected, stopPolling]);

  // Connect: create instance + get QR
  const handleConnect = async () => {
    setLoadingQr(true);
    setQrCodeBase64(null);
    try {
      await invokeWhatsApp("create-instance");
      const data = await invokeWhatsApp("get-qrcode");
      const base64 = data?.qrcode?.base64 || data?.base64;
      if (base64) {
        setQrCodeBase64(base64);
      } else {
        toast.info("QR Code não disponível. Tente novamente em alguns segundos.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao conectar WhatsApp");
    }
    setLoadingQr(false);
  };

  // Check status manually
  const handleCheckStatus = async () => {
    setCheckingStatus(true);
    try {
      const data = await invokeWhatsApp("check-status");
      const isConn = data?.conectado === true;
      setConnected(isConn);
      if (isConn) setQrCodeBase64(null);
      toast.success(isConn ? "WhatsApp conectado!" : "WhatsApp desconectado");
    } catch (err: any) {
      toast.error(err.message || "Erro ao verificar status");
    }
    setCheckingStatus(false);
  };

  // Disconnect
  const handleDisconnect = async () => {
    try {
      await invokeWhatsApp("disconnect");
      setConnected(false);
      setQrCodeBase64(null);
      toast.info("WhatsApp desconectado");
    } catch (err: any) {
      toast.error(err.message || "Erro ao desconectar");
    }
  };

  // Save template
  const handleSaveTemplate = async (type: string) => {
    if (!user) return;
    setSavingTemplate(true);
    const existing = templates[type];

    if (existing) {
      const { error } = await supabase
        .from("message_templates")
        .update({ message_text: editText, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) {
        toast.error("Erro ao salvar template");
      } else {
        setTemplates((prev) => ({ ...prev, [type]: { ...existing, message_text: editText } }));
        toast.success("Template salvo!");
      }
    } else {
      const { data, error } = await supabase
        .from("message_templates")
        .insert({
          user_id: user.id,
          template_type: type as "carro_pronto" | "cliente_inativo",
          message_text: editText,
        })
        .select()
        .single();
      if (error) {
        toast.error("Erro ao criar template");
      } else if (data) {
        setTemplates((prev) => ({ ...prev, [type]: data }));
        toast.success("Template criado!");
      }
    }
    setEditing(null);
    setSavingTemplate(false);
  };

  // Send message
  const handleSend = async () => {
    const customer = customers.find((c) => c.id === selectedCustomerId);
    if (!customer?.phone) {
      toast.error("Selecione um cliente com telefone cadastrado");
      return;
    }
    if (!message.trim()) {
      toast.error("Digite uma mensagem");
      return;
    }
    setSending(true);
    try {
      await invokeWhatsApp("send-message", { phone: customer.phone, message });
      toast.success(`Mensagem enviada para ${customer.name}!`);
      setMessage("");
      setSelectedCustomerId("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar mensagem");
    }
    setSending(false);
  };

  const applyTemplate = (type: string) => {
    const tpl = templates[type];
    if (!tpl) return;
    const customer = customers.find((c) => c.id === selectedCustomerId);
    let text = tpl.message_text;
    if (customer) {
      text = text.replace(/\{nome\}/g, customer.name);
      text = text.replace(/\{placa\}/g, customer.plate || "");
    }
    setMessage(text);
  };

  const startEditing = (type: string) => {
    const defaultTexts: Record<string, string> = {
      carro_pronto: "Olá {nome}! Seu carro já está pronto para retirada. 🚗✨",
      cliente_inativo: "Olá {nome}! Já faz um tempo que seu carro não passa por aqui. Temos vagas hoje! 😊",
    };
    setEditText(templates[type]?.message_text || defaultTexts[type] || "");
    setEditing(type);
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">WhatsApp</h1>
        <p className="text-muted-foreground text-sm">Conexão e mensagens automáticas</p>
      </div>

      <Tabs defaultValue="connection">
        <TabsList>
          <TabsTrigger value="connection">Conexão</TabsTrigger>
          <TabsTrigger value="templates">Mensagens</TabsTrigger>
          <TabsTrigger value="send">Enviar</TabsTrigger>
        </TabsList>

        {/* CONNECTION TAB */}
        <TabsContent value="connection" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" /> Conectar WhatsApp
              </CardTitle>
              <CardDescription>
                {connected
                  ? "Seu WhatsApp está conectado e pronto para enviar mensagens"
                  : "Clique em conectar e escaneie o QR Code com seu WhatsApp"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-6">
                <Badge
                  className={
                    connected
                      ? "bg-success/10 text-success border-success/20"
                      : "bg-destructive/10 text-destructive border-destructive/20"
                  }
                >
                  {connected ? (
                    <>
                      <Wifi className="h-3 w-3 mr-1" /> Conectado
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-3 w-3 mr-1" /> Desconectado
                    </>
                  )}
                </Badge>
              </div>

              {!connected ? (
                <div className="text-center">
                  <div className="w-64 h-64 mx-auto bg-secondary rounded-2xl flex items-center justify-center mb-6 border-2 border-dashed border-border overflow-hidden">
                    {loadingQr ? (
                      <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                    ) : qrCodeBase64 ? (
                      <img src={qrCodeBase64} alt="QR Code" className="w-full h-full object-contain p-2" />
                    ) : (
                      <div className="text-center">
                        <QrCode className="h-16 w-16 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">QR Code aparecerá aqui</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 justify-center flex-wrap">
                    <Button
                      className="gradient-primary border-0"
                      onClick={handleConnect}
                      disabled={loadingQr}
                    >
                      <QrCode className="mr-2 h-4 w-4" />
                      {qrCodeBase64 ? "Reconectar" : "Conectar WhatsApp"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCheckStatus}
                      disabled={checkingStatus}
                    >
                      {checkingStatus ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Verificar status
                    </Button>
                  </div>
                  {qrCodeBase64 && (
                    <p className="text-xs text-muted-foreground mt-3">
                      Abra o WhatsApp no celular → Menu → Aparelhos conectados → Conectar
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleCheckStatus} disabled={checkingStatus}>
                    {checkingStatus ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Verificar status
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setConnected(false);
                      handleConnect();
                    }}
                  >
                    <QrCode className="mr-2 h-4 w-4" /> Reconectar
                  </Button>
                  <Button variant="destructive" onClick={handleDisconnect}>
                    <Power className="mr-2 h-4 w-4" /> Desconectar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TEMPLATES TAB */}
        <TabsContent value="templates" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Carro pronto</CardTitle>
                  <CardDescription>Enviada quando o serviço é finalizado</CardDescription>
                </div>
                <Badge className="bg-success/10 text-success border-success/20">Automática</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {editing === "carro_pronto" ? (
                <div className="space-y-3">
                  <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} />
                  <p className="text-xs text-muted-foreground">Variáveis: {"{nome}"}, {"{placa}"}, {"{servico}"}</p>
                  <Button size="sm" onClick={() => handleSaveTemplate("carro_pronto")} disabled={savingTemplate}>
                    <Save className="mr-2 h-3 w-3" /> Salvar
                  </Button>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <p className="text-sm text-muted-foreground bg-secondary/50 p-3 rounded-lg flex-1">
                    {templates.carro_pronto?.message_text || "Nenhum template configurado. Clique em editar."}
                  </p>
                  <Button size="icon" variant="ghost" className="ml-2" onClick={() => startEditing("carro_pronto")}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Cliente inativo (21 dias)</CardTitle>
                  <CardDescription>Enviada para clientes que não voltam há 21 dias</CardDescription>
                </div>
                <Badge className="bg-warning/10 text-warning border-warning/20">Agendada</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {editing === "cliente_inativo" ? (
                <div className="space-y-3">
                  <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} />
                  <p className="text-xs text-muted-foreground">Variáveis: {"{nome}"}, {"{dias}"}</p>
                  <Button size="sm" onClick={() => handleSaveTemplate("cliente_inativo")} disabled={savingTemplate}>
                    <Save className="mr-2 h-3 w-3" /> Salvar
                  </Button>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <p className="text-sm text-muted-foreground bg-secondary/50 p-3 rounded-lg flex-1">
                    {templates.cliente_inativo?.message_text || "Nenhum template configurado. Clique em editar."}
                  </p>
                  <Button size="icon" variant="ghost" className="ml-2" onClick={() => startEditing("cliente_inativo")}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEND TAB */}
        <TabsContent value="send" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" /> Enviar mensagem
              </CardTitle>
              <CardDescription>Selecione um cliente e envie uma mensagem via WhatsApp</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Cliente</Label>
                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.phone ? `- ${c.phone}` : "(sem telefone)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {Object.keys(templates).length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  <p className="text-xs text-muted-foreground w-full">Usar template:</p>
                  {templates.carro_pronto && (
                    <Button size="sm" variant="outline" onClick={() => applyTemplate("carro_pronto")}>
                      Carro pronto
                    </Button>
                  )}
                  {templates.cliente_inativo && (
                    <Button size="sm" variant="outline" onClick={() => applyTemplate("cliente_inativo")}>
                      Cliente inativo
                    </Button>
                  )}
                </div>
              )}

              <div>
                <Label>Mensagem</Label>
                <Textarea rows={4} placeholder="Digite sua mensagem..." value={message} onChange={(e) => setMessage(e.target.value)} />
              </div>

              <Button className="w-full gradient-primary border-0" onClick={handleSend} disabled={sending || !connected}>
                {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {connected ? "Enviar mensagem" : "Conecte o WhatsApp primeiro"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WhatsApp;
