const SUPABASE_CONFIG = {
  url: "https://gkzuzugokctccfadzqwf.supabase.co",
  anonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrenV6dWdva2N0Y2NmYWR6cXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NDE3NTIsImV4cCI6MjA5NTQxNzc1Mn0.NgWjWFNoHMu9NgcgCLXza6FnoaAr5foRAWC990DsLNU",
  aiFunctionUrl:
    "https://gkzuzugokctccfadzqwf.supabase.co/functions/v1/njuasco-ai",
  checkoutOtpFunctionUrl:
    "https://gkzuzugokctccfadzqwf.supabase.co/functions/v1/checkout-otp",
  staffOtpFunctionUrl:
    "https://gkzuzugokctccfadzqwf.supabase.co/functions/v1/checkout-otp",
  paystackCheckoutFunctionUrl:
    "https://gkzuzugokctccfadzqwf.supabase.co/functions/v1/paystack-checkout",
  adminEmails: ["info@njuasco.edu.gh", "novatech1025@gmail.com"],
};
const DASHBOARD_PASSWORDS = {
  admin: "NJUASCO-Admin-2026!",
  subadmin: "NJUASCO-SubAdmin-2026!",
};
window.NJUASCO_SUPABASE = SUPABASE_CONFIG;

(function preloadSupabaseSdk() {
  if (window.supabase || document.querySelector("script[data-njuasco-supabase]")) return;
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  script.async = true;
  script.dataset.njuascoSupabase = "1";
  document.head.appendChild(script);
})();

