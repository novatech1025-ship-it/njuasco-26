declare namespace Deno {
  export const env: {
    get(key: string): string | undefined;
  };
}

// @deno-types="https://esm.sh/@supabase/supabase-js@2/dist/module.d.ts"
// @ts-ignore - Remote esm.sh module, works on Supabase Edge Runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OTP_TTL_MS = 5 * 60 * 1000;
const VERIFY_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export default {
  async fetch(req: Request) {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(`ip:${ip}`, 20, RATE_LIMIT_WINDOW_MS)) {
      return json({ error: "Too many verification requests. Please try again later." }, 429);
    }

    const secret = Deno.env.get("CHECKOUT_VERIFY_SECRET");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const devMode =
      Deno.env.get("CHECKOUT_OTP_DEV_MODE") === "true" && isLocalSupabaseUrl(supabaseUrl || "");
    if (!secret || new TextEncoder().encode(secret).length < 32 || !serviceKey || !supabaseUrl) {
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
        if (isRateLimited(`send:${phoneHash}`, 1, 30_000)) {
          return json({ error: "Please wait before requesting another code." }, 429);
        }
        const code = randomOtp();
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
        if (!smsSent && !devMode) {
          await supabase.from("checkout_otp_challenges").delete().eq("phone_hash", phoneHash);
          const senderIssue =
            !Deno.env.get("ARKESEL_API_KEY")
              ? "Arkesel API key is missing. Set ARKESEL_API_KEY."
              : "Could not send SMS. Check your number and try again.";
          return json({ error: senderIssue }, 503);
        }

        const response: Record<string, unknown> = {
          ok: true,
          message: smsSent ? "Verification code sent." : "Verification code prepared.",
          expiresIn: OTP_TTL_MS / 1000,
        };
        if (!smsSent && devMode) {
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
        if (!constantTimeEqual(codeHash, row.code_hash)) {
          await supabase
            .from("checkout_otp_challenges")
            .update({ attempts: (row.attempts || 0) + 1 })
            .eq("id", row.id);
          return json({ error: "Incorrect verification code" }, 400);
        }

        await supabase.from("checkout_otp_challenges").delete().eq("id", row.id);
        const customerId = crypto.randomUUID();
        const verificationToken = await signToken(
          { phone, customerId, exp: Date.now() + VERIFY_TOKEN_TTL_MS },
          secret,
        );
        return json({ ok: true, verificationToken, customerId, expiresIn: VERIFY_TOKEN_TTL_MS / 1000 });
      }

      return json({ error: "Unknown action" }, 400);
    } catch (error) {
      console.error("Checkout OTP request failed:", error);
      return json({ error: "Verification failed. Please try again." }, 500);
    }
  },
};

async function sendSms(phone: string, body: string) {
  try {
    const apiKey = Deno.env.get("ARKESEL_API_KEY");
    const sender = Deno.env.get("ARKESEL_SENDER_ID") ?? "NJUASCO";
    if (!apiKey) {
      console.error("Missing Arkesel API key");
      return false;
    }

    const to = phone.startsWith("+") ? phone : `+${phone}`;
    const payload = {
      sender,
      message: body,
      recipients: [to],
    };

    const res = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.status !== "success") {
      console.error("Arkesel SMS failed with status:", res.status);
      return false;
    }

    return true;
  } catch (error) {
    console.error("SMS sendSms error:", error instanceof Error ? error.message : error);
    return false;
  }
}

function normalizePhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (!digits) return "";
  // Remove leading 00
  if (digits.startsWith("00")) digits = digits.slice(2);
  // If starts with 0, replace with 233 (Ghana country code)
  if (digits.startsWith("0")) digits = `233${digits.slice(1)}`;
  // If 9 digits and starts with 2, 4, or 5, add 233
  if (digits.length === 9 && /^[245]/.test(digits)) digits = `233${digits}`;
  // If already has country code at the start, ensure it's 12 digits total
  if (digits.startsWith("233") && digits.length >= 12) return digits;
  // Ensure we have exactly 12 digits (country code + 9 digits)
  if (digits.length !== 12) return "";
  return digits;
}

function isLocalSupabaseUrl(value: string) {
  try {
    return ["localhost", "127.0.0.1", "kong"].includes(new URL(value).hostname);
  } catch {
    return false;
  }
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomOtp() {
  const range = 900_000;
  const ceiling = 0x1_0000_0000 - (0x1_0000_0000 % range);
  const buffer = new Uint32Array(1);
  do {
    crypto.getRandomValues(buffer);
  } while (buffer[0] >= ceiling);
  return String(100_000 + (buffer[0] % range));
}

function constantTimeEqual(left: string, right: string) {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  let difference = leftBytes.length ^ rightBytes.length;
  const length = Math.max(leftBytes.length, rightBytes.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] || 0) ^ (rightBytes[index] || 0);
  }
  return difference === 0;
}

function isRateLimited(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (requestCounts.size > 5000) {
    for (const [entryKey, entry] of requestCounts) {
      if (entry.resetAt <= now) requestCounts.delete(entryKey);
    }
  }
  if (requestCounts.size > 5000 && !requestCounts.has(key)) return true;
  const entry = requestCounts.get(key);
  if (!entry || entry.resetAt <= now) {
    requestCounts.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
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
