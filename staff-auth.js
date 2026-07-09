// Staff portal SMS step-up auth.
(function () {
  // Allow deployments to toggle staff OTP via the global config `window.NJUASCO_SUPABASE.staffOtpEnabled`.
  // Fallback to false when the config isn't present.
  const STAFF_OTP_ENABLED = Boolean((typeof window !== 'undefined' && window.NJUASCO_SUPABASE && window.NJUASCO_SUPABASE.staffOtpEnabled) || false);
  const TRUST_MS = 5 * 60 * 60 * 1000;
  const REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;

  function normalizePhone(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function trustKey(role, email) {
    return `nj_staff_trust_${role}_${String(email || "").toLowerCase()}`;
  }

  function getTrust(role, email) {
    try {
      return JSON.parse(localStorage.getItem(trustKey(role, email)) || "null");
    } catch {
      return null;
    }
  }

  function saveTrust(role, email, remember = false) {
    const now = Date.now();
    const payload = {
      verifiedAt: now,
      expiresAt: now + TRUST_MS,
      rememberUntil: remember ? now + REMEMBER_MS : 0,
    };
    localStorage.setItem(trustKey(role, email), JSON.stringify(payload));
    return payload;
  }

  function clearTrust(role, email) {
    localStorage.removeItem(trustKey(role, email));
  }

  function needsStepUp(role, email) {
    if (!STAFF_OTP_ENABLED) return false;
    const trust = getTrust(role, email);
    if (!trust) return true;
    const now = Date.now();
    if (trust.rememberUntil && trust.rememberUntil > now) return false;
    return !trust.expiresAt || trust.expiresAt <= now;
  }

  async function readApiJson(res) {
    const text = await res.text();
    if (!text.trim()) {
      if (!res.ok) throw new Error(`Verification service unavailable (${res.status})`);
      return {};
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Verification service returned an invalid response.");
    }
  }

  async function otpRequest(body) {
    const phone = DB?._normalizeCheckoutPhone?.(body.phone) || StaffAuth.normalizePhone(body.phone);
    if (!phone || phone.length < 9) throw new Error("Enter a valid mobile number.");
    const payload = { ...body, phone };
    let lastError = null;
    try {
      const localRes = await fetch("/api/staff-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const localData = await readApiJson(localRes);
      if (localRes.ok) return localData;
      if (localData?.error) lastError = new Error(localData.error);
    } catch (error) {
      if (error.message && !/fetch|network|failed to fetch/i.test(error.message)) lastError = error;
    }
    const cfg = window.NJUASCO_SUPABASE || {};
    const urls = [cfg.staffOtpFunctionUrl, cfg.checkoutOtpFunctionUrl].filter(Boolean);
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: cfg.anonKey,
            Authorization: `Bearer ${cfg.anonKey}`,
          },
          body: JSON.stringify({ ...payload, scope: "staff" }),
        });
        const data = await readApiJson(res);
        if (res.ok) return data;
        if (data?.error) lastError = new Error(data.error);
      } catch (error) {
        if (error.message && !/fetch|network|failed to fetch/i.test(error.message)) lastError = error;
      }
    }
    throw lastError || new Error("SMS verification is unavailable. Configure Twilio or run node server.js.");
  }

  async function sendOtp(phone) {
    return otpRequest({ action: "send", phone, scope: "staff" });
  }

  async function verifyOtp(phone, code) {
    return otpRequest({ action: "verify", phone, code, scope: "staff" });
  }

  function bindStaffOtpOverlay(options = {}) {
    const overlay = document.getElementById(options.overlayId || "staff-otp-ov");
    if (!overlay || overlay.dataset.bound === "1") return;
    overlay.dataset.bound = "1";
    const phoneInput = document.getElementById(options.phoneId || "staff-otp-phone");
    const codeInput = document.getElementById(options.codeId || "staff-otp-code");
    const sendBtn = document.getElementById(options.sendId || "staff-otp-send");
    const verifyBtn = document.getElementById(options.verifyId || "staff-otp-verify");
    const rememberEl = document.getElementById(options.rememberId || "staff-otp-remember");
    const msgEl = document.getElementById(options.msgId || "staff-otp-msg");

    sendBtn?.addEventListener("click", async () => {
      const phone = phoneInput?.value?.trim();
      if (!phone) {
        if (msgEl) msgEl.textContent = "Enter your mobile number.";
        return;
      }
      sendBtn.disabled = true;
      sendBtn.textContent = "Sending...";
      try {
        const data = await sendOtp(phone);
        if (msgEl) msgEl.textContent = data.message || "Code sent.";
        document.getElementById(options.panelId || "staff-otp-panel")?.style && (document.getElementById(options.panelId || "staff-otp-panel").style.display = "block");
      } catch (error) {
        if (msgEl) msgEl.textContent = error.message || "Could not send code.";
      } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = "Send code";
      }
    });

    verifyBtn?.addEventListener("click", async () => {
      const phone = phoneInput?.value?.trim();
      const code = codeInput?.value?.trim();
      if (!phone || !code) {
        if (msgEl) msgEl.textContent = "Enter your phone number and the SMS code.";
        return;
      }
      verifyBtn.disabled = true;
      verifyBtn.textContent = "Verifying...";
      try {
        await verifyOtp(phone, code);
        saveTrust(options.role, options.email, !!rememberEl?.checked);
        overlay.classList.remove("show");
        if (options.onVerified) options.onVerified();
        if (options.toast) options.toast("Verified. Welcome back.");
      } catch (error) {
        if (msgEl) msgEl.textContent = error.message || "Verification failed.";
      } finally {
        verifyBtn.disabled = false;
        verifyBtn.textContent = "Verify & continue";
      }
    });
  }

  function showStepUpIfNeeded(role, email, phone, options = {}) {
    if (!STAFF_OTP_ENABLED) return false;
    if (!needsStepUp(role, email)) return false;
    const overlay = document.getElementById(options.overlayId || "staff-otp-ov");
    const phoneInput = document.getElementById(options.phoneId || "staff-otp-phone");
    if (phoneInput && phone && !phoneInput.value) phoneInput.value = phone;
    bindStaffOtpOverlay({ ...options, role, email });
    overlay?.classList.add("show");
    return true;
  }

  window.StaffAuth = {
    STAFF_OTP_ENABLED,
    TRUST_MS,
    normalizePhone,
    needsStepUp,
    saveTrust,
    clearTrust,
    sendOtp,
    verifyOtp,
    bindStaffOtpOverlay,
    showStepUpIfNeeded,
  };

  document.addEventListener("DOMContentLoaded", () => {
    if (!STAFF_OTP_ENABLED) {
      document.getElementById("staff-otp-ov")?.classList.remove("show");
    }
  });
})();

