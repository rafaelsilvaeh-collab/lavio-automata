import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { Users, UserCheck, MessageCircle, Car, UserPlus, Send, DollarSign, TrendingUp, Activity, Wallet } from "lucide-react";

interface Metrics {
  total_users: number;
  onboarded_users: number;
  blocked_users: number;
  whatsapp_connected: number;
  total_customers: number;
  total_cars: number;
  notifications_sent_30d: number;
  notifications_total_30d: number;
  active_users_7d: number;
  users_by_month: { month: string; count: number }[];
  cars_by_month: { month: string; count: number }[];
}

const monthLabel = (ym: string) => {
  const [, m] = ym.split("-");
  const names = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return names[parseInt(m, 10) - 1] ?? ym;
};

const currentMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

function fillMonths(data: { month: string; count: number }[]) {
  const map = new Map(data.map((d) => [d.month, d.count]));
  const out: { month: string; count: number; label: string }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({ month: key, count: map.get(key) ?? 0, label: monthLabel(key) });
  }
  return out;
}

function StatusBadge({ status }: { status: "good" | "warn" | "bad" }) {
  const map = {
    good: { label: "🟢 Saudável", cls: "bg-success/15 text-success border-success/30" },
    warn: { label: "🟡 Atenção", cls: "bg-warning/15 text-warning border-warning/30" },
    bad: { label: "🔴 Crítico", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  };
  return <Badge variant="outline" className={map[status].cls}>{map[status].label}</Badge>;
}

export function AdminOverview() {
  const [m, setM] = useState<Metrics | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("admin_metrics");
      if (!error && data) setM(data as unknown as Metrics);
    })();
  }, []);

  if (!m) return <div className="text-muted-foreground">Carregando métricas…</div>;

  const usersChart = fillMonths(m.users_by_month);
  const carsChart = fillMonths(m.cars_by_month);
  const cumulative = usersChart.reduce<{ month: string; total: number; label: string }[]>((acc, cur, idx) => {
    const prev = idx > 0 ? acc[idx - 1].total : 0;
    acc.push({ month: cur.month, total: prev + cur.count, label: cur.label });
    return acc;
  }, []);

  const onboardingPct = m.total_users > 0 ? Math.round((m.onboarded_users / m.total_users) * 100) : 0;
  const waPct = m.total_users > 0 ? Math.round((m.whatsapp_connected / m.total_users) * 100) : 0;
  const deliveryPct = m.notifications_total_30d > 0
    ? Math.round((m.notifications_sent_30d / m.notifications_total_30d) * 100)
    : 0;

  const status = (v: number, good: number, warn: number): "good" | "warn" | "bad" =>
    v >= good ? "good" : v >= warn ? "warn" : "bad";

  const productCards = [
    { label: "Usuários", value: m.total_users, icon: Users, color: "text-primary" },
    { label: "Onboarding", value: `${onboardingPct}%`, icon: UserCheck, color: "text-success" },
    { label: "WhatsApp conectados", value: m.whatsapp_connected, icon: MessageCircle, color: "text-success" },
    { label: "Carros (total)", value: m.total_cars, icon: Car, color: "text-accent" },
    { label: "Clientes (total)", value: m.total_customers, icon: UserPlus, color: "text-primary" },
    { label: "Notif. enviadas 30d", value: m.notifications_sent_30d, icon: Send, color: "text-success" },
  ];

  const saasCards = [
    { label: "MRR", value: "R$ 0", icon: DollarSign },
    { label: "ARR", value: "R$ 0", icon: TrendingUp },
    { label: "Churn mensal", value: "—", icon: Activity },
    { label: "ARPU", value: "R$ 0", icon: Wallet },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-2">Uso do produto</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {productCards.map((c) => (
            <Card key={c.label}>
              <CardContent className="p-4">
                <c.icon className={`h-5 w-5 ${c.color} mb-2`} />
                <p className="text-2xl font-bold">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
          Métricas SaaS
          <Badge variant="outline" className="text-xs">Aguardando Stripe</Badge>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {saasCards.map((c) => (
            <Card key={c.label} className="opacity-70">
              <CardContent className="p-4">
                <c.icon className="h-5 w-5 text-muted-foreground mb-2" />
                <p className="text-2xl font-bold text-muted-foreground">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Novos usuários por mês</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={usersChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip />
                <Bar dataKey="count">
                  {usersChart.map((entry) => (
                    <Cell key={entry.month} fill={entry.month === currentMonthKey() ? "#f97316" : "#0ea5e9"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Crescimento acumulado</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={cumulative}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Carros registrados por mês (uso real)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={carsChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip />
                <Bar dataKey="count">
                  {carsChart.map((entry) => (
                    <Cell key={entry.month} fill={entry.month === currentMonthKey() ? "#f97316" : "#0ea5e9"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Saúde do produto</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2">Métrica</th>
                  <th className="py-2">Valor</th>
                  <th className="py-2">Saudável</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2">Onboarding completion</td>
                  <td className="py-2">{onboardingPct}%</td>
                  <td className="py-2 text-muted-foreground">≥ 60%</td>
                  <td className="py-2"><StatusBadge status={status(onboardingPct, 60, 30)} /></td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">Usuários com WA conectado</td>
                  <td className="py-2">{waPct}%</td>
                  <td className="py-2 text-muted-foreground">≥ 50%</td>
                  <td className="py-2"><StatusBadge status={status(waPct, 50, 25)} /></td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">Usuários ativos últimos 7d</td>
                  <td className="py-2">{m.active_users_7d}</td>
                  <td className="py-2 text-muted-foreground">—</td>
                  <td className="py-2 text-muted-foreground">—</td>
                </tr>
                <tr>
                  <td className="py-2">Notificações entregues (30d)</td>
                  <td className="py-2">{m.notifications_total_30d > 0 ? `${deliveryPct}%` : "—"}</td>
                  <td className="py-2 text-muted-foreground">≥ 90%</td>
                  <td className="py-2">{m.notifications_total_30d > 0 ? <StatusBadge status={status(deliveryPct, 90, 70)} /> : <span className="text-muted-foreground">—</span>}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
