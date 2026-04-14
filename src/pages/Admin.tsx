import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Users, TrendingUp, DollarSign, Activity, Shield, Settings, Edit2, Save } from "lucide-react";
import { toast } from "sonner";

const Admin = () => {
  const [planPrices, setPlanPrices] = useState({ monthly: 149, semiannualDiscount: 13, annualDiscount: 27 });
  const [landingContent, setLandingContent] = useState({
    headline: 'Seu pátio fica cheio e os clientes ficam perguntando no WhatsApp se o carro já está pronto?',
    subheadline: 'O Lavio avisa automaticamente o cliente quando o carro fica pronto, organiza seu caixa e mantém seus clientes voltando.',
    videoUrl: '',
  });
  const [editingPlan, setEditingPlan] = useState(false);
  const [editingLanding, setEditingLanding] = useState(false);

  const mockUsers = [
    { id: '1', name: 'Lava Rápido do João', email: 'joao@email.com', plan: 'Lavgo', status: 'active', since: '2024-01-15' },
    { id: '2', name: 'Auto Wash Maria', email: 'maria@email.com', plan: 'Trial', status: 'trial', since: '2024-03-01' },
    { id: '3', name: 'Super Clean Pedro', email: 'pedro@email.com', plan: 'Lavgo', status: 'inactive', since: '2024-02-10' },
  ];

  const metrics = [
    { label: 'MRR', value: 'R$2.200', icon: DollarSign, color: 'text-success' },
    { label: 'Clientes ativos', value: '20', icon: Users, color: 'text-primary' },
    { label: 'Churn', value: '3%', icon: Activity, color: 'text-warning' },
    { label: 'Trials ativos', value: '5', icon: TrendingUp, color: 'text-accent' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Admin</h1>
      </div>

      <Tabs defaultValue="metrics">
        <TabsList className="flex-wrap">
          <TabsTrigger value="metrics">Métricas</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="plans">Planos</TabsTrigger>
          <TabsTrigger value="landing">Landing Page</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {metrics.map(m => (
              <Card key={m.label} className="border-border/50">
                <CardContent className="p-4">
                  <m.icon className={`h-6 w-6 ${m.color} mb-2`} />
                  <p className="text-2xl font-bold text-foreground">{m.value}</p>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader><CardTitle className="text-lg">Receita total</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-success">R$26.400</p>
              <p className="text-sm text-muted-foreground">Receita acumulada desde o lançamento</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Clientes SaaS</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockUsers.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <p className="font-medium text-sm text-foreground">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email} • Desde {new Date(user.since).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[10px] ${
                        user.status === 'active' ? 'bg-success/10 text-success border-success/20' :
                        user.status === 'trial' ? 'bg-warning/10 text-warning border-warning/20' :
                        'bg-destructive/10 text-destructive border-destructive/20'
                      }`}>
                        {user.status === 'active' ? 'Ativo' : user.status === 'trial' ? 'Trial' : 'Inativo'}
                      </Badge>
                      <Button size="sm" variant={user.status === 'inactive' ? 'default' : 'outline'} className="text-xs h-7">
                        {user.status === 'inactive' ? 'Ativar' : 'Desativar'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Configuração de planos</CardTitle>
                {!editingPlan ? (
                  <Button size="sm" variant="outline" onClick={() => setEditingPlan(true)}><Edit2 className="mr-1 h-3 w-3" /> Editar</Button>
                ) : (
                  <Button size="sm" className="gradient-primary border-0" onClick={() => { setEditingPlan(false); toast.success('Planos atualizados!'); }}>
                    <Save className="mr-1 h-3 w-3" /> Salvar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Preço mensal (R$)</Label>
                <Input type="number" value={planPrices.monthly} onChange={e => setPlanPrices(p => ({ ...p, monthly: +e.target.value }))} disabled={!editingPlan} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Desconto semestral (%)</Label>
                  <Input type="number" value={planPrices.semiannualDiscount} onChange={e => setPlanPrices(p => ({ ...p, semiannualDiscount: +e.target.value }))} disabled={!editingPlan} />
                </div>
                <div>
                  <Label>Desconto anual (%)</Label>
                  <Input type="number" value={planPrices.annualDiscount} onChange={e => setPlanPrices(p => ({ ...p, annualDiscount: +e.target.value }))} disabled={!editingPlan} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="landing" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Conteúdo da Landing Page</CardTitle>
                {!editingLanding ? (
                  <Button size="sm" variant="outline" onClick={() => setEditingLanding(true)}><Edit2 className="mr-1 h-3 w-3" /> Editar</Button>
                ) : (
                  <Button size="sm" className="gradient-primary border-0" onClick={() => { setEditingLanding(false); toast.success('Landing page atualizada!'); }}>
                    <Save className="mr-1 h-3 w-3" /> Salvar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Headline</Label>
                <Textarea value={landingContent.headline} onChange={e => setLandingContent(p => ({ ...p, headline: e.target.value }))} disabled={!editingLanding} rows={2} />
              </div>
              <div>
                <Label>Subtítulo</Label>
                <Textarea value={landingContent.subheadline} onChange={e => setLandingContent(p => ({ ...p, subheadline: e.target.value }))} disabled={!editingLanding} rows={2} />
              </div>
              <div>
                <Label>URL do vídeo</Label>
                <Input value={landingContent.videoUrl} onChange={e => setLandingContent(p => ({ ...p, videoUrl: e.target.value }))} disabled={!editingLanding} placeholder="https://youtube.com/..." />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
