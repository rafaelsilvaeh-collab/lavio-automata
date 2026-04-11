import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Droplets, CheckCircle, DollarSign, Users } from "lucide-react";

const stats = [
  { label: "No pátio", value: "3", icon: Car, color: "text-warning" },
  { label: "Em lavagem", value: "2", icon: Droplets, color: "text-primary" },
  { label: "Finalizados", value: "5", icon: CheckCircle, color: "text-success" },
  { label: "Faturamento", value: "R$650", icon: DollarSign, color: "text-success" },
  { label: "Atendidos hoje", value: "8", icon: Users, color: "text-primary" },
];

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Visão geral do seu lava-rápido</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`${stat.color}`}>
                  <stat.icon className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Carros no pátio</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { plate: "ABC-1234", client: "João Silva", service: "Lavagem completa", status: "em_lavagem" },
                { plate: "DEF-5678", client: "Maria Santos", service: "Lavagem simples", status: "aguardando" },
                { plate: "GHI-9012", client: "Pedro Costa", service: "Lavagem completa", status: "finalizado" },
              ].map((car) => (
                <div key={car.plate} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div>
                    <p className="font-medium text-sm text-foreground">{car.client}</p>
                    <p className="text-xs text-muted-foreground">{car.plate} • {car.service}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    car.status === 'em_lavagem' ? 'bg-primary/10 text-primary' :
                    car.status === 'finalizado' ? 'bg-success/10 text-success' :
                    'bg-warning/10 text-warning'
                  }`}>
                    {car.status === 'em_lavagem' ? 'Em lavagem' :
                     car.status === 'finalizado' ? 'Finalizado' : 'Aguardando'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Resumo do dia</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Lavagens simples</span>
                <span className="font-medium text-foreground">4 × R$40 = R$160</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Lavagens completas</span>
                <span className="font-medium text-foreground">3 × R$80 = R$240</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Outros</span>
                <span className="font-medium text-foreground">R$250</span>
              </div>
              <div className="border-t pt-3 flex justify-between items-center">
                <span className="font-semibold text-foreground">Total do dia</span>
                <span className="text-xl font-bold text-success">R$650</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
