import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type Payload = {
  applicationId: string;
  status: "approved" | "rejected";
  note?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as Payload;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: app, error } = await supabase
      .from("admission_applications")
      .select("*")
      .eq("id", payload.applicationId)
      .single();

    if (error || !app) throw error ?? new Error("Application not found");

    const accepted = payload.status === "approved";
    const message = `${accepted ? "Congratulations" : "Dear Parent/Guardian"}, ${app.name}'s admission application (${app.ref}) has been ${accepted ? "accepted" : "declined"} by New Juaben Senior High School.${payload.note ? " Note: " + payload.note : ""}`;
    const subject = `NJUASCO admission application ${app.ref}`;

    const results: Record<string, unknown> = {};

    if (app.guardian_email && Deno.env.get("RESEND_API_KEY")) {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: Deno.env.get("EMAIL_FROM") ?? "NJUASCO Admissions <admissions@njuasco.edu.gh>",
          to: app.guardian_email,
          subject,
          text: message,
        }),
      });
      results.email = await emailRes.json().catch(() => ({ ok: emailRes.ok }));
      await supabase.from("admission_notifications").insert({
        application_id: app.id,
        channel: "email",
        recipient: app.guardian_email,
        subject,
        message,
        provider_status: emailRes.ok ? "sent" : "failed",
        provider_response: results.email,
      });
    }

    const smsPhone = app.guardian_phone;
    const arkeselKey = Deno.env.get("ARKESEL_API_KEY");
    const arkeselSender = Deno.env.get("ARKESEL_SENDER_ID") ?? "NJUASCO";

    if (smsPhone && arkeselKey) {
      const smsRes = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": arkeselKey,
        },
        body: JSON.stringify({
          sender: arkeselSender,
          to: smsPhone,
          message,
        }),
      });
      results.sms = await smsRes.json().catch(() => ({ ok: smsRes.ok }));
      await supabase.from("admission_notifications").insert({
        application_id: app.id,
        channel: "sms",
        recipient: smsPhone,
        subject,
        message,
        provider_status: smsRes.ok ? "sent" : "failed",
        provider_response: results.sms,
      });
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