const DB = {
  ADMIN_SESSION_MS: 3 * 60 * 60 * 1000,
  SUBADMIN_SESSION_MS: 2 * 60 * 60 * 1000,
  PORTAL_SESSION_MS: 2 * 60 * 60 * 1000,
  DASHBOARD_PASSWORD_MS: 3 * 60 * 60 * 1000,
  _remoteSyncReady: false,
  _pendingRemoteWrites: new Map(),
  _remoteContentSubscribers: [],
  _remoteContentSubscription: null,
  _siteContentKeys: [
    "news",
    "team",
    "departments",
    "houses",
    "clubs",
    "facilities",
    "gallery",
    "documents",
    "homepageSlides",
    "merchandise",
    "notifications",
    "students",
    "teachers",
    "applications",
    "donations",
    "orders",
    "messages",
    "logs",
    "subadmins",
    "shopCustomers",
  ],
  _get(k) {
    try {
      return JSON.parse(localStorage.getItem("nj_" + k)) || [];
    } catch {
      return [];
    }
  },
  _dedupeById(items) {
    const seen = new Set();
    return (Array.isArray(items) ? items : []).filter((item) => {
      const id = item?.id;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  },
  _set(k, v) {
    const value = Array.isArray(v) ? this._dedupeById(v) : v;
    localStorage.setItem("nj_" + k, JSON.stringify(value));
    if (this._siteContentKeys.includes(k)) {
      this._pushRemoteContent(k, value);
    }
  },
  _id() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  },
  _email(value) {
    return String(value || "").trim().toLowerCase();
  },
  async _sha256(value) {
    if (!crypto?.subtle) throw new Error("Secure password storage is not available in this browser.");
    const data = new TextEncoder().encode(String(value || ""));
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  },
  _randomToken(length = 24) {
    const bytes = new Uint8Array(length);
    if (crypto?.getRandomValues) {
      crypto.getRandomValues(bytes);
      return Array.from(bytes)
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
    }
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  },
  _makeSubAdminUser(email, profile = {}) {
    const normalized = this._email(email);
    return {
      id: profile.id || `local-subadmin-${normalized}`,
      email: normalized,
      role: "subadmin",
      app_metadata: { provider: "local-subadmin" },
      user_metadata: {
        name: profile.name || profile.username || normalized,
        subAdminId: profile.id || "",
      },
    };
  },
  async _subAdminPasswordHash(email, password, salt) {
    if (!crypto?.subtle) throw new Error("Secure password storage is not available in this browser.");
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(String(password || "")),
      "PBKDF2",
      false,
      ["deriveBits"],
    );
    const bits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: encoder.encode(`njuasco-subadmin:v2:${this._email(email)}:${salt}`),
        iterations: 120000,
        hash: "SHA-256",
      },
      key,
      256,
    );
    return Array.from(new Uint8Array(bits))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  },
  async _subAdminPasswordHashV1(email, password, salt) {
    return this._sha256(`njuasco-subadmin:v1:${this._email(email)}:${salt}:${password}`);
  },
  _isLocalFullAdminCredential(email, password) {
    return this._email(email) === "novatech1025@gmail.com" && String(password || "") === "admin123";
  },
  _saveLocalFullAdminSession(email) {
    const now = Date.now();
    const user = {
      id: "a0000000-0000-4000-8000-000000000001",
      email: this._email(email),
      role: "full-admin",
      app_metadata: { provider: "local-admin" },
      user_metadata: { name: "NJUASCO Admin" },
      signedInAt: new Date(now).toISOString(),
      expiresAt: now + this._portalSessionMs("admin"),
    };
    localStorage.setItem("nj_full_admin_session", JSON.stringify(user));
    this.savePortalSession("admin", email);
    return user;
  },
  _getLocalFullAdminSession() {
    try {
      const user = JSON.parse(localStorage.getItem("nj_full_admin_session") || "null");
      if (!this.isFullAdminEmail(user?.email)) return null;
      if (user?.expiresAt && Number(user.expiresAt) < Date.now()) {
        this._clearLocalFullAdminSession();
        return null;
      }
      return user;
    } catch {
      return null;
    }
  },
  _clearLocalFullAdminSession() {
    localStorage.removeItem("nj_full_admin_session");
    this.clearPortalSession("admin");
  },
  _portalSessionMs(role) {
    return role === "admin" ? this.ADMIN_SESSION_MS : this.SUBADMIN_SESSION_MS;
  },
  savePortalSession(role, email) {
    const key = `nj_portal_${role}`;
    localStorage.setItem(
      key,
      JSON.stringify({
        email: this._email(email),
        expiresAt: Date.now() + this._portalSessionMs(role),
      }),
    );
  },
  getPortalSession(role) {
    try {
      const data = JSON.parse(localStorage.getItem(`nj_portal_${role}`) || "null");
      if (!data?.email || !data?.expiresAt || Number(data.expiresAt) < Date.now()) {
        localStorage.removeItem(`nj_portal_${role}`);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  },
  clearPortalSession(role) {
    localStorage.removeItem(`nj_portal_${role}`);
  },
  _dashboardPasswordTrustKey(role, email) {
    return `nj_dashboard_trust_${role}_${this._email(email)}`;
  },
  saveDashboardPasswordTrust(role, email) {
    const key = this._dashboardPasswordTrustKey(role, email);
    const now = Date.now();
    const ttl = role === "admin" ? this.ADMIN_SESSION_MS : this.SUBADMIN_SESSION_MS;
    localStorage.setItem(
      key,
      JSON.stringify({
        verifiedAt: now,
        expiresAt: now + ttl,
      }),
    );
  },
  clearDashboardPasswordTrust(role, email) {
    const key = this._dashboardPasswordTrustKey(role, email);
    localStorage.removeItem(key);
  },
  needsDashboardPasswordChallenge(role, email) {
    const key = this._dashboardPasswordTrustKey(role, email);
    try {
      const data = JSON.parse(localStorage.getItem(key) || "null");
      if (!data?.expiresAt) return true;
      return Number(data.expiresAt) <= Date.now();
    } catch {
      return true;
    }
  },
  clearAllDashboardPasswordTrusts() {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith("nj_dashboard_trust_")) localStorage.removeItem(key);
    }
  },
  isAuthorizedDashboardEmail(role, email) {
    const normalized = this._email(email);
    if (!normalized) return false;
    if (role === "admin") return this.isFullAdminEmail(normalized);
    if (role === "subadmin") return this.isActiveSubAdminEmail(normalized);
    return false;
  },
  verifyDashboardPassword(role, email, password) {
    const normalized = this._email(email);
    if (!normalized || !password) return false;
    const expected = DASHBOARD_PASSWORDS[role] || DASHBOARD_PASSWORDS.admin;
    return String(password) === expected;
  },
  getAdminEmails() {
    const info = this.getInfo?.() || {};
    const saved = Array.isArray(info.adminEmails) ? info.adminEmails : [];
    const primary = info.primaryAdminEmail ? [info.primaryAdminEmail] : [];
    return [...SUPABASE_CONFIG.adminEmails, ...saved, ...primary]
      .map((email) => this._email(email))
      .filter(Boolean)
      .filter((email, index, list) => list.indexOf(email) === index);
  },
  isFullAdminEmail(email) {
    return this.getAdminEmails().includes(this._email(email));
  },
  _subAdminEmail(admin) {
    return this._email(admin?.email || admin?.username);
  },
  isActiveSubAdminEmail(email) {
    const normalized = this._email(email);
    return this._get("subadmins").some(
      (admin) => admin?.active !== false && this._subAdminEmail(admin) === normalized,
    );
  },
  _ensureSupabase() {
    if (this._supabasePromise) return this._supabasePromise;
    this._supabasePromise = new Promise((resolve, reject) => {
      if (window.__njuascoSupabase) {
        resolve(window.__njuascoSupabase);
        return;
      }
      const createClient = () => {
        try {
          window.__njuascoSupabase = window.supabase.createClient(
            SUPABASE_CONFIG.url,
            SUPABASE_CONFIG.anonKey,
            {
              auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
              },
            },
          );
          resolve(window.__njuascoSupabase);
        } catch (error) {
          reject(error);
        }
      };
      if (window.supabase) {
        createClient();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      script.async = true;
      script.onload = () => {
        if (!window.supabase) {
          reject(new Error("Supabase SDK failed to load."));
          return;
        }
        createClient();
      };
      script.onerror = () => reject(new Error("Failed to load Supabase SDK."));
      document.head.appendChild(script);
    });
    return this._supabasePromise;
  },
  async isSupabaseAuthenticated() {
    try {
      const client = await this._ensureSupabase();
      const { data, error } = await client.auth.getSession();
      return !error && !!data?.session?.access_token;
    } catch {
      return false;
    }
  },
  async getSupabaseAuthUser() {
    try {
      const client = await this._ensureSupabase();
      const { data: sessionData } = await client.auth.getSession();
      if (sessionData?.session?.user) return sessionData.session.user;
      const { data, error } = await client.auth.getUser();
      if (error || !data?.user) return null;
      return data.user;
    } catch {
      return null;
    }
  },
  async getAuthUser() {
    return this.getSupabaseAuthUser();
  },
  _hasAuthCallbackParams() {
    const search = window.location.search || "";
    const hash = window.location.hash || "";
    return (
      /[?&]code=/.test(search) ||
      /[?&]error=/.test(search) ||
      /(?:^#|[&#])(?:access_token|refresh_token|error)=/.test(hash)
    );
  },
  _cleanAuthUrl() {
    if (!this._hasAuthCallbackParams()) return;
    history.replaceState({}, document.title, window.location.pathname);
  },
  async completeAuthRedirect() {
    if (!this._hasAuthCallbackParams()) return false;
    const client = await this._ensureSupabase();
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (error) throw error;
      this._cleanAuthUrl();
      return true;
    }
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    this._cleanAuthUrl();
    return !!data?.session;
  },
  async _pushRemoteContent(key, value) {
    if (!this._siteContentKeys.includes(key)) return false;
    this._pendingRemoteWrites.set(key, value);
    return this._flushPendingRemoteWrites();
  },
  async _flushPendingRemoteWrites() {
    if (!(await this.isSupabaseAuthenticated())) return false;
    let allOk = true;
    for (const [key, value] of [...this._pendingRemoteWrites.entries()]) {
      const ok = await this.saveRemoteContent(key, value);
      if (ok) this._pendingRemoteWrites.delete(key);
      else allOk = false;
    }
    return allOk;
  },
  async remoteHasContent() {
    try {
      const rows = await this.fetchRemoteContent();
      const remoteInfo = await this.fetchRemoteInfo();
      const hasRows =
        Array.isArray(rows) &&
        rows.some((row) => Array.isArray(row.value) && row.value.length > 0);
      const hasInfo =
        remoteInfo && typeof remoteInfo === "object" && Object.keys(remoteInfo).length > 0;
      return hasRows || hasInfo;
    } catch {
      return false;
    }
  },
  async pushAllLocalToRemote() {
    if (!(await this.isSupabaseAuthenticated())) return false;
    if (await this.remoteHasContent()) {
      await this.syncRemoteAll();
      return true;
    }
    const infoOk = await this.saveRemoteInfo(this.getInfo());
    const contentResults = await Promise.all(
      this._siteContentKeys.map((key) => this.saveRemoteContent(key, this._get(key))),
    );
    this._pendingRemoteWrites.clear();
    return infoOk && contentResults.every(Boolean);
  },
  async signInWithEmail(email, password) {
    const client = await this._ensureSupabase();
    const login = client.auth.signInWithPassword({
      email: this._email(email),
      password,
    });
    const timeout = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error("Sign-in timed out. Check your internet connection and try again.")),
        20000,
      );
    });
    const { data, error } = await Promise.race([login, timeout]);
    if (error) {
      const msg = String(error.message || "");
      if (/invalid login credentials/i.test(msg)) {
        throw new Error("Wrong email or password. Use the exact email and password from Supabase Auth.");
      }
      if (/email not confirmed/i.test(msg)) {
        throw new Error("Email not confirmed. In Supabase, open the user and tick Auto Confirm, then try again.");
      }
      if (/invalid api key/i.test(msg)) {
        throw new Error("Supabase connection error. Refresh the page and try again.");
      }
      throw error;
    }
    return data?.user || null;
  },
  async signInWithGoogle(redirectTo) {
    const client = await this._ensureSupabase();
    const target = redirectTo || window.location.href.split("#")[0].split("?")[0];
    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: target,
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });
    if (error) throw error;
  },
  async signOut() {
    this._clearLocalFullAdminSession();
    this.clearPortalSession("subadmin");
    this.clearAllDashboardPasswordTrusts();
    try {
      const client = await this._ensureSupabase();
      await client.auth.signOut();
    } catch {
      // ignore sign-out failures; the UI still leaves the protected screen
    }
  },
  async updateCurrentUserPassword(currentPassword, newPassword) {
    const user = await this.getAuthUser();
    if (!user?.email) throw new Error("Please sign in again before changing your password.");
    await this.signInWithEmail(user.email, currentPassword);
    const client = await this._ensureSupabase();
    const { error } = await client.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return true;
  },
  async updateCurrentUserCredentials(currentPassword, updates = {}) {
    const user = await this.getAuthUser();
    if (!user?.email) throw new Error("Please sign in again before changing admin credentials.");
    await this.signInWithEmail(user.email, currentPassword);
    const next = {};
    if (updates.email && this._email(updates.email) !== this._email(user.email)) {
      next.email = this._email(updates.email);
    }
    if (updates.password) next.password = updates.password;
    if (!Object.keys(next).length) return { user, changed: false };
    const client = await this._ensureSupabase();
    const { data, error } = await client.auth.updateUser(next);
    if (error) throw error;
    return { user: data?.user || user, changed: true, requestedEmail: next.email || "" };
  },
  async signInFullAdmin(email, password) {
    const normalized = this._email(email);
    if (!this.isFullAdminEmail(normalized)) {
      throw new Error("This email is not allowed to access the main admin dashboard.");
    }
    try {
      const user = await this.signInWithEmail(normalized, password);
      if (!this.isFullAdminEmail(user?.email)) {
        await this.signOut();
        throw new Error("This email is not allowed to access the main admin dashboard.");
      }
      this._saveLocalFullAdminSession(normalized);
      return user;
    } catch (error) {
      const msg = String(error?.message || "");
      const networkish = /network|fetch|load failed|timeout|retry/i.test(msg);
      if (networkish && this._isLocalFullAdminCredential(normalized, password)) {
        return this._saveLocalFullAdminSession(normalized);
      }
      throw error;
    }
  },
  async requireFullAdminAuth() {
    const localUser = this._getLocalFullAdminSession();
    if (localUser) return localUser;
    const user = await this.getSupabaseAuthUser();
    if (user && this.isAuthorizedDashboardEmail("admin", user?.email)) {
      const portal = this.getPortalSession("admin");
      if (portal && portal.email === this._email(user.email)) return user;
      await this.signOut();
      return null;
    }
    if (user && !this.isAuthorizedDashboardEmail("admin", user?.email)) {
      await this.signOut();
    }
    const portal = this.getPortalSession("admin");
    if (portal && this.isAuthorizedDashboardEmail("admin", portal.email)) return null;
    return null;
  },
  findSubAdminByEmail(email) {
    return this.getSubAdminProfileByEmail(email);
  },
  subAdminNeedsPasswordSetup(profile) {
    if (!profile) return true;
    if (profile.passwordSet === true) return false;
    if (String(profile.staffPassword || "").trim()) return false;
    return true;
  },
  getSubAdminProfileByEmail(email) {
    const normalized = this._email(email);
    if (!normalized) return null;
    return (
      this._get("subadmins").find(
        (admin) => admin?.active !== false && this._subAdminEmail(admin) === normalized,
      ) || null
    );
  },
  async markSubAdminPasswordReady(profile, passwordLabel = "Set") {
    if (!profile?.id) return profile;
    if (passwordLabel && !/^Set$|^—/.test(String(passwordLabel))) {
      await this._saveSubAdminPasswordCredential(profile.id, profile.email || profile.username, passwordLabel);
    } else {
      this._saveSubAdminStaffPassword(profile.id, "Set", { syncRemote: true });
    }
    try {
      const client = await this._ensureSupabase();
      await client.auth.updateUser({
        data: {
          subAdminPasswordSet: true,
          subAdminId: profile.id,
        },
      });
    } catch {
      // local + profile flags still prevent repeat setup prompts
    }
    return this.findSubAdminByEmail(profile.email || profile.username);
  },
  _saveSubAdminStaffPassword(profileId, password, options = {}) {
    const admins = this._get("subadmins");
    const index = admins.findIndex((a) => a.id === profileId);
    if (index === -1) return false;
    admins[index] = {
      ...admins[index],
      staffPassword: password,
      passwordSet: true,
      passwordSetAt: new Date().toISOString().split("T")[0],
    };
    this._set("subadmins", admins);
    if (options.syncRemote !== false) {
      this._pushRemoteContent("subadmins", admins);
    }
    return true;
  },
  async _saveSubAdminPasswordCredential(profileId, email, password, options = {}) {
    const admins = this._get("subadmins");
    const index = admins.findIndex((a) => a.id === profileId);
    if (index === -1) return null;
    const normalized = this._email(email || admins[index].email || admins[index].username);
    const salt = this._randomToken(18);
    const hash = await this._subAdminPasswordHash(normalized, password, salt);
    admins[index] = {
      ...admins[index],
      email: normalized || admins[index].email,
      staffPassword: "Set",
      staffPasswordHash: hash,
      passwordHashVersion: 2,
      passwordSalt: salt,
      passwordSet: true,
      passwordSetAt: new Date().toISOString().split("T")[0],
    };
    this._set("subadmins", admins);
    if (options.syncRemote !== false) {
      this._pushRemoteContent("subadmins", admins);
    }
    return admins[index];
  },
  async verifySubAdminPassword(profile, password) {
    if (!profile || !password) return false;
    const email = this._subAdminEmail(profile);
    if (profile.staffPasswordHash && profile.passwordSalt) {
      const hash =
        Number(profile.passwordHashVersion || 1) >= 2
          ? await this._subAdminPasswordHash(email, password, profile.passwordSalt)
          : await this._subAdminPasswordHashV1(email, password, profile.passwordSalt);
      if (hash === profile.staffPasswordHash) {
        if (Number(profile.passwordHashVersion || 1) < 2) {
          await this._saveSubAdminPasswordCredential(profile.id, email, password);
        }
        return true;
      }
      return false;
    }
    const legacyPassword = String(profile.staffPassword || "");
    if (legacyPassword && legacyPassword !== "Set" && legacyPassword === String(password)) {
      await this._saveSubAdminPasswordCredential(profile.id, email, password);
      return true;
    }
    return false;
  },
  async setupSubAdminPassword(email, password) {
    if (String(password || "").length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }
    await this.syncRemoteAll();
    const normalized = this._email(email);
    const profile = this.getSubAdminProfileByEmail(normalized);
    if (!profile) {
      throw new Error("This email is not assigned to an active sub-admin profile.");
    }
    if (profile.passwordSet) {
      throw new Error("Password already set. Sign in with your password instead.");
    }
    const updatedProfile = await this._saveSubAdminPasswordCredential(profile.id, normalized, password);
    await this._flushPendingRemoteWrites();
    return {
      user: this._makeSubAdminUser(normalized, updatedProfile || profile),
      profile: updatedProfile || this.getSubAdminProfileByEmail(normalized) || profile,
    };
  },
  async signInSubAdmin(email, password) {
    await this.syncRemoteAll();
    const normalized = this._email(email);
    const profile = this.getSubAdminProfileByEmail(normalized);
    if (!profile) {
      throw new Error("This email is not assigned to an active sub-admin profile.");
    }
    if (await this.verifySubAdminPassword(profile, password)) {
      return { user: this._makeSubAdminUser(normalized, profile), profile };
    }
    try {
      const user = await this.signInWithEmail(normalized, password);
      const freshProfile = await this.getSubAdminProfileForUser(user);
      return { user, profile: freshProfile };
    } catch (error) {
      const msg = String(error?.message || "");
      if (/email rate limit/i.test(msg)) {
        throw new Error("Supabase email rate limit was reached. Use the password you created for this sub-admin account.");
      }
      throw error;
    }
  },
  async getSubAdminProfileForUser(user) {
    await this.syncRemoteAll();
    const normalized = this._email(user?.email);
    if (!this.isAuthorizedDashboardEmail("subadmin", normalized)) {
      await this.signOut();
      throw new Error("This email is not authorized to access the sub-admin dashboard.");
    }
    const profile = this.getSubAdminProfileByEmail(normalized);
    if (!profile) {
      await this.signOut();
      throw new Error("This email is not assigned to an active sub-admin profile.");
    }
    return profile;
  },
  _remoteApplicationRowToApp(row, documents = []) {
    return {
      id: row.id,
      remoteId: row.id,
      ref: row.ref,
      name: row.name,
      firstName: row.first_name,
      lastName: row.last_name,
      dob: row.dob,
      gender: row.gender,
      address: row.address,
      phone: row.phone,
      programme: row.programme,
      status: row.status,
      stage: row.stage,
      date: row.created_at || row.updated_at,
      aggregate: row.aggregate,
      beceIndex: row.bece_index,
      beceYear: row.bece_year,
      school: row.previous_school,
      guardianName: row.guardian_name,
      guardianPhone: row.guardian_phone,
      guardianEmail: row.guardian_email,
      guardianRelation: row.guardian_relation,
      guardianOccupation: row.guardian_occupation,
      decisionNote: row.decision_note,
      decisionDate: row.decision_date,
      timeline: row.timeline || [],
      documents,
    };
  },
  _mergeApplications(remoteApps = []) {
    if (!Array.isArray(remoteApps) || !remoteApps.length) return this._get("applications");
    const local = this._get("applications");
    const byRef = new Map(local.map((app) => [app.ref || app.id, app]));
    remoteApps.forEach((app) => {
      const key = app.ref || app.id;
      byRef.set(key, { ...(byRef.get(key) || {}), ...app });
    });
    const merged = Array.from(byRef.values()).sort(
      (a, b) => new Date(b.date || 0) - new Date(a.date || 0),
    );
    localStorage.setItem("nj_applications", JSON.stringify(merged));
    this._notifyRemoteContentSubscribers("applications", merged);
    return merged;
  },
  async fetchRemoteApplications() {
    try {
      const client = await this._ensureSupabase();
      const { data: rows, error } = await client
        .from("admission_applications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!rows?.length) return [];
      const ids = rows.map((row) => row.id);
      const { data: docRows } = await client
        .from("admission_documents")
        .select("*")
        .in("application_id", ids);
      const docsByApp = new Map();
      for (const doc of docRows || []) {
        let url = "";
        if (doc.storage_path) {
          const { data: signed } = await client.storage
            .from("admission-documents")
            .createSignedUrl(doc.storage_path, 60 * 10);
          url = signed?.signedUrl || "";
        }
        const list = docsByApp.get(doc.application_id) || [];
        list.push({
          id: doc.id,
          type: doc.document_type,
          label: doc.label,
          name: doc.file_name,
          mime: doc.mime_type,
          size: doc.file_size,
          storagePath: doc.storage_path,
          data: url,
        });
        docsByApp.set(doc.application_id, list);
      }
      return rows.map((row) => this._remoteApplicationRowToApp(row, docsByApp.get(row.id) || []));
    } catch {
      return null;
    }
  },
  async syncRemoteApplications() {
    const apps = await this.fetchRemoteApplications();
    if (!Array.isArray(apps)) return false;
    this._mergeApplications(apps);
    return true;
  },
  async updateRemoteApplicationStatus(app, changes = {}) {
    const remoteId = app?.remoteId || (/^[0-9a-f-]{36}$/i.test(app?.id || "") ? app.id : "");
    if (!remoteId && !app?.ref) return null;
    try {
      const client = await this._ensureSupabase();
      let query = client.from("admission_applications").update({
        status: changes.status,
        stage: changes.stage,
        decision_note: changes.decisionNote || "",
        decision_date: changes.decisionDate || null,
        timeline: changes.timeline || [],
      });
      query = remoteId ? query.eq("id", remoteId) : query.eq("ref", app.ref);
      const { data, error } = await query.select("*").single();
      if (error) throw error;
      const updated = this._remoteApplicationRowToApp(data, app.documents || []);
      this._mergeApplications([updated]);
      return updated;
    } catch {
      return null;
    }
  },
  async uploadSiteAsset(file, folder = "uploads") {
    if (!file) return "";
    try {
      const client = await this._ensureSupabase();
      const safeName = String(file.name || "asset")
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName || "asset"}`;
      const { error } = await client.storage.from("site-assets").upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (error) throw error;
      const { data } = client.storage.from("site-assets").getPublicUrl(path);
      return data?.publicUrl || "";
    } catch {
      return "";
    }
  },
  _remoteInfoSubscribers: [],
  _remoteInfoSubscription: null,
  _notifyRemoteInfoSubscribers(info) {
    this._remoteInfoSubscribers.forEach((cb) => {
      try {
        cb(info);
      } catch (e) {
        // ignore subscriber errors
      }
    });
  },
  _notifyRemoteContentSubscribers(key, value) {
    this._remoteContentSubscribers.forEach((cb) => {
      try {
        cb(key, value);
      } catch (e) {
        // ignore subscriber errors
      }
    });
  },
  async fetchRemoteContent() {
    try {
      const client = await this._ensureSupabase();
      const { data, error } = await client
        .from("site_content")
        .select("key,value")
        .in("key", this._siteContentKeys);
      if (error) throw error;
      return data || [];
    } catch {
      return null;
    }
  },
  async saveRemoteContent(key, value) {
    if (!this._siteContentKeys.includes(key)) return false;
    try {
      const client = await this._ensureSupabase();
      const { error } = await client
        .from("site_content")
        .upsert({ key, value }, { onConflict: "key" });
      if (error) throw error;
      return true;
    } catch {
      return false;
    }
  },
  async syncRemoteContent(options = {}) {
    const rows = await this.fetchRemoteContent();
    if (!Array.isArray(rows)) {
      this._remoteSyncReady = true;
      return false;
    }
    if (rows.length) {
      rows.forEach((row) => {
        if (!this._siteContentKeys.includes(row.key) || !Array.isArray(row.value)) return;
        if (this._pendingRemoteWrites.has(row.key)) return;
        const deduped = this._dedupeById(row.value);
        localStorage.setItem("nj_" + row.key, JSON.stringify(deduped));
        this._notifyRemoteContentSubscribers(row.key, deduped);
      });
    } else if (!options.preferRemote && await this.isSupabaseAuthenticated()) {
      await Promise.all(
        this._siteContentKeys.map((key) => this.saveRemoteContent(key, this._dedupeById(this._get(key)))),
      );
    }
    if (options.preferRemote) {
      const remoteKeys = new Set(rows.map((row) => row?.key));
      const publicKeys = [
        "news",
        "team",
        "departments",
        "houses",
        "clubs",
        "facilities",
        "gallery",
        "documents",
        "homepageSlides",
        "merchandise",
        "notifications",
      ];
      publicKeys.forEach((key) => {
        if (remoteKeys.has(key) || this._pendingRemoteWrites.has(key)) return;
        localStorage.setItem("nj_" + key, "[]");
        this._notifyRemoteContentSubscribers(key, []);
      });
    }
    this._remoteSyncReady = true;
    await this._flushPendingRemoteWrites();
    return true;
  },
  async syncRemotePublic() {
    // Public pages only need the site settings and published site content.
    // Keep this separate from applications, which can be slow and is not part
    // of a visitor's initial page render.
    const [info, content] = await Promise.all([
      this.syncRemoteInfo(),
      this.syncRemoteContent({ preferRemote: true }),
    ]);
    return { info, content };
  },
  async syncRemoteAll(options = {}) {
    const [info, contentChanged, applicationsChanged] = await Promise.all([
      this.syncRemoteInfo(),
      this.syncRemoteContent(options),
      this.syncRemoteApplications(),
    ]);
    await Promise.all([
      this.subscribeRemoteInfo(() => {}),
      this.subscribeRemoteContent(() => {}),
    ]);
    await this._flushPendingRemoteWrites();
    return { info, contentChanged, applicationsChanged };
  },
  async subscribeRemoteContent(callback) {
    if (typeof callback === "function") {
      this._remoteContentSubscribers.push(callback);
    }
    if (this._remoteContentSubscription) return this._remoteContentSubscription;
    try {
      const client = await this._ensureSupabase();
      this._remoteContentSubscription = client
        .channel("site_content_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "site_content",
          },
          (payload) => {
            const key = payload?.new?.key;
            const value = payload?.new?.value;
            if (this._siteContentKeys.includes(key) && Array.isArray(value)) {
              if (this._pendingRemoteWrites.has(key)) return;
              const deduped = this._dedupeById(value);
              localStorage.setItem("nj_" + key, JSON.stringify(deduped));
              this._notifyRemoteContentSubscribers(key, deduped);
            }
          },
        )
        .subscribe();
      return this._remoteContentSubscription;
    } catch {
      return null;
    }
  },
  async subscribeRemoteInfo(callback) {
    if (typeof callback === "function") {
      this._remoteInfoSubscribers.push(callback);
    }
    if (this._remoteInfoSubscription) return this._remoteInfoSubscription;
    try {
      const client = await this._ensureSupabase();
      this._remoteInfoSubscription = client
        .channel("site_settings_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "site_settings",
            filter: "key=eq.site_info",
          },
          (payload) => {
            const remoteInfo = payload?.new?.value;
            if (remoteInfo && typeof remoteInfo === "object") {
              localStorage.setItem("nj_info", JSON.stringify(remoteInfo));
              this._notifyRemoteInfoSubscribers(remoteInfo);
            }
          },
        )
        .subscribe();
      return this._remoteInfoSubscription;
    } catch {
      return null;
    }
  },
  async fetchRemoteInfo() {
    try {
      const client = await this._ensureSupabase();
      const { data, error } = await client
        .from("site_settings")
        .select("value")
        .eq("key", "site_info")
        .maybeSingle();
      if (error) throw error;
      return data?.value || null;
    } catch {
      return null;
    }
  },
  async saveRemoteInfo(info) {
    try {
      const client = await this._ensureSupabase();
      const { error } = await client
        .from("site_settings")
        .upsert({ key: "site_info", value: info }, { onConflict: "key" });
      if (error) throw error;
      return true;
    } catch {
      return false;
    }
  },
  async syncRemoteInfo() {
    const remote = await this.fetchRemoteInfo();
    if (remote && typeof remote === "object") {
      localStorage.setItem("nj_info", JSON.stringify(remote));
      this._notifyRemoteInfoSubscribers(remote);
      return remote;
    }
    if (await this.isSupabaseAuthenticated()) {
      const local = this.getInfo();
      if (Object.keys(local).length) {
        await this.saveRemoteInfo(local);
      }
    }
    return null;
  },
  getAll(k) {
    return this._get(k);
  },
  getById(k, id) {
    return this._get(k).find((i) => i.id === id) || null;
  },
  add(k, item) {
    const l = this._get(k);
    item.id = item.id || this._id();
    l.push(item);
    this._set(k, l);
    this._log("Added", k, item.name || item.title || item.id);
    return item;
  },
  update(k, id, ch) {
    const l = this._get(k);
    const i = l.findIndex((x) => x.id === id);
    if (i === -1) return null;
    l[i] = { ...l[i], ...ch };
    this._set(k, l);
    this._log("Updated", k, l[i].name || l[i].title || id);
    return l[i];
  },
  delete(k, id) {
    const item = this._get(k).find((i) => i.id === id);
    const l = this._get(k).filter((i) => i.id !== id);
    this._set(k, l);
    if (item)
      this._log("Deleted", k, item.name || item.title || item.ref || id);
    return true;
  },
  getInfo() {
    try {
      return JSON.parse(localStorage.getItem("nj_info") || "{}");
    } catch {
      return {};
    }
  },
  saveInfo(d) {
    localStorage.setItem("nj_info", JSON.stringify(d));
    this._notifyRemoteInfoSubscribers(d);
    this._log("Updated", "School Info", "School Information");
    return this.saveRemoteInfo(d);
  },
  _log(a, s, d) {
    const logs = this._get("logs");
    logs.unshift({
      id: this._id(),
      user: "Admin",
      action: a,
      detail: `${s}: "${d}"`,
      ip: "Local",
      time: new Date().toLocaleString(),
    });
    if (logs.length > 200) logs.pop();
    this._set("logs", logs);
  },
  seed() {
    // Public content is managed by the dashboard and remote database. Never
    // populate a new visitor's browser with placeholder news, images, or events.
    if (!localStorage.getItem("nj_seeded")) {
      localStorage.setItem("nj_seeded", "1");
    }
  },
};
DB.seed();

DB.migrateAboutContent = function () {
  const info = this.getInfo();
  const defaults = {
    name: "New Juaben Senior High School",
    shortName: "NJUASCO",
    homeBadgeTitle: "70+ YEARS OF",
    homeBadgeSubtitle: "EXCELLENCE",
    principalEmoji: "👨‍🏫",
    welcomeText:
      "Founded in 1953, New Juaben Senior High School has stood as a pillar of quality education in Koforidua, Eastern Region. We nurture every student through a rich curriculum, vibrant extracurriculars, and a disciplined environment focused on holistic development.",
    vision:
      "To be a preferred destination for quality secondary education to prepare students from diverse backgrounds for further studies and the world of work.",
    mission:
      "Provision of a conducive environment that nurtures students to acquire knowledge, skills, and attitudes to support life-long learning.",
    principalMessage:
      "Welcome to New Juaben Senior High School — a place where excellence is not just a goal, but a way of life. Since 1953, we have been committed to nurturing the whole student: intellectually, morally, and socially.",
    principalName: "Mr. Emmanuel Ofori",
    principalTitle: "Headmaster, NJUASCO",
    aboutFoundedDesc:
      "Serving the New Juaben community with quality secondary education for over 71 years of proud history.",
    aboutLocationVal: "Koforidua",
    aboutLocationDesc:
      "New Juaben, Eastern Region, Ghana. School Code: 0020103 · Category B school.",
    motto: "HARDWORK",
    warCry: "DAASEBRE MMA",
    founded: "1953",
    code: "0020103",
    category: "B",
  };
  let changed = false;
  Object.entries(defaults).forEach(([key, value]) => {
    if (!info[key]) {
      info[key] = value;
      changed = true;
    }
  });
  if (!Array.isArray(info.aboutTimeline) || !info.aboutTimeline.length) {
    info.aboutTimeline = [
      {
        year: "1953",
        title: "School Founded",
        desc: "New Juaben Senior High School opens its doors for the first time in Koforidua, Eastern Region, beginning a legacy of academic excellence in Ghana.",
        color: "#2563eb",
      },
      {
        year: "1970s",
        title: "Expansion & Growth",
        desc: "The school expands its programmes and facilities, welcoming students from across the Eastern Region and building a growing regional reputation.",
        color: "#9333ea",
      },
      {
        year: "1990s",
        title: "Academic Milestones",
        desc: "NJUASCO establishes itself as a top-performing school in the Eastern Region with outstanding SSSCE results and national recognition for academic excellence.",
        color: "#059669",
      },
      {
        year: "2000s",
        title: "Modern Infrastructure",
        desc: "New science laboratories, ICT centre, library extension, and sports complex are commissioned to support the growing student population and modern curriculum demands.",
        color: "#d97706",
      },
      {
        year: "2010s – Present",
        title: "Continued Excellence",
        desc: "NJUASCO continues to achieve outstanding WASSCE results, compete nationally in NSMQ, and expand community impact through NJOSA and digital learning initiatives.",
        color: "#dc2626",
      },
    ];
    changed = true;
  }
  if (!Array.isArray(info.coreValues) || !info.coreValues.length) {
    info.coreValues = [
      { emoji: "💪", title: "Hard Work", desc: "Dedication and perseverance form the bedrock of everything we do. We celebrate effort as much as achievement.", color: "rgba(37, 99, 235, 0.1)" },
      { emoji: "⚖️", title: "Discipline", desc: "A disciplined mind and character are essential for sustained success — in school and in the world beyond.", color: "rgba(147, 51, 234, 0.1)" },
      { emoji: "💡", title: "Creativity & Innovation", desc: "We encourage students to think boldly, question fearlessly, and develop innovative solutions to real challenges.", color: "rgba(245, 158, 11, 0.1)" },
      { emoji: "🤝", title: "Honesty & Integrity", desc: "Truth, transparency, and moral uprightness are non-negotiable in our community of learners and educators.", color: "rgba(16, 185, 129, 0.1)" },
      { emoji: "🌍", title: "Tolerance & Teamwork", desc: "Respecting diversity and working collaboratively prepares students for leadership in a multicultural world.", color: "rgba(6, 182, 212, 0.1)" },
      { emoji: "⭐", title: "Excellence", desc: "We pursue the highest standards in academics, sports, arts, and character — because our students deserve nothing less.", color: "rgba(220, 38, 38, 0.1)" },
    ];
    changed = true;
  }
  if (!Array.isArray(info.aiFaqs)) {
    info.aiFaqs = [];
    changed = true;
  }
  if (!Array.isArray(info.aiKnowledgePoints)) {
    info.aiKnowledgePoints = [];
    if (info.aiKnowledge?.trim()) {
      info.aiKnowledgePoints = info.aiKnowledge
        .split(/\n+/)
        .map((line) => line.replace(/^[-*•\d.]+\s*/, "").trim())
        .filter(Boolean)
        .map((text) => ({ id: DB._id(), text, createdAt: new Date().toISOString() }));
    }
    changed = true;
  }
  if (typeof info.aiKnowledge !== "string") {
    info.aiKnowledge = "";
    changed = true;
  }
  if (
    info.aiKnowledgePoints?.length === 1 &&
    /NOVA Tech Team|Official Knowledge Base/i.test(info.aiKnowledgePoints[0]?.text || "") &&
    !String(info.aiKnowledge || "").trim()
  ) {
    info.aiKnowledgePoints = [];
    changed = true;
  }
  if (!info.heroStats || typeof info.heroStats !== "object") {
    info.heroStats = { years: 71, students: 3000, programmes: 7, staff: 200 };
    changed = true;
  }
  if (info.heroClubsUseLive !== true && info.heroClubsUseLive !== false) {
    info.heroClubsUseLive = true;
    changed = true;
  }
  if (typeof info.heroClubsManual !== "string") {
    info.heroClubsManual = "";
    changed = true;
  }
  if (typeof info.adminVerifyPhone !== "string") {
    info.adminVerifyPhone = "";
    changed = true;
  }
  if (typeof info.topBannerMessage !== "string" || !info.topBannerMessage.trim()) {
    info.topBannerMessage = "Welcome to {schoolName} | Academic Excellence Since {founded} | War Cry: {warCry}! | Admissions Open {admissionYear}";
    changed = true;
  }
  if (info.admissionsYearAuto !== true && info.admissionsYearAuto !== false) {
    info.admissionsYearAuto = true;
    changed = true;
  }
  if (typeof info.admissionsAcademicYear !== "string") {
    info.admissionsAcademicYear = "";
    changed = true;
  }
  const welcomeDefaults = {
    enabled: true,
    kicker: "New Juaben Senior High School",
    title: "Welcome to NJB City",
    text: "Home of excellence, discipline, creativity, clubs, culture, and the proud NJUASCO spirit.",
    buttonText: "Enter NJB City",
    image: "njb.png",
    logo: "njuasco-logo.png",
  };
  if (!info.firstVisitWelcome || typeof info.firstVisitWelcome !== "object") {
    info.firstVisitWelcome = { ...welcomeDefaults };
    changed = true;
  } else {
    Object.entries(welcomeDefaults).forEach(([key, value]) => {
      if (typeof info.firstVisitWelcome[key] === "undefined" || info.firstVisitWelcome[key] === "") {
        info.firstVisitWelcome[key] = value;
        changed = true;
      }
    });
  }
  if (String(info.motto || "").trim().toLowerCase() === "hard work, discipline, success") {
    info.motto = "HARDWORK";
    changed = true;
  }
  if (changed) localStorage.setItem("nj_info", JSON.stringify(info));
};

DB.seedNovaTechAIKnowledge = function () {
  // NOVA Tech details are available to the AI only for website-creator questions.
  // Do not seed them as the school's general AI knowledge base.
};

DB.getAIKnowledgeText = function () {
  const info = this.getInfo();
  const points = Array.isArray(info.aiKnowledgePoints) ? info.aiKnowledgePoints : [];
  if (points.length) {
    return points.map((point, index) => `${index + 1}. ${point.text}`).join("\n");
  }
  return String(info.aiKnowledge || "").trim();
};

DB.findOrCreateShopCustomer = function ({ name, email, phone, wardName, wardClass }) {
  const normalizedPhone = this._normalizeCheckoutPhone(phone);
  const customers = this._get("shopCustomers");
  let customer = customers.find((c) => c.phone === normalizedPhone);
  if (!customer) {
    customer = {
      id: this._id(),
      name: String(name || "").trim(),
      email: String(email || "").trim().toLowerCase(),
      phone: normalizedPhone,
      wardName: String(wardName || "").trim(),
      wardClass: String(wardClass || "").trim(),
      createdAt: new Date().toISOString(),
    };
    customers.push(customer);
    this._set("shopCustomers", customers);
    this.saveRemoteContent?.("shopCustomers", customers);
  } else {
    customer.name = String(name || customer.name || "").trim();
    customer.email = String(email || customer.email || "").trim().toLowerCase();
    customer.wardName = String(wardName || customer.wardName || "").trim();
    customer.wardClass = String(wardClass || customer.wardClass || "").trim();
    customer.updatedAt = new Date().toISOString();
    this._set("shopCustomers", customers);
    this.saveRemoteContent?.("shopCustomers", customers);
  }
  return customer;
};

DB.saveCheckoutProfile = function (profile) {
  localStorage.setItem("nj_checkout_profile", JSON.stringify({ ...profile, savedAt: Date.now() }));
};

DB.getCheckoutProfile = function () {
  try {
    const profile = JSON.parse(localStorage.getItem("nj_checkout_profile") || "null");
    return profile && profile.customerId ? profile : null;
  } catch {
    return null;
  }
};

DB.saveCheckoutSession = function (session) {
  const now = Date.now();
  const payload = {
    ...session,
    savedAt: now,
    expiresAt: session?.expiresAt || now + 30 * 24 * 60 * 60 * 1000,
  };
  localStorage.setItem("nj_checkout_verify", JSON.stringify(payload));
};

DB.getCheckoutSession = function () {
  try {
    const data = JSON.parse(localStorage.getItem("nj_checkout_verify") || "null");
    if (!data?.verificationToken || !data?.expiresAt || Number(data.expiresAt) <= Date.now()) {
      this.clearCheckoutSession();
      return null;
    }
    return data;
  } catch {
    return null;
  }
};

DB._normalizeCheckoutPhone = function (phone) {
  let digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `233${digits.slice(1)}`;
  if (digits.length === 9 && /^[245]/.test(digits)) digits = `233${digits}`;
  return digits;
};

DB.formatCheckoutPhone = function (phone) {
  const digits = this._normalizeCheckoutPhone(phone);
  return digits ? `+${digits}` : "";
};

DB.clearCheckoutSession = function () {
  localStorage.removeItem("nj_checkout_verify");
};

DB.forceSyncContentKey = async function (key) {
  if (!this._siteContentKeys.includes(key)) return false;
  const value = this._dedupeById(this._get(key));
  this._set(key, value);
  this._pendingRemoteWrites.set(key, value);
  const ok = await this.saveRemoteContent(key, value);
  if (ok) this._pendingRemoteWrites.delete(key);
  return ok;
};

DB.migrateSiteContent = function () {
  const info = this.getInfo();
  const next = {
    name: info.name || "New Juaben Senior High School",
    shortName: info.shortName || "NJUASCO",
    footerCopyright:
      info.footerCopyright ||
      "© 2025 New Juaben Senior High School. All rights reserved.",
    novaTechName: info.novaTechName || "NOVATech",
    novaTechUrl: info.novaTechUrl || "#",
    galaxyName: info.galaxyName || "Galaxy Design Studio",
    galaxyUrl: info.galaxyUrl || "#",
  };
  if (Object.keys(next).some((key) => info[key] !== next[key])) {
    localStorage.setItem("nj_info", JSON.stringify({ ...info, ...next }));
  }
};

DB.migrateEmojiIcons = function () {
  const isImageAsset = (src) => /^(data:image\/|https?:\/\/|\.?\/|[\w .-]+\.(png|jpe?g|webp|gif|svg)(\?.*)?$)/i.test(String(src || ""));
  const hasBrokenEncoding = (src) => /â|Â|ðŸ|ï¸|�/.test(String(src || ""));
  const icon = (name) => `<span class="ico ico-${name}" data-ico="${name}" aria-hidden="true"></span>`;
  const iconByCollection = {
    news: { n1: icon("award"), n2: icon("calendar"), n3: icon("megaphone"), n4: icon("flask"), n5: icon("cap"), n6: icon("masks") },
    team: { t1: icon("user"), t2: icon("user"), t3: icon("school"), t4: icon("school"), t5: icon("flask"), t6: icon("user") },
    clubs: { c1: icon("flask"), c2: icon("masks"), c3: icon("fileText"), c4: icon("info"), c5: icon("shop"), c6: icon("megaphone") },
    facilities: { f1: icon("fileText"), f2: icon("flask"), f3: icon("shop"), f4: icon("cap"), f5: icon("school"), f6: icon("heart") },
    gallery: { g1: icon("school"), g2: icon("flask"), g3: icon("cap"), g4: icon("masks"), g5: icon("fileText"), g6: icon("image"), g7: icon("award"), g8: icon("cap"), g9: icon("home"), g10: icon("shop"), g11: icon("heart"), g12: icon("megaphone") },
    merchandise: { m1: icon("shop"), m2: icon("shop"), m3: icon("cap"), m4: icon("fileText"), m5: icon("award"), m6: icon("award") },
    houses: {
      h1: '<span class="ico ico-home" data-ico="home" aria-hidden="true"></span>',
      h2: '<span class="ico ico-home" data-ico="home" aria-hidden="true"></span>',
      h3: '<span class="ico ico-home" data-ico="home" aria-hidden="true"></span>',
      h4: '<span class="ico ico-home" data-ico="home" aria-hidden="true"></span>',
    },
  };

  Object.entries(iconByCollection).forEach(([collection, icons]) => {
    const items = this.getAll(collection);
    let changed = false;
    items.forEach((item) => {
      if (icons[item.id] && !isImageAsset(item.image) && (!item.image || hasBrokenEncoding(item.image))) {
        item.image = icons[item.id];
        changed = true;
      }
      if (collection === "houses") {
        if (!Array.isArray(item.gallery)) {
          item.gallery = [];
          changed = true;
        }
        if (!item.story && item.traits) {
          item.story = item.traits;
          changed = true;
        }
      }
    });
    if (changed) this._set(collection, items);
  });
};

DB.runLocalMigrations = function () {
  DB.migrateAboutContent();
  DB.migrateSiteContent();
  DB.migrateEmojiIcons();
  DB.seedNovaTechAIKnowledge?.();
};

DB.syncRemoteAll()
  .catch(() => {})
  .finally(() => {
    DB._remoteSyncReady = true;
    DB.runLocalMigrations();
  });

// ── CART ─────────────────────────────────────────
DB.getCart = function () {
  try {
    return JSON.parse(localStorage.getItem("nj_cart") || "[]");
  } catch {
    return [];
  }
};
DB.saveCart = function (c) {
  localStorage.setItem("nj_cart", JSON.stringify(c));
};
DB.addToCart = function (item) {
  const cart = this.getCart();
  const existing = cart.find((i) => i.id === item.id);
  if (existing) {
    existing.qty = (existing.qty || 1) + 1;
  } else {
    cart.push({ ...item, qty: 1 });
  }
  this.saveCart(cart);
  return cart;
};
DB.removeFromCart = function (id) {
  const cart = this.getCart().filter((i) => i.id !== id);
  this.saveCart(cart);
  return cart;
};
DB.updateQty = function (id, qty) {
  const cart = this.getCart();
  const item = cart.find((i) => i.id === id);
  if (item) {
    if (qty <= 0) {
      return this.removeFromCart(id);
    }
    item.qty = qty;
  }
  this.saveCart(cart);
  return cart;
};
DB.cartTotal = function () {
  return this.getCart().reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);
};
DB.clearCart = function () {
  localStorage.removeItem("nj_cart");
};

