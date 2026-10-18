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
const LOOKUP_LIMIT = 20;
const LOOKUP_WINDOW_MS = 60_000;
const lookupCounts = new Map<string, { count: number; resetAt: number }>();

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return json({ error: "Too many status checks. Please wait and try again." }, 429);
  }

  let body: Record<string, unknown>;
  try {
    const rawBody = await req.text();
    if (rawBody.length > 1000) return json({ error: "Request body is too large" }, 413);
    body = JSON.parse(rawBody || "{}");
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }
  const ref = String(body.ref || "").trim().toUpperCase();
  if (!/^NJ-[A-Z0-9-]{6,48}$/.test(ref)) {
    return json({ error: "Enter a valid application reference" }, 400);
  }
  const legacyReference = /^NJ-\d{4}-\d{6}$/.test(ref);
  const dob = String(body.dob || "").trim();
  if (legacyReference && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    return json({ error: "Date of birth is required for older application references" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Application status is temporarily unavailable" }, 503);
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    let query = supabase
      .from("admission_applications")
      .select("id,ref,programme,status,created_at")
      .eq("ref", ref);
    if (legacyReference) query = query.eq("dob", dob);
    const { data: row, error } = await query.maybeSingle();
    if (error) throw error;
    if (!row) return json({ application: null });

    const { count, error: countError } = await supabase
      .from("admission_documents")
      .select("id", { count: "exact", head: true })
      .eq("application_id", row.id);
    if (countError) throw countError;

    return json({
      application: {
        ref: row.ref,
        programme: row.programme,
        status: row.status,
        date: row.created_at,
        documentCount: count || 0,
      },
    });
  } catch (error) {
    console.error("Admission status lookup failed:", error);
    return json({ error: "Application status is temporarily unavailable" }, 503);
  }
});

function isRateLimited(ip: string) {
  const now = Date.now();
  if (lookupCounts.size > 5000) {
    for (const [key, value] of lookupCounts) {
      if (value.resetAt <= now) lookupCounts.delete(key);
    }
  }
  if (lookupCounts.size > 5000 && !lookupCounts.has(ip)) return true;
  const current = lookupCounts.get(ip);
  if (!current || current.resetAt <= now) {
    lookupCounts.set(ip, { count: 1, resetAt: now + LOOKUP_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > LOOKUP_LIMIT;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
