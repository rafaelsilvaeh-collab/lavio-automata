import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Car, Droplets, CheckCircle, DollarSign, Users, MessageSquare, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { RegisterCarDialog } from "@/components/RegisterCarDialog";

interface DashboardMetrics {
  noPatio: number;
  emLavagem: number;
  finalizadosHoje: number;
  faturamentoHoje: number;
  atendidosHoje: number;
}

interface YardCarDisplay {
  id: string;
  clientName: string;
  plate: string | null;
  serviceName: string | null;
  status: string;
}

interface DaySummaryEntry {
  category: string;
  type: string;
  total: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics>({ noPatio: 0, emLavagem: 0, finalizadosHoje: 0, faturamentoHoje: 0, atendidosHoje: 0 });
  const [yardCars, setYardCars] = useState<YardCarDisplay[]>([]);
  const [daySummary, setDaySummary] = useState<DaySummaryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];

      // Fetch cars in yard (not entregue)
      const { data: cars } = await supabase
        .from("cars_in_yard")
        .select("id, status, entry_time, customer_id, service_id, customers(name, plate), services(name)")
        .neq("status", "entregue");

      const allCars = (cars || []) as any[];
      const todayStart = new Date(today + "T00:00:00").toISOString();

      // Fetch today's cars for "atendidos hoje"
      const { count: atendidosCount } = await supabase
        .from("cars_in_yard")
        .select("id", { count: "exact", head: true })
        .gte("created_at", todayStart);

      // Fetch today's finalizados
      const finalizadosHoje = allCars.filter(c => {
        const isFinished = ["finalizado", "cliente_avisado"].includes(c.status);
        return isFinished;
      }).length;

      // Fetch cash flow entries for today
      const { data: cashEntries } = await supabase
        .from("cash_flow_entries")
        .select("*")
        .eq("entry_date", today);

      const entries = cashEntries || [];
      const faturamento = entries.filter(e => e.type === "entrada").reduce((s, e) => s + Number(e.amount), 0);

      // Group by category for day summary
      const summaryMap = new Map<string, DaySummaryEntry>();
      entries.forEach(e => {
        const key = `${e.type}-${e.category}`;
        const existing = summaryMap.get(key);
        if (existing) {
          existing.total += Number(e.amount);
        } else {
          summaryMap.set(key, { category: e.category, type: e.type, total: Number(e.amount) });
        }
      });

      setMetrics({
        noPatio: allCars.length,
        emLavagem: allCars.filter(c => c.status === "em_lavagem").length,
        finalizadosHoje,
        faturamentoHoje: faturamento,
        atendidosHoje: atendidosCount || 0,
      });

      setYardCars(allCars.map(c => ({
        id: c.id,
        clientName: c.customers?.name || "Sem nome",
        plate: c.customers?.plate || null,
        serviceName: c.services?.name || null,
        status: c.status,
      })));

      setDaySummary(Array.from(summaryMap.values()));
      setLoading(false);
    };
    fetchAll();
  }, [user]);

  const stats = [
    { label: "No pátio", value: String(metrics.noPatio), icon: Car, color: "text-warning" },
    { label: "Em lavagem", value: String(metrics.emLavagem), icon: Droplets, color: "text-primary" },
    { label: "Finalizados", value: String(metrics.finalizadosHoje), icon: CheckCircle, color: "text-success" },
    { label: "Faturamento", value: `R$${metrics.faturamentoHoje}`, icon: DollarSign, color: "text-success" },
    { label: "Atendidos hoje", value: String(metrics.atendidosHoje), icon: Users, color: "text-primary" },
  ];

  const statusLabel = (s: string) => {
    const map: Record<string, string> = { aguardando: "Aguardando", em_lavagem: "Em lavagem", finalizado: "Finalizado", cliente_avisado: "Cliente avisado" };
    return map[s] || s;
  };
  const statusClass = (s: string) => {
    const map: Record<string, string> = { em_lavagem: "bg-primary/10 text-primary", finalizado: "bg-success/10 text-success", cliente_avisado: "bg-accent/10 text-accent" };
    return map[s] || "bg-warning/10 text-warning";
  };

  const totalEntradas = daySummary.filter(e => e.type === "entrada").reduce((s, e) => s + e.total, 0);
  const totalSaidas = daySummary.filter(e => e.type === "saida").reduce((s, e) => s + e.total, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-64 mt-2" /></div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

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
                <div className={stat.color}><stat.icon className="h-8 w-8" /></div>
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
            {yardCars.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Car className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum veículo no pátio. Os veículos aparecem aqui quando uma lavagem é registrada.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {yardCars.map((car) => (
                  <div key={car.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <p className="font-medium text-sm text-foreground">{car.clientName}</p>
                      <p className="text-xs text-muted-foreground">{car.plate || "Sem placa"} • {car.serviceName || "Sem serviço"}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusClass(car.status)}`}>
                      {statusLabel(car.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Resumo do dia</CardTitle></CardHeader>
          <CardContent>
            {daySummary.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma movimentação hoje. Registre entradas e saídas na tela de Caixa.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {daySummary.map((entry, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{entry.category}</span>
                    <span className={`font-medium text-foreground ${entry.type === "saida" ? "text-destructive" : ""}`}>
                      {entry.type === "saida" ? "-" : ""}R${entry.total}
                    </span>
                  </div>
                ))}
                <div className="border-t pt-3 flex justify-between items-center">
                  <span className="font-semibold text-foreground">Resultado do dia</span>
                  <span className={`text-xl font-bold ${totalEntradas - totalSaidas >= 0 ? "text-success" : "text-destructive"}`}>
                    R${totalEntradas - totalSaidas}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
