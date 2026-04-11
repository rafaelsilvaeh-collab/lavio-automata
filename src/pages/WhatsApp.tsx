import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, QrCode, Wifi, WifiOff, RefreshCw, Power, Edit2, Save, Send, Settings, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

type WhatsAppConfig = Tables<"whatsapp_config">;
type MessageTemplate = Tables<"message_templates">;
type Customer = Tables<"customers">;

const WhatsApp = () => {
  const { user } = useAuth();

  // Connection state
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [instanceId, setInstanceId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [connected, setConnected] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [loadingQr, setLoadingQr] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

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

  // Load config
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoadingConfig(true);
      const { data } = await supabase
        .from("whatsapp_config")
        .select("*")
        .maybeSingle();

      if (data) {
        setConfig(data);
        setInstanceId(data.instance_id || "");
        setApiKey(data.api_key || "");
        setConnected(data.is_connected);
      }
      setLoadingConfig(false);
    };
    load();
  }, [user]);

  // Load templates
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("message_templates")
        .select("*");

      if (data && data.length > 0) {
        const map: Record<string, MessageTemplate> = {};
        data.forEach((t) => (map[t.template_type] = t));
        setTemplates(map);
      }
    };
    load();
  }, [user]);

  // Load customers
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("customers")
        .select("*")
        .eq("is_active", true)
        .order("name");
      setCustomers(data || []);
    };
    load();
  }, [user]);

  const invokeWhatsApp = async (action: string, extra: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke("whatsapp", {
      body: { action, ...extra },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  };

  // Save Z-API config
  const handleSaveConfig = async () => {
    if (!instanceId || !apiKey) {
      toast.error("Preencha o Instance ID e o Token");
      return;
    }
    setSavingConfig(true);
    try {
      await invokeWhatsApp("save-config", { instance_id: instanceId, api_key: apiKey });
      toast.success("Configuração salva!");
      // Reload config
      const { data } = await supabase.from("whatsapp_config").select("*").maybeSingle();
      if (data) {
        setConfig(data);
        setConnected(data.is_connected);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar configuração");
    }
    setSavingConfig(false);
  };

  // Generate QR Code
  const handleGetQrCode = async () => {
    setLoadingQr(true);
    setQrCodeUrl(null);
    try {
      const data = await invokeWhatsApp("get-qrcode");
      if (data?.value) {
        setQrCodeUrl(data.value);
      } else if (data?.image) {
        setQrCodeUrl(data.image);
      } else {
        toast.info("QR Code não disponível. Verifique se a instância está correta.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar QR Code");
    }
    setLoadingQr(false);
  };

  // Check status
  const handleCheckStatus = async () => {
    setCheckingStatus(true);
    try {
      const data = await invokeWhatsApp("check-status");
      const isConn = data?.is_connected === true;
      setConnected(isConn);
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
      setQrCodeUrl(null);
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

  // Apply template to send textarea
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

  const hasConfig = !!(config?.instance_id && config?.api_key);

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
          {/* Z-API Config */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" /> Configuração Z-API
              </CardTitle>
              <CardDescription>Insira suas credenciais da Z-API para conectar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Instance ID</Label>
                <Input
                  placeholder="Ex: 3C5A8B..."
                  value={instanceId}
                  onChange={(e) => setInstanceId(e.target.value)}
                />
              </div>
              <div>
                <Label>Token (API Key)</Label>
                <Input
                  type="password"
                  placeholder="Seu token Z-API"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
              <Button
                onClick={handleSaveConfig}
                disabled={savingConfig}
                className="gradient-primary border-0"
              >
                {savingConfig ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar configuração
              </Button>
            </CardContent>
          </Card>

          {/* Connection Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" /> Conectar WhatsApp
              </CardTitle>
              <CardDescription>
                {hasConfig
                  ? "Gere o QR Code e escaneie com seu WhatsApp"
                  : "Salve a configuração Z-API primeiro"}
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
                    ) : qrCodeUrl ? (
                      <img src={qrCodeUrl} alt="QR Code" className="w-full h-full object-contain" />
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
                      onClick={handleGetQrCode}
                      disabled={!hasConfig || loadingQr}
                    >
                      <QrCode className="mr-2 h-4 w-4" /> Gerar QR Code
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCheckStatus}
                      disabled={!hasConfig || checkingStatus}
                    >
                      {checkingStatus ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Verificar status
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Abra o WhatsApp no celular → Menu → Aparelhos conectados → Conectar
                  </p>
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
          {/* Car ready template */}
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
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Variáveis: {"{nome}"}, {"{placa}"}, {"{servico}"}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => handleSaveTemplate("carro_pronto")}
                    disabled={savingTemplate}
                  >
                    <Save className="mr-2 h-3 w-3" /> Salvar
                  </Button>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <p className="text-sm text-muted-foreground bg-secondary/50 p-3 rounded-lg flex-1">
                    {templates.carro_pronto?.message_text ||
                      "Nenhum template configurado. Clique em editar."}
                  </p>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="ml-2"
                    onClick={() => startEditing("carro_pronto")}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Inactive client template */}
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
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Variáveis: {"{nome}"}, {"{dias}"}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => handleSaveTemplate("cliente_inativo")}
                    disabled={savingTemplate}
                  >
                    <Save className="mr-2 h-3 w-3" /> Salvar
                  </Button>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <p className="text-sm text-muted-foreground bg-secondary/50 p-3 rounded-lg flex-1">
                    {templates.cliente_inativo?.message_text ||
                      "Nenhum template configurado. Clique em editar."}
                  </p>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="ml-2"
                    onClick={() => startEditing("cliente_inativo")}
                  >
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
                <Textarea
                  rows={4}
                  placeholder="Digite sua mensagem..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <Button
                className="w-full gradient-primary border-0"
                onClick={handleSend}
                disabled={sending || !connected}
              >
                {sending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
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
