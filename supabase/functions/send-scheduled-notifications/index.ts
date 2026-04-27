import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SCHEDULED-NOTIF] ${step}${d}`);
};

const buildInstanceName = (userId: string) =>
  `lavgo_${userId.replace(/-/g, "").slice(0, 16)}`;

const DEFAULT_READY_MESSAGE = (customerName: string, plate: string) =>
  `Olá, ${customerName}! 🚗✨ Seu veículo (${plate}) já está pronto para retirada. Obrigado pela preferência!`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const evolutionUrl = (Deno.env.get("EVOLUTION_API_URL") ?? "").replace(/\/$/, "");
  const evolutionKey = Deno.env.get("EVOLUTION_API_KEY") ?? "";

  if (!evolutionUrl || !evolutionKey) {
    log("Missing Evolution config");
    return new Response(
      JSON.stringify({ error: "Evolution API not configured" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 503 }
    );
  }

  try {
    const nowIso = new Date().toISOString();

    const { data: dueCars, error: fetchErr } = await supabase
      .from("cars_in_yard")
      .select(
        "id, user_id, customer_id, scheduled_notification_time, status, customers(name, plate, phone)"
      )
      .eq("notification_status", "pending")
      .not("scheduled_notification_time", "is", null)
      .lte("scheduled_notification_time", nowIso)
      .neq("status", "entregue")
      .limit(50);

    if (fetchErr) {
      log("Fetch error", fetchErr);
      throw fetchErr;
    }

    log(`Found ${dueCars?.length ?? 0} due notifications`);

    const results: Array<Record<string, unknown>> = [];

    for (const car of dueCars ?? []) {
      const customer = (car as any).customers;
      if (!customer?.phone) {
        await supabase
          .from("cars_in_yard")
          .update({
            notification_status: "skipped",
            notification_error: "Cliente sem telefone",
          })
          .eq("id", car.id);
        results.push({ id: car.id, status: "skipped", reason: "no-phone" });
        continue;
      }

      // Check WhatsApp instance state
      const instanceName = buildInstanceName(car.user_id);
      const stateRes = await fetch(
        `${evolutionUrl}/instance/connectionState/${instanceName}`,
        { method: "GET", headers: { apikey: evolutionKey } }
      );
      const stateData = await stateRes.json().catch(() => ({}));
      const state = stateData?.instance?.state || stateData?.state || "close";

      if (state !== "open") {
        log(`Instance ${instanceName} not connected (${state})`);
        await supabase
          .from("cars_in_yard")
          .update({
            notification_status: "failed",
            notification_error: `WhatsApp desconectado (${state})`,
          })
          .eq("id", car.id);
        results.push({ id: car.id, status: "failed", reason: "wa-disconnected", state });
        continue;
      }

      // Try fetching custom template
      const { data: tpl } = await supabase
        .from("message_templates")
        .select("message_text")
        .eq("user_id", car.user_id)
        .eq("template_type", "carro_pronto")
        .eq("is_active", true)
        .maybeSingle();

      const baseMessage =
        tpl?.message_text ?? DEFAULT_READY_MESSAGE(customer.name, customer.plate ?? "");
      const message = baseMessage
        .replace(/\{nome\}/gi, customer.name ?? "")
        .replace(/\{placa\}/gi, customer.plate ?? "");

      let phone = String(customer.phone).replace(/\D/g, "");
      if (phone.length <= 11) phone = `55${phone}`;

      const sendRes = await fetch(
        `${evolutionUrl}/message/sendText/${instanceName}`,
        {
          method: "POST",
          headers: { apikey: evolutionKey, "Content-Type": "application/json" },
          body: JSON.stringify({ number: phone, textMessage: { text: message } }),
        }
      );
      const sendData = await sendRes.json().catch(() => ({}));

      if (!sendRes.ok) {
        log(`Send failed for car ${car.id}`, sendData);
        await supabase
          .from("cars_in_yard")
          .update({
            notification_status: "failed",
            notification_error: JSON.stringify(sendData).slice(0, 500),
          })
          .eq("id", car.id);
        results.push({ id: car.id, status: "failed", details: sendData });
        continue;
      }

      await supabase
        .from("cars_in_yard")
        .update({
          notification_status: "sent",
          notification_sent_at: new Date().toISOString(),
          notification_error: null,
        })
        .eq("id", car.id);

      log(`Sent notification for car ${car.id}`);
      results.push({ id: car.id, status: "sent" });
    }

    return new Response(
      JSON.stringify({ processed: results.length, results, ranAt: nowIso }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
