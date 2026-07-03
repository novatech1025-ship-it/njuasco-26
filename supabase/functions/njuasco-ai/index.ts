const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AI_SYSTEM_PROMPT =
  "You are NJB City AI, the official assistant for New Juaben Senior High School (NJUASCO) in Koforidua, Ghana. " +
  "Answer using the provided school website context first. Prioritize school information for questions about the motto, core values, leaders, staff, teachers, departments, houses, admissions, programmes, facilities, contact details, and history. " +
  "The school motto is HARDWORK. Do not answer school motto or school core-value questions with NOVA Tech values. " +
  "Use NOVA Tech and Galaxy Design Studio details only when the user asks about the website creators, NOVA Tech, Galaxy Design Studio, or the School Website Project. Be clear, warm, and accurate. " +
  "If the context does not contain the answer, say what you know and direct the user to contact the school for confirmation. " +
  "Do not invent fees, dates, or policies.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) {
    return json({ error: "GROQ_API_KEY is not set" }, 500);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const message = String(body.message || "").trim();
    const siteContext = String(body.siteContext || "").slice(0, 20000);

    if (!message) {
      return json({ error: "Message is required" }, 400);
    }

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: Deno.env.get("GROQ_MODEL") || "llama-3.1-8b-instant",
        temperature: 0.4,
        max_tokens: 450,
        messages: [
          {
            role: "system",
            content: AI_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: `Website context:\n${siteContext}\n\nQuestion: ${message}`,
          },
        ],
      }),
    });

    const data = await groqRes.json();
    if (!groqRes.ok) {
      return json({ error: data.error?.message || "Groq API error" }, groqRes.status);
    }

    return json({ reply: data.choices?.[0]?.message?.content || "" });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "AI request failed" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
