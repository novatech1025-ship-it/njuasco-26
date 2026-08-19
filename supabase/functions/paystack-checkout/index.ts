const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!paystackSecret) {
    return json({ error: "PAYSTACK_SECRET_KEY is not set in Supabase secrets" }, 500);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const type = body.type === "donation" ? "donation" : "shop";
    const reference = String(body.reference || crypto.randomUUID()).slice(0, 80);
    const customerEmail = String(body.customerEmail || body.email || "").trim();
    const origin = String(body.origin || Deno.env.get("SITE_URL") || "").replace(/\/+$/, "");
    if (!origin || !/^https?:\/\//i.test(origin)) {
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
