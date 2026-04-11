import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Phone, Car, User } from "lucide-react";
import { toast } from "sonner";

interface Customer {
  id: string;
  name: string;
  phone: string;
  car_model: string;
  plate: string;
  last_wash: string;
  notes: string;
  active: boolean;
  recurring: boolean;
}

const mockCustomers: Customer[] = [
  { id: '1', name: 'João Silva', phone: '(11) 99999-1234', car_model: 'Civic 2022', plate: 'ABC-1234', last_wash: '2024-03-10', notes: '', active: true, recurring: true },
  { id: '2', name: 'Maria Santos', phone: '(11) 98888-5678', car_model: 'Corolla 2023', plate: 'DEF-5678', last_wash: '2024-03-08', notes: 'Prefere lavagem completa', active: true, recurring: false },
  { id: '3', name: 'Pedro Costa', phone: '(11) 97777-9012', car_model: 'HB20 2021', plate: 'GHI-9012', last_wash: '2024-02-15', notes: '', active: false, recurring: false },
];

const Customers = () => {
  const [search, setSearch] = useState('');
  const [customers] = useState<Customer[]>(mockCustomers);
  const [open, setOpen] = useState(false);

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.plate.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Cliente salvo com sucesso!');
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground text-sm">{customers.length} clientes cadastrados</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary border-0"><Plus className="mr-2 h-4 w-4" /> Novo cliente</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Novo cliente</DialogTitle></DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div><Label>Nome</Label><Input required /></div>
              <div><Label>Telefone</Label><Input required placeholder="(11) 99999-9999" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Modelo do carro</Label><Input placeholder="Ex: Civic 2022" /></div>
                <div><Label>Placa</Label><Input placeholder="ABC-1234" /></div>
              </div>
              <div><Label>Observações</Label><Textarea /></div>
              <Button type="submit" className="w-full gradient-primary border-0">Salvar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nome, placa ou telefone..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid gap-3">
        {filtered.map((customer) => (
          <Card key={customer.id} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="gradient-primary w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{customer.name}</h3>
                      {customer.recurring && <Badge variant="secondary" className="text-[10px]">Recorrente</Badge>}
                      {!customer.active && <Badge variant="destructive" className="text-[10px]">Inativo</Badge>}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{customer.phone}</span>
                      <span className="flex items-center gap-1"><Car className="h-3 w-3" />{customer.car_model} • {customer.plate}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Última lavagem: {new Date(customer.last_wash).toLocaleDateString('pt-BR')}</p>
                    {customer.notes && <p className="text-xs text-muted-foreground mt-1 italic">{customer.notes}</p>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum cliente encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Customers;
