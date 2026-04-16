import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

const Services = () => {
  const { user } = useAuth();
  const [services, setServices] = useState<Tables<"services">[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("30");

  const fetchServices = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("name");
    if (error) console.error(error);
    setServices(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchServices();
  }, [user]);

  const resetForm = () => {
    setName("");
    setPrice("");
    setDuration("30");
    setEditingId(null);
  };

  const openEdit = (s: Tables<"services">) => {
    setEditingId(s.id);
    setName(s.name);
    setPrice(String(s.price));
    setDuration(String(s.duration_minutes));
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) {
      toast.error("Informe o nome do serviço");
      return;
    }
    setSaving(true);

    const payload = {
      name: name.trim(),
      price: parseFloat(price) || 0,
      duration_minutes: parseInt(duration) || 30,
      user_id: user.id,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("services").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("services").insert(payload));
    }

    if (error) {
      toast.error("Erro ao salvar serviço");
      console.error(error);
    } else {
      toast.success(editingId ? "Serviço atualizado!" : "Serviço cadastrado!");
      setOpen(false);
      resetForm();
      fetchServices();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir serviço");
    } else {
      toast.success("Serviço excluído!");
      fetchServices();
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Serviços</h1>
          <p className="text-muted-foreground text-sm">{services.length} serviços cadastrados</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gradient-primary border-0">
              <Plus className="mr-2 h-4 w-4" /> Novo serviço
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar serviço" : "Novo serviço"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nome do serviço</Label>
                <Input placeholder="Ex: Lavagem Completa" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Preço (R$)</Label>
                  <Input type="number" step="0.01" min="0" placeholder="0,00" value={price} onChange={(e) => setPrice(e.target.value)} />
                </div>
                <div>
                  <Label>Duração (min)</Label>
                  <Input type="number" min="1" value={duration} onChange={(e) => setDuration(e.target.value)} />
                </div>
              </div>
              <Button type="submit" className="w-full gradient-primary border-0" disabled={saving}>
                {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Cadastrar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {services.map((s) => (
          <Card key={s.id} className="border-border/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">{s.name}</h3>
                <p className="text-sm text-muted-foreground">
                  R$ {Number(s.price).toFixed(2)} • {s.duration_minutes} min
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="icon" variant="ghost" onClick={() => openEdit(s)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(s.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {services.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Wrench className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum serviço cadastrado.</p>
            <p className="text-sm">Adicione seus tipos de lavagem para começar.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Services;
