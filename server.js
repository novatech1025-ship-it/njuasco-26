const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const argPort = process.argv.find((arg) => arg.startsWith("--port="))?.split("=")[1];
const PORT = Number(argPort || process.env.PORT || 3000);
const ROOT = __dirname;

loadEnvFile();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const CHECKOUT_VERIFY_SECRET = process.env.CHECKOUT_VERIFY_SECRET || process.env.GROQ_API_KEY || "njuasco-dev-checkout-secret";
const ARKESEL_API_KEY = process.env.ARKESEL_API_KEY;
const ARKESEL_SENDER_ID = process.env.ARKESEL_SENDER_ID || "NJUASCO";
const CHECKOUT_OTP_DEV_MODE = process.env.CHECKOUT_OTP_DEV_MODE === "true";

const OTP_STORE = new Map();
const OTP_TTL_MS = 5 * 60 * 1000;
const VERIFY_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const AI_SYSTEM_PROMPT =
  "You are NJB City AI, the official assistant for New Juaben Senior High School (NJUASCO) in Koforidua, Ghana. " +
  "Use the provided school website context first and answer questions about the school, admissions, facilities, clubs, news, documents, alumni, leaders, staff, teachers, departments, houses, core values, and history. " +
  "The school motto is HARDWORK. Do not answer school motto or school core-value questions with NOVA Tech values. " +
  "Use NOVA Tech and Galaxy Design Studio details only when the user asks about the website creators, NOVA Tech, Galaxy Design Studio, or the School Website Project. " +
  "Be clear, warm, and accurate. If the context does not contain the answer, say what you know and direct the user to contact the school for confirmation. " +
  "Do not invent fees, dates, or policies.";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

