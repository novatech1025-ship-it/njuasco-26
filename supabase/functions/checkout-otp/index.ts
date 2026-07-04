import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export default {
  async fetch(req: Request) {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const secret = Deno.env.get("CHECKOUT_VERIFY_SECRET");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!secret || !serviceKey || !supabaseUrl) {
      return json({ error: "Checkout verification is not configured" }, 500);
    }

    try {
      const body = await req.json().catch(() => ({}));
      const action = String(body.action || "send");
      const phone = normalizePhone(String(body.phone || ""));
      if (phone.length < 9) {
        return json({ error: "A valid mobile number is required" }, 400);
      }

      const supabase = createClient(supabaseUrl, serviceKey);
      const phoneHash = await sha256(`${secret}:phone:${phone}`);

      if (action === "send") {
        const code = String(Math.floor(100000 + Math.random() * 900000));
        const codeHash = await sha256(`${secret}:otp:${phone}:${code}`);
        const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

        await supabase.from("checkout_otp_challenges").delete().eq("phone_hash", phoneHash);
        const { error } = await supabase.from("checkout_otp_challenges").insert({
          phone_hash: phoneHash,
          code_hash: codeHash,
          expires_at: expiresAt,
          attempts: 0,
        });
        if (error) throw new Error(error.message);

        const smsSent = await sendSms(phone, `Your NJUASCO shop verification code is ${code}. It expires in 5 minutes.`);
        if (!smsSent && Deno.env.get("CHECKOUT_OTP_DEV_MODE") !== "true") {
          await supabase.from("checkout_otp_challenges").delete().eq("phone_hash", phoneHash);
          const senderIssue =
            !Deno.env.get("TWILIO_ACCOUNT_SID") ||
            !Deno.env.get("TWILIO_AUTH_TOKEN") ||
            (!Deno.env.get("TWILIO_MESSAGING_SERVICE_SID") && !Deno.env.get("TWILIO_FROM_NUMBER"))
              ? "Twilio sender settings are incomplete. Add a Messaging Service SID or a valid From number."
              : "Could not send SMS. Check your number and try again.";
          return json({ error: senderIssue }, 503);
        }

        const response: Record<string, unknown> = {
          ok: true,
          message: smsSent ? "Verification code sent." : "Verification code prepared.",
          expiresIn: OTP_TTL_MS / 1000,
        };
        if (!smsSent && Deno.env.get("CHECKOUT_OTP_DEV_MODE") === "true") {
          response.devCode = code;
        }
        return json(response);
      }

      if (action === "verify") {
        const code = String(body.code || "").trim();
        if (!/^\d{6}$/.test(code)) {
          return json({ error: "Enter the 6-digit verification code" }, 400);
        }

        const { data: rows, error } = await supabase
          .from("checkout_otp_challenges")
          .select("*")
          .eq("phone_hash", phoneHash)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1);
        if (error) throw new Error(error.message);

        const row = rows?.[0];
        if (!row) return json({ error: "Code expired. Request a new one." }, 400);
        if ((row.attempts || 0) >= MAX_ATTEMPTS) {
          return json({ error: "Too many attempts. Request a new code." }, 429);
        }

        const codeHash = await sha256(`${secret}:otp:${phone}:${code}`);
        if (codeHash !== row.code_hash) {
          await supabase
            .from("checkout_otp_challenges")
            .update({ attempts: (row.attempts || 0) + 1 })
            .eq("id", row.id);
          return json({ error: "Incorrect verification code" }, 400);
        }

        await supabase.from("checkout_otp_challenges").delete().eq("id", row.id);
        const customerId = crypto.randomUUID();
        const verificationToken = await signToken(
          { phone, customerId, exp: Date.now() + 15 * 60 * 1000 },
          secret,
        );
        return json({ ok: true, verificationToken, customerId, expiresIn: 900 });
      }

      return json({ error: "Unknown action" }, 400);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "Verification failed" }, 500);
    }
  },
};

async function sendSms(phone: string, body: string) {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("TWILIO_FROM_NUMBER");
  const serviceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
  if (!sid || !token || (!serviceSid && !from)) return false;

  const to = phone.startsWith("+") ? phone : `+${phone}`;
  const auth = btoa(`${sid}:${token}`);
  const params = new URLSearchParams({ To: to, Body: body });
  if (serviceSid) {
    params.set("MessagingServiceSid", serviceSid);
  } else if (from) {
    params.set("From", from);
  }
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  return res.ok;
}

function normalizePhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `233${digits.slice(1)}`;
  if (digits.length === 9 && /^[245]/.test(digits)) digits = `233${digits}`;
  return digits;
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function signToken(payload: Record<string, unknown>, secret: string) {
  const data = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${data}.${sig}`;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}
