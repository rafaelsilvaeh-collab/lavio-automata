import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[WHATSAPP] ${step}${d}`);
};

const maskNumber = (n: string) => {
  if (!n) return "";
  if (n.length <= 4) return "***";
  return `${n.slice(0, 4)}***${n.slice(-2)}`;
};

function getEvolutionConfig() {
  const url = Deno.env.get("EVOLUTION_API_URL");
  const key = Deno.env.get("EVOLUTION_API_KEY");
  if (!url || url.trim() === "") {
    const e = new Error("EVOLUTION_API_URL não configurada");
    (e as any).code = "WA_NOT_CONFIGURED";
    (e as any).status = 503;
    throw e;
  }
  if (!key || key.trim() === "") {
    const e = new Error("EVOLUTION_API_KEY não configurada");
    (e as any).code = "WA_NOT_CONFIGURED";
    (e as any).status = 503;
    throw e;
  }
  return { url: url.replace(/\/$/, ""), key };
}

function buildInstanceName(userId: string): string {
  return `lavgo_${userId.replace(/-/g, "").slice(0, 16)}`;
}

async function checkInstanceState(url: string, key: string, instanceName: string): Promise<string> {
  const res = await fetch(`${url}/instance/connectionState/${instanceName}`, {
    method: "GET",
    headers: { apikey: key },
  });
  const data = await res.json().catch(() => ({}));
  const state = data?.instance?.state || data?.state || "close";
  logStep(`[WA] action=check-state URL=${url} STATE=${state} STATUS=${res.status}`);
  return state;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
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
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      logStep("Auth failed", { error: userError?.message });
      return new Response(JSON.stringify({ error: "Sessão expirada. Faça login novamente." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const userId = userData.user.id;
    const instanceName = buildInstanceName(userId);
    logStep(`[WA] user=${userId} instance=${instanceName}`);

    const body = await req.json();
    const { action } = body;
    if (!action) throw new Error("Ação não especificada");

    logStep(`[WA] action=${action}`);

    if (action === "create-instance") {
      const { url, key } = getEvolutionConfig();

      const res = await fetch(`${url}/instance/create`, {
        method: "POST",
        headers: { apikey: key, "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceName,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
        }),
      });

      const data = await res.json();
      logStep(`[WA] action=create-instance URL=${url} STATUS=${res.status}`);

      if (!res.ok && !JSON.stringify(data).toLowerCase().includes("already")) {
        console.error("[WHATSAPP] Instance create error:", JSON.stringify(data));
        throw new Error("Falha ao criar instância WhatsApp");
      }

      const { data: existing } = await supabase
        .from("whatsapp_config")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("whatsapp_config")
          .update({ instance_id: instanceName, updated_at: new Date().toISOString() })
          .eq("user_id", userId);
      } else {
        await supabase
          .from("whatsapp_config")
          .insert({ user_id: userId, instance_id: instanceName, is_connected: false });
      }

      return new Response(JSON.stringify({ success: true, instanceName }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get-qrcode") {
      const { url, key } = getEvolutionConfig();

      const res = await fetch(`${url}/instance/connect/${instanceName}`, {
        method: "GET",
        headers: { apikey: key },
      });

      const data = await res.json();
      logStep(`[WA] action=get-qrcode URL=${url} STATUS=${res.status}`);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "check-status") {
      const { url, key } = getEvolutionConfig();
      const state = await checkInstanceState(url, key, instanceName);
      const isConnected = state === "open";

      await supabase
        .from("whatsapp_config")
        .update({
          is_connected: isConnected,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      return new Response(
        JSON.stringify({ conectado: isConnected, estado: state }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "send-message") {
      const { phone, message } = body;
      if (!phone || !message) throw new Error("phone e message são obrigatórios");

      const { url, key } = getEvolutionConfig();

      // Pre-flight: connection state
      const state = await checkInstanceState(url, key, instanceName);
      if (state !== "open") {
        logStep(`[WA] action=send-message BLOCKED STATE=${state}`);
        return new Response(
          JSON.stringify({
            error: "WhatsApp desconectado. Reconecte em Configurações.",
            code: "WA_DISCONNECTED",
            state,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 }
        );
      }

      // Normalize phone: only digits, prepend 55 if missing
      let cleanPhone = String(phone).replace(/\D/g, "");
      if (cleanPhone.length <= 11) cleanPhone = `55${cleanPhone}`;

      const res = await fetch(`${url}/message/sendText/${instanceName}`, {
        method: "POST",
        headers: { apikey: key, "Content-Type": "application/json" },
        body: JSON.stringify({ number: cleanPhone, textMessage: { text: message } }),
      });

      const data = await res.json().catch(() => ({}));
      logStep(`[WA] action=send-message URL=${url} STATE=${state} NUMBER=${maskNumber(cleanPhone)} STATUS=${res.status}`);

      if (!res.ok) {
        console.error("[WHATSAPP] Send message error:", JSON.stringify(data));
        return new Response(
          JSON.stringify({ error: "Falha ao enviar mensagem WhatsApp", details: data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 }
        );
      }

      return new Response(JSON.stringify({ success: true, ...data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "disconnect") {
      const { url, key } = getEvolutionConfig();

      const res = await fetch(`${url}/instance/logout/${instanceName}`, {
        method: "DELETE",
        headers: { apikey: key },
      });

      const data = await res.json();

      await supabase
        .from("whatsapp_config")
        .update({ is_connected: false, updated_at: new Date().toISOString() })
        .eq("user_id", userId);

      logStep(`[WA] action=disconnect URL=${url} STATUS=${res.status}`);
      return new Response(JSON.stringify({ success: true, ...data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Ação desconhecida: ${action}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const code = (error as any)?.code;
    const status = (error as any)?.status || 400;
    logStep(`[WA] ERROR code=${code || "ERR"} STATUS=${status}`, { message: msg });
    return new Response(JSON.stringify({ error: msg, code }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});