function loadEnvFile() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) process.env[key] = value;
  }
}

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 120000) {
        reject(new Error("Request too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function handleAI(req, res) {
  if (req.method !== "POST") {
    if (req.method === "OPTIONS") {
      send(res, 204, "");
      return;
    }
    send(res, 405, JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  if (!GROQ_API_KEY) {
    send(res, 500, JSON.stringify({ error: "GROQ_API_KEY is not set" }));
    return;
  }

  try {
    const body = JSON.parse(await readBody(req) || "{}");
    const message = String(body.message || "").trim();
    const siteContext = String(body.siteContext || "").slice(0, 8000);

    if (!message) {
      send(res, 400, JSON.stringify({ error: "Message is required" }));
      return;
    }

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.4,
        max_tokens: 300,
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
      send(res, groqRes.status, JSON.stringify({ error: data.error?.message || "Groq API error" }));
      return;
    }

    send(res, 200, JSON.stringify({ reply: data.choices?.[0]?.message?.content || "" }));
  } catch (error) {
    send(res, 500, JSON.stringify({ error: error.message || "AI request failed" }));
  }
}

function requestOrigin(req) {
  const proto = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

function moneyToMinorUnits(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 100);
}

function normalizeCheckoutPhone(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `233${digits.slice(1)}`;
  if (digits.length === 9 && /^[245]/.test(digits)) digits = `233${digits}`;
  return digits;
}

function hashCheckoutValue(value) {
  return crypto.createHmac("sha256", CHECKOUT_VERIFY_SECRET).update(value).digest("hex");
}

function signVerificationToken(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", CHECKOUT_VERIFY_SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function verifyVerificationToken(token) {
  if (!token || typeof token !== "string") return null;
  if (token.startsWith("dev.") && CHECKOUT_OTP_DEV_MODE) {
    try {
      const data = token.slice(4).replace(/-/g, "+").replace(/_/g, "/");
      const padded = data + "=".repeat((4 - (data.length % 4)) % 4);
      const payload = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
      if (!payload?.exp || payload.exp < Date.now()) return null;
      return payload;
    } catch {
      return null;
    }
  }
  if (!token.includes(".")) return null;
  const [data, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", CHECKOUT_VERIFY_SECRET).update(data).digest("base64url");
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    if (!payload?.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

async function sendCheckoutSms(phone, message) {
  if (!ARKESEL_API_KEY) {
    console.log("SMS: Missing Arkesel API key");
    return false;
  }
  try {
    const to = phone.startsWith("+") ? phone : `+${phone}`;
    const payload = {
      sender: ARKESEL_SENDER_ID,
      message,
      recipients: [to],
    };
    console.log(`SMS: Sending to ${to} via Arkesel...`);
    const res = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
      method: "POST",
      headers: {
        "api-key": ARKESEL_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.status !== "success") {
      console.log(`SMS: Arkesel error ${res.status}: ${JSON.stringify(data)}`);
      return false;
    }
    console.log("SMS: Sent successfully");
    return true;
  } catch (err) {
    console.error("SMS: Fetch error:", err.message || err);
    return false;
  }
}

async function handleCheckoutOtp(req, res) {
  if (req.method !== "POST") {
    send(res, 405, JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  try {
    const body = JSON.parse((await readBody(req)) || "{}");
    const action = String(body.action || "send");
    const phone = normalizeCheckoutPhone(body.phone);
    if (phone.length < 9) {
      send(res, 400, JSON.stringify({ error: "A valid mobile number is required" }));
      return;
    }

    if (action === "send") {
      const existing = OTP_STORE.get(phone);
      if (existing?.lastSent && Date.now() - existing.lastSent < 30000) {
        send(res, 429, JSON.stringify({ error: "Please wait before requesting another code" }));
        return;
      }

      const code = String(Math.floor(100000 + Math.random() * 900000));
      OTP_STORE.set(phone, {
        hash: hashCheckoutValue(`otp:${phone}:${code}`),
        expires: Date.now() + OTP_TTL_MS,
        attempts: 0,
        lastSent: Date.now(),
      });

      const smsSent = await sendCheckoutSms(
        phone,
        `Your NJUASCO shop verification code is ${code}. It expires in 5 minutes.`,
      );
      if (!smsSent && !CHECKOUT_OTP_DEV_MODE) {
        OTP_STORE.delete(phone);
        const senderIssue =
          !ARKESEL_API_KEY
            ? "Arkesel API key is missing. Set ARKESEL_API_KEY."
            : "Could not send SMS. Check your number and try again.";
        send(res, 503, JSON.stringify({ error: senderIssue }));
        return;
      }
      const response = {
        ok: true,
        message: smsSent ? "Verification code sent to your phone." : "Verification code prepared.",
        expiresIn: OTP_TTL_MS / 1000,
      };
      if (!smsSent && CHECKOUT_OTP_DEV_MODE) response.devCode = code;
      send(res, 200, JSON.stringify(response));
      return;
    }

    if (action === "verify") {
      const code = String(body.code || "").trim();
      if (!/^\d{6}$/.test(code)) {
        send(res, 400, JSON.stringify({ error: "Enter the 6-digit verification code" }));
        return;
      }

      const challenge = OTP_STORE.get(phone);
      if (!challenge || challenge.expires < Date.now()) {
        send(res, 400, JSON.stringify({ error: "Code expired. Request a new one." }));
        return;
      }
      if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
        send(res, 429, JSON.stringify({ error: "Too many attempts. Request a new code." }));
        return;
      }

      if (challenge.hash !== hashCheckoutValue(`otp:${phone}:${code}`)) {
        challenge.attempts += 1;
        OTP_STORE.set(phone, challenge);
        send(res, 400, JSON.stringify({ error: "Incorrect verification code" }));
        return;
      }

      OTP_STORE.delete(phone);
      const customerId = crypto.randomUUID();
      const verificationToken = signVerificationToken({
        phone,
        customerId,
        exp: Date.now() + VERIFY_TOKEN_TTL_MS,
      });
      send(res, 200, JSON.stringify({ ok: true, verificationToken, customerId, expiresIn: VERIFY_TOKEN_TTL_MS / 1000 }));
      return;
    }

    send(res, 400, JSON.stringify({ error: "Unknown action" }));
  } catch (error) {
    send(res, 500, JSON.stringify({ error: error.message || "Verification failed" }));
  }
}

async function handlePaystackCheckout(req, res) {
  if (req.method !== "POST") {
    send(res, 405, JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  if (!PAYSTACK_SECRET_KEY) {
    send(res, 500, JSON.stringify({ error: "PAYSTACK_SECRET_KEY is not set" }));
    return;
  }

  try {
    const body = JSON.parse(await readBody(req) || "{}");
    const type = body.type === "donation" ? "donation" : "shop";
    const reference = String(body.reference || "").slice(0, 80);
    const customerEmail = String(body.customerEmail || body.email || "").trim();
    const verificationToken = String(body.verificationToken || "");
    if (type !== "donation") {
      const verified = verifyVerificationToken(verificationToken);
      if (!verified) {
        send(res, 403, JSON.stringify({ error: "Phone verification is required before checkout" }));
        return;
      }
    }
    const origin = String(body.origin || requestOrigin(req)).replace(/\/+$/, "");
    const encodedRef = encodeURIComponent(reference);
    const callbackPath =
      type === "donation"
        ? `/donate.html?payment=success&ref=${encodedRef}`
        : `/checkout.html?payment=success&ref=${encodedRef}`;

    let amount = 0;
    let currency = String(body.currency || "GHS").toUpperCase();
    if (type === "donation") {
      amount = moneyToMinorUnits(body.amount);
    } else {
      const items = Array.isArray(body.items) ? body.items : [];
      if (!items.length) throw new Error("Cart is empty.");
      amount = moneyToMinorUnits(
        items
          .slice(0, 50)
          .reduce((sum, item) => sum + (Number(item.amount ?? item.price) || 0) * (Number(item.quantity || item.qty || 1) || 1), 0),
      );
      currency = String(items[0]?.currency || body.currency || "GHS").toUpperCase();
    }
    if (!customerEmail) throw new Error("Customer email is required for Paystack checkout.");
    if (!amount || amount < 1) throw new Error("A valid payment amount is required.");

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
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
      send(res, paystackRes.status || 400, JSON.stringify({ error: data?.message || "Paystack checkout failed" }));
      return;
    }
    send(res, 200, JSON.stringify({ reference: data.data?.reference || reference, url: data.data?.authorization_url }));
  } catch (error) {
    send(res, 400, JSON.stringify({ error: error.message || "Unable to create Paystack checkout transaction" }));
  }
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = path.resolve(ROOT, "." + pathname);

  if (!filePath.startsWith(ROOT)) {
    send(res, 403, "Forbidden", "text/plain; charset=utf-8");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      send(res, 404, "Not found", "text/plain; charset=utf-8");
      return;
    }

    const type = TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    send(res, 200, data, type);
  });
}

http
  .createServer((req, res) => {
    if (req.method === "OPTIONS") {
      send(res, 204, "");
      return;
    }
    if (req.url.startsWith("/api/ai")) {
      handleAI(req, res);
      return;
    }
    if (req.url.startsWith("/api/checkout-otp") || req.url.startsWith("/api/staff-otp")) {
      handleCheckoutOtp(req, res);
      return;
    }
    if (req.url.startsWith("/api/create-paystack-transaction")) {
      handlePaystackCheckout(req, res);
      return;
    }
    serveStatic(req, res);
  })
  .listen(PORT, () => {
    console.log(`NJUASCO site running at http://localhost:${PORT}`);
  });
