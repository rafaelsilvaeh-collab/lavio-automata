import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (s: string, d?: unknown) =>
  console.log(`[ADMIN-ACTIONS] ${s}${d ? " - " + JSON.stringify(d) : ""}`);

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
      log("Forbidden", { callerId });
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const body = await req.json();
    const { action, target_user_id } = body;
    if (!action) throw new Error("Ação não especificada");
    log(`action=${action}`, { target_user_id });

    if (action === "reset-password") {
      const { data: target } = await admin.auth.admin.getUserById(target_user_id);
      if (!target?.user?.email) throw new Error("Usuário não encontrado");
      const { data, error } = await admin.auth.admin.generateLink({
        type: "recovery",
        email: target.user.email,
      });
      if (error) throw error;
      return new Response(JSON.stringify({ link: data.properties?.action_link, email: target.user.email }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "set-blocked") {
      const { is_blocked } = body;
      if (typeof is_blocked !== "boolean") throw new Error("is_blocked obrigatório");
      const { error } = await admin
        .from("profiles")
        .update({ is_blocked, updated_at: new Date().toISOString() })
        .eq("user_id", target_user_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, is_blocked }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "impersonate") {
      const { data: target } = await admin.auth.admin.getUserById(target_user_id);
      if (!target?.user?.email) throw new Error("Usuário não encontrado");
      const { data, error } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: target.user.email,
      });
      if (error) throw error;
      log("Impersonate", { admin: callerId, target: target_user_id });
      return new Response(JSON.stringify({ link: data.properties?.action_link, email: target.user.email }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
