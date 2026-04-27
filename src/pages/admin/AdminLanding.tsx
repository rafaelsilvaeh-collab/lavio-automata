import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Edit2, Save } from "lucide-react";

interface LandingFields {
  landing_headline: string;
  landing_subheadline: string;
  landing_video_url: string;
}

export function AdminLanding() {
  const [data, setData] = useState<LandingFields | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("landing_headline, landing_subheadline, landing_video_url")
        .eq("id", 1)
        .maybeSingle();
      if (data) setData(data as LandingFields);
    })();
  }, []);

  const save = async () => {
    if (!data) return;
    setSaving(true);
    const { error } = await supabase.from("app_settings").update(data as any).eq("id", 1);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Landing page atualizada");
    setEditing(false);
  };

  if (!data) return <div className="text-muted-foreground">Carregando…</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Conteúdo da Landing Page</CardTitle>
          {!editing ? (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Edit2 className="mr-1 h-3 w-3" /> Editar
            </Button>
          ) : (
            <Button size="sm" className="gradient-primary border-0" onClick={save} disabled={saving}>
              <Save className="mr-1 h-3 w-3" /> {saving ? "Salvando…" : "Salvar"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Headline</Label>
          <Textarea rows={2} disabled={!editing} value={data.landing_headline}
            onChange={(e) => setData({ ...data, landing_headline: e.target.value })} />
        </div>
        <div>
          <Label>Subtítulo</Label>
          <Textarea rows={2} disabled={!editing} value={data.landing_subheadline}
            onChange={(e) => setData({ ...data, landing_subheadline: e.target.value })} />
        </div>
        <div>
          <Label>URL do vídeo</Label>
          <Input disabled={!editing} placeholder="https://youtube.com/…" value={data.landing_video_url}
            onChange={(e) => setData({ ...data, landing_video_url: e.target.value })} />
        </div>
      </CardContent>
    </Card>
  );
}
