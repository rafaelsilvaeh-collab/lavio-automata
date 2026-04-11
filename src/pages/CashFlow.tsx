import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, TrendingUp, TrendingDown, DollarSign, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { toast } from "sonner";

interface CashEntry {
  id: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  time: string;
}

const mockEntries: CashEntry[] = [
  { id: '1', type: 'income', category: 'Lavagem simples', description: 'João Silva - ABC-1234', amount: 40, time: '08:45' },
  { id: '2', type: 'income', category: 'Lavagem completa', description: 'Maria Santos - DEF-5678', amount: 80, time: '09:30' },
  { id: '3', type: 'income', category: 'Lavagem completa', description: 'Pedro Costa - GHI-9012', amount: 80, time: '10:15' },
  { id: '4', type: 'expense', category: 'Produtos', description: 'Shampoo automotivo', amount: 35, time: '11:00' },
  { id: '5', type: 'income', category: 'Lavagem simples', description: 'Ana Lima - JKL-3456', amount: 40, time: '11:30' },
  { id: '6', type: 'expense', category: 'Funcionários', description: 'Diária - Carlos', amount: 100, time: '12:00' },
];

const CashFlow = () => {
  const [entries] = useState<CashEntry[]>(mockEntries);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [openIncome, setOpenIncome] = useState(false);
  const [openExpense, setOpenExpense] = useState(false);

  const totalIncome = entries.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
  const totalExpense = entries.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
  const result = totalIncome - totalExpense;

  const handleSave = (type: string) => {
    toast.success(`${type === 'income' ? 'Entrada' : 'Saída'} registrada!`);
    if (type === 'income') setOpenIncome(false);
    else setOpenExpense(false);
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
            <p className={`text-lg font-bold ${result >= 0 ? 'text-success' : 'text-destructive'}`}>R${result}</p>
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
            <form onSubmit={(e) => { e.preventDefault(); handleSave('income'); }} className="space-y-4">
              <div>
                <Label>Categoria</Label>
                <Select><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simples">Lavagem simples</SelectItem>
                    <SelectItem value="completa">Lavagem completa</SelectItem>
                    <SelectItem value="outros">Outros serviços</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Descrição</Label><Input placeholder="Ex: João Silva - ABC-1234" /></div>
              <div><Label>Valor (R$)</Label><Input type="number" step="0.01" required /></div>
              <Button type="submit" className="w-full bg-success hover:bg-success/90 text-success-foreground">Salvar</Button>
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
            <form onSubmit={(e) => { e.preventDefault(); handleSave('expense'); }} className="space-y-4">
              <div>
                <Label>Categoria</Label>
                <Select><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="produtos">Produtos</SelectItem>
                    <SelectItem value="funcionarios">Funcionários</SelectItem>
                    <SelectItem value="outros">Outros custos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Descrição</Label><Input placeholder="Ex: Shampoo automotivo" /></div>
              <div><Label>Valor (R$)</Label><Input type="number" step="0.01" required /></div>
              <Button type="submit" className="w-full" variant="destructive">Salvar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Entries list */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Movimentações</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-3">
                  {entry.type === 'income' ? (
                    <TrendingUp className="h-4 w-4 text-success" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">{entry.category}</p>
                    <p className="text-xs text-muted-foreground">{entry.description} • {entry.time}</p>
                  </div>
                </div>
                <span className={`font-semibold text-sm ${entry.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                  {entry.type === 'income' ? '+' : '-'}R${entry.amount}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CashFlow;
