import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, QrCode, Wifi, WifiOff, RefreshCw, Power, Edit2, Save } from "lucide-react";
import { toast } from "sonner";

const WhatsApp = () => {
  const [connected, setConnected] = useState(false);
  const [templates, setTemplates] = useState({
    carReady: "Olá {nome}! Seu carro já está pronto para retirada no Lava Rápido. 🚗✨",
    inactive: "Olá {nome}! Já faz um tempo que seu carro não passa por aqui. Temos vagas hoje para lavagem. 😊",
  });
  const [editing, setEditing] = useState<string | null>(null);

  const handleConnect = () => {
    toast.info('Escaneie o QR Code com seu WhatsApp');
    setTimeout(() => {
      setConnected(true);
      toast.success('WhatsApp conectado com sucesso!');
    }, 2000);
  };

  const handleDisconnect = () => {
    setConnected(false);
    toast.info('WhatsApp desconectado');
  };

  const saveTemplate = (key: string) => {
    setEditing(null);
    toast.success('Template salvo!');
  };

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
        </TabsList>

        <TabsContent value="connection" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Conectar WhatsApp
              </CardTitle>
              <CardDescription>Conecte seu WhatsApp para enviar mensagens automáticas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-6">
                <Badge className={`${connected ? 'bg-success/10 text-success border-success/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
                  {connected ? <><Wifi className="h-3 w-3 mr-1" /> Conectado</> : <><WifiOff className="h-3 w-3 mr-1" /> Desconectado</>}
                </Badge>
              </div>

              {!connected ? (
                <div className="text-center">
                  <div className="w-64 h-64 mx-auto bg-secondary rounded-2xl flex items-center justify-center mb-6 border-2 border-dashed border-border">
                    <div className="text-center">
                      <QrCode className="h-16 w-16 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">QR Code aparecerá aqui</p>
                    </div>
                  </div>
                  <Button className="gradient-primary border-0" onClick={handleConnect}>
                    <QrCode className="mr-2 h-4 w-4" /> Gerar QR Code
                  </Button>
                  <p className="text-xs text-muted-foreground mt-3">
                    Abra o WhatsApp no celular → Menu → Aparelhos conectados → Conectar
                  </p>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleConnect}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Reconectar
                  </Button>
                  <Button variant="destructive" onClick={handleDisconnect}>
                    <Power className="mr-2 h-4 w-4" /> Desconectar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4 mt-4">
          {/* Car ready template */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Carro pronto</CardTitle>
                  <CardDescription>Enviada automaticamente quando o serviço é finalizado</CardDescription>
                </div>
                <Badge className="bg-success/10 text-success border-success/20">Automática</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {editing === 'carReady' ? (
                <div className="space-y-3">
                  <Textarea value={templates.carReady} onChange={e => setTemplates(prev => ({ ...prev, carReady: e.target.value }))} rows={3} />
                  <p className="text-xs text-muted-foreground">Variáveis: {'{nome}'}, {'{placa}'}, {'{servico}'}</p>
                  <Button size="sm" onClick={() => saveTemplate('carReady')}><Save className="mr-2 h-3 w-3" /> Salvar</Button>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <p className="text-sm text-muted-foreground bg-secondary/50 p-3 rounded-lg flex-1">{templates.carReady}</p>
                  <Button size="icon" variant="ghost" className="ml-2" onClick={() => setEditing('carReady')}>
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
              {editing === 'inactive' ? (
                <div className="space-y-3">
                  <Textarea value={templates.inactive} onChange={e => setTemplates(prev => ({ ...prev, inactive: e.target.value }))} rows={3} />
                  <p className="text-xs text-muted-foreground">Variáveis: {'{nome}'}, {'{dias}'}</p>
                  <Button size="sm" onClick={() => saveTemplate('inactive')}><Save className="mr-2 h-3 w-3" /> Salvar</Button>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <p className="text-sm text-muted-foreground bg-secondary/50 p-3 rounded-lg flex-1">{templates.inactive}</p>
                  <Button size="icon" variant="ghost" className="ml-2" onClick={() => setEditing('inactive')}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WhatsApp;
