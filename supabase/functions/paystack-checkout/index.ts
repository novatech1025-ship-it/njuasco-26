const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const PAYSTACK_REQUEST_LIMIT = 30;
const PAYSTACK_RATE_WINDOW_MS = 60_000;
const paystackRequestCounts = new Map<string, { count: number; resetAt: number }>();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return json({ error: "Too many checkout requests. Please try again shortly." }, 429);
  }

  const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!paystackSecret) {
    return json({ error: "PAYSTACK_SECRET_KEY is not set in Supabase secrets" }, 500);
  }

  try {
    const rawBody = await req.text();
    if (rawBody.length > 20_000) return json({ error: "Request body is too large" }, 413);
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody || "{}");
    } catch {
      return json({ error: "Invalid request body" }, 400);
    }
    const type = body.type === "donation" ? "donation" : "shop";
    const reference = String(body.reference || crypto.randomUUID()).slice(0, 80);
    const customerEmail = String(body.customerEmail || body.email || "").trim();
    if (type !== "donation") {
      const verificationSecret = Deno.env.get("CHECKOUT_VERIFY_SECRET");
      if (!verificationSecret || new TextEncoder().encode(verificationSecret).length < 32) {
        return json({ error: "Checkout verification is not configured" }, 503);
      }
      const verified = await verifyCheckoutToken(
        String(body.verificationToken || ""),
        verificationSecret,
      );
      if (!verified) {
        return json({ error: "Phone verification is required before checkout" }, 403);
      }
    }
    const configuredSiteUrl = Deno.env.get("SITE_URL");
    if (!configuredSiteUrl) {
      return json({ error: "SITE_URL is not configured in Supabase secrets" }, 503);
    }
    let origin: string;
    try {
      const configuredOrigin = new URL(configuredSiteUrl).origin;
      const requestedOrigin = body.origin ? new URL(String(body.origin)).origin : configuredOrigin;
      if (requestedOrigin !== configuredOrigin || !configuredOrigin.startsWith("https://")) {
        return json({ error: "A trusted checkout origin is required" }, 400);
      }
      origin = configuredOrigin;
    } catch {
      return json({ error: "A valid site origin is required" }, 400);
    }
    if (!customerEmail) {
      return json({ error: "Customer email is required for Paystack checkout" }, 400);
    }

    let amount = 0;
    let currency = String(body.currency || "GHS").toUpperCase();
    if (type === "donation") {
      amount = moneyToMinorUnits(body.amount);
    } else {
      const items = Array.isArray(body.items) ? body.items : [];
      if (!items.length) return json({ error: "Cart is empty" }, 400);
      amount = moneyToMinorUnits(
        items
          .slice(0, 50)
          .reduce((sum, item) => sum + (Number(item.amount ?? item.price) || 0) * (Number(item.quantity || item.qty || 1) || 1), 0),
      );
      currency = String(items[0]?.currency || body.currency || "GHS").toUpperCase();
    }
    if (!amount || amount < 1) return json({ error: "A valid payment amount is required" }, 400);

    const encodedRef = encodeURIComponent(reference);
    const callbackPath =
      type === "donation"
        ? `/donate.html?payment=success&ref=${encodedRef}`
        : `/checkout.html?payment=success&ref=${encodedRef}`;

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: customerEmail,
        amount,
        currency,
        reference,
        callback_url: `${origin}${callbackPath}`,
        channels: ["card", "bank", "ussd", "qr", "mobile_money", "bank_transfer"],
        metadata: {
          type,
          reference,
          purpose: String(body.purpose || "").slice(0, 120),
        },
      }),
    });
    const data = await paystackRes.json();
    if (!paystackRes.ok || !data?.status) {
      return json({ error: data?.message || "Paystack checkout failed" }, paystackRes.status || 400);
    }
    return json({ reference: data.data?.reference || reference, url: data.data?.authorization_url });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unable to create Paystack checkout transaction" }, 400);
  }
});

function moneyToMinorUnits(amount: unknown) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 100);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function isRateLimited(ip: string) {
  const now = Date.now();
  if (paystackRequestCounts.size > 5000) {
    for (const [key, entry] of paystackRequestCounts) {
      if (entry.resetAt <= now) paystackRequestCounts.delete(key);
    }
  }
  if (paystackRequestCounts.size > 5000 && !paystackRequestCounts.has(ip)) return true;
  const entry = paystackRequestCounts.get(ip);
  if (!entry || entry.resetAt <= now) {
    paystackRequestCounts.set(ip, { count: 1, resetAt: now + PAYSTACK_RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > PAYSTACK_REQUEST_LIMIT;
}

async function verifyCheckoutToken(token: string, secret: string) {
  const separator = token.indexOf(".");
  if (separator < 1 || separator !== token.lastIndexOf(".")) return false;
  const data = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signatureBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
    const expected = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    if (!constantTimeEqual(signature, expected)) return false;

    const encodedPayload = data.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = encodedPayload + "=".repeat((4 - (encodedPayload.length % 4)) % 4);
    const payloadBytes = Uint8Array.from(atob(paddedPayload), (char) => char.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes));
    return Boolean(
      payload?.exp > Date.now() &&
      /^\d{9,15}$/.test(String(payload?.phone || "")) &&
      typeof payload?.customerId === "string",
    );
  } catch {
    return false;
  }
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
