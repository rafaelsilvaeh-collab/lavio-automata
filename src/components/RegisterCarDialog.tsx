import { useState, useEffect, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, X, Camera, ChevronRight, ChevronLeft, User, Car as CarIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";
import { formatPhoneInput, toStorage } from "@/lib/phone";

interface RegisterCarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  editId?: string | null;
}

type Step = 1 | 2 | 3;

export const RegisterCarDialog = ({ open, onOpenChange, onSuccess, editId }: RegisterCarDialogProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);

  // Step 1: customer
  const [customers, setCustomers] = useState<Tables<"customers">[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Tables<"customers"> | null>(null);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", plate: "", car_model: "" });

  // Step 1: photo / notes
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [entryNotes, setEntryNotes] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2: timing
  const [estimatedMinutes, setEstimatedMinutes] = useState("40");
  const [notifyTime, setNotifyTime] = useState("");

  // Step 3: service
  const [services, setServices] = useState<Tables<"services">[]>([]);
  const [serviceSearch, setServiceSearch] = useState("");
  const [selectedService, setSelectedService] = useState<Tables<"services"> | null>(null);
  const [showNewService, setShowNewService] = useState(false);
  const [newService, setNewService] = useState({ name: "", price: "" });
  const [saveToCatalog, setSaveToCatalog] = useState(true);
  const [finalPrice, setFinalPrice] = useState("");
  const [adHocServiceName, setAdHocServiceName] = useState("");

  // Debounce customer search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Load data on open
  useEffect(() => {
    if (!user || !open) return;
    const load = async () => {
      const [{ data: c }, { data: s }] = await Promise.all([
        supabase.from("customers").select("*").order("name"),
        supabase.from("services").select("*").order("name"),
      ]);
      setCustomers(c || []);
      setServices(s || []);
    };
    load();
  }, [user, open]);

  // Load edit data
  useEffect(() => {
    if (!editId || !user || !open) return;
    (async () => {
      const { data } = await supabase
        .from("cars_in_yard")
        .select("*, customers(*), services(*)")
        .eq("id", editId)
        .maybeSingle();
      if (!data) return;
      setSelectedCustomer(data.customers as any);
      setEstimatedMinutes(String(data.estimated_duration ?? 40));
      if (data.scheduled_notification_time) {
        const d = new Date(data.scheduled_notification_time);
        setNotifyTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
      }
      setSelectedService((data.services as any) ?? null);
      setEntryNotes(data.entry_notes ?? "");
      setAdHocServiceName(data.ad_hoc_service_name ?? "");
      setFinalPrice(
        data.final_price != null
          ? String(data.final_price)
          : data.services
          ? String((data.services as any).price)
          : ""
      );
      if (data.photo_url) {
        setExistingPhotoUrl(data.photo_url);
        const { data: signed } = await supabase.storage
          .from("vehicle-photos")
          .createSignedUrl(data.photo_url, 3600);
        if (signed?.signedUrl) setPhotoPreview(signed.signedUrl);
      }
    })();
  }, [editId, user, open]);

  const filteredCustomers = useMemo(() => {
    if (!debouncedSearch) return customers.slice(0, 8);
    const q = debouncedSearch.toLowerCase();
    return customers
      .filter((c) => c.name.toLowerCase().includes(q) || (c.plate || "").toLowerCase().includes(q))
      .slice(0, 8);
  }, [customers, debouncedSearch]);

  const filteredServices = useMemo(() => {
    if (!serviceSearch) return services;
    const q = serviceSearch.toLowerCase();
    return services.filter((s) => s.name.toLowerCase().includes(q));
  }, [services, serviceSearch]);

  const reset = () => {
    setStep(1);
    setSearch("");
    setDebouncedSearch("");
    setSelectedCustomer(null);
    setShowNewCustomer(false);
    setNewCustomer({ name: "", phone: "", plate: "", car_model: "" });
    setPhotoFile(null);
    setPhotoPreview(null);
    setExistingPhotoUrl(null);
    setEntryNotes("");
    setEstimatedMinutes("40");
    setNotifyTime("");
    setServiceSearch("");
    setSelectedService(null);
    setShowNewService(false);
    setNewService({ name: "", price: "" });
    setSaveToCatalog(true);
    setFinalPrice("");
    setAdHocServiceName("");
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSelectCustomer = (c: Tables<"customers">) => {
    setSelectedCustomer(c);
    setShowNewCustomer(false);
    setSearch("");
  };

  const handleCreateCustomer = async () => {
    if (!user) return;
    if (!newCustomer.name.trim() || !newCustomer.phone.trim() || !newCustomer.plate.trim()) {
      toast.error("Nome, WhatsApp e placa são obrigatórios");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("customers")
      .insert({
        user_id: user.id,
        name: newCustomer.name.trim(),
        phone: toStorage(newCustomer.phone),
        plate: newCustomer.plate.trim().toUpperCase(),
        car_model: newCustomer.car_model.trim() || null,
      })
      .select()
      .single();
    setSaving(false);
    if (error || !data) {
      toast.error("Erro ao cadastrar cliente");
      return;
    }
    setCustomers((prev) => [data, ...prev]);
    handleSelectCustomer(data);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Foto muito grande (máx 5MB)");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setEntryNotes("");
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setExistingPhotoUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const goToStep2 = () => {
    if (!selectedCustomer) {
      toast.error("Selecione ou cadastre um cliente");
      return;
    }
    if (!photoFile && !existingPhotoUrl && !entryNotes.trim()) {
      toast.error("Adicione uma foto ou descreva as condições do veículo");
      return;
    }
    setStep(2);
  };

  const goToStep3 = () => {
    if (!estimatedMinutes || parseInt(estimatedMinutes) <= 0) {
      toast.error("Informe o tempo estimado");
      return;
    }
    setStep(3);
  };

  const handleSelectService = (s: Tables<"services">) => {
    setSelectedService(s);
    setAdHocServiceName("");
    setFinalPrice(String(Number(s.price)));
    setShowNewService(false);
    setServiceSearch("");
  };

  const handleAdHocService = async (): Promise<{ serviceId: string | null; name: string; price: number } | null> => {
    if (!user) return null;
    const name = newService.name.trim();
    const price = parseFloat(newService.price.replace(",", "."));
    if (!name || !price || price <= 0) {
      toast.error("Informe nome e preço do serviço");
      return null;
    }
    if (saveToCatalog) {
      const { data, error } = await supabase
        .from("services")
        .insert({ user_id: user.id, name, price })
        .select()
        .single();
      if (error || !data) {
        toast.error("Erro ao salvar serviço no catálogo");
        return null;
      }
      setServices((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      return { serviceId: data.id, name, price };
    }
    return { serviceId: null, name, price };
  };

  const handleRegister = async () => {
    if (!user || !selectedCustomer) return;
    setSaving(true);

    let serviceIdToUse: string | null = selectedService?.id ?? null;
    let serviceNameToUse = selectedService?.name ?? "";
    let priceToUse = parseFloat(finalPrice.replace(",", ".")) || 0;

    if (showNewService) {
      const result = await handleAdHocService();
      if (!result) {
        setSaving(false);
        return;
      }
      serviceIdToUse = result.serviceId;
      serviceNameToUse = result.name;
      priceToUse = result.price;
    }

    if (!serviceIdToUse && !serviceNameToUse) {
      toast.error("Selecione ou cadastre um serviço");
      setSaving(false);
      return;
    }
    if (!priceToUse || priceToUse <= 0) {
      toast.error("Informe um preço válido");
      setSaving(false);
      return;
    }

    // Upload photo if new file present
    let photoPath: string | null = existingPhotoUrl;
    if (photoFile) {
      const ext = photoFile.name.split(".").pop() || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("vehicle-photos")
        .upload(path, photoFile, { upsert: false, contentType: photoFile.type });
      if (upErr) {
        toast.error("Erro ao enviar foto");
        console.error(upErr);
        setSaving(false);
        return;
      }
      // Delete old photo if replacing
      if (existingPhotoUrl) {
        await supabase.storage.from("vehicle-photos").remove([existingPhotoUrl]);
      }
      photoPath = path;
    }

    let scheduled: string | null = null;
    if (notifyTime) {
      const [hh, mm] = notifyTime.split(":").map(Number);
      const d = new Date();
      d.setHours(hh, mm, 0, 0);
      scheduled = d.toISOString();
    }
    const payload = {
      user_id: user.id,
      customer_id: selectedCustomer.id,
      service_id: serviceIdToUse,
      ad_hoc_service_name: serviceIdToUse ? null : serviceNameToUse,
      final_price: priceToUse,
      estimated_duration: parseInt(estimatedMinutes) || null,
      scheduled_notification_time: scheduled,
      photo_url: photoPath,
      entry_notes: entryNotes.trim() || null,
    };

    const { error } = editId
      ? await supabase.from("cars_in_yard").update(payload).eq("id", editId)
      : await supabase.from("cars_in_yard").insert(payload);

    setSaving(false);
    if (error) {
      toast.error("Erro ao registrar carro");
      console.error(error);
      return;
    }
    toast.success(editId ? "Registro atualizado ✅" : "Carro registrado ✅");
    reset();
    onOpenChange(false);
    onSuccess?.();
  };

  // Step indicator
  const StepIndicator = () => (
    <div className="flex items-center gap-2 mb-2">
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex items-center flex-1">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
              step >= n ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {n}
          </div>
          {n < 3 && (
            <div className={`flex-1 h-0.5 mx-1 ${step > n ? "bg-primary" : "bg-border"}`} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editId ? "Editar registro" : "Registrar carro"}</DialogTitle>
        </DialogHeader>
        <StepIndicator />

        {/* STEP 1 — Customer + photo/notes */}
        {step === 1 && (
          <div className="space-y-4">
            {!selectedCustomer && !showNewCustomer && (
              <>
                <div>
                  <Label>Cliente</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Buscar por nome ou placa..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
                {filteredCustomers.length > 0 && (
                  <div className="border border-border rounded-lg divide-y divide-border max-h-60 overflow-y-auto">
                    {filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-secondary/50 flex items-center gap-2"
                        onClick={() => handleSelectCustomer(c)}
                      >
                        <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{c.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {c.plate || "Sem placa"} {c.car_model ? `• ${c.car_model}` : ""}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {filteredCustomers.length === 0 && debouncedSearch && (
                  <p className="text-xs text-muted-foreground text-center">Nenhum cliente encontrado</p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowNewCustomer(true)}
                >
                  + Cadastrar novo cliente
                </Button>
              </>
            )}

            {!selectedCustomer && showNewCustomer && (
              <div className="space-y-3 border border-border rounded-lg p-3 bg-secondary/20">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Novo cliente</h4>
                  <button
                    type="button"
                    onClick={() => setShowNewCustomer(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div>
                  <Label>Nome *</Label>
                  <Input
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>WhatsApp *</Label>
                  <Input
                    placeholder="(15) 99999-9999"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer((f) => ({ ...f, phone: formatPhoneInput(e.target.value) }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Placa *</Label>
                    <Input
                      placeholder="ABC-1234"
                      value={newCustomer.plate}
                      onChange={(e) => setNewCustomer((f) => ({ ...f, plate: e.target.value.toUpperCase() }))}
                    />
                  </div>
                  <div>
                    <Label>Modelo</Label>
                    <Input
                      placeholder="Civic 2022"
                      value={newCustomer.car_model}
                      onChange={(e) => setNewCustomer((f) => ({ ...f, car_model: e.target.value }))}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  className="w-full gradient-primary border-0"
                  onClick={handleCreateCustomer}
                  disabled={saving}
                >
                  {saving ? "Salvando..." : "Salvar e continuar →"}
                </Button>
              </div>
            )}

            {selectedCustomer && (
              <>
                <div className="border border-border rounded-lg p-3 bg-secondary/20 flex items-center gap-3">
                  <User className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{selectedCustomer.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {selectedCustomer.plate || "Sem placa"}{selectedCustomer.car_model ? ` • ${selectedCustomer.car_model}` : ""}
                    </p>
                  </div>
                  {!editId && (
                    <button
                      type="button"
                      onClick={() => setSelectedCustomer(null)}
                      className="text-xs text-muted-foreground hover:text-foreground underline"
                    >
                      Trocar
                    </button>
                  )}
                </div>

                <div>
                  <Label>📸 Foto do veículo na entrada</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                  {photoPreview ? (
                    <div className="relative mt-1 rounded-lg overflow-hidden border border-border">
                      <img src={photoPreview} alt="Foto do veículo" className="w-full max-h-48 object-cover" />
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="absolute top-2 right-2 bg-background/90 hover:bg-background rounded-full p-1.5 shadow"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full mt-1"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="h-4 w-4 mr-2" /> Tirar / escolher foto
                    </Button>
                  )}
                </div>

                {!photoPreview && (
                  <div>
                    <Label>📝 Observações sobre o veículo *</Label>
                    <Textarea
                      placeholder="Ex: risco na porta esquerda, amassado no para-choque traseiro..."
                      value={entryNotes}
                      onChange={(e) => setEntryNotes(e.target.value)}
                      className="mt-1"
                      rows={3}
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Obrigatório quando não há foto — registra a condição do veículo na entrada.
                    </p>
                  </div>
                )}

                <Button type="button" className="w-full gradient-primary border-0" onClick={goToStep2}>
                  Continuar → <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        )}

        {/* STEP 2 — timing */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tempo estimado (min)</Label>
                <Input
                  type="number"
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(e.target.value)}
                />
              </div>
              <div>
                <Label>Horário do aviso WhatsApp</Label>
                <Input type="time" value={notifyTime} onChange={(e) => setNotifyTime(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
              </Button>
              <Button type="button" className="flex-1 gradient-primary border-0" onClick={goToStep3}>
                Continuar <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3 — service + price */}
        {step === 3 && (
          <div className="space-y-4">
            {!selectedService && !showNewService && (
              <>
                <div>
                  <Label>Serviço</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Buscar serviço cadastrado..."
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                    />
                  </div>
                </div>
                {filteredServices.length > 0 ? (
                  <div className="border border-border rounded-lg divide-y divide-border max-h-48 overflow-y-auto">
                    {filteredServices.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-secondary/50 flex justify-between items-center"
                        onClick={() => handleSelectService(s)}
                      >
                        <span className="text-sm font-medium">{s.name}</span>
                        <span className="text-sm text-muted-foreground">R$ {Number(s.price).toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center">Nenhum serviço encontrado</p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowNewService(true)}
                >
                  + Cadastrar novo serviço
                </Button>
              </>
            )}

            {showNewService && (
              <div className="space-y-3 border border-border rounded-lg p-3 bg-secondary/20">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Novo serviço</h4>
                  <button
                    type="button"
                    onClick={() => setShowNewService(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div>
                  <Label>Nome do serviço *</Label>
                  <Input
                    value={newService.name}
                    onChange={(e) => setNewService((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Preço (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newService.price}
                    onChange={(e) => setNewService((f) => ({ ...f, price: e.target.value }))}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="save-catalog"
                    checked={saveToCatalog}
                    onCheckedChange={(v) => setSaveToCatalog(!!v)}
                  />
                  <label htmlFor="save-catalog" className="text-sm cursor-pointer">
                    Salvar no catálogo para próximas vezes
                  </label>
                </div>
              </div>
            )}

            {selectedService && (
              <div className="border border-border rounded-lg p-3 bg-secondary/20 flex items-center gap-3">
                <CarIcon className="h-5 w-5 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{selectedService.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Catálogo • R$ {Number(selectedService.price).toFixed(2)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedService(null);
                    setFinalPrice("");
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Trocar
                </button>
              </div>
            )}

            {(selectedService || showNewService) && (
              <div>
                <Label>Preço (R$) — editável</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={showNewService ? newService.price : finalPrice}
                  onChange={(e) => {
                    if (showNewService) setNewService((f) => ({ ...f, price: e.target.value }));
                    else setFinalPrice(e.target.value);
                  }}
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(2)}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
              </Button>
              <Button
                type="button"
                className="flex-1 gradient-primary border-0"
                onClick={handleRegister}
                disabled={saving}
              >
                {saving ? "Salvando..." : editId ? "Salvar alterações" : "Registrar carro →"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
