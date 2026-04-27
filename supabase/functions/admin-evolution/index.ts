import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (s: string, d?: unknown) =>
  console.log(`[ADMIN-EVOLUTION] ${s}${d ? " - " + JSON.stringify(d) : ""}`);

function getEvolutionConfig() {
  const url = Deno.env.get("EVOLUTION_API_URL");
  const key = Deno.env.get("EVOLUTION_API_KEY");
  if (!url || !key) throw new Error("Evolution API não configurada");
  return { url: url.replace(/\/$/, ""), key };
}

function maskHost(url: string): string {
  try {
    const u = new URL(url);
    return u.host;
  } catch {
    return "***";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Sessão expirada" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    const callerId = userData.user.id;
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const body = await req.json();
    const { action } = body;
    log(`action=${action}`);

    const { url, key } = getEvolutionConfig();
    const host = maskHost(url);

    if (action === "get-status") {
      const res = await fetch(`${url}/`, { method: "GET", headers: { apikey: key } });
      const data = await res.json().catch(() => ({}));
      return new Response(
        JSON.stringify({
          status: res.status,
          ok: res.ok,
          host,
          version: data?.version || data?.message || null,
          raw: data,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "list-instances") {
      const res = await fetch(`${url}/instance/fetchInstances`, {
        method: "GET",
        headers: { apikey: key },
      });
      const data = await res.json().catch(() => ([]));

      // Cross-reference with whatsapp_config to find owner businesses
      const { data: configs } = await admin
        .from("whatsapp_config")
        .select("instance_id, user_id, profiles:profiles!inner(business_name)")
        .not("instance_id", "is", null);

      // Fallback if join syntax fails: separate query
      let ownerMap = new Map<string, { user_id: string; business_name: string | null }>();
      if (configs && Array.isArray(configs)) {
        for (const c of configs as any[]) {
          if (c.instance_id) {
            ownerMap.set(c.instance_id, {
              user_id: c.user_id,
              business_name: c.profiles?.business_name ?? null,
            });
          }
        }
      }

      const list = Array.isArray(data)
        ? data.map((inst: any) => {
            const name = inst?.instance?.instanceName || inst?.name || inst?.instanceName;
            const state = inst?.instance?.state || inst?.connectionStatus || inst?.status || "unknown";
            const owner = name ? ownerMap.get(name) : undefined;
            return {
              instance_name: name,
              state,
              owner_user_id: owner?.user_id ?? null,
              owner_business_name: owner?.business_name ?? null,
            };
          })
        : [];

      return new Response(JSON.stringify({ status: res.status, instances: list, raw: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "send-test") {
      const { instanceName, phone, message } = body;
      if (!instanceName || !phone || !message) {
        throw new Error("instanceName, phone e message são obrigatórios");
      }

      // Pre-flight
      const stateRes = await fetch(`${url}/instance/connectionState/${instanceName}`, {
        method: "GET",
        headers: { apikey: key },
      });
      const stateData = await stateRes.json().catch(() => ({}));
      const state = stateData?.instance?.state || stateData?.state || "close";

      if (state !== "open") {
        return new Response(
          JSON.stringify({
            error: "Instância desconectada",
            state,
            raw_state_response: stateData,
            raw_state_status: stateRes.status,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 }
        );
      }

      let cleanPhone = String(phone).replace(/\D/g, "");
      if (cleanPhone.length <= 11) cleanPhone = `55${cleanPhone}`;

      const sendRes = await fetch(`${url}/message/sendText/${instanceName}`, {
        method: "POST",
        headers: { apikey: key, "Content-Type": "application/json" },
        body: JSON.stringify({ number: cleanPhone, textMessage: { text: message } }),
      });
      const sendData = await sendRes.json().catch(() => ({}));

      return new Response(
        JSON.stringify({
          state,
          send_status: sendRes.status,
          send_ok: sendRes.ok,
          send_response: sendData,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Ação desconhecida: ${action}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("ERROR", { msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
