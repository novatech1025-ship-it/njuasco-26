const ICON_PATHS = {
        home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10"/><path d="M9 21v-6h6v6"/>',
        school:
          '<path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6"/><path d="M9 10h.01"/><path d="M15 10h.01"/>',
        news: '<path d="M4 19.5A2.5 2.5 0 0 1 1.5 17V5H18v12a2.5 2.5 0 0 0 5 0V8h-5"/><path d="M5 8h8"/><path d="M5 12h8"/><path d="M5 16h5"/>',
        image:
          '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
        landmark:
          '<path d="M3 21h18"/><path d="M5 21V10"/><path d="M19 21V10"/><path d="M12 3 3 8h18l-9-5z"/><path d="M9 21V10"/><path d="M15 21V10"/>',
        masks:
          '<path d="M7 8h.01"/><path d="M11 8h.01"/><path d="M9 13a3 3 0 0 0 3-3V5H4v5a5 5 0 0 0 5 5"/><path d="M17 11h.01"/><path d="M21 11h.01"/><path d="M19 16a3 3 0 0 1-3-3V8h8v5a5 5 0 0 1-5 5"/>',
        cap: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/><path d="M22 10v6"/>',
        user: '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>',
        heart:
          '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>',
        shop: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
        bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
        clipboard:
          '<path d="M9 2h6v4H9z"/><path d="M9 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-4"/>',
        phone:
          '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z"/>',
        key: '<circle cx="7.5" cy="14.5" r="3.5"/><path d="M10 12l8-8 2 2-2 2 2 2-2 2-2-2-3 3"/>',
        info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
        cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L23 6H6"/>',
        search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
        check: '<path d="m20 6-11 11-5-5"/>',
        x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
      };
      function hydrateIcons(root = document) {
        root.querySelectorAll("[data-ico]").forEach((el) => {
          if (el.dataset.ready === "1") return;
          const path = ICON_PATHS[el.dataset.ico] || ICON_PATHS.info;
          el.innerHTML = `<svg viewBox="0 0 24 24" focusable="false">${path}</svg>`;
          el.dataset.ready = "1";
        });
      }
      function isImageAsset(src) {
        return /^(data:image\/|https?:\/\/|\.?\/|[\w .-]+\.(png|jpe?g|webp|gif|svg)(\?.*)?$)/i.test(
          String(src || ""),
        );
      }
      function mediaMarkup(src, cls = "") {
        if (isImageAsset(src)) return `<img class="media-img ${cls}" src="${esc(src)}" alt="">`;
        return src || "";
      }
      function fileToDataURL(file) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      async function docFileValue() {
        const file = document.getElementById("mf-doc-file")?.files?.[0];
        if (file) return (await DB.uploadSiteAsset?.(file, "documents")) || (await fileToDataURL(file));
        return gv("mf-file-url") || "#";
      }
      async function mediaValue(inputId = "mf-image", fileId = "mf-file") {
        const file = document.getElementById(fileId)?.files?.[0];
        if (file) return (await DB.uploadSiteAsset?.(file, "media")) || (await fileToDataURL(file));
        return gv(inputId);
      }
      async function bulkUploadGallery(input) {
        await bulkUploadMedia(input, "gallery", "gallery-mgr");
      }
      function fileTitle(file) {
        return file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
      }
      async function bulkUploadMedia(input, key, reload, extra = {}) {
        const files = Array.from(input?.files || []);
        if (!files.length) return;
        for (const [index, file] of files.entries()) {
          const src = (await DB.uploadSiteAsset?.(file, key)) || (await fileToDataURL(file));
          const base = {
            title: fileTitle(file),
            name: fileTitle(file),
            image: src,
            file: src,
            description: "",
            category: extra.category || (key === "documents" ? "General" : "campus"),
            status: key === "homepageSlides" ? "active" : "published",
            color: "linear-gradient(135deg,#1e40af,#4f46e5)",
            order: Date.now() + index,
            ...extra,
          };
          if (key === "documents") {
            DB.add(key, {
              title: base.title,
              category: base.category,
              description: "",
              file: base.file,
              status: "published",
              order: base.order,
            });
          } else if (key === "homepageSlides") {
            DB.add(key, {
              title: base.title,
              image: base.image,
              status: "active",
              order: base.order,
            });
          } else if (key === "facilities") {
            DB.add(key, {
              name: base.name,
              category: "other",
              description: "",
              image: base.image,
              color: base.color,
              features: [],
              order: base.order,
            });
          } else if (key === "houses") {
            DB.add(key, {
              name: base.name,
              gender: "Mixed",
              color: "#2563eb",
              master: "",
              motto: "",
              achievements: "",
              story: "",
              image: base.image,
              gallery: [base.image],
              order: base.order,
            });
          } else {
            DB.add(key, base);
          }
        }
        if (input) input.value = "";
        loadPage(reload);
        toast(`${files.length} item${files.length === 1 ? "" : "s"} uploaded`);
      }
      function selectAll(selectorClass, checked = true) {
        document.querySelectorAll(`.${selectorClass}`).forEach((el) => (el.checked = checked));
      }
      function bulkArrange(key, reload, selectorClass) {
        const ids = Array.from(document.querySelectorAll(`.${selectorClass}:checked`)).map((el) => el.value);
        if (!ids.length) {
          toast("Select at least one item first");
          return;
        }
        const start = Number(prompt("Start order number", "1"));
        if (!Number.isFinite(start)) return;
        const items = DB.getAll(key);
        ids.forEach((id, index) => {
          const item = items.find((x) => x.id === id);
          if (item) item.order = start + index;
        });
        DB._set(key, items);
        loadPage(reload);
        toast("Selected items arranged");
      }
      function bindMediaPreview(value = "") {
        const preview = document.getElementById("mf-preview");
        const input = document.getElementById("mf-image");
        const file = document.getElementById("mf-file");
        const paint = (src) => {
          if (!preview) return;
          preview.innerHTML = src ? mediaMarkup(src) : '<span>No image selected</span>';
          hydrateIcons(preview);
        };
        paint(value);
        input?.addEventListener("input", () => paint(input.value.trim()));
        file?.addEventListener("change", async () => {
          const f = file.files?.[0];
          if (f) paint(await fileToDataURL(f));
        });
      }
      const SUPABASE_CONFIG = {
        url: "https://gkzuzugokctccfadzqwf.supabase.co",
        anonKey:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrenV6dWdva2N0Y2NmYWR6cXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NDE3NTIsImV4cCI6MjA5NTQxNzc1Mn0.NgWjWFNoHMu9NgcgCLXza6FnoaAr5foRAWC990DsLNU",
        adminEmails: ["info@njuasco.edu.gh", "novatech1025@gmail.com"],
      };
      const PORTAL_SESSION_MS = 5 * 60 * 60 * 1000;
      const DB = {
        _remoteSyncReady: false,
        _pendingRemoteWrites: new Map(),
        _remoteInfoSubscribers: [],
        _remoteInfoSubscription: null,
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
        ],
        _get(k) {
          try {
            return JSON.parse(localStorage.getItem("nj_" + k)) || [];
          } catch {
            return [];
          }
        },
        _set(k, v) {
          localStorage.setItem("nj_" + k, JSON.stringify(v));
          if (this._siteContentKeys.includes(k)) {
            this._pushRemoteContent(k, v);
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
        _getLocalFullAdminSession() {
          try {
            const user = JSON.parse(localStorage.getItem("nj_full_admin_session") || "null");
            if (!this.isFullAdminEmail(user?.email)) return null;
            if (!user?.expiresAt || Number(user.expiresAt) <= Date.now()) {
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
            expiresAt: now + PORTAL_SESSION_MS,
          };
          localStorage.setItem("nj_full_admin_session", JSON.stringify(user));
          this.savePortalSession("admin", email);
          return user;
        },
        savePortalSession(role, email) {
          localStorage.setItem(
            `nj_portal_${role}`,
            JSON.stringify({
              email: this._email(email),
              expiresAt: Date.now() + PORTAL_SESSION_MS,
            }),
          );
        },
        getPortalSession(role) {
          try {
            const key = `nj_portal_${role}`;
            const data = JSON.parse(localStorage.getItem(key) || "null");
            if (!data?.email || !data?.expiresAt || Number(data.expiresAt) <= Date.now()) {
              localStorage.removeItem(key);
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
            script.onload = () => (window.supabase ? createClient() : reject(new Error("Supabase SDK failed to load.")));
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
        async signOut() {
          this._clearLocalFullAdminSession();
          try {
            const client = await this._ensureSupabase();
            await client.auth.signOut();
          } catch {}
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
          if (user && this.isFullAdminEmail(user?.email)) {
            const portal = this.getPortalSession("admin");
            if (!portal || portal.email !== this._email(user.email)) {
              await this.signOut?.();
              return null;
            }
            return user;
          }
          return null;
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
          const merged = Array.from(byRef.values()).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
          localStorage.setItem("nj_applications", JSON.stringify(merged));
          this._notifyRemoteContentSubscribers("applications", merged);
          return merged;
        },
        async fetchRemoteApplications() {
          try {
            const client = await this._ensureSupabase();
            const { data: rows, error } = await client.from("admission_applications").select("*").order("created_at", { ascending: false });
            if (error) throw error;
            if (!rows?.length) return [];
            const ids = rows.map((row) => row.id);
            const { data: docRows } = await client.from("admission_documents").select("*").in("application_id", ids);
            const docsByApp = new Map();
            for (const doc of docRows || []) {
              let url = "";
              if (doc.storage_path) {
                const { data: signed } = await client.storage.from("admission-documents").createSignedUrl(doc.storage_path, 60 * 10);
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
        _notifyRemoteInfoSubscribers(info) {
          this._remoteInfoSubscribers.forEach((cb) => {
            try {
              cb(info);
            } catch (e) {}
          });
        },
        _notifyRemoteContentSubscribers(key, value) {
          this._remoteContentSubscribers.forEach((cb) => {
            try {
              cb(key, value);
            } catch (e) {}
          });
        },
        async fetchRemoteInfo() {
          try {
            const client = await this._ensureSupabase();
            const { data, error } = await client.from("site_settings").select("value").eq("key", "site_info").maybeSingle();
            if (error) throw error;
            return data?.value || null;
          } catch {
            return null;
          }
        },
        async saveRemoteInfo(info) {
          try {
            const client = await this._ensureSupabase();
            const { error } = await client.from("site_settings").upsert({ key: "site_info", value: info }, { onConflict: "key" });
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
            if (Object.keys(local).length) await this.saveRemoteInfo(local);
          }
          return null;
        },
        async subscribeRemoteInfo(callback) {
          if (typeof callback === "function") this._remoteInfoSubscribers.push(callback);
          if (this._remoteInfoSubscription) return this._remoteInfoSubscription;
          try {
            const client = await this._ensureSupabase();
            this._remoteInfoSubscription = client
              .channel("site_settings_changes")
              .on("postgres_changes", { event: "*", schema: "public", table: "site_settings", filter: "key=eq.site_info" }, (payload) => {
                const remoteInfo = payload?.new?.value;
                if (remoteInfo && typeof remoteInfo === "object") {
                  localStorage.setItem("nj_info", JSON.stringify(remoteInfo));
                  this._notifyRemoteInfoSubscribers(remoteInfo);
                }
              })
              .subscribe();
            return this._remoteInfoSubscription;
          } catch {
            return null;
          }
        },
        async fetchRemoteContent() {
          try {
            const client = await this._ensureSupabase();
            const { data, error } = await client.from("site_content").select("key,value").in("key", this._siteContentKeys);
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
            const { error } = await client.from("site_content").upsert({ key, value }, { onConflict: "key" });
            if (error) throw error;
            return true;
          } catch {
            return false;
          }
        },
        async syncRemoteContent() {
          const rows = await this.fetchRemoteContent();
          if (!Array.isArray(rows)) {
            this._remoteSyncReady = true;
            return false;
          }
          if (rows.length) {
            rows.forEach((row) => {
              if (this._siteContentKeys.includes(row.key) && Array.isArray(row.value)) {
                localStorage.setItem("nj_" + row.key, JSON.stringify(row.value));
                this._notifyRemoteContentSubscribers(row.key, row.value);
              }
            });
          } else if (await this.isSupabaseAuthenticated()) {
            await Promise.all(this._siteContentKeys.map((key) => this.saveRemoteContent(key, this._get(key))));
          }
          this._remoteSyncReady = true;
          await this._flushPendingRemoteWrites();
          return true;
        },
        async syncRemoteAll() {
          const [info, contentChanged, applicationsChanged] = await Promise.all([this.syncRemoteInfo(), this.syncRemoteContent(), this.syncRemoteApplications()]);
          await Promise.all([this.subscribeRemoteInfo(() => {}), this.subscribeRemoteContent(() => {})]);
          await this._flushPendingRemoteWrites();
          return { info, contentChanged, applicationsChanged };
        },
        async subscribeRemoteContent(callback) {
          if (typeof callback === "function") this._remoteContentSubscribers.push(callback);
          if (this._remoteContentSubscription) return this._remoteContentSubscription;
          try {
            const client = await this._ensureSupabase();
            this._remoteContentSubscription = client
              .channel("site_content_changes")
              .on("postgres_changes", { event: "*", schema: "public", table: "site_content" }, (payload) => {
                const key = payload?.new?.key;
                const value = payload?.new?.value;
                if (this._siteContentKeys.includes(key) && Array.isArray(value)) {
                  localStorage.setItem("nj_" + key, JSON.stringify(value));
                  this._notifyRemoteContentSubscribers(key, value);
                }
              })
              .subscribe();
            return this._remoteContentSubscription;
          } catch {
            return null;
          }
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
      };
      DB.syncRemoteAll().catch(() => {
        DB._remoteSyncReady = true;
      });
      DB.migrateEmojiIcons = function () {
        const isImg = (src) =>
          /^(data:image\/|https?:\/\/|\.?\/|[\w .-]+\.(png|jpe?g|webp|gif|svg)(\?.*)?$)/i.test(
            String(src || ""),
          );
        const broken = (src) => /[\uFFFD]|â|Â|ðŸ|ï¸|\?{2,}/.test(String(src || ""));
        const icon = (name) =>
          `<span class="ico ico-${name}" data-ico="${name}" aria-hidden="true"></span>`;
        const icons = {
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
        Object.entries(icons).forEach(([collection, values]) => {
          const items = this.getAll(collection);
          let changed = false;
          items.forEach((item) => {
            if (values[item.id] && !isImg(item.image) && (!item.image || broken(item.image))) {
              item.image = values[item.id];
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
      DB.migrateEmojiIcons();
