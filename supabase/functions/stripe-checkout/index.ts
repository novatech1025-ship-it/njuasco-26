const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const STRIPE_API_VERSION = "2026-02-25.clover";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeSecret) {
    return json({ error: "STRIPE_SECRET_KEY is not set in Supabase secrets" }, 500);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const type = body.type === "donation" ? "donation" : "shop";
    const reference = String(body.reference || "").slice(0, 80);
    const customerEmail = String(body.customerEmail || body.email || "").trim();
    const origin = String(body.origin || Deno.env.get("SITE_URL") || "").replace(/\/+$/, "");
    if (!origin || !/^https?:\/\//i.test(origin)) {
      return json({ error: "A valid site origin is required" }, 400);
    }

    const params = new URLSearchParams();
    params.append("mode", "payment");
    const encodedRef = encodeURIComponent(reference);
    params.append(
      "success_url",
      `${origin}/${type === "donation" ? "donate.html" : "checkout.html"}?payment=success&ref=${encodedRef}&session_id={CHECKOUT_SESSION_ID}`,
    );
    params.append(
      "cancel_url",
      `${origin}/${type === "donation" ? "donate.html" : "checkout.html"}?payment=cancelled`,
    );
    params.append("metadata[type]", type);
    if (reference) params.append("metadata[reference]", reference);
    if (customerEmail) params.append("customer_email", customerEmail);

    if (type === "donation") {
      appendLineItem(params, 0, {
        name: `NJUASCO Donation - ${body.purpose || "General Fund"}`,
        amount: body.amount,
        currency: body.currency || "GHS",
        quantity: 1,
      });
      params.append("metadata[purpose]", String(body.purpose || "General Fund").slice(0, 120));
    } else {
      const items = Array.isArray(body.items) ? body.items : [];
      if (!items.length) return json({ error: "Cart is empty" }, 400);
      items.slice(0, 50).forEach((item, index) => appendLineItem(params, index, item));
    }

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecret}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Stripe-Version": STRIPE_API_VERSION,
      },
      body: params,
    });
    const data = await stripeRes.json();
    if (!stripeRes.ok) {
      return json({ error: data?.error?.message || "Stripe Checkout failed" }, stripeRes.status);
    }
    return json({ id: data.id, url: data.url });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unable to create Stripe Checkout session" }, 400);
  }
});

function appendLineItem(params: URLSearchParams, index: number, item: Record<string, unknown>) {
  const name = String(item.name || "NJUASCO item").slice(0, 120);
  const quantity = Math.max(1, Number(item.quantity || item.qty || 1) || 1);
  const currency = String(item.currency || "GHS").toLowerCase();
  const amountMajor = Number(item.amount ?? item.price ?? 0);
  const unitAmount = Math.round(amountMajor * 100);
  if (!unitAmount || unitAmount < 1) throw new Error("Each Stripe line item must have a valid amount.");
  params.append(`line_items[${index}][price_data][currency]`, currency);
  params.append(`line_items[${index}][price_data][product_data][name]`, name);
  params.append(`line_items[${index}][price_data][unit_amount]`, String(unitAmount));
  params.append(`line_items[${index}][quantity]`, String(quantity));
  const image = String(item.image || "");
  if (/^https?:\/\//i.test(image)) {
    params.append(`line_items[${index}][price_data][product_data][images][0]`, image);
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}
