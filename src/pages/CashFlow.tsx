import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, TrendingUp, TrendingDown, DollarSign, ArrowUpCircle, ArrowDownCircle, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import type { Tables } from "@/integrations/supabase/types";

type CashEntry = Tables<"cash_flow_entries">;

const CashFlow = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [openIncome, setOpenIncome] = useState(false);
  const [openExpense, setOpenExpense] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Initial balance state
  const [showInitialBalance, setShowInitialBalance] = useState(false);
  const [initialBalanceChecked, setInitialBalanceChecked] = useState(false);
  const [initialBalanceValue, setInitialBalanceValue] = useState("");

  // Form state
  const [incomeForm, setIncomeForm] = useState({ category: "", description: "", amount: "" });
  const [expenseForm, setExpenseForm] = useState({ category: "", description: "", amount: "" });

  const fetchEntries = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("cash_flow_entries")
      .select("*")
      .eq("entry_date", date)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar movimentações");
      console.error(error);
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  };

  // Check if user has ANY entries (for initial balance card)
  const checkInitialBalance = async () => {
    if (!user) return;
    const { count } = await supabase
      .from("cash_flow_entries")
      .select("id", { count: "exact", head: true });

    setShowInitialBalance(count === 0);
    setInitialBalanceChecked(true);
  };

  useEffect(() => {
    if (user) {
      checkInitialBalance();
    }
  }, [user]);

  useEffect(() => {
    fetchEntries();
  }, [user, date]);

  const totalIncome = entries.filter(e => e.type === "entrada").reduce((sum, e) => sum + Number(e.amount), 0);
  const totalExpense = entries.filter(e => e.type === "saida").reduce((sum, e) => sum + Number(e.amount), 0);
  const result = totalIncome - totalExpense;

  const handleSaveEntry = async (type: "entrada" | "saida") => {
    if (!user) return;
    setSaving(true);
    const form = type === "entrada" ? incomeForm : expenseForm;

    const { error } = await supabase.from("cash_flow_entries").insert({
      user_id: user.id,
      type,
      category: form.category || "Outros",
      description: form.description || null,
      amount: parseFloat(form.amount) || 0,
      entry_date: date,
    });

    if (error) {
      toast.error("Erro ao salvar movimentação");
      console.error(error);
    } else {
      toast.success(`${type === "entrada" ? "Entrada" : "Saída"} registrada!`);
      if (type === "entrada") {
        setOpenIncome(false);
        setIncomeForm({ category: "", description: "", amount: "" });
      } else {
        setOpenExpense(false);
        setExpenseForm({ category: "", description: "", amount: "" });
      }
      fetchEntries();
      setShowInitialBalance(false);
    }
    setSaving(false);
  };

  const handleSetInitialBalance = async () => {
    if (!user) return;
    const val = parseFloat(initialBalanceValue);
    if (isNaN(val) || val <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("cash_flow_entries").insert({
      user_id: user.id,
      type: "entrada" as const,
      category: "Saldo inicial",
      description: "Saldo inicial definido pelo usuário",
      amount: val,
      entry_date: new Date().toISOString().split("T")[0],
    });
    if (error) {
      toast.error("Erro ao definir saldo inicial");
    } else {
      toast.success("Saldo inicial definido!");
      setShowInitialBalance(false);
      fetchEntries();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Caixa do Dia</h1>
          <p className="text-muted-foreground text-sm">Controle financeiro diário</p>
        </div>
        <Input type="date" className="w-auto" value={date} onChange={e => setDate(e.target.value)} />
      </div>

      {/* Initial balance card */}
      {initialBalanceChecked && showInitialBalance && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Wallet className="h-6 w-6 text-primary mt-0.5" />
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="font-semibold text-foreground">Configure seu saldo inicial</h3>
                  <p className="text-sm text-muted-foreground">Informe o saldo que você já possui em caixa para começar com o valor correto.</p>
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label>Saldo atual em caixa (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={initialBalanceValue}
                      onChange={e => setInitialBalanceValue(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleSetInitialBalance} disabled={saving} className="gradient-primary border-0">
                    Definir saldo inicial
                  </Button>
                </div>
                <button
                  onClick={() => setShowInitialBalance(false)}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Começar do zero →
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <ArrowUpCircle className="h-6 w-6 text-success mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Entradas</p>
            <p className="text-lg font-bold text-success">R${totalIncome}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <ArrowDownCircle className="h-6 w-6 text-destructive mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Saídas</p>
            <p className="text-lg font-bold text-destructive">R${totalExpense}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-6 w-6 text-primary mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Resultado</p>
            <p className={`text-lg font-bold ${result >= 0 ? "text-success" : "text-destructive"}`}>R${result}</p>
          </CardContent>
        </Card>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Dialog open={openIncome} onOpenChange={setOpenIncome}>
          <DialogTrigger asChild>
            <Button className="flex-1 bg-success hover:bg-success/90 text-success-foreground border-0">
              <Plus className="mr-2 h-4 w-4" /> Entrada
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Nova entrada</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveEntry("entrada"); }} className="space-y-4">
              <div>
                <Label>Categoria</Label>
                <Select value={incomeForm.category} onValueChange={v => setIncomeForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lavagem simples">Lavagem simples</SelectItem>
                    <SelectItem value="Lavagem completa">Lavagem completa</SelectItem>
                    <SelectItem value="Outros serviços">Outros serviços</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Descrição</Label><Input placeholder="Ex: João Silva - ABC-1234" value={incomeForm.description} onChange={e => setIncomeForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div><Label>Valor (R$)</Label><Input type="number" step="0.01" required value={incomeForm.amount} onChange={e => setIncomeForm(f => ({ ...f, amount: e.target.value }))} /></div>
              <Button type="submit" className="w-full bg-success hover:bg-success/90 text-success-foreground" disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={openExpense} onOpenChange={setOpenExpense}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex-1 border-destructive text-destructive hover:bg-destructive/10">
              <Plus className="mr-2 h-4 w-4" /> Saída
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Nova saída</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveEntry("saida"); }} className="space-y-4">
              <div>
                <Label>Categoria</Label>
                <Select value={expenseForm.category} onValueChange={v => setExpenseForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Produtos">Produtos</SelectItem>
                    <SelectItem value="Funcionários">Funcionários</SelectItem>
                    <SelectItem value="Outros custos">Outros custos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Descrição</Label><Input placeholder="Ex: Shampoo automotivo" value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div><Label>Valor (R$)</Label><Input type="number" step="0.01" required value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))} /></div>
              <Button type="submit" className="w-full" variant="destructive" disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Entries list */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Movimentações</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma movimentação ainda. Use os botões acima para lançar entradas e saídas.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3">
                    {entry.type === "entrada" ? (
                      <TrendingUp className="h-4 w-4 text-success" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">{entry.category}</p>
                      <p className="text-xs text-muted-foreground">{entry.description || "Sem descrição"} • {new Date(entry.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                  <span className={`font-semibold text-sm ${entry.type === "entrada" ? "text-success" : "text-destructive"}`}>
                    {entry.type === "entrada" ? "+" : "-"}R${Number(entry.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CashFlow;
