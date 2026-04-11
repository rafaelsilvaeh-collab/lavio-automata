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
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autenticado");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Usuário inválido");

    const userId = userData.user.id;
    logStep("User authenticated", { userId });

    // Get user's Z-API config
    const { data: config, error: configError } = await supabase
      .from("whatsapp_config")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (configError) throw new Error(`Erro ao buscar config: ${configError.message}`);

    const body = await req.json();
    const { action } = body;

    if (!action) throw new Error("Ação não especificada");

    logStep("Action requested", { action });

    // Actions that don't require a connected instance
    if (action === "save-config") {
      const { instance_id, api_key } = body;
      if (!instance_id || !api_key) throw new Error("instance_id e api_key são obrigatórios");

      const upsertData = {
        user_id: userId,
        instance_id,
        api_key,
        is_connected: false,
        updated_at: new Date().toISOString(),
      };

      if (config) {
        const { error } = await supabase
          .from("whatsapp_config")
          .update(upsertData)
          .eq("user_id", userId);
        if (error) throw new Error(`Erro ao salvar: ${error.message}`);
      } else {
        const { error } = await supabase
          .from("whatsapp_config")
          .insert(upsertData);
        if (error) throw new Error(`Erro ao salvar: ${error.message}`);
      }

      logStep("Config saved");
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // All other actions require config
    if (!config?.instance_id || !config?.api_key) {
      throw new Error("WhatsApp não configurado. Adicione seu Instance ID e Token Z-API.");
    }

    const baseUrl = `https://api.z-api.io/instances/${config.instance_id}/token/${config.api_key}`;

    if (action === "get-qrcode") {
      const res = await fetch(`${baseUrl}/qr-code/image`, { method: "GET" });
      const data = await res.json();
      logStep("QR code fetched", { status: res.status });

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "check-status") {
      const res = await fetch(`${baseUrl}/status`, { method: "GET" });
      const data = await res.json();
      logStep("Status checked", { status: res.status, data });

      const isConnected = data?.connected === true;

      // Update connection status in DB
      await supabase
        .from("whatsapp_config")
        .update({
          is_connected: isConnected,
          phone_number: data?.phoneNumber || config.phone_number,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      return new Response(JSON.stringify({ ...data, is_connected: isConnected }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "send-message") {
      const { phone, message } = body;
      if (!phone || !message) throw new Error("phone e message são obrigatórios");

      // Clean phone number (keep only digits, add 55 if needed)
      let cleanPhone = phone.replace(/\D/g, "");
      if (cleanPhone.length <= 11) cleanPhone = `55${cleanPhone}`;

      const res = await fetch(`${baseUrl}/send-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone, message }),
      });

      const data = await res.json();
      logStep("Message sent", { status: res.status, phone: cleanPhone });

      if (!res.ok) {
        throw new Error(`Z-API erro: ${JSON.stringify(data)}`);
      }

      return new Response(JSON.stringify({ success: true, ...data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "disconnect") {
      const res = await fetch(`${baseUrl}/logout`, { method: "POST" });
      const data = await res.json();

      await supabase
        .from("whatsapp_config")
        .update({ is_connected: false, updated_at: new Date().toISOString() })
        .eq("user_id", userId);

      logStep("Disconnected");
      return new Response(JSON.stringify({ success: true, ...data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Ação desconhecida: ${action}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
