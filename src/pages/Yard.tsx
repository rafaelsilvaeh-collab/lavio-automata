import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Clock, Car, MessageSquare, ChevronRight } from "lucide-react";
import { toast } from "sonner";

type CarStatus = 'aguardando' | 'em_lavagem' | 'finalizado' | 'cliente_avisado' | 'entregue';

interface YardCar {
  id: string;
  client: string;
  plate: string;
  service: string;
  entryTime: string;
  estimatedMinutes: number;
  scheduledNotify: string;
  status: CarStatus;
}

const statusConfig: Record<CarStatus, { label: string; className: string }> = {
  aguardando: { label: 'Aguardando', className: 'bg-warning/10 text-warning' },
  em_lavagem: { label: 'Em lavagem', className: 'bg-primary/10 text-primary' },
  finalizado: { label: 'Finalizado', className: 'bg-success/10 text-success' },
  cliente_avisado: { label: 'Cliente avisado', className: 'bg-accent/10 text-accent' },
  entregue: { label: 'Entregue', className: 'bg-muted text-muted-foreground' },
};

const statusOrder: CarStatus[] = ['aguardando', 'em_lavagem', 'finalizado', 'cliente_avisado', 'entregue'];

const mockCars: YardCar[] = [
  { id: '1', client: 'João Silva', plate: 'ABC-1234', service: 'Lavagem completa', entryTime: '08:30', estimatedMinutes: 60, scheduledNotify: '09:30', status: 'em_lavagem' },
  { id: '2', client: 'Maria Santos', plate: 'DEF-5678', service: 'Lavagem simples', entryTime: '09:00', estimatedMinutes: 30, scheduledNotify: '09:30', status: 'aguardando' },
  { id: '3', client: 'Pedro Costa', plate: 'GHI-9012', service: 'Lavagem completa', entryTime: '07:45', estimatedMinutes: 60, scheduledNotify: '08:45', status: 'finalizado' },
];

const Yard = () => {
  const [cars, setCars] = useState<YardCar[]>(mockCars);
  const [open, setOpen] = useState(false);
  const [editNotifyId, setEditNotifyId] = useState<string | null>(null);
  const [newNotifyTime, setNewNotifyTime] = useState('');

  const advanceStatus = (id: string) => {
    setCars(prev => prev.map(car => {
      if (car.id !== id) return car;
      const idx = statusOrder.indexOf(car.status);
      if (idx < statusOrder.length - 1) {
        const next = statusOrder[idx + 1];
        if (next === 'cliente_avisado') {
          toast.success(`Mensagem enviada para ${car.client}!`);
        }
        return { ...car, status: next };
      }
      return car;
    }));
  };

  const updateNotifyTime = (id: string) => {
    setCars(prev => prev.map(car =>
      car.id === id ? { ...car, scheduledNotify: newNotifyTime } : car
    ));
    setEditNotifyId(null);
    toast.success('Horário do aviso atualizado!');
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Carro registrado com sucesso!');
    setOpen(false);
  };

  const activeCars = cars.filter(c => c.status !== 'entregue');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pátio</h1>
          <p className="text-muted-foreground text-sm">{activeCars.length} carros no pátio</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary border-0"><Plus className="mr-2 h-4 w-4" /> Registrar carro</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Registrar carro</DialogTitle></DialogHeader>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <Label>Cliente</Label>
                <Select><SelectTrigger><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">João Silva - ABC-1234</SelectItem>
                    <SelectItem value="2">Maria Santos - DEF-5678</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Serviço</Label>
                <Select><SelectTrigger><SelectValue placeholder="Selecionar serviço" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simples">Lavagem simples (R$40)</SelectItem>
                    <SelectItem value="completa">Lavagem completa (R$80)</SelectItem>
                    <SelectItem value="premium">Lavagem premium (R$120)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Tempo estimado (min)</Label><Input type="number" defaultValue={40} /></div>
                <div><Label>Horário do aviso</Label><Input type="time" /></div>
              </div>
              <Button type="submit" className="w-full gradient-primary border-0">Registrar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {activeCars.map((car) => {
          const config = statusConfig[car.status];
          const nextIdx = statusOrder.indexOf(car.status) + 1;
          const nextStatus = nextIdx < statusOrder.length ? statusConfig[statusOrder[nextIdx]] : null;

          return (
            <Card key={car.id} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{car.client}</h3>
                      <Badge className={`text-[10px] ${config.className} border-0`}>{config.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      <Car className="h-3 w-3 inline mr-1" />{car.plate} • {car.service}
                    </p>
                  </div>
                </div>

                {/* Status timeline */}
                <div className="flex items-center gap-1 mb-3 overflow-x-auto">
                  {statusOrder.map((s, i) => {
                    const reached = statusOrder.indexOf(car.status) >= i;
                    return (
                      <div key={s} className="flex items-center">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${reached ? 'bg-primary' : 'bg-border'}`} />
                        {i < statusOrder.length - 1 && (
                          <div className={`w-6 h-0.5 ${reached && statusOrder.indexOf(car.status) > i ? 'bg-primary' : 'bg-border'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-3">
                  <span><Clock className="h-3 w-3 inline mr-1" />Entrada: {car.entryTime}</span>
                  <span>•</span>
                  <span>{car.estimatedMinutes}min estimados</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    Aviso: {car.scheduledNotify}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {nextStatus && (
                    <Button size="sm" className="gradient-primary border-0 text-xs" onClick={() => advanceStatus(car.id)}>
                      {nextStatus.label} <ChevronRight className="ml-1 h-3 w-3" />
                    </Button>
                  )}
                  {editNotifyId === car.id ? (
                    <div className="flex gap-2 items-center">
                      <Input type="time" className="h-8 w-28 text-xs" value={newNotifyTime} onChange={e => setNewNotifyTime(e.target.value)} />
                      <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => updateNotifyTime(car.id)}>Salvar</Button>
                      <Button size="sm" variant="ghost" className="text-xs h-8" onClick={() => setEditNotifyId(null)}>Cancelar</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => { setEditNotifyId(car.id); setNewNotifyTime(car.scheduledNotify); }}>
                      Alterar horário do aviso
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {activeCars.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Car className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum carro no pátio</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Yard;
