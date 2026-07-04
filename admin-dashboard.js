// ═══════════════════════════════════════════════════════
      //  NJUASCO ADMIN DASHBOARD - Full JavaScript
      // ═══════════════════════════════════════════════════════

      // ── HELPERS ──────────────────────────────────────────────
      function esc(s) {
        return String(s || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
      }
      function fmtDate(d) {
        try {
          return new Date(d).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
        } catch {
          return d || "";
        }
      }
      function itemLabel(value) {
        const text = String(value || "").trim();
        return text || "Untitled question";
      }
      let toastTimer;
      function toast(msg, type = "") {
        const t = document.getElementById("toast");
        t.innerHTML = msg;
        hydrateIcons(t);
        t.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
      }

      function showDashboardPasswordModal(email) {
        const overlay = document.getElementById("dashboard-password-ov");
        const input = document.getElementById("dashboard-password-input");
        const msg = document.getElementById("dashboard-password-msg");
        const error = document.getElementById("dashboard-password-error");
        if (!overlay || !input || !msg || !error) {
          return Promise.reject(
            new Error("Password verification modal is unavailable.")
          );
        }
        msg.textContent = `Enter your admin password for ${email} to continue.`;
        msg.style.color = "var(--g500)";
        error.textContent = "";
        input.value = "";
        overlay.style.display = "flex";
        input.focus();

        return new Promise((resolve, reject) => {
          const cleanup = () => {
            input.removeEventListener("keydown", onKeyDown);
            overlay.removeEventListener("click", onOverlayClick);
            document.removeEventListener("keydown", onDocKeyDown);
          };
          const close = (result, shouldReject = false) => {
            cleanup();
            overlay.style.display = "none";
            if (shouldReject) reject(result);
            else resolve(result);
          };
          const submit = () => {
            const value = input.value.trim();
            if (!value) {
              error.textContent = "Please enter your admin password.";
              return;
            }
            close(value);
          };
          const onKeyDown = (event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          };
          const onOverlayClick = (event) => {
            if (event.target === overlay) close("", true);
          };
          const onDocKeyDown = (event) => {
            if (event.key === "Escape") close("", true);
          };
          document.getElementById("dashboard-password-cancel")?.addEventListener("click", () => close("", true), { once: true });
          document.getElementById("dashboard-password-submit")?.addEventListener("click", submit, { once: true });
          input.addEventListener("keydown", onKeyDown);
          overlay.addEventListener("click", onOverlayClick);
          document.addEventListener("keydown", onDocKeyDown);
        });
      }

      // ── PAGE ROUTING ──────────────────────────────────────────
      const TITLES = {
        dashboard: "Dashboard",
        "school-info": "School Information",
        "about-page": "About Page",
        "ai-knowledge": "AI Knowledge",
        "news-mgr": "News & Events",
        "team-mgr": "Team Members",
        "departments-mgr": "Departments",
        "gallery-mgr": "Gallery",
        "docs-mgr": "Documents",
        "slides-mgr": "Homepage Slides",
        "facilities-mgr": "Facilities",
        "houses-mgr": "Houses",
        "clubs-mgr": "Clubs",
        "students-mgr": "Students",
        "teachers-mgr": "Teachers",
        "admissions-mgr": "Applications",
        "donations-mgr": "Donations",
        "merch-mgr": "Merchandise",
        "orders-mgr": "Shop Orders",
        "messages-mgr": "Website Messages",
        "notif-mgr": "Notifications",
        "logs-mgr": "Activity Logs",
        "settings-mgr": "Settings",
        "subadmins-mgr": "Sub-Admin Management",
      };

      let currentPageId = "dashboard";

      function refreshAdminPage() {
        DB.runLocalMigrations?.();
        loadPage(currentPageId);
        loadSchoolInfo();
        hydrateIcons(document);
      }
      let adminRefreshTimer = null;
      function scheduleAdminRefresh() {
        clearTimeout(adminRefreshTimer);
        adminRefreshTimer = setTimeout(refreshAdminPage, 150);
      }

      function showPage(id, el) {
        currentPageId = id;
        document
          .querySelectorAll(".apage")
          .forEach((p) => p.classList.remove("active"));
        const pg = document.getElementById("pg-" + id);
        if (pg) pg.classList.add("active");
        if (el) {
          document
            .querySelectorAll(".sb-item")
            .forEach((i) => i.classList.remove("active"));
          el.classList.add("active");
        }
        document.getElementById("page-title").textContent = TITLES[id] || id;
        csbmob();
        document.querySelector(".content")?.scrollTo({ top: 0, behavior: "smooth" });
        loadPage(id);
      }

      function loadPage(id) {
        if (id === "dashboard") renderDashboard();
        else if (id === "school-info") loadSchoolInfo();
        else if (id === "about-page") loadAboutPage();
        else if (id === "ai-knowledge") loadAIKnowledge();
        else if (id === "news-mgr") renderNews();
        else if (id === "team-mgr") renderTeam();
        else if (id === "departments-mgr") renderDepartments();
        else if (id === "gallery-mgr") renderGallery();
        else if (id === "docs-mgr") renderDocs();
        else if (id === "slides-mgr") renderSlides();
        else if (id === "facilities-mgr") renderFacilities();
        else if (id === "houses-mgr") renderHouses();
        else if (id === "clubs-mgr") renderClubs();
        else if (id === "students-mgr") renderStudents();
        else if (id === "teachers-mgr") renderTeachers();
        else if (id === "admissions-mgr") renderApplications();
        else if (id === "donations-mgr") renderDonations();
        else if (id === "merch-mgr") renderMerch();
        else if (id === "orders-mgr") renderOrders();
        else if (id === "messages-mgr") renderMessages();
        else if (id === "notif-mgr") renderNotifs();
        else if (id === "logs-mgr") renderLogs();
        else if (id === "settings-mgr") loadSettings();
        else if (id === "subadmins-mgr") renderSubAdmins();
        hydrateIcons(document);
      }

      // ── SIDEBAR MOBILE ────────────────────────────────────────
      function osbmob() {
        document.getElementById("sidebar").classList.add("open");
        document.getElementById("sb-ov").classList.add("open");
        document.querySelector(".content")?.classList.add("scroll-lock");
      }
      function csbmob() {
        document.getElementById("sidebar").classList.remove("open");
        document.getElementById("sb-ov").classList.remove("open");
        document.querySelector(".content")?.classList.remove("scroll-lock");
      }

      // ── MODAL ─────────────────────────────────────────────────
      let _editId = null,
        _editKey = null;
      function openModal(type, id) {
        _editId = id || null;
        _editKey = type;
        const item = id
          ? type === "subadmin"
            ? DB._getSaAdmins().find((a) => a.id === id) || null
            : DB.getById(
                type === "news"
                  ? "news"
                  : type === "team"
                    ? "team"
                    : type === "department"
                      ? "departments"
                    : type === "gallery"
                      ? "gallery"
                      : type === "doc"
                        ? "documents"
                        : type === "slide"
                          ? "homepageSlides"
                          : type === "facility"
                        ? "facilities"
                        : type === "house"
                          ? "houses"
                          : type === "club"
                            ? "clubs"
                            : type === "student"
                              ? "students"
                              : type === "teacher"
                                ? "teachers"
                                : type === "donation"
                                  ? "donations"
                                  : type === "merch"
                                    ? "merchandise"
                                    : type === "notif"
                                      ? "notifications"
                                      : type,
                id,
              )
          : null;
        const title =
          (id ? "Edit " : "Add ") +
          ({
            news: "News Post",
            team: "Team Member",
            department: "Department",
            gallery: "Gallery Photo",
            doc: "Document",
            slide: "Homepage Slide",
            facility: "Facility",
            house: "House",
            club: "Club",
            student: "Student",
            teacher: "Teacher",
            donation: "Donation",
            merch: "Product",
            notif: "Notification",
            subadmin: "Sub-Admin",
          }[type] || type);
        document.getElementById("modal-title").textContent = title;
        const body = document.getElementById("modal-body");
        const footer = document.getElementById("modal-footer");
        body.innerHTML = getModalForm(type, item);
        bindMediaPreview(item?.image || "");
        footer.innerHTML = `<button class="btn btn-g" onclick="cmodal()">Cancel</button><button class="btn btn-p" onclick="saveModal('${type}')">${id ? "Save Changes" : "Add Now"}</button>`;
        document.getElementById("modal-ov").classList.add("open");
        hydrateIcons(body);
        bindColorPickers(body);
      }
      function cmodal() {
        document.getElementById("modal-ov").classList.remove("open");
        _editId = null;
        _editKey = null;
      }
      document.getElementById("modal-ov").addEventListener("click", (e) => {
        if (e.target === document.getElementById("modal-ov")) cmodal();
      });

      function getModalForm(type, d) {
        const v = (f, def = "") => esc(d?.[f] ?? def);
        const mediaField = (label, def) => `
    <div class="fg media-field">
      <label class="flbl">${label}</label>
      <div class="media-preview" id="mf-preview"></div>
      <input class="finp" id="mf-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/*">
      <input class="finp" id="mf-image" value="${v("image", def)}" placeholder="Optional emoji or image URL">
    </div>`;
        if (type === "news")
          return `<div style="display:flex;flex-direction:column;gap:14px">
    <div class="fg"><label class="flbl">Title</label><input class="finp" id="mf-title" value="${v("title")}" placeholder="Post title"></div>
    <div class="fg"><label class="flbl">Category</label><select class="finp" id="mf-cat"><option value="news" ${d?.category === "news" ? "selected" : ""}>News</option><option value="event" ${d?.category === "event" ? "selected" : ""}>Event</option><option value="achievement" ${d?.category === "achievement" ? "selected" : ""}>Achievement</option><option value="announcement" ${d?.category === "announcement" ? "selected" : ""}>Announcement</option></select></div>
    <div class="fg"><label class="flbl">Date</label><input class="finp" id="mf-date" type="date" value="${v("date", new Date().toISOString().split("T")[0])}"></div>
    <div class="fg"><label class="flbl">Excerpt (short summary)</label><input class="finp" id="mf-excerpt" value="${v("excerpt")}" placeholder="Short description for cards"></div>
    <div class="fg"><label class="flbl">Full Content</label><textarea class="finp fta" id="mf-content" placeholder="Full article content…">${v("content")}</textarea></div>
    ${mediaField("Image Upload / Icon", '<span class="ico ico-news" data-ico="news" aria-hidden="true"></span>')}
    <div class="fg"><label class="flbl">Status</label><select class="finp" id="mf-status"><option value="published" ${d?.status === "published" ? "selected" : ""}>Published</option><option value="draft" ${d?.status === "draft" ? "selected" : ""}>Draft</option></select></div>
  </div>`;
        if (type === "team")
          return `<div style="display:flex;flex-direction:column;gap:14px">
    <div class="fg"><label class="flbl">Full Name</label><input class="finp" id="mf-name" value="${v("name")}" placeholder="Staff full name"></div>
    <div class="fg"><label class="flbl">Position</label><input class="finp" id="mf-position" value="${v("position")}" placeholder="e.g. Head of Department"></div>
    <div class="fg"><label class="flbl">Department</label><input class="finp" id="mf-department" value="${v("department")}" placeholder="e.g. Science"></div>
    <div class="fg"><label class="flbl">Email</label><input class="finp" id="mf-email" type="email" value="${v("email")}" placeholder="staff@njuasco.edu.gh"></div>
    <div class="fg"><label class="flbl">Bio</label><textarea class="finp fta" id="mf-bio" placeholder="Brief biography…">${v("bio")}</textarea></div>
    ${mediaField("Photo Upload / Icon", '<span class="ico ico-user" data-ico="user" aria-hidden="true"></span>')}
  </div>`;
        if (type === "department")
          return `<div style="display:flex;flex-direction:column;gap:14px">
    <div class="fg"><label class="flbl">Department Name</label><input class="finp" id="mf-name" value="${v("name")}" placeholder="e.g. Science Department"></div>
    <div class="fg"><label class="flbl">Description</label><textarea class="finp fta" id="mf-desc" placeholder="Short department description">${v("description")}</textarea></div>
    <div class="fg"><label class="flbl">Subjects / Tags (comma-separated)</label><input class="finp" id="mf-tags" value="${esc((d?.tags || []).join(", "))}" placeholder="Biology, Chemistry, Physics"></div>
    ${mediaField("Icon / Image", '<span class="ico ico-book" data-ico="book" aria-hidden="true"></span>')}
    ${colorPickerField("mf-color", d?.color || "linear-gradient(135deg,#2563eb,#4f46e5)", { mode: "gradient", label: "Department Colour" })}
    <div class="fg"><label class="flbl">Display Order</label><input class="finp" id="mf-order" type="number" value="${v("order", "1")}" placeholder="1"></div>
  </div>`;
        if (type === "gallery")
          return `<div style="display:flex;flex-direction:column;gap:14px">
    <div class="fg"><label class="flbl">Title</label><input class="finp" id="mf-title" value="${v("title")}" placeholder="Photo title"></div>
    <div class="fg"><label class="flbl">Category</label><select class="finp" id="mf-cat"><option value="events" ${d?.category === "events" ? "selected" : ""}>Events</option><option value="facilities" ${d?.category === "facilities" ? "selected" : ""}>Facilities</option><option value="activities" ${d?.category === "activities" ? "selected" : ""}>Activities</option><option value="achievements" ${d?.category === "achievements" ? "selected" : ""}>Achievements</option><option value="campus" ${d?.category === "campus" ? "selected" : ""}>Campus</option></select></div>
    ${mediaField("Image Upload / Icon", '<span class="ico ico-image" data-ico="image" aria-hidden="true"></span>')}
    <div class="fg"><label class="flbl">Description</label><input class="finp" id="mf-desc" value="${v("description")}" placeholder="Brief description"></div>
    ${colorPickerField("mf-color", d?.color || "linear-gradient(135deg,#1e40af,#4f46e5)", { mode: "gradient", label: "Background Colour" })}
  </div>`;
        if (type === "doc")
          return `<div style="display:flex;flex-direction:column;gap:14px">
    <div class="fg"><label class="flbl">Document Title</label><input class="finp" id="mf-title" value="${v("title")}" placeholder="e.g. School Prospectus"></div>
    <div class="fg"><label class="flbl">Category</label><input class="finp" id="mf-cat" value="${v("category", "General")}" placeholder="Admissions, Academics, Students"></div>
    <div class="fg"><label class="flbl">Description</label><textarea class="finp fta" id="mf-desc" placeholder="Short description">${v("description")}</textarea></div>
    <div class="fg"><label class="flbl">Upload File</label><input class="finp" id="mf-doc-file" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,image/*"></div>
    <div class="fg"><label class="flbl">File / Link URL</label><input class="finp" id="mf-file-url" value="${v("file", "#")}" placeholder="https://... or uploaded file"></div>
    <div class="fg"><label class="flbl">Order</label><input class="finp" id="mf-order" type="number" value="${v("order", "1")}" placeholder="1"></div>
    <div class="fg"><label class="flbl">Status</label><select class="finp" id="mf-status"><option value="published" ${d?.status !== "draft" ? "selected" : ""}>Published</option><option value="draft" ${d?.status === "draft" ? "selected" : ""}>Draft</option></select></div>
  </div>`;
        if (type === "slide")
          return `<div style="display:flex;flex-direction:column;gap:14px">
    <div class="fg"><label class="flbl">Slide Title</label><input class="finp" id="mf-title" value="${v("title")}" placeholder="e.g. Campus Front View"></div>
    ${mediaField("Slide Image Upload", "njb.jpg")}
    <div class="fg"><label class="flbl">Overlay Text (Optional)</label><input class="finp" id="mf-overlay-text" value="${v("overlayText", "")}" placeholder="Text to display over image"></div>
    <div class="fg" style="display:flex;gap:8px;align-items:center"><label class="flbl" style="margin:0;flex:1">Show Text Overlay</label><input type="checkbox" id="mf-show-text" ${v("showText") ? "checked" : ""} style="width:18px;height:18px;cursor:pointer"></div>
    <div class="fg"><label class="flbl">Order</label><input class="finp" id="mf-order" type="number" value="${v("order", "1")}" placeholder="1"></div>
    <div class="fg"><label class="flbl">Status</label><select class="finp" id="mf-status"><option value="active" ${d?.status !== "inactive" ? "selected" : ""}>Active</option><option value="inactive" ${d?.status === "inactive" ? "selected" : ""}>Inactive</option></select></div>
  </div>`;
        if (type === "facility")
          return `<div style="display:flex;flex-direction:column;gap:14px">
    <div class="fg"><label class="flbl">Facility Name</label><input class="finp" id="mf-name" value="${v("name")}" placeholder="e.g. Science Laboratory"></div>
    <div class="fg"><label class="flbl">Category</label><select class="finp" id="mf-cat"><option value="library">Library</option><option value="laboratory">Laboratory</option><option value="sports">Sports</option><option value="classroom">Classroom</option><option value="cafeteria">Cafeteria</option><option value="other">Other</option></select></div>
    <div class="fg"><label class="flbl">Description</label><textarea class="finp fta" id="mf-desc" placeholder="Full description…">${v("description")}</textarea></div>
    ${mediaField("Image Upload / Icon", '<span class="ico ico-landmark" data-ico="landmark" aria-hidden="true"></span>')}
    <div class="fg"><label class="flbl">Features (comma-separated)</label><input class="finp" id="mf-features" value="${esc((d?.features || []).join(", "))}" placeholder="Feature 1, Feature 2, Feature 3"></div>
  </div>`;
        if (type === "house")
          return `<div style="display:flex;flex-direction:column;gap:14px">
    <div class="fg"><label class="flbl">House Name</label><input class="finp" id="mf-name" value="${v("name")}" placeholder="e.g. Red House"></div>
    <div class="fg"><label class="flbl">Gender</label><select class="finp" id="mf-gender"><option ${d?.gender === "Boys" ? "selected" : ""}>Boys</option><option ${d?.gender === "Girls" ? "selected" : ""}>Girls</option><option ${d?.gender === "Mixed" ? "selected" : ""}>Mixed</option></select></div>
    ${colorPickerField("mf-color", d?.color || "#ef4444", { label: "House Colour" })}
    ${mediaField("House Cover Image", '<span class="ico ico-home" data-ico="home" aria-hidden="true"></span>')}
    <div class="fg"><label class="flbl">House Master</label><input class="finp" id="mf-master" value="${v("master")}" placeholder="Mr./Mrs. Name"></div>
    <div class="fg"><label class="flbl">Assistant House Master</label><input class="finp" id="mf-assistantMaster" value="${v("assistantMaster")}" placeholder="Mr./Mrs. Name"></div>
    <div class="fg"><label class="flbl">Motto</label><input class="finp" id="mf-motto" value="${v("motto")}" placeholder="House motto"></div>
    <div class="fg"><label class="flbl">House Story</label><textarea class="finp fta" id="mf-story" placeholder="History, story, and important details">${v("story")}</textarea></div>
    <div class="fg"><label class="flbl">Add House Gallery Images</label><input class="finp" id="mf-gallery-files" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/*" multiple></div>
    <div class="fg"><label class="flbl">Achievements</label><textarea class="finp fta" id="mf-achievements" placeholder="List achievements…">${v("achievements")}</textarea></div>
  </div>`;
        if (type === "club")
          return `<div style="display:flex;flex-direction:column;gap:14px">
    <div class="fg"><label class="flbl">Club Name</label><input class="finp" id="mf-name" value="${v("name")}" placeholder="e.g. Science Club"></div>
    <div class="fg"><label class="flbl">Category</label><select class="finp" id="mf-cat"><option value="STEM" ${d?.category === "STEM" ? "selected" : ""}>STEM</option><option value="Arts" ${d?.category === "Arts" ? "selected" : ""}>Arts</option><option value="Academic" ${d?.category === "Academic" ? "selected" : ""}>Academic</option><option value="Social" ${d?.category === "Social" ? "selected" : ""}>Social</option><option value="Sports" ${d?.category === "Sports" ? "selected" : ""}>Sports</option></select></div>
    <div class="fg"><label class="flbl">Coordinator</label><input class="finp" id="mf-coordinator" value="${v("coordinator")}" placeholder="Teacher name"></div>
    <div class="fg"><label class="flbl">Meeting Days</label><input class="finp" id="mf-meetingDays" value="${v("meetingDays")}" placeholder="e.g. Thursdays, 3:00 PM"></div>
    ${mediaField("Image Upload / Icon", '<span class="ico ico-masks" data-ico="masks" aria-hidden="true"></span>')}
    <div class="fg"><label class="flbl">Description</label><textarea class="finp fta" id="mf-description" placeholder="Club description…">${v("description")}</textarea></div>
    <div class="fg"><label class="flbl">Achievements</label><input class="finp" id="mf-achievements" value="${v("achievements")}" placeholder="e.g. National champions 2024"></div>
  </div>`;
        if (type === "student")
          return `<div style="display:flex;flex-direction:column;gap:14px">
    <div class="fg"><label class="flbl">Full Name</label><input class="finp" id="mf-name" value="${v("name")}" placeholder="Student's full name"></div>
    <div class="fg"><label class="flbl">Programme</label><select class="finp" id="mf-programme"><option>General Science</option><option>General Arts</option><option>Business</option><option>Home Economics</option><option>Visual Arts</option><option>Agriculture</option><option>Languages</option></select></div>
    <div class="fg"><label class="flbl">Year</label><select class="finp" id="mf-year"><option>Year 1</option><option>Year 2</option><option>Year 3</option></select></div>
    <div class="fg"><label class="flbl">Class</label><input class="finp" id="mf-class" value="${v("class")}" placeholder="e.g. SCI-1A"></div>
    <div class="fg"><label class="flbl">Guardian Phone</label><input class="finp" id="mf-guardianPhone" type="tel" value="${v("guardianPhone")}" placeholder="+233 XX XXX XXXX"></div>
    <div class="fg"><label class="flbl">Status</label><select class="finp" id="mf-status"><option value="active" ${d?.status === "active" ? "selected" : ""}>Active</option><option value="suspended" ${d?.status === "suspended" ? "selected" : ""}>Suspended</option><option value="graduated" ${d?.status === "graduated" ? "selected" : ""}>Graduated</option></select></div>
  </div>`;
        if (type === "teacher")
          return `<div style="display:flex;flex-direction:column;gap:14px">
    <div class="fg"><label class="flbl">Full Name</label><input class="finp" id="mf-name" value="${v("name")}" placeholder="Teacher's full name"></div>
    <div class="fg"><label class="flbl">Subject</label><input class="finp" id="mf-subject" value="${v("subject")}" placeholder="e.g. Biology/Science"></div>
    <div class="fg"><label class="flbl">Department</label><input class="finp" id="mf-department" value="${v("department")}" placeholder="e.g. Science"></div>
    <div class="fg"><label class="flbl">Email</label><input class="finp" id="mf-email" type="email" value="${v("email")}" placeholder="teacher@njuasco.edu.gh"></div>
    <div class="fg"><label class="flbl">Phone</label><input class="finp" id="mf-phone" type="tel" value="${v("phone")}" placeholder="+233 XX XXX XXXX"></div>
    <div class="fg"><label class="flbl">Status</label><select class="finp" id="mf-status"><option value="active" ${d?.status === "active" ? "selected" : ""}>Active</option><option value="inactive" ${d?.status === "inactive" ? "selected" : ""}>Inactive</option></select></div>
  </div>`;
        if (type === "donation")
          return `<div style="display:flex;flex-direction:column;gap:14px">
    <div class="fg"><label class="flbl">Donor Name</label><input class="finp" id="mf-donor" value="${v("donor")}" placeholder="Full name or organization"></div>
    <div class="fg"><label class="flbl">Amount (GHS)</label><input class="finp" id="mf-amount" type="number" value="${v("amount")}" placeholder="Amount in GHS"></div>
    <div class="fg"><label class="flbl">Purpose</label><select class="finp" id="mf-purpose"><option>Scholarships</option><option>Infrastructure</option><option>Lab Equipment</option><option>Sports</option><option>General Fund</option></select></div>
    <div class="fg"><label class="flbl">Payment Method</label><select class="finp" id="mf-method"><option>Mobile Money</option><option>Bank Transfer</option><option>Cash</option><option>Cheque</option></select></div>
    <div class="fg"><label class="flbl">Reference Number</label><input class="finp" id="mf-reference" value="${v("reference")}" placeholder="e.g. MM-2025-001"></div>
    <div class="fg"><label class="flbl">Status</label><select class="finp" id="mf-status"><option value="completed" ${d?.status === "completed" ? "selected" : ""}>Completed</option><option value="pending" ${d?.status === "pending" ? "selected" : ""}>Pending</option></select></div>
  </div>`;
        if (type === "merch")
          return `<div style="display:flex;flex-direction:column;gap:14px">
    <div class="fg"><label class="flbl">Product Name</label><input class="finp" id="mf-name" value="${v("name")}" placeholder="e.g. NJUASCO Polo Shirt"></div>
    <div class="fg"><label class="flbl">Price (GHS)</label><input class="finp" id="mf-price" type="number" value="${v("price")}" placeholder="Price in GHS"></div>
    <div class="fg"><label class="flbl">Category</label><select class="finp" id="mf-cat"><option ${d?.category === "Clothing" ? "selected" : ""}>Clothing</option><option ${d?.category === "Accessories" ? "selected" : ""}>Accessories</option><option ${d?.category === "Stationery" ? "selected" : ""}>Stationery</option><option ${d?.category === "Other" ? "selected" : ""}>Other</option></select></div>
    ${mediaField("Image Upload / Icon", '<span class="ico ico-shop" data-ico="shop" aria-hidden="true"></span>')}
    <div class="fg"><label class="flbl">Description</label><textarea class="finp fta" id="mf-description" placeholder="Product description…">${v("description")}</textarea></div>
    <div class="fg"><label class="flbl">Stock Status</label><select class="finp" id="mf-stock"><option value="true" ${d?.stock ? "selected" : ""}>In Stock</option><option value="false" ${!d || !d.stock ? "selected" : ""}>Out of Stock</option></select></div>
  </div>`;
        if (type === "notif")
          return `<div style="display:flex;flex-direction:column;gap:14px">
    <div class="fg"><label class="flbl">Title</label><input class="finp" id="mf-title" value="${v("title")}" placeholder="Notification title"></div>
    <div class="fg"><label class="flbl">Message</label><textarea class="finp fta" id="mf-message" placeholder="Notification message…">${v("message")}</textarea></div>
    <div class="fg"><label class="flbl">Audience</label><select class="finp" id="mf-audience"><option ${d?.audience === "All Users" ? "selected" : ""}>All Users</option><option ${d?.audience === "All Students" ? "selected" : ""}>All Students</option><option ${d?.audience === "Year 1 Students" ? "selected" : ""}>Year 1 Students</option><option ${d?.audience === "Year 2 Students" ? "selected" : ""}>Year 2 Students</option><option ${d?.audience === "Year 3 Students" ? "selected" : ""}>Year 3 Students</option><option ${d?.audience === "All Teachers" ? "selected" : ""}>All Teachers</option><option ${d?.audience === "Parents" ? "selected" : ""}>Parents</option><option ${d?.audience === "Alumni" ? "selected" : ""}>Alumni</option></select></div>
    <div class="fg"><label class="flbl">Priority</label><select class="finp" id="mf-priority"><option value="normal" ${d?.priority === "normal" ? "selected" : ""}>Normal</option><option value="high" ${d?.priority === "high" ? "selected" : ""}>High</option><option value="urgent" ${d?.priority === "urgent" ? "selected" : ""}>Urgent</option></select></div>
  </div>`;
        if (type === "subadmin") {
          const allPerms = {
            school:
              '<span class="ico ico-landmark" data-ico="landmark" aria-hidden="true"></span> School Info',
            team:
              '<span class="ico ico-user" data-ico="user" aria-hidden="true"></span> Leadership',
            facilities:
              '<span class="ico ico-landmark" data-ico="landmark" aria-hidden="true"></span> Facilities',
            houses:
              '<span class="ico ico-home" data-ico="home" aria-hidden="true"></span> Houses',
            clubs:
              '<span class="ico ico-masks" data-ico="masks" aria-hidden="true"></span> Clubs',
            teachers:
              '<span class="ico ico-user" data-ico="user" aria-hidden="true"></span> Teachers',
            news: '<span class="ico ico-news" data-ico="news" aria-hidden="true"></span> News & Events',
            gallery:
              '<span class="ico ico-image" data-ico="image" aria-hidden="true"></span> Gallery',
            documents:
              '<span class="ico ico-book" data-ico="book" aria-hidden="true"></span> Documents',
            slides:
              '<span class="ico ico-image" data-ico="image" aria-hidden="true"></span> Homepage Slides',
            notifications:
              '<span class="ico ico-bell" data-ico="bell" aria-hidden="true"></span> Notifications',
            applications: "📝 Applications",
            students:
              '<span class="ico ico-cap" data-ico="cap" aria-hidden="true"></span> Students',
            merchandise:
              '<span class="ico ico-shop" data-ico="shop" aria-hidden="true"></span> Merchandise',
            orders:
              '<span class="ico ico-cart" data-ico="cart" aria-hidden="true"></span> Orders',
          };
          const existingPerms = d?.permissions || [];
          return `<div style="display:flex;flex-direction:column;gap:16px">
      <div><label class="flbl">Full Name</label><input class="finp" id="mf-name" value="${v("name")}" placeholder="Staff full name"></div>
      <div><label class="flbl">Supabase Auth Email</label><input class="finp" id="mf-email" type="email" value="${v("email")}" placeholder="staff@njuasco.edu.gh" autocomplete="email"></div>
      <div><label class="flbl">Username / Short Label</label><input class="finp" id="mf-username" value="${v("username")}" placeholder="e.g. newseditor"></div>
      <div style="font-size:12px;color:var(--g500);line-height:1.55;background:var(--g50);border:1px solid var(--g100);border-radius:var(--r);padding:10px 12px">Add the staff email only. On first login they will set their own password, and you will see it here in Sub-Admin Management.</div>
      <div><label class="flbl">Role / Title</label><input class="finp" id="mf-role" value="${v("role")}" placeholder="e.g. News Editor"></div>
      <div><label class="flbl">Account Status</label><select class="finp" id="mf-active"><option value="true" ${d?.active !== false ? "selected" : ""}>Active - can log in</option><option value="false" ${d?.active === false ? "selected" : ""}>Disabled - access blocked</option></select></div>
      <div>
        <label class="flbl">Permissions (select all that apply)</label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
          ${Object.entries(allPerms)
            .map(
              ([k, lbl]) =>
                `<label style="display:flex;align-items:center;gap:8px;padding:10px;background:var(--g50);border-radius:var(--r);cursor:pointer"><input type="checkbox" id="perm-${k}" value="${k}" ${existingPerms.includes(k) ? "checked" : ""} style="accent-color:var(--b6);width:16px;height:16px"><span style="font-size:13px">${lbl}</span></label>`,
            )
            .join("")}
        </div>
      </div>
    </div>`;
        }
        return `<p style="color:var(--g500)">Form coming soon.</p>`;
      }

      function gv(id) {
        const el = document.getElementById(id);
        return el ? el.value.trim() : "";
      }

      async function saveModal(type) {
        const id = _editId;
        let data = {};
        if (type === "news") {
          data = {
            title: gv("mf-title"),
            category: gv("mf-cat"),
            date: gv("mf-date"),
            excerpt: gv("mf-excerpt"),
            content: gv("mf-content"),
            image:
              (await mediaValue()) ||
              '<span class="ico ico-news" data-ico="news" aria-hidden="true"></span>',
            status: gv("mf-status"),
            color: "linear-gradient(135deg,#1e40af,#4f46e5)",
          };
          if (!data.title) {
            toast("Title is required");
            return;
          }
        } else if (type === "team") {
          const existing = id ? DB.getById("team", id) : null;
          data = {
            name: gv("mf-name"),
            position: gv("mf-position"),
            department: gv("mf-department"),
            email: gv("mf-email"),
            bio: gv("mf-bio"),
            image:
              (await mediaValue()) ||
              '<span class="ico ico-user" data-ico="user" aria-hidden="true"></span>',
            color: "linear-gradient(135deg,#2563eb,#4338ca)",
            order: existing?.order || Date.now(),
          };
          if (!data.name) {
            toast("Name is required");
            return;
          }
        } else if (type === "department") {
          const existing = id ? DB.getById("departments", id) : null;
          data = {
            name: gv("mf-name"),
            description: gv("mf-desc"),
            tags: gv("mf-tags")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            image:
              (await mediaValue()) ||
              '<span class="ico ico-book" data-ico="book" aria-hidden="true"></span>',
            color: gv("mf-color") || "linear-gradient(135deg,#2563eb,#4f46e5)",
            order: parseInt(gv("mf-order"), 10) || existing?.order || Date.now(),
          };
          if (!data.name) {
            toast("Department name is required");
            return;
          }
        } else if (type === "gallery") {
          data = {
            title: gv("mf-title"),
            category: gv("mf-cat"),
            image:
              (await mediaValue()) ||
              '<span class="ico ico-image" data-ico="image" aria-hidden="true"></span>',
            description: gv("mf-desc"),
            color: gv("mf-color") || "linear-gradient(135deg,#1e40af,#4f46e5)",
          };
          if (!data.title) {
            toast("Title is required");
            return;
          }
        } else if (type === "doc") {
          data = {
            title: gv("mf-title"),
            category: gv("mf-cat") || "General",
            description: gv("mf-desc"),
            file: await docFileValue(),
            order: parseInt(gv("mf-order"), 10) || Date.now(),
            status: gv("mf-status") || "published",
          };
          if (!data.title) {
            toast("Document title is required");
            return;
          }
        } else if (type === "slide") {
          data = {
            title: gv("mf-title"),
            image: (await mediaValue()) || "njb.jpg",
            overlayText: gv("mf-overlay-text") || "",
            showText: document.getElementById("mf-show-text")?.checked || false,
            order: parseInt(gv("mf-order"), 10) || Date.now(),
            status: gv("mf-status") || "active",
          };
          if (!data.title) {
            toast("Slide title is required");
            return;
          }
        } else if (type === "facility") {
          data = {
            name: gv("mf-name"),
            category: gv("mf-cat"),
            description: gv("mf-desc"),
            image:
              (await mediaValue()) ||
              '<span class="ico ico-landmark" data-ico="landmark" aria-hidden="true"></span>',
            color: "linear-gradient(135deg,#1e40af,#4f46e5)",
            features: gv("mf-features")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            order: Date.now(),
          };
          if (!data.name) {
            toast("Name is required");
            return;
          }
        } else if (type === "house") {
          const existingHouse = id ? DB.getById("houses", id) : null;
          const galleryFiles = Array.from(document.getElementById("mf-gallery-files")?.files || []);
          const gallery = Array.isArray(existingHouse?.gallery) ? [...existingHouse.gallery] : [];
          for (const file of galleryFiles) {
            gallery.push(await uploadImageAsset(file, "houses"));
          }
          data = {
            name: gv("mf-name"),
            gender: gv("mf-gender"),
            color: gv("mf-color") || "#ef4444",
            image:
              (await mediaValue("mf-image", "mf-file", "houses")) ||
              existingHouse?.image ||
              '<span class="ico ico-home" data-ico="home" aria-hidden="true"></span>',
            master: gv("mf-master"),
            assistantMaster: gv("mf-assistantMaster"),
            motto: gv("mf-motto"),
            story: gv("mf-story"),
            achievements: gv("mf-achievements"),
            gallery,
            order: existingHouse?.order || Date.now(),
          };
          if (!data.name) {
            toast("House name is required");
            return;
          }
        } else if (type === "club") {
          data = {
            name: gv("mf-name"),
            category: gv("mf-cat"),
            coordinator: gv("mf-coordinator"),
            meetingDays: gv("mf-meetingDays"),
            image:
              (await mediaValue()) ||
              '<span class="ico ico-masks" data-ico="masks" aria-hidden="true"></span>',
            description: gv("mf-description"),
            achievements: gv("mf-achievements"),
            color: "rgba(37,99,235,.1)",
            colorText: "#2563eb",
            order: Date.now(),
          };
          if (!data.name) {
            toast("Name is required");
            return;
          }
        } else if (type === "student") {
          data = {
            name: gv("mf-name"),
            programme: gv("mf-programme"),
            year: gv("mf-year"),
            class: gv("mf-class"),
            guardianPhone: gv("mf-guardianPhone"),
            status: gv("mf-status"),
            admissionDate: new Date().toISOString().split("T")[0],
            indexNo: "ST-" + Date.now().toString(36).toUpperCase(),
          };
          if (!data.name) {
            toast("Name is required");
            return;
          }
        } else if (type === "teacher") {
          data = {
            name: gv("mf-name"),
            subject: gv("mf-subject"),
            department: gv("mf-department"),
            email: gv("mf-email"),
            phone: gv("mf-phone"),
            status: gv("mf-status"),
            formMaster: false,
            formClass: "",
            classes: [],
          };
          if (!data.name) {
            toast("Name is required");
            return;
          }
        } else if (type === "donation") {
          data = {
            donor: gv("mf-donor"),
            amount: parseFloat(gv("mf-amount")) || 0,
            currency: "GHS",
            purpose: gv("mf-purpose"),
            method: gv("mf-method"),
            reference:
              gv("mf-reference") ||
              "REF-" + Date.now().toString(36).toUpperCase(),
            status: gv("mf-status"),
            date: new Date().toISOString().split("T")[0],
            email: "",
            anonymous: false,
          };
          if (!data.donor) {
            toast("Donor name is required");
            return;
          }
        } else if (type === "merch") {
          data = {
            name: gv("mf-name"),
            price: parseFloat(gv("mf-price")) || 0,
            currency: "GHS",
            category: gv("mf-cat"),
            image:
              (await mediaValue()) ||
              '<span class="ico ico-shop" data-ico="shop" aria-hidden="true"></span>',
            description: gv("mf-description"),
            stock: gv("mf-stock") === "true",
          };
          if (!data.name) {
            toast("Product name is required");
            return;
          }
        } else if (type === "notif") {
          data = {
            title: gv("mf-title"),
            message: gv("mf-message"),
            audience: gv("mf-audience"),
            priority: gv("mf-priority"),
            status: "delivered",
            sentDate: new Date().toISOString().split("T")[0],
            reads: 0,
          };
          if (!data.title || !data.message) {
            toast("Title and message are required");
            return;
          }
        }
        if (type === "subadmin") {
          const allPermKeys = [
            "school",
            "team",
            "facilities",
            "houses",
            "clubs",
            "teachers",
            "news",
            "gallery",
            "documents",
            "slides",
            "notifications",
            "applications",
            "students",
            "merchandise",
            "orders",
          ];
          const perms = allPermKeys.filter(
            (k) => document.getElementById("perm-" + k)?.checked,
          );
          data = {
            name: gv("mf-name"),
            email: gv("mf-email").toLowerCase(),
            username: gv("mf-username"),
            role: gv("mf-role"),
            active: gv("mf-active") !== "false",
            permissions: perms,
            color: "linear-gradient(135deg,#2563eb,#4338ca)",
          };
          if (!data.name || !data.email) {
            toast("Name and Supabase Auth email are required");
            return;
          }
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            toast("Enter a valid email address");
            return;
          }
          data.username = data.username || data.email.split("@")[0];
          const admins = DB._getSaAdmins();
          const duplicate = admins.some(
            (a) =>
              a.id !== id &&
              String(a.email || a.username || "").trim().toLowerCase() ===
                data.email,
          );
          if (duplicate) {
            toast("That Supabase Auth email is already assigned");
            return;
          }
          if (id) {
            const i = admins.findIndex((a) => a.id === id);
            if (i !== -1) {
              admins[i] = {
                ...admins[i],
                ...data,
                staffPassword: admins[i].staffPassword || "",
                passwordSet: admins[i].passwordSet === true,
              };
              DB._saveSaAdmins(admins);
              DB._log("Updated", "Sub-admin", data.username);
              const synced = await flushRemoteSync();
              updateSyncBanner(synced);
              toast(
                synced
                  ? '<span class="ico ico-check" data-ico="check" aria-hidden="true"></span> Sub-admin updated and synced!'
                  : '<span class="ico ico-check" data-ico="check" aria-hidden="true"></span> Sub-admin updated locally.',
              );
              cmodal();
              renderSubAdmins();
              return;
            }
          } else {
            const newAdmin = {
              ...data,
              id: DB._id(),
              passwordSet: false,
              staffPassword: "",
            };
            admins.push(newAdmin);
            DB._saveSaAdmins(admins);
            DB._log("Added", "Sub-admin", data.username);
            const synced = await flushRemoteSync();
            updateSyncBanner(synced);
            toast(
              synced
                ? '<span class="ico ico-check" data-ico="check" aria-hidden="true"></span> Sub-admin added and synced!'
                : '<span class="ico ico-check" data-ico="check" aria-hidden="true"></span> Sub-admin added locally.',
            );
            cmodal();
            renderSubAdmins();
            return;
          }
        }
        const dbKey = {
          news: "news",
          team: "team",
          department: "departments",
          gallery: "gallery",
          doc: "documents",
          slide: "homepageSlides",
          facility: "facilities",
          house: "houses",
          club: "clubs",
          student: "students",
          teacher: "teachers",
          donation: "donations",
          merch: "merchandise",
          notif: "notifications",
        }[type];
        if (id) DB.update(dbKey, id, data);
        else DB.add(dbKey, data);
        toast('<span class="ico ico-check" data-ico="check" aria-hidden="true"></span> Saved!');
        cmodal();
        loadPage(
          {
            news: "news-mgr",
            team: "team-mgr",
            department: "departments-mgr",
            gallery: "gallery-mgr",
            doc: "docs-mgr",
            slide: "slides-mgr",
            facility: "facilities-mgr",
            house: "houses-mgr",
            club: "clubs-mgr",
            student: "students-mgr",
            teacher: "teachers-mgr",
            donation: "donations-mgr",
            merch: "merch-mgr",
            notif: "notif-mgr",
          }[type],
        );
        if (type === "news") renderDashboard();
        if (type === "notif") notifyNotificationsChanged();
        flushRemoteSync().then((synced) => {
          updateSyncBanner(synced);
          if (!synced) {
            toast('<span class="ico ico-check" data-ico="check" aria-hidden="true"></span> Saved locally. Sign in with Supabase Auth to sync to all devices.');
          }
        });
      }

      // ── CONFIRM DELETE ─────────────────────────────────────────
      function confirmAct(title, msg, btnTxt, cb) {
        document.getElementById("confirm-title").textContent = title;
        document.getElementById("confirm-msg").textContent = msg;
        const btn = document.getElementById("confirm-ok");
        btn.textContent = btnTxt;
        btn.onclick = async () => {
          document.getElementById("confirm-ov").classList.remove("open");
          await cb();
        };
        document.getElementById("confirm-ov").classList.add("open");
      }

      async function syncAfterChange(message, reload, contentKey) {
        if (contentKey) {
          await DB.forceSyncContentKey?.(contentKey);
        }
        const synced = await flushRemoteSync();
        if (reload) loadPage(reload);
        toast(
          synced
            ? `${message} Synced to all devices.`
            : `${message} Saved locally only — connect cloud sync above.`,
        );
        await refreshSyncBanner();
        return synced;
      }

      async function adminQuickUpdate(key, id, changes, reload) {
        DB.update(key, id, changes);
        if (key === "notifications") notifyNotificationsChanged();
        await syncAfterChange("Updated successfully!", reload);
      }
      window.adminQuickUpdate = adminQuickUpdate;

      function delItem(key, id, reload) {
        confirmAct(
          "Delete this item?",
          "This cannot be undone.",
          "Delete",
          async () => {
            DB.delete(key, id);
            if (key === "notifications") notifyNotificationsChanged();
            await syncAfterChange("Deleted successfully!", reload, key);
          },
        );
      }

      function bulkDelete(key, reload, selectorClass) {
        const ids = Array.from(document.querySelectorAll(`.${selectorClass}:checked`)).map(
          (el) => el.value,
        );
        if (!ids.length) {
          toast("Select at least one item first");
          return;
        }
        confirmAct(
          `Delete ${ids.length} selected item${ids.length === 1 ? "" : "s"}?`,
          "This cannot be undone.",
          "Delete",
          async () => {
            ids.forEach((id) => DB.delete(key, id));
            if (key === "notifications") notifyNotificationsChanged();
            if (key === "messages") {
              renderMessages();
              updateMessageBadges();
            }
            await syncAfterChange("Selected items deleted.", reload, key);
          },
        );
      }

      function bulkDeleteSubAdmins() {
        const ids = Array.from(document.querySelectorAll(".admin-sa-select:checked")).map((el) => el.value);
        if (!ids.length) {
          toast("Select at least one sub-admin first");
          return;
        }
        confirmAct(
          `Remove ${ids.length} selected sub-admin${ids.length === 1 ? "" : "s"}?`,
          "This cannot be undone.",
          "Delete",
          async () => {
            const remaining = DB._getSaAdmins().filter((admin) => !ids.includes(admin.id));
            DB._saveSaAdmins(remaining);
            DB._log("Deleted", "Sub-admin", `${ids.length} selected`);
            const synced = await flushRemoteSync();
            renderSubAdmins();
            toast(synced ? "Selected sub-admins removed and synced." : "Selected sub-admins removed locally.");
          },
        );
      }

      function notifyNotificationsChanged() {
        window.dispatchEvent(new Event("nj-notifications-updated"));
      }

      function clearNotifs() {
        confirmAct(
          "Clear all notifications?",
          "This removes every notification from the website and portals.",
          "Clear",
          async () => {
            DB._set("notifications", []);
            DB._log("Cleared", "notifications", "All notifications");
            notifyNotificationsChanged();
            renderNotifs();
            renderDashboard();
            updateMessageBadges();
            await syncAfterChange("Notifications cleared.", "notif-mgr");
          },
        );
      }

      function markAllMessagesRead() {
        const messages = DB.getAll("messages");
        const unread = messages.filter((m) => m.status !== "read");
        if (!unread.length) {
          toast("All messages are already marked read.");
          return;
        }
        unread.forEach((msg) => DB.update("messages", msg.id, { status: "read" }));
        DB.saveRemoteContent?.("messages", DB.getAll("messages"));
        renderMessages();
        updateMessageBadges();
        syncAfterChange(`Marked ${unread.length} message${unread.length === 1 ? "" : "s"} read.`, "messages-mgr", "messages");
      }

      // ── DASHBOARD ─────────────────────────────────────────────
      function renderDashboard() {
        const news = DB.getAll("news");
        const students = DB.getAll("students");
        const apps = DB.getAll("applications");
        const teachers = DB.getAll("teachers");
        document.getElementById("dash-stats").innerHTML = `
    <div class="stat-w"><div class="sw-ic" style="background:rgba(37,99,235,.1)"><span class="ico ico-cap" data-ico="cap" aria-hidden="true"></span></div><div class="sw-num">${students.length.toLocaleString()}</div><div class="sw-lbl">Students</div></div>
    <div class="stat-w"><div class="sw-ic" style="background:rgba(16,185,129,.1)"><span class="ico ico-user" data-ico="user" aria-hidden="true"></span><span class="ico ico-school" data-ico="school" aria-hidden="true"></span></div><div class="sw-num">${teachers.length}</div><div class="sw-lbl">Teachers</div></div>
    <div class="stat-w"><div class="sw-ic" style="background:rgba(245,158,11,.1)">📝</div><div class="sw-num">${apps.filter((a) => a.status === "submitted" || a.status === "under_review").length}</div><div class="sw-lbl">Pending Apps</div></div>
    <div class="stat-w"><div class="sw-ic" style="background:rgba(220,38,38,.1)"><span class="ico ico-heart" data-ico="heart" aria-hidden="true"></span></div><div class="sw-num">GHS ${DB.getAll(
      "donations",
    )
      .reduce((s, d) => (d.status === "completed" ? s + d.amount : s), 0)
      .toLocaleString()}</div><div class="sw-lbl">Total Donations</div></div>`;
        hydrateIcons(document.getElementById("dash-stats"));
        document.getElementById("dash-apps-table").innerHTML =
          `<thead><tr><th>Ref</th><th>Applicant</th><th>Programme</th><th>Status</th><th>Action</th></tr></thead><tbody>` +
          apps
            .slice(0, 5)
            .map(
              (a) =>
                `<tr><td style="font-family:monospace;font-size:11px">${esc(a.ref)}</td><td>${esc(a.name)}</td><td>${esc(a.programme)}</td><td>${statusTag(a.status)}</td><td><button class="btn btn-sm btn-g" onclick="showPage('admissions-mgr',null)">View</button></td></tr>`,
            )
            .join("") +
          `</tbody>`;
        const logs = DB.getAll("logs").slice(0, 5);
        document.getElementById("dash-logs").innerHTML =
          logs
            .map(
              (l) => `
    <div class="act-item"><div class="act-dot" style="background:rgba(37,99,235,.1)"><span class="ico ico-clipboard" data-ico="clipboard" aria-hidden="true"></span></div><div><div class="act-title">${esc(l.action)}</div><div class="act-sub">${esc(l.detail)}</div><div class="act-time">${l.time}</div></div></div>`,
            )
            .join("") ||
          '<div style="padding:14px;color:var(--g400);font-size:13px">No recent activity</div>';
        setBadge(
          "news-badge",
          news.filter((n) => n.status === "published").length,
        );
        setBadge(
          "app-badge",
          apps.filter(
            (a) => a.status === "submitted" || a.status === "under_review",
          ).length,
        );
        setBadge(
          "tb-badge",
          DB.getAll("notifications").filter((n) => n.status === "delivered")
            .length,
        );
        setBadge(
          "msg-badge",
          DB.getAll("messages").filter((m) => m.status !== "read").length,
        );
        hydrateIcons(document.getElementById("dash-logs"));
      }

      function setBadge(id, count) {
        const badge = document.getElementById(id);
        if (!badge) return;
        badge.textContent = count > 0 ? count : "";
        badge.style.display = count > 0 ? "inline-flex" : "none";
      }

      function updateMessageBadges() {
        const unreadCount = DB.getAll("messages").filter((m) => m.status !== "read").length;
        setBadge("msg-badge", unreadCount);
        const notifCount = DB.getAll("notifications").filter((n) => n.status === "delivered").length;
        const topBadge = document.getElementById("tb-badge");
        if (topBadge) {
          const total = notifCount + unreadCount;
          topBadge.textContent = total > 0 ? total : "";
          topBadge.style.display = total > 0 ? "inline-flex" : "none";
        }
      }

      function statusTag(s) {
        const m = {
          submitted: '<span class="tag tag-b">Submitted</span>',
          under_review: '<span class="tag tag-y">Under Review</span>',
          approved: '<span class="tag tag-g">Accepted</span>',
          rejected: '<span class="tag tag-r">Declined</span>',
        };
        return m[s] || `<span class="tag">${s}</span>`;
      }

      // ── SCHOOL INFO ────────────────────────────────────────────
      const TIMELINE_COLORS = ["#2563eb", "#9333ea", "#059669", "#d97706", "#dc2626"];
      const VALUE_COLORS = [
        "rgba(37, 99, 235, 0.1)",
        "rgba(147, 51, 234, 0.1)",
        "rgba(245, 158, 11, 0.1)",
        "rgba(16, 185, 129, 0.1)",
        "rgba(6, 182, 212, 0.1)",
        "rgba(220, 38, 38, 0.1)",
      ];

      function timelineRowHtml(item = {}, index = 0) {
        const color = item.color || TIMELINE_COLORS[index % TIMELINE_COLORS.length];
        return `
        <div class="repeater-row" data-timeline-index="${index}">
          <div class="repeater-head">
            <strong>Timeline Entry ${index + 1}</strong>
            <button class="btn btn-sm btn-r" type="button" onclick="removeTimelineEntry(${index})">Remove</button>
          </div>
          <div class="form-grid">
            <div class="fg"><label class="flbl">Year / Period</label><input class="finp tl-year" value="${esc(item.year || "")}" placeholder="e.g. 1953 or 2010s"></div>
            <div class="fg"><label class="flbl">Title</label><input class="finp tl-title" value="${esc(item.title || "")}" placeholder="e.g. School Founded"></div>
            ${colorPickerField(`tl-color-${index}`, color, { label: "Dot Colour", extraClass: "tl-color" })}
          </div>
          <div class="fg" style="margin-top:12px"><label class="flbl">Description</label><textarea class="finp fta tl-desc" placeholder="Describe this milestone...">${esc(item.desc || item.description || "")}</textarea></div>
        </div>`;
      }

      function valueRowHtml(item = {}, index = 0) {
        return `
        <div class="repeater-row" data-value-index="${index}">
          <div class="repeater-head">
            <strong>Core Value ${index + 1}</strong>
            <button class="btn btn-sm btn-r" type="button" onclick="removeCoreValueEntry(${index})">Remove</button>
          </div>
          <div class="form-grid">
            <div class="fg"><label class="flbl">Emoji</label><input class="finp cv-emoji" value="${esc(item.emoji || "⭐")}" placeholder="💪"></div>
            <div class="fg"><label class="flbl">Title</label><input class="finp cv-title" value="${esc(item.title || "")}" placeholder="Hard Work"></div>
          </div>
          <div class="fg" style="margin-top:12px"><label class="flbl">Description</label><textarea class="finp fta cv-desc" placeholder="Explain this value...">${esc(item.desc || item.description || "")}</textarea></div>
        </div>`;
      }

      function faqRowHtml(item = {}, index = 0) {
        return `
        <div class="repeater-row" data-faq-index="${index}">
          <div class="repeater-head">
            <strong>Q&amp;A ${index + 1}</strong>
            <button class="btn btn-sm btn-r" type="button" onclick="removeAIFaqEntry(${index})">Remove</button>
          </div>
          <div class="fg"><label class="flbl">Question</label><input class="finp faq-q" value="${esc(item.q || item.question || "")}" placeholder="What are the school fees?"></div>
          <div class="fg" style="margin-top:12px"><label class="flbl">Official Answer</label><textarea class="finp fta faq-a" placeholder="Write the answer the AI should give...">${esc(item.a || item.answer || "")}</textarea></div>
        </div>`;
      }

      function renderTimelineEditor(items = []) {
        const wrap = document.getElementById("timeline-editor");
        if (!wrap) return;
        const list = items.length ? items : [{ year: "", title: "", desc: "", color: TIMELINE_COLORS[0] }];
        wrap.innerHTML = list.map((item, i) => timelineRowHtml(item, i)).join("");
        bindColorPickers(wrap);
      }

      function renderValuesEditor(items = []) {
        const wrap = document.getElementById("values-editor");
        if (!wrap) return;
        const list = items.length ? items : [{ emoji: "⭐", title: "", desc: "" }];
        wrap.innerHTML = list.map((item, i) => valueRowHtml(item, i)).join("");
      }

      function renderAIFaqEditor(items = []) {
        const wrap = document.getElementById("ai-faq-editor");
        if (!wrap) return;
        const rows = (items.length ? items : []).map((item, i) => faqRowHtml(item, i)).join("");
        wrap.innerHTML = rows || '<p style="padding:12px 0;color:var(--g400);font-size:13px">No Q&amp;A entries yet. Add common questions students and parents ask.</p>';
        wrap.querySelectorAll(".repeater-row").forEach((row, index) => {
          row.style.marginBottom = "10px";
          const head = row.querySelector(".repeater-head");
          if (head) {
            head.style.paddingBottom = "8px";
            head.style.marginBottom = "8px";
          }
          const fields = row.querySelectorAll(".fg, .form-grid");
          fields.forEach((field) => {
            field.style.display = "none";
          });
          const summary = document.createElement("div");
          summary.className = "ai-faq-summary";
          summary.style.cssText = "font-size:13px;color:var(--g700);line-height:1.5;padding:6px 0 2px;cursor:pointer";
          summary.textContent = `${index + 1}. ${itemLabel(items[index]?.q || "Untitled question")}`;
          summary.onclick = () => {
            const details = row.querySelectorAll(".fg, .form-grid");
            const visible = summary.dataset.open === "1";
            details.forEach((field) => {
              field.style.display = visible ? "none" : "block";
            });
            summary.dataset.open = visible ? "0" : "1";
            summary.textContent = visible
              ? `${index + 1}. ${itemLabel(items[index]?.q || "Untitled question")}`
              : `${index + 1}. ${itemLabel(items[index]?.q || "Untitled question")} · click to collapse`;
          };
          row.insertBefore(summary, row.firstChild);
        });
      }

      function collectTimelineFromEditor() {
        return [...document.querySelectorAll("#timeline-editor .repeater-row")].map((row, index) => ({
          year: row.querySelector(".tl-year")?.value.trim() || "",
          title: row.querySelector(".tl-title")?.value.trim() || "",
          desc: row.querySelector(".tl-desc")?.value.trim() || "",
          color: row.querySelector(".tl-color")?.value || TIMELINE_COLORS[index % TIMELINE_COLORS.length],
        })).filter((item) => item.year || item.title || item.desc);
      }

      function collectValuesFromEditor() {
        return [...document.querySelectorAll("#values-editor .repeater-row")].map((row, index) => ({
          emoji: row.querySelector(".cv-emoji")?.value.trim() || "⭐",
          title: row.querySelector(".cv-title")?.value.trim() || "",
          desc: row.querySelector(".cv-desc")?.value.trim() || "",
          color: VALUE_COLORS[index % VALUE_COLORS.length],
        })).filter((item) => item.title || item.desc);
      }

      function collectAIFaqFromEditor() {
        return [...document.querySelectorAll("#ai-faq-editor .repeater-row")].map((row) => ({
          q: row.querySelector(".faq-q")?.value.trim() || "",
          a: row.querySelector(".faq-a")?.value.trim() || "",
        })).filter((item) => item.q && item.a);
      }

      function addTimelineEntry() {
        renderTimelineEditor([...collectTimelineFromEditor(), { year: "", title: "", desc: "", color: TIMELINE_COLORS[0] }]);
      }
      function removeTimelineEntry(index) {
        const items = collectTimelineFromEditor();
        items.splice(index, 1);
        renderTimelineEditor(items);
      }
      function addCoreValueEntry() {
        renderValuesEditor([...collectValuesFromEditor(), { emoji: "⭐", title: "", desc: "" }]);
      }
      function removeCoreValueEntry(index) {
        const items = collectValuesFromEditor();
        items.splice(index, 1);
        renderValuesEditor(items);
      }
      function addAIFaqEntry() {
        const items = collectAIFaqFromEditor();
        items.push({ q: "", a: "" });
        renderAIFaqEditor(items);
      }
      function removeAIFaqEntry(index) {
        const items = collectAIFaqFromEditor();
        items.splice(index, 1);
        renderAIFaqEditor(items);
      }
      window.addTimelineEntry = addTimelineEntry;
      window.removeTimelineEntry = removeTimelineEntry;
      window.addCoreValueEntry = addCoreValueEntry;
      window.removeCoreValueEntry = removeCoreValueEntry;
      window.addAIFaqEntry = addAIFaqEntry;
      window.removeAIFaqEntry = removeAIFaqEntry;

      async function flushRemoteSync() {
        if (!(await DB.isSupabaseAuthenticated?.())) return false;
        await DB._flushPendingRemoteWrites?.();
        const infoOk = await DB.saveRemoteInfo?.(DB.getInfo());
        return !!infoOk;
      }

      async function connectCloudSync(email, password) {
        const normalized = String(email || "").trim().toLowerCase();
        if (!normalized || !password) {
          throw new Error("Enter your Supabase admin email and password.");
        }
        await DB.signInWithEmail(normalized, password);
        await DB.syncRemoteAll?.();
        refreshAdminPage();
        DB.pushAllLocalToRemote?.()
          .then(async (pushed) => {
            await DB.syncRemoteAll?.();
            refreshAdminPage();
            await refreshSyncBanner();
            toast(
              pushed
                ? "Cloud sync connected. Your site content is ready to edit."
                : "Connected. Some items could not upload — save again to retry.",
            );
          })
          .catch(async () => {
            await refreshSyncBanner();
            toast("Connected. Your latest cloud content has been loaded.");
          });
        return true;
      }

      function updateSyncBanner(synced, userEmail = "") {
        const banner = document.getElementById("sync-banner");
        if (!banner) return;
        if (synced) {
          banner.hidden = true;
          banner.innerHTML = "";
          return;
        }
        banner.hidden = false;
        banner.innerHTML = `
          <div><strong>Cloud sync is off.</strong> Changes are only on this device until you connect Supabase.</div>
          <form id="cloud-sync-form" style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            <input id="cloud-sync-email" type="email" class="finp" placeholder="Admin email" value="${esc(userEmail)}" style="flex:1;min-width:180px" autocomplete="email" />
            <input id="cloud-sync-pass" type="password" class="finp" placeholder="Password" style="flex:1;min-width:140px" autocomplete="current-password" />
            <button type="submit" class="btn btn-p btn-sm">Connect cloud sync</button>
          </form>
          <p id="cloud-sync-err" style="margin:8px 0 0;font-size:12px;color:#b45309"></p>`;
        const form = banner.querySelector("#cloud-sync-form");
        if (form && !form.dataset.bound) {
          form.dataset.bound = "1";
          form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const errEl = banner.querySelector("#cloud-sync-err");
            const btn = form.querySelector('button[type="submit"]');
            if (errEl) errEl.textContent = "";
            if (btn) {
              btn.disabled = true;
              btn.textContent = "Connecting...";
            }
            try {
              await connectCloudSync(
                banner.querySelector("#cloud-sync-email")?.value,
                banner.querySelector("#cloud-sync-pass")?.value,
              );
              await refreshSyncBanner();
              toast("Cloud sync enabled. Changes will appear on all devices.");
            } catch (error) {
              if (errEl) errEl.textContent = error?.message || "Could not connect cloud sync.";
            } finally {
              if (btn) {
                btn.disabled = false;
                btn.textContent = "Connect cloud sync";
              }
            }
          });
        }
      }

      async function refreshSyncBanner() {
        const user = await DB.getAuthUser?.();
        const authed = await DB.isSupabaseAuthenticated?.();
        updateSyncBanner(authed, user?.email || "");
        return authed;
      }

      async function persistSiteInfo(info, successMessage, noteId) {
        const synced = await DB.saveInfo(info);
        const note = noteId ? document.getElementById(noteId) : null;
        if (note) {
          note.textContent = synced
            ? "Saved and synced — changes will appear on all devices within a few seconds."
            : "Saved locally. Cloud sync will retry when the connection is available.";
        }
        toast(
          synced
            ? `${successMessage} Synced to all devices.`
            : `${successMessage} Saved locally only — connect cloud sync above.`,
        );
        await refreshSyncBanner();
        return synced;
      }

      function loadSchoolInfo() {
        const i = DB.getInfo();
        const set = (id, val) => {
          const el = document.getElementById(id);
          if (el && val) el.value = val;
        };
        set("si-name", i.name);
        set("si-short", i.shortName);
        set("si-code", i.code);
        set("si-cat", i.category);
        set("si-phone", i.phone);
        set("si-email", i.email);
        set("si-address", i.address);
        set("si-hours", i.hours);
        set("si-fb", i.facebook);
        set("si-tw", i.twitter);
        set("si-ig", i.instagram);
        set("si-li", i.linkedin);
        set("si-motto", i.motto);
        set("si-warcry", i.warCry);
        set("si-founded", i.founded);
        set("si-hero", i.heroTitle);
        set("si-herosub", i.heroSubtitle);
        set("si-hero-image", i.heroImage);
        const hp = document.getElementById("si-hero-preview");
        const hi = document.getElementById("si-hero-image");
        const hf = document.getElementById("si-hero-file");
        const paintHero = (src) => {
          if (hp) hp.innerHTML = src ? mediaMarkup(src) : mediaMarkup("njb.jpg");
        };
        paintHero(i.heroImage || "njb.jpg");
        hi?.addEventListener("input", () => paintHero(hi.value.trim() || "njb.jpg"));
        hf?.addEventListener("change", async () => {
          const f = hf.files?.[0];
          if (f) paintHero(await fileToDataURL(f));
        });
        set("si-welcome", i.welcomeText);
        const firstWelcome = i.firstVisitWelcome || {};
        const fwEnabled = document.getElementById("si-first-welcome-enabled");
        if (fwEnabled) fwEnabled.checked = firstWelcome.enabled !== false;
        set("si-first-welcome-kicker", firstWelcome.kicker || "New Juaben Senior High School");
        set("si-first-welcome-title", firstWelcome.title || "Welcome to NJB City");
        set("si-first-welcome-text", firstWelcome.text || "Home of excellence, discipline, creativity, clubs, culture, and the proud NJUASCO spirit.");
        set("si-first-welcome-button", firstWelcome.buttonText || "Enter NJB City");
        set("si-first-welcome-image", firstWelcome.image || "njb.jpg");
        set("si-first-welcome-logo", firstWelcome.logo || "NJUASCO LOGO.png");
        set("si-footer-copy", i.footerCopyright);
        set("si-nova-name", i.novaTechName || "NOVATech");
        set("si-nova-url", i.novaTechUrl);
        set("si-galaxy-name", i.galaxyName || "Galaxy Design Studio");
        set("si-galaxy-url", i.galaxyUrl);
        const stats = i.heroStats || { years: 71, students: 3000, programmes: 7, staff: 200 };
        const setNum = (id, val) => {
          const el = document.getElementById(id);
          if (el) el.value = val ?? "";
        };
        setNum("si-stat-years", stats.years);
        setNum("si-stat-students", stats.students);
        setNum("si-stat-programmes", stats.programmes);
        setNum("si-stat-staff", stats.staff);
        const clubsLive = document.getElementById("si-clubs-live");
        if (clubsLive) clubsLive.checked = i.heroClubsUseLive !== false;
        setNum("si-clubs-manual", i.heroClubsManual || "");
        updateHeroStatsPreview();
      }
      function getHeroClubsCount(info) {
        const clubsLive = info?.heroClubsUseLive !== false;
        const clubsManual = Number(info?.heroClubsManual);
        if (clubsLive || !clubsManual) return DB.getAll("clubs").length;
        return clubsManual;
      }
      function updateHeroStatsPreview() {
        const preview = document.getElementById("si-stats-preview");
        if (!preview) return;
        const stats = {
          years: Number(document.getElementById("si-stat-years")?.value) || 0,
          students: Number(document.getElementById("si-stat-students")?.value) || 0,
          programmes: Number(document.getElementById("si-stat-programmes")?.value) || 0,
          staff: Number(document.getElementById("si-stat-staff")?.value) || 0,
        };
        const clubs = getHeroClubsCount({
          heroClubsUseLive: document.getElementById("si-clubs-live")?.checked !== false,
          heroClubsManual: document.getElementById("si-clubs-manual")?.value || "",
        });
        preview.innerHTML =
          `<strong>Homepage preview:</strong> ${stats.students.toLocaleString()}+ Students · ${stats.staff.toLocaleString()}+ Staff · ${stats.years.toLocaleString()}+ Years · ${clubs.toLocaleString()}+ Clubs · ${stats.programmes.toLocaleString()} Programmes (hero banner only)`;
      }
      async function saveSchoolInfo() {
        const g = (id) => document.getElementById(id)?.value || "";
        const heroFile = document.getElementById("si-hero-file")?.files?.[0];
        const firstWelcomeFile = document.getElementById("si-first-welcome-file")?.files?.[0];
        const firstWelcomeImage = firstWelcomeFile
          ? (await DB.uploadSiteAsset?.(firstWelcomeFile, "welcome")) || (await fileToDataURL(firstWelcomeFile))
          : g("si-first-welcome-image");
        const info = {
          ...DB.getInfo(),
          name: g("si-name"),
          shortName: g("si-short"),
          code: g("si-code"),
          category: g("si-cat"),
          phone: g("si-phone"),
          email: g("si-email"),
          address: g("si-address"),
          hours: g("si-hours"),
          facebook: g("si-fb"),
          twitter: g("si-tw"),
          instagram: g("si-ig"),
          linkedin: g("si-li"),
          motto: g("si-motto"),
          warCry: g("si-warcry"),
          founded: g("si-founded"),
          heroTitle: g("si-hero"),
          heroSubtitle: g("si-herosub"),
          heroImage: heroFile
            ? (await DB.uploadSiteAsset?.(heroFile, "school")) || (await fileToDataURL(heroFile))
            : g("si-hero-image"),
          welcomeText: g("si-welcome"),
          firstVisitWelcome: {
            enabled: document.getElementById("si-first-welcome-enabled")?.checked !== false,
            kicker: g("si-first-welcome-kicker") || "New Juaben Senior High School",
            title: g("si-first-welcome-title") || "Welcome to NJB City",
            text: g("si-first-welcome-text") || "Home of excellence, discipline, creativity, clubs, culture, and the proud NJUASCO spirit.",
            buttonText: g("si-first-welcome-button") || "Enter NJB City",
            image: firstWelcomeImage || "njb.jpg",
            logo: g("si-first-welcome-logo") || "NJUASCO LOGO.png",
          },
          footerCopyright: g("si-footer-copy"),
          novaTechName: g("si-nova-name"),
          novaTechUrl: g("si-nova-url"),
          galaxyName: g("si-galaxy-name"),
          galaxyUrl: g("si-galaxy-url"),
          heroStats: {
            years: Number(document.getElementById("si-stat-years")?.value) || 0,
            students: Number(document.getElementById("si-stat-students")?.value) || 0,
            programmes: Number(document.getElementById("si-stat-programmes")?.value) || 0,
            staff: Number(document.getElementById("si-stat-staff")?.value) || 0,
          },
          heroClubsUseLive: document.getElementById("si-clubs-live")?.checked !== false,
          heroClubsManual: document.getElementById("si-clubs-manual")?.value || "",
        };
        await persistSiteInfo(info, "School information saved!");
      }

      function loadAboutPage() {
        const i = DB.getInfo();
        const set = (id, val) => {
          const el = document.getElementById(id);
          if (el) el.value = val || "";
        };
        set("ab-history", i.welcomeText);
        set("ab-founded-desc", i.aboutFoundedDesc);
        set("ab-location-val", i.aboutLocationVal);
        set("ab-location-desc", i.aboutLocationDesc);
        set("ab-vision", i.vision);
        set("ab-mission", i.mission);
        set("ab-pm", i.principalMessage);
        set("ab-pname", i.principalName);
        set("ab-ptitle", i.principalTitle);
        set("ab-principal-emoji", i.principalEmoji);
        set("ab-home-badge-title", i.homeBadgeTitle);
        set("ab-home-badge-sub", i.homeBadgeSubtitle);
        renderTimelineEditor(i.aboutTimeline || []);
        renderValuesEditor(i.coreValues || []);
      }

      async function saveAboutPage() {
        const g = (id) => document.getElementById(id)?.value || "";
        const info = {
          ...DB.getInfo(),
          welcomeText: g("ab-history"),
          aboutFoundedDesc: g("ab-founded-desc"),
          aboutLocationVal: g("ab-location-val"),
          aboutLocationDesc: g("ab-location-desc"),
          vision: g("ab-vision"),
          mission: g("ab-mission"),
          principalMessage: g("ab-pm"),
          principalName: g("ab-pname"),
          principalTitle: g("ab-ptitle"),
          principalEmoji: g("ab-principal-emoji"),
          homeBadgeTitle: g("ab-home-badge-title"),
          homeBadgeSubtitle: g("ab-home-badge-sub"),
          aboutTimeline: collectTimelineFromEditor(),
          coreValues: collectValuesFromEditor(),
        };
        await persistSiteInfo(info, "About page saved!", "about-sync-note");
      }
      window.saveAboutPage = saveAboutPage;

      function renderAIKnowledgePoints(items = []) {
        const wrap = document.getElementById("ai-knowledge-points");
        if (!wrap) return;
        wrap.innerHTML = items.length
          ? items
              .map(
                (item, index) => `<div class="repeater-row" style="align-items:flex-start">
                  <div style="flex:1">
                    <div style="font-size:11px;font-weight:700;color:var(--g400);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Point ${index + 1}</div>
                    <div style="font-size:14px;color:var(--g800);line-height:1.5;white-space:pre-wrap">${esc(item.text || "")}</div>
                    <div style="font-size:11px;color:var(--g400);margin-top:6px">${item.createdAt ? fmtDate(item.createdAt) : ""}</div>
                  </div>
                  <div style="display:flex;gap:8px;flex-wrap:wrap">
                    <button class="btn btn-sm btn-g" type="button" onclick="editAIKnowledgePoint('${item.id}')">Edit</button>
                    <button class="btn btn-sm btn-r" type="button" title="Delete knowledge point" aria-label="Delete knowledge point" onclick="removeAIKnowledgePoint('${item.id}')"><span class="ico ico-x" data-ico="x" aria-hidden="true"></span></button>
                  </div>
                </div>`,
              )
              .join("")
          : '<p style="padding:12px 0;color:var(--g400);font-size:13px">No knowledge points yet. Add your first official fact above.</p>';
        hydrateIcons(wrap);
      }

      function getAIKnowledgePoints() {
        const info = DB.getInfo();
        return Array.isArray(info.aiKnowledgePoints) ? info.aiKnowledgePoints : [];
      }

      async function addAIKnowledgePoint() {
        const text = document.getElementById("ai-knowledge-input")?.value.trim() || "";
        if (!text) {
          toast("Enter a knowledge point before saving");
          return;
        }
        const points = getAIKnowledgePoints();
        points.push({ id: DB._id(), text, createdAt: new Date().toISOString() });
        const info = {
          ...DB.getInfo(),
          aiKnowledgePoints: points,
          aiKnowledge: points.map((point, index) => `${index + 1}. ${point.text}`).join("\n"),
        };
        await persistSiteInfo(info, "Knowledge point saved!", "ai-sync-note");
        document.getElementById("ai-knowledge-input").value = "";
        renderAIKnowledgePoints(points);
      }

      async function editAIKnowledgePoint(id) {
        const points = getAIKnowledgePoints();
        const current = points.find((point) => point.id === id);
        if (!current) return;
        const nextText = prompt("Edit knowledge point:", current.text || "");
        if (nextText === null) return;
        const trimmed = nextText.trim();
        if (!trimmed) {
          toast("Knowledge point cannot be empty");
          return;
        }
        const updatedPoints = points.map((point) =>
          point.id === id
            ? {
                ...point,
                text: trimmed,
                updatedAt: new Date().toISOString(),
              }
            : point,
        );
        const info = {
          ...DB.getInfo(),
          aiKnowledgePoints: updatedPoints,
          aiKnowledge: updatedPoints.map((point, index) => `${index + 1}. ${point.text}`).join("\n"),
        };
        await persistSiteInfo(info, "Knowledge point updated.", "ai-sync-note");
        renderAIKnowledgePoints(updatedPoints);
      }

      async function removeAIKnowledgePoint(id) {
        if (!confirm("Delete this AI knowledge point?")) return;
        const points = getAIKnowledgePoints().filter((point) => point.id !== id);
        const info = {
          ...DB.getInfo(),
          aiKnowledgePoints: points,
          aiKnowledge: points.map((point, index) => `${index + 1}. ${point.text}`).join("\n"),
        };
        await persistSiteInfo(info, "Knowledge point removed.", "ai-sync-note");
        renderAIKnowledgePoints(points);
      }

      function toggleAITrainingPanel(force) {
        const panel = document.getElementById("ai-training-panel");
        const btn = document.getElementById("ai-training-toggle");
        if (!panel || !btn) return;
        const shouldShow = typeof force === "boolean" ? force : panel.style.display === "none";
        panel.style.display = shouldShow ? "block" : "none";
        btn.textContent = shouldShow ? "Hide AI training" : "Show AI training";
      }

      function loadAIKnowledge() {
        const i = DB.getInfo();
        renderAIKnowledgePoints(i.aiKnowledgePoints || []);
        renderAIFaqEditor(i.aiFaqs || []);
        toggleAITrainingPanel(false);
      }

      async function saveAIKnowledge() {
        const info = {
          ...DB.getInfo(),
          aiKnowledgePoints: getAIKnowledgePoints(),
          aiKnowledge: getAIKnowledgePoints().map((point, index) => `${index + 1}. ${point.text}`).join("\n"),
          aiFaqs: collectAIFaqFromEditor(),
        };
        await persistSiteInfo(info, "AI knowledge saved!", "ai-sync-note");
      }
      window.addAIKnowledgePoint = addAIKnowledgePoint;
      window.editAIKnowledgePoint = editAIKnowledgePoint;
      window.removeAIKnowledgePoint = removeAIKnowledgePoint;
      window.saveAIKnowledge = saveAIKnowledge;
      window.toggleAITrainingPanel = toggleAITrainingPanel;

      // ── NEWS ───────────────────────────────────────────────────
      function renderNews() {
        const all = DB.getAll("news");
        const mkItem = (n) =>
          `<div class="news-item"><div class="news-thumb" style="background:${n.color}">${mediaMarkup(n.image)}</div><div class="news-info"><div class="news-title">${esc(n.title)}</div><div class="news-meta"><span style="color:${n.status === "published" ? "var(--gn)" : "var(--go)"}">● ${n.status}</span><span>${fmtDate(n.date)}</span><span class="tag tag-b" style="font-size:10px">${n.category}</span></div></div><div class="news-acts"><button class="btn btn-sm btn-g" onclick="openModal('news','${n.id}')">Edit</button>${n.status === "draft" ? `<button class="btn btn-sm btn-p" onclick="adminQuickUpdate('news','${n.id}',{status:'published'},'news-mgr')">Publish</button>` : `<button class="btn btn-sm btn-g" onclick="adminQuickUpdate('news','${n.id}',{status:'draft'},'news-mgr')">Unpublish</button>`}<button class="btn btn-sm btn-r" onclick="delItem('news','${n.id}','news-mgr')">Delete</button></div></div>`;
        document.getElementById("news-list-all").innerHTML =
          all.map(mkItem).join("") ||
          '<p style="padding:20px;color:var(--g400)">No posts yet. Add your first news post!</p>';
        document.getElementById("news-list-pub").innerHTML =
          all
            .filter((n) => n.status === "published")
            .map(mkItem)
            .join("") ||
          '<p style="padding:20px;color:var(--g400)">No published posts.</p>';
        document.getElementById("news-list-draft").innerHTML =
          all
            .filter((n) => n.status === "draft")
            .map(mkItem)
            .join("") ||
          '<p style="padding:20px;color:var(--g400)">No drafts.</p>';
        const addNewsBulkTools = (list) => {
          if (!list || !list.querySelector(".news-item")) return;
          list.querySelectorAll(".news-item").forEach((item) => {
            const editBtn = item.querySelector("button[onclick^=\"openModal('news'\"]");
            const id = editBtn?.getAttribute("onclick")?.match(/'news','([^']+)'/)?.[1];
            if (!id || item.querySelector(".admin-news-select")) return;
            const title = item.querySelector(".news-title")?.textContent || "news item";
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.value = id;
            checkbox.className = "admin-news-select";
            checkbox.setAttribute("aria-label", `Select ${title}`);
            checkbox.style.cssText =
              "width:18px;height:18px;accent-color:var(--b6);flex-shrink:0;margin-top:18px";
            item.prepend(checkbox);
          });
          const toolbar = document.createElement("div");
          toolbar.style.cssText =
            "display:flex;gap:8px;align-items:center;justify-content:flex-end;margin:0 0 12px;flex-wrap:wrap";
          toolbar.innerHTML =
            '<button class="btn btn-sm btn-g" type="button" data-news-select-all>Select All</button><button class="btn btn-sm btn-g" type="button" data-news-clear>Clear</button><button class="btn btn-sm btn-r" type="button" data-news-delete>Delete Selected</button>';
          toolbar.querySelector("[data-news-select-all]")?.addEventListener("click", () => {
            document.querySelectorAll(".admin-news-select").forEach((el) => (el.checked = false));
            list.querySelectorAll(".admin-news-select").forEach((el) => (el.checked = true));
          });
          toolbar.querySelector("[data-news-clear]")?.addEventListener("click", () => {
            list.querySelectorAll(".admin-news-select").forEach((el) => (el.checked = false));
          });
          toolbar.querySelector("[data-news-delete]")?.addEventListener("click", () => {
            document.querySelectorAll(".admin-news-select").forEach((el) => {
              if (!list.contains(el)) el.checked = false;
            });
            bulkDelete("news", "news-mgr", "admin-news-select");
          });
          list.prepend(toolbar);
        };
        ["news-list-all", "news-list-pub", "news-list-draft"].forEach((id) =>
          addNewsBulkTools(document.getElementById(id)),
        );
      }

      // ── TEAM ───────────────────────────────────────────────────
      function renderTeam() {
        const items = DB.getAll("team").sort((a, b) => a.order - b.order);
        document.getElementById("team-list").innerHTML =
          items
            .map(
              (t) => `
    <div class="team-item"><div class="team-av" style="background:${t.color}">${mediaMarkup(t.image)}</div><div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:700">${esc(t.name)}</div><div style="font-size:12px;color:var(--b6);font-weight:600">${esc(t.position)}</div><div style="font-size:12px;color:var(--g500)">${esc(t.department)} · ${esc(t.email)}</div></div><div style="display:flex;gap:6px;flex-shrink:0"><button class="btn btn-sm btn-g" onclick="openModal('team','${t.id}')">Edit</button><button class="btn btn-sm btn-r" onclick="delItem('team','${t.id}','team-mgr')"><span class="ico ico-x" data-ico="x" aria-hidden="true"></span></button></div></div>`,
            )
            .join("") ||
          '<div style="padding:24px;text-align:center;color:var(--g400)">No team members yet.</div>';
      }

      // ── GALLERY ────────────────────────────────────────────────
      function renderDepartments() {
        const items = DB.getAll("departments").sort((a, b) => (a.order || 0) - (b.order || 0));
        document.getElementById("dept-list").innerHTML =
          items
            .map(
              (d) => `
    <div style="background:#fff;border-radius:var(--r);padding:16px;border:1px solid var(--g100);display:flex;gap:14px;align-items:flex-start">
      <div style="width:52px;height:52px;border-radius:12px;background:${esc(d.color || "linear-gradient(135deg,#2563eb,#4f46e5)")};display:flex;align-items:center;justify-content:center;font-size:24px;color:#fff;flex-shrink:0;overflow:hidden">${mediaMarkup(d.image || "")}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:15px;font-weight:700;margin-bottom:3px">${esc(d.name)}</div>
        <div style="font-size:12px;color:var(--g500);margin-bottom:6px">${esc((d.description || "").slice(0, 120))}${(d.description || "").length > 120 ? "..." : ""}</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px">${(d.tags || []).map((tag) => `<span style="background:var(--g100);padding:2px 8px;border-radius:100px;font-size:11px">${esc(tag)}</span>`).join("")}</div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0"><button class="btn btn-sm btn-g" onclick="openModal('department','${d.id}')">Edit</button><button class="btn btn-sm btn-r" onclick="delItem('departments','${d.id}','departments-mgr')"><span class="ico ico-x" data-ico="x" aria-hidden="true"></span></button></div>
    </div>`,
            )
            .join("") ||
          '<div style="padding:24px;text-align:center;color:var(--g400)">No departments yet.</div>';
      }

      function renderGallery() {
        const items = DB.getAll("gallery");
        document.getElementById("gallery-list").innerHTML =
          items
            .map(
              (g) => `
    <div style="background:#fff;border-radius:var(--r);overflow:hidden;box-shadow:var(--sh1);border:1px solid var(--g100)">
      <div style="aspect-ratio:1;background:${g.color};display:flex;align-items:center;justify-content:center;font-size:40px;overflow:hidden;position:relative"><input class="admin-gallery-select" type="checkbox" value="${g.id}" style="position:absolute;top:8px;left:8px;width:18px;height:18px;accent-color:var(--b6);z-index:2">${mediaMarkup(g.image)}</div>
      <div style="padding:12px">
        <div style="font-size:13px;font-weight:600;margin-bottom:4px">${esc(g.title)}</div>
        <div style="display:inline-block;padding:2px 8px;background:var(--g100);border-radius:100px;font-size:11px;color:var(--g500);margin-bottom:10px">${g.category}</div>
        <div style="display:flex;gap:6px"><button class="btn btn-sm btn-g" onclick="openModal('gallery','${g.id}')">Edit</button><button class="btn btn-sm btn-r" onclick="delItem('gallery','${g.id}','gallery-mgr')">Delete</button></div>
      </div>
    </div>`,
            )
            .join("") ||
          '<div style="padding:24px;text-align:center;color:var(--g400);grid-column:1/-1">No gallery photos yet.</div>';
      }

      // ── FACILITIES ─────────────────────────────────────────────
      function renderDocs() {
        const items = DB.getAll("documents").sort(
          (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0),
        );
        document.getElementById("docs-table").innerHTML =
          `<thead><tr><th><input type="checkbox" onchange="document.querySelectorAll('.admin-doc-select').forEach(x=>x.checked=this.checked)" style="accent-color:var(--b6)"></th><th>Title</th><th>Category</th><th>Status</th><th>Order</th><th>Actions</th></tr></thead><tbody>` +
          (items
            .map(
              (d) =>
                `<tr><td><input class="admin-doc-select" type="checkbox" value="${d.id}" style="accent-color:var(--b6)"></td><td style="font-weight:600">${esc(d.title)}</td><td>${esc(d.category || "General")}</td><td><span class="tag ${d.status === "draft" ? "tag-y" : "tag-g"}">${esc(d.status || "published")}</span></td><td>${esc(d.order || "")}</td><td><a class="btn btn-sm btn-g" href="${esc(d.file || "#")}" target="_blank" rel="noopener">View</a> <button class="btn btn-sm btn-g" onclick="openModal('doc','${d.id}')">Edit</button> <button class="btn btn-sm btn-r" onclick="delItem('documents','${d.id}','docs-mgr')">Delete</button></td></tr>`,
            )
            .join("") ||
            '<tr><td colspan="6" style="text-align:center;color:var(--g400);padding:24px">No documents yet.</td></tr>') +
          `</tbody>`;
      }

      function renderSlides() {
        const items = DB.getAll("homepageSlides").sort(
          (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0),
        );
        document.getElementById("slides-list").innerHTML =
          items
            .map(
              (s) => `
    <div style="background:#fff;border-radius:var(--r);overflow:hidden;box-shadow:var(--sh1);border:1px solid var(--g100)">
      <div style="aspect-ratio:4/3;background:var(--g100);display:flex;align-items:center;justify-content:center;font-size:40px;overflow:hidden">${mediaMarkup(s.image)}</div>
      <div style="padding:12px">
        <div style="font-size:13px;font-weight:600;margin-bottom:4px">${esc(s.title)}</div>
        <div style="display:inline-block;padding:2px 8px;background:var(--g100);border-radius:100px;font-size:11px;color:var(--g500);margin-bottom:10px">${esc(s.status || "active")} · Order ${esc(s.order || "")}</div>
        <div style="display:flex;gap:6px"><button class="btn btn-sm btn-g" onclick="openModal('slide','${s.id}')">Edit</button><button class="btn btn-sm btn-r" onclick="delItem('homepageSlides','${s.id}','slides-mgr')">Delete</button></div>
      </div>
    </div>`,
            )
            .join("") ||
          '<div style="padding:24px;text-align:center;color:var(--g400);grid-column:1/-1">No homepage slides yet.</div>';
      }

      function renderFacilities() {
        const items = DB.getAll("facilities").sort((a, b) => a.order - b.order);
        document.getElementById("fac-list").innerHTML =
          items
            .map(
              (f) => `
    <div style="background:#fff;border-radius:var(--r);padding:16px;border:1px solid var(--g100);display:flex;gap:14px;align-items:flex-start">
      <div style="width:52px;height:52px;border-radius:12px;background:${f.color};display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;overflow:hidden">${mediaMarkup(f.image)}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:15px;font-weight:700;margin-bottom:3px">${esc(f.name)}</div>
        <div style="font-size:12px;color:var(--g500);margin-bottom:6px">${esc(f.description.slice(0, 100))}…</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px">${(f.features || []).map((ft) => `<span style="background:var(--g100);padding:2px 8px;border-radius:100px;font-size:11px">${esc(ft)}</span>`).join("")}</div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0"><button class="btn btn-sm btn-g" onclick="openModal('facility','${f.id}')">Edit</button><button class="btn btn-sm btn-r" onclick="delItem('facilities','${f.id}','facilities-mgr')"><span class="ico ico-x" data-ico="x" aria-hidden="true"></span></button></div>
    </div>`,
            )
            .join("") ||
          '<div style="padding:24px;text-align:center;color:var(--g400)">No facilities yet.</div>';
      }

      // ── HOUSES ─────────────────────────────────────────────────
      function renderHouses() {
        const items = DB.getAll("houses").sort((a, b) => a.order - b.order);
        document.getElementById("house-list").innerHTML =
          items
            .map(
              (h) => `
    <div style="background:#fff;border-radius:var(--r);padding:16px;border-left:4px solid ${h.color};border:1px solid var(--g100);border-left:4px solid ${h.color};display:flex;gap:14px;align-items:flex-start">
      <div style="width:58px;height:58px;border-radius:12px;background:${h.color}22;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;overflow:hidden">${mediaMarkup(h.image || '<span class="ico ico-home" data-ico="home" aria-hidden="true"></span>')}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
          <div style="width:18px;height:18px;border-radius:50%;background:${h.color};flex-shrink:0"></div>
          <span style="font-size:16px;font-weight:700">${esc(h.name)}</span>
          <span style="background:${h.color}22;color:${h.color};padding:2px 8px;border-radius:100px;font-size:11px;font-weight:700">${h.gender}</span>
        </div>
        <div style="font-size:12px;color:var(--g500)">Master: ${esc(h.master || "Not set")}</div>
        <div style="font-size:12px;color:var(--g500)">Assistant: ${esc(h.assistantMaster || "Not set")}</div>
        <div style="font-size:12px;color:var(--g500);font-style:italic">${esc(h.motto)}</div>
        <div style="font-size:11px;color:var(--g400);margin-top:4px">${(h.gallery || []).length} gallery image(s)</div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0"><button class="btn btn-sm btn-g" onclick="openModal('house','${h.id}')">Edit</button><button class="btn btn-sm btn-r" onclick="delItem('houses','${h.id}','houses-mgr')"><span class="ico ico-x" data-ico="x" aria-hidden="true"></span></button></div>
    </div>`,
            )
            .join("") ||
          '<div style="padding:24px;text-align:center;color:var(--g400)">No houses yet.</div>';
      }

      // ── CLUBS ──────────────────────────────────────────────────
      function renderClubs() {
        const items = DB.getAll("clubs").sort((a, b) => a.order - b.order);
        document.getElementById("clubs-list").innerHTML =
          items
            .map(
              (c) => `
    <div style="background:#fff;border-radius:var(--r);padding:16px;border:1px solid var(--g100);display:flex;gap:14px;align-items:flex-start">
      <div style="width:48px;height:48px;border-radius:12px;background:${c.color};display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;overflow:hidden">${mediaMarkup(c.image)}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:15px;font-weight:700;margin-bottom:3px">${esc(c.name)} <span style="background:${c.color};color:${c.colorText};padding:2px 8px;border-radius:100px;font-size:10px;font-weight:700">${c.category}</span></div>
        <div style="font-size:12px;color:var(--g500)">Coordinator: ${esc(c.coordinator)} · ${esc(c.meetingDays)}</div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0"><button class="btn btn-sm btn-g" onclick="openModal('club','${c.id}')">Edit</button><button class="btn btn-sm btn-r" onclick="delItem('clubs','${c.id}','clubs-mgr')"><span class="ico ico-x" data-ico="x" aria-hidden="true"></span></button></div>
    </div>`,
            )
            .join("") ||
          '<div style="padding:24px;text-align:center;color:var(--g400)">No clubs yet.</div>';
      }

      // ── STUDENTS ───────────────────────────────────────────────
      let _allStudents = [];
      function renderStudents(q = "", prog = "") {
        _allStudents = DB.getAll("students");
        const filtered = _allStudents.filter((s) => {
          const mq =
            !q ||
            s.name.toLowerCase().includes(q.toLowerCase()) ||
            s.indexNo?.toLowerCase().includes(q.toLowerCase());
          const mp = !prog || s.programme === prog;
          return mq && mp;
        });
        document.getElementById("students-pager-info").textContent =
          `Showing ${filtered.length} of ${_allStudents.length} students`;
        document.getElementById("students-table").innerHTML =
          `<thead><tr><th><input type="checkbox" onchange="document.querySelectorAll('.admin-student-select').forEach(x=>x.checked=this.checked)" style="accent-color:var(--b6)"></th><th>Student</th><th>Programme</th><th>Year</th><th>Class</th><th>Status</th><th>Actions</th></tr></thead><tbody>` +
          filtered
            .map(
              (s) =>
                `<tr><td><input class="admin-student-select" type="checkbox" value="${s.id}" style="accent-color:var(--b6)"></td><td><div style="display:flex;align-items:center;gap:10px"><div class="av-sm" style="background:var(--gp)">${s.name.slice(0, 2).toUpperCase()}</div><div><div style="font-weight:600">${esc(s.name)}</div><div style="font-size:11px;color:var(--g400)">${esc(s.indexNo || "")}</div></div></div></td><td>${esc(s.programme)}</td><td>${esc(s.year)}</td><td>${esc(s.class)}</td><td><span class="tag ${s.status === "active" ? "tag-g" : s.status === "suspended" ? "tag-r" : "tag-y"}">${s.status}</span></td><td style="white-space:nowrap"><button class="btn btn-sm btn-g" onclick="openModal('student','${s.id}')">Edit</button> <button class="btn btn-sm btn-r" onclick="delItem('students','${s.id}','students-mgr')"><span class="ico ico-x" data-ico="x" aria-hidden="true"></span></button></td></tr>`,
            )
            .join("") +
          `</tbody>`;
        hydrateIcons(document.getElementById("students-table"));
      }
      function filterStudents(q) {
        const prog = document.getElementById("student-prog-filter").value;
        renderStudents(q, prog);
      }

      // ── TEACHERS ──────────────────────────────────────────────
      function renderTeachers() {
        const items = DB.getAll("teachers");
        document.getElementById("teachers-table").innerHTML =
          `<thead><tr><th><input type="checkbox" onchange="document.querySelectorAll('.admin-teacher-select').forEach(x=>x.checked=this.checked)" style="accent-color:var(--b6)"></th><th>Teacher</th><th>Subject</th><th>Dept</th><th>Form Class</th><th>Status</th><th>Actions</th></tr></thead><tbody>` +
          items
            .map(
              (t) =>
                `<tr><td><input class="admin-teacher-select" type="checkbox" value="${t.id}" style="accent-color:var(--b6)"></td><td><div style="display:flex;align-items:center;gap:10px"><div class="av-sm" style="background:var(--gs)">${t.name.slice(0, 2).toUpperCase()}</div><div><div style="font-weight:600">${esc(t.name)}</div><div style="font-size:11px;color:var(--g400)">${esc(t.email || "")}</div></div></div></td><td>${esc(t.subject)}</td><td>${esc(t.department)}</td><td>${t.formMaster ? esc(t.formClass) : "—"}</td><td><span class="tag ${t.status === "active" ? "tag-g" : "tag-y"}">${t.status}</span></td><td style="white-space:nowrap"><button class="btn btn-sm btn-g" onclick="openModal('teacher','${t.id}')">Edit</button> <button class="btn btn-sm btn-r" onclick="delItem('teachers','${t.id}','teachers-mgr')"><span class="ico ico-x" data-ico="x" aria-hidden="true"></span></button></td></tr>`,
            )
            .join("") +
          `</tbody>`;
        hydrateIcons(document.getElementById("teachers-table"));
      }

      // ── APPLICATIONS ───────────────────────────────────────────
      function appStatusMeta(status) {
        return (
          {
            submitted: {
              label: "Submitted",
              color: "var(--b6)",
              bg: "rgba(37,99,235,.08)",
            },
            under_review: {
              label: "Under Review",
              color: "#d97706",
              bg: "rgba(245,158,11,.1)",
            },
            approved: {
              label: "Accepted",
              color: "#059669",
              bg: "rgba(16,185,129,.1)",
            },
            rejected: {
              label: "Declined",
              color: "var(--r6)",
              bg: "rgba(220,38,38,.08)",
            },
          }[status] || {
            label: status || "Submitted",
            color: "var(--g500)",
            bg: "var(--g100)",
          }
        );
      }
      function appDocLinks(app) {
        const docs = app.documents || [];
        if (!docs.length)
          return '<div style="font-size:12px;color:var(--g400)">No uploaded documents are attached to this record.</div>';
        return docs
          .map((d) => {
            const size = d.size ? `${Math.round(d.size / 1024)} KB` : "";
            return `<a href="${d.data || "#"}" download="${esc(d.name || d.label || "document")}" target="_blank" rel="noopener" style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border:1px solid var(--g100);border-radius:10px;text-decoration:none;color:var(--g800);background:#fff;margin-bottom:8px">
              <span><strong style="font-size:13px">${esc(d.label || "Document")}</strong><br><span style="font-size:11px;color:var(--g500)">${esc(d.name || "")} ${size ? "· " + size : ""}</span></span>
              <span class="tag tag-b">View</span>
            </a>`;
          })
          .join("");
      }
      function notifyApplicationGuardian(app, status, note = "") {
        const accepted = status === "approved";
        const message = `${accepted ? "Congratulations" : "Dear Parent/Guardian"}, ${app.name || "the applicant"}'s admission application (${app.ref}) has been ${accepted ? "accepted" : "declined"} by New Juaben Senior High School.${note ? " Note: " + note : ""}`;
        DB.add("notifications", {
          title: `Admission ${accepted ? "Accepted" : "Declined"}: ${app.ref}`,
          message,
          audience: "Parent/Guardian",
          sentDate: new Date().toISOString().split("T")[0],
          status: "delivered",
        });
        if (app.guardianEmail) {
          window.open(
            `mailto:${encodeURIComponent(app.guardianEmail)}?subject=${encodeURIComponent("NJUASCO admission application " + app.ref)}&body=${encodeURIComponent(message)}`,
            "_blank",
          );
        }
        if (app.guardianPhone) {
          window.open(
            `sms:${encodeURIComponent(app.guardianPhone)}?&body=${encodeURIComponent(message)}`,
            "_blank",
          );
        }
      }
      async function setApplicationReviewStatus(id) {
        const app = DB.getById("applications", id);
        if (!app) return;
        const timeline = app.timeline || [];
        timeline.push({
          status: "under_review",
          title: "Application under review",
          date: new Date().toISOString(),
          note: "Application moved to admissions review.",
        });
        const changes = { status: "under_review", stage: "Under review", timeline };
        DB.update("applications", id, changes);
        await DB.updateRemoteApplicationStatus?.(app, changes);
        renderApplications();
        openApplicationReview(id);
        toast("Application moved to review");
      }
      async function updateApplicationStatus(id, status) {
        const app = DB.getById("applications", id);
        if (!app) return;
        const note = document.getElementById("app-action-note")?.value.trim() || "";
        const timeline = app.timeline || [];
        timeline.push({
          status,
          title:
            status === "approved"
              ? "Application accepted"
              : "Application declined",
          date: new Date().toISOString(),
          note:
            note ||
            (status === "approved"
              ? "Admission offer approved by the admissions office."
              : "Application declined by the admissions office."),
        });
        const changes = {
          status,
          stage: status === "approved" ? "Accepted" : "Declined",
          decisionDate: new Date().toISOString().split("T")[0],
          decisionNote: note,
          timeline,
        };
        DB.update("applications", id, changes);
        const remote = await DB.updateRemoteApplicationStatus?.(app, changes);
        if (!remote) {
          toast("Saved locally. Supabase will update when the connection is available.");
        }
        notifyApplicationGuardian(app, status, note);
        renderApplications();
        openApplicationReview(id);
        toast(
          status === "approved"
            ? "Application accepted and guardian notification prepared."
            : "Application declined and guardian notification prepared.",
        );
      }
      function openApplicationReview(id) {
        const app = DB.getById("applications", id);
        const wrap = document.getElementById("app-review-modal");
        if (!app || !wrap) return;
        const meta = appStatusMeta(app.status);
        wrap.style.display = "block";
        wrap.innerHTML = `<div style="position:fixed;inset:0;background:rgba(15,23,42,.46);z-index:9998;display:flex;align-items:center;justify-content:center;padding:18px" onclick="if(event.target===this)closeApplicationReview()">
          <div style="width:min(980px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 24px 80px rgba(15,23,42,.22)">
            <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding:24px;border-bottom:1px solid var(--g100)">
              <div><div style="font-size:12px;color:var(--g400);font-weight:700;text-transform:uppercase;letter-spacing:.08em">${esc(app.ref)}</div><div style="font-family:'Playfair Display',serif;font-size:28px;font-weight:900;color:var(--g900)">${esc(app.name || "Applicant")}</div><div style="font-size:13px;color:var(--g500);margin-top:4px">${esc(app.programme || "-")} · Aggregate ${esc(app.aggregate || "-")} · Applied ${fmtDate(app.date)}</div></div>
              <button class="btn btn-sm btn-g" onclick="closeApplicationReview()">Close</button>
            </div>
            <div style="display:grid;grid-template-columns:minmax(0,1.15fr) minmax(280px,.85fr);gap:18px;padding:24px">
              <div>
                <div style="display:inline-flex;padding:7px 13px;border-radius:999px;background:${meta.bg};color:${meta.color};font-size:12px;font-weight:800;border:1px solid ${meta.color}33;margin-bottom:14px">${meta.label}</div>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:18px">
                  ${[
                    ["Date of Birth", app.dob],
                    ["Gender", app.gender],
                    ["Phone", app.phone],
                    ["Address", app.address],
                    ["Previous School", app.school],
                    ["BECE Year", app.beceYear],
                  ].map(([k, v]) => `<div style="background:var(--g50);border:1px solid var(--g100);border-radius:12px;padding:12px"><div style="font-size:10px;text-transform:uppercase;color:var(--g400);font-weight:800">${k}</div><div style="font-size:13px;color:var(--g800);font-weight:600;margin-top:4px">${esc(v || "-")}</div></div>`).join("")}
                </div>
                <div style="font-size:15px;font-weight:800;color:var(--g900);margin-bottom:10px">Uploaded Files</div>
                ${appDocLinks(app)}
              </div>
              <div>
                <div style="background:var(--g50);border:1px solid var(--g100);border-radius:14px;padding:16px;margin-bottom:14px">
                  <div style="font-size:15px;font-weight:800;color:var(--g900);margin-bottom:10px">Parent / Guardian</div>
                  <div style="font-size:13px;color:var(--g700);line-height:1.8">${esc(app.guardianName || "-")} (${esc(app.guardianRelation || "Guardian")})<br>${esc(app.guardianPhone || "No phone")}<br>${esc(app.guardianEmail || "No email")}<br>${esc(app.guardianOccupation || "")}</div>
                </div>
                <label class="flbl">Decision note sent with email/SMS</label>
                <textarea class="finp fta" id="app-action-note" placeholder="Add reporting instructions, missing document notes, or reason for decline...">${esc(app.decisionNote || "")}</textarea>
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
                  <button class="btn btn-g" onclick="setApplicationReviewStatus('${app.id}')">Mark Review</button>
                  <button class="btn btn-p" onclick="updateApplicationStatus('${app.id}','approved')">Accept</button>
                  <button class="btn btn-r" onclick="updateApplicationStatus('${app.id}','rejected')">Decline</button>
                </div>
                <div style="font-size:11px;color:var(--g400);line-height:1.5;margin-top:10px">Email and SMS open as prepared drafts on this static site. Supabase Edge Functions can later send them automatically.</div>
              </div>
            </div>
          </div>
        </div>`;
      }
      function closeApplicationReview() {
        const wrap = document.getElementById("app-review-modal");
        if (wrap) {
          wrap.style.display = "none";
          wrap.innerHTML = "";
        }
      }
      function renderApplications() {
        const apps = DB.getAll("applications");
        const counts = {
          submitted: 0,
          under_review: 0,
          approved: 0,
          rejected: 0,
        };
        apps.forEach((a) => {
          if (counts[a.status] !== undefined) counts[a.status]++;
        });
        document.getElementById("apps-stats").innerHTML = `
    <div style="background:#fff;border-radius:var(--r);padding:14px;text-align:center;border:1px solid var(--g100)"><div style="font-size:22px;font-weight:700;color:var(--b6)">${counts.submitted + counts.under_review}</div><div style="font-size:11px;color:var(--g500)">Pending</div></div>
    <div style="background:#fff;border-radius:var(--r);padding:14px;text-align:center;border:1px solid var(--g100)"><div style="font-size:22px;font-weight:700;color:var(--gn)">${counts.approved}</div><div style="font-size:11px;color:var(--g500)">Accepted</div></div>
    <div style="background:#fff;border-radius:var(--r);padding:14px;text-align:center;border:1px solid var(--g100)"><div style="font-size:22px;font-weight:700;color:var(--r6)">${counts.rejected}</div><div style="font-size:11px;color:var(--g500)">Declined</div></div>
    <div style="background:#fff;border-radius:var(--r);padding:14px;text-align:center;border:1px solid var(--g100)"><div style="font-size:22px;font-weight:700;color:var(--g900)">${apps.length}</div><div style="font-size:11px;color:var(--g500)">Total</div></div>`;
        document.getElementById("apps-table").innerHTML =
          `<thead><tr><th>Reference</th><th>Applicant</th><th>Programme</th><th>Aggregate</th><th>Files</th><th>Applied</th><th>Status</th><th>Actions</th></tr></thead><tbody>` +
          apps
            .map(
              (
                a,
              ) => `<tr><td style="font-family:monospace;font-size:11px">${esc(a.ref)}</td><td style="font-weight:600">${esc(a.name)}<div style="font-size:11px;color:var(--g400)">${esc(a.guardianEmail || a.guardianPhone || "")}</div></td><td>${esc(a.programme)}</td><td>${a.aggregate || "—"}</td><td><span class="tag tag-b">${(a.documents || []).length} files</span></td><td>${fmtDate(a.date)}</td><td>${statusTag(a.status)}</td><td style="white-space:nowrap;display:flex;gap:6px">
      <button class="btn btn-sm btn-p" onclick="openApplicationReview('${a.id}')">Take Action</button>
      <button class="btn btn-sm btn-r" onclick="delItem('applications','${a.id}','admissions-mgr')"><span class="ico ico-x" data-ico="x" aria-hidden="true"></span></button>
    </td></tr>`,
            )
            .join("") +
          `</tbody>`;
      }
      function exportCSV() {
        const apps = DB.getAll("applications");
        const csv = [
          "Reference,Name,Programme,Aggregate,Status,Date,Guardian,Guardian Email,Guardian Phone,Files",
          ...apps.map(
            (a) =>
              [
                a.ref,
                a.name,
                a.programme,
                a.aggregate || "",
                a.status,
                a.date,
                a.guardianName || "",
                a.guardianEmail || "",
                a.guardianPhone || "",
                (a.documents || []).length,
              ]
                .map((v) => `"${String(v).replace(/"/g, '""')}"`)
                .join(","),
          ),
        ].join("\n");
        const b = new Blob([csv], { type: "text/csv" });
        const u = URL.createObjectURL(b);
        const a = document.createElement("a");
        a.href = u;
        a.download = "njuasco-applications.csv";
        a.click();
        URL.revokeObjectURL(u);
        toast("CSV exported!");
      }
      function exportApplicationsPDF() {
        const apps = DB.getAll("applications");
        const rows = apps
          .map(
            (a) =>
              `<tr><td>${esc(a.ref)}</td><td>${esc(a.name)}</td><td>${esc(a.programme)}</td><td>${esc(a.aggregate || "")}</td><td>${esc(appStatusMeta(a.status).label)}</td><td>${fmtDate(a.date)}</td><td>${(a.documents || []).length}</td></tr>`,
          )
          .join("");
        const w = window.open("", "_blank");
        if (!w) return toast("Popup blocked. Please allow popups to export PDF.");
        w.document.write(`<!doctype html><html><head><title>NJUASCO Admission Applications</title><style>
          body{font-family:Arial,sans-serif;color:#111827;margin:32px}.head{display:flex;align-items:center;gap:14px;border-bottom:3px solid #2563eb;padding-bottom:14px;margin-bottom:22px}
          img{width:64px;height:64px;object-fit:contain}.school{font-size:22px;font-weight:800}.sub{font-size:12px;color:#6b7280;margin-top:3px}
          table{width:100%;border-collapse:collapse;font-size:12px}th{text-align:left;background:#eff6ff;color:#1d4ed8;padding:10px;border:1px solid #dbeafe}td{padding:9px;border:1px solid #e5e7eb}
          .meta{font-size:12px;color:#4b5563;margin-bottom:16px}.foot{margin-top:20px;font-size:11px;color:#6b7280}
        </style></head><body><div class="head"><img src="NJUASCO LOGO.png"><div><div class="school">New Juaben Senior High School</div><div class="sub">Admission Applications Export</div></div></div><div class="meta">Generated ${new Date().toLocaleString()} · ${apps.length} application(s)</div><table><thead><tr><th>Reference</th><th>Applicant</th><th>Programme</th><th>Aggregate</th><th>Status</th><th>Applied</th><th>Files</th></tr></thead><tbody>${rows}</tbody></table><div class="foot">NJUASCO Admissions Office · HARDWORK</div><script>window.onload=()=>{window.print();}<\/script></body></html>`);
        w.document.close();
      }

      // ── DONATIONS ──────────────────────────────────────────────
      function renderDonations() {
        const items = DB.getAll("donations");
        const total = items.reduce(
          (s, d) => (d.status === "completed" ? s + d.amount : s),
          0,
        );
        const pending = items.filter((d) => d.status === "pending").length;
        document.getElementById("donation-stats").innerHTML = `
    <div class="stat-w"><div class="sw-ic" style="background:rgba(220,38,38,.1)"><span class="ico ico-heart" data-ico="heart" aria-hidden="true"></span></div><div class="sw-num">GHS ${total.toLocaleString()}</div><div class="sw-lbl">Total Received</div></div>
    <div class="stat-w"><div class="sw-ic" style="background:rgba(37,99,235,.1)">👥</div><div class="sw-num">${items.length}</div><div class="sw-lbl">Total Donors</div></div>
    <div class="stat-w"><div class="sw-ic" style="background:rgba(245,158,11,.1)">⏳</div><div class="sw-num">${pending}</div><div class="sw-lbl">Pending</div></div>
    <div class="stat-w"><div class="sw-ic" style="background:rgba(16,185,129,.1)"><span class="ico ico-check" data-ico="check" aria-hidden="true"></span></div><div class="sw-num">${items.length - pending}</div><div class="sw-lbl">Completed</div></div>`;
        document.getElementById("donations-table").innerHTML =
          `<thead><tr><th>Donor</th><th>Amount</th><th>Purpose</th><th>Method</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>` +
          items
            .map(
              (d) =>
                `<tr><td style="font-weight:600">${d.anonymous ? "Anonymous" : esc(d.donor)}</td><td style="font-weight:700;color:var(--gn)">GHS ${d.amount?.toLocaleString()}</td><td>${esc(d.purpose)}</td><td>${esc(d.method)}</td><td>${fmtDate(d.date)}</td><td><span class="tag ${d.status === "completed" ? "tag-g" : "tag-y"}">${d.status}</span></td><td><button class="btn btn-sm btn-r" onclick="delItem('donations','${d.id}','donations-mgr')"><span class="ico ico-x" data-ico="x" aria-hidden="true"></span></button></td></tr>`,
            )
            .join("") +
          `</tbody>`;
      }

      // ── MERCHANDISE ────────────────────────────────────────────
      function renderMerch() {
        const items = DB.getAll("merchandise");
        document.getElementById("merch-list").innerHTML =
          items
            .map(
              (m) => `
    <div style="background:#fff;border-radius:var(--rl);overflow:hidden;box-shadow:var(--sh1);border:1px solid var(--g100)">
      <div style="aspect-ratio:1;background:var(--g50);display:flex;align-items:center;justify-content:center;font-size:56px;overflow:hidden">${mediaMarkup(m.image)}</div>
      <div style="padding:14px">
        <div style="font-size:13px;font-weight:700;margin-bottom:4px">${esc(m.name)}</div>
        <div style="font-size:16px;font-weight:700;color:var(--b6);margin-bottom:4px">GHS ${m.price}</div>
        <div style="font-size:11px;color:${m.stock ? "var(--gn)" : "var(--r6)"};margin-bottom:10px">${m.stock ? '<span class="ico ico-check" data-ico="check" aria-hidden="true"></span> In Stock' : "✗ Out of Stock"}</div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm btn-g" onclick="openModal('merch','${m.id}')">Edit</button>
          <button class="btn btn-sm btn-g" onclick="adminQuickUpdate('merchandise','${m.id}',{stock:${!m.stock}},'merch-mgr')">${m.stock ? "Mark OOS" : "Mark In Stock"}</button>
          <button class="btn btn-sm btn-r" onclick="delItem('merchandise','${m.id}','merch-mgr')"><span class="ico ico-x" data-ico="x" aria-hidden="true"></span></button>
        </div>
      </div>
    </div>`,
            )
            .join("") ||
          '<div style="padding:24px;text-align:center;color:var(--g400);grid-column:1/-1">No products yet.</div>';
      }

      // ── NOTIFICATIONS ──────────────────────────────────────────
      function renderOrders() {
        const orders = DB.getAll("orders").sort(
          (a, b) => new Date(b.date || 0) - new Date(a.date || 0),
        );
        const paid = orders.filter((o) =>
          ["paid", "fulfilled", "completed"].includes(o.status),
        ).length;
        const pending = orders.filter((o) =>
          String(o.status || "").includes("pending"),
        ).length;
        const total = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
        document.getElementById("order-stats").innerHTML = `
    <div class="stat-w"><div class="sw-ic" style="background:rgba(37,99,235,.1)"><span class="ico ico-cart" data-ico="cart" aria-hidden="true"></span></div><div class="sw-num">${orders.length}</div><div class="sw-lbl">Total Orders</div></div>
    <div class="stat-w"><div class="sw-ic" style="background:rgba(16,185,129,.1)"><span class="ico ico-check" data-ico="check" aria-hidden="true"></span></div><div class="sw-num">${paid}</div><div class="sw-lbl">Paid / Fulfilled</div></div>
    <div class="stat-w"><div class="sw-ic" style="background:rgba(245,158,11,.1)">...</div><div class="sw-num">${pending}</div><div class="sw-lbl">Pending</div></div>
    <div class="stat-w"><div class="sw-ic" style="background:rgba(147,51,234,.1)">GHS</div><div class="sw-num">${total.toLocaleString()}</div><div class="sw-lbl">Order Value</div></div>`;
        document.getElementById("orders-table").innerHTML =
          `<thead><tr><th>Ref</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead><tbody>` +
          (orders
            .map((o) => {
              const items = (o.items || [])
                .map((i) => `${esc(i.name)} x${i.qty || i.quantity || 1}`)
                .join("<br>");
              const status = String(o.status || "pending");
              const tag =
                status === "fulfilled" || status === "completed" || status === "paid"
                  ? "tag-g"
                  : status.includes("pending")
                    ? "tag-y"
                    : "tag-b";
              return `<tr><td style="font-weight:700">${esc(o.ref || o.id)}</td><td><div style="font-weight:600">${esc(o.customer)}</div><div style="font-size:11px;color:var(--g500)">Ward: ${esc(o.wardName || o.address || "—")}${o.wardClass ? ` · ${esc(o.wardClass)}` : ""}</div><div style="font-size:11px;color:var(--g400)">${esc(o.phone || o.email || "")}</div></td><td>${items || "-"}</td><td style="font-weight:700;color:var(--b6)">GHS ${(Number(o.total) || 0).toLocaleString()}</td><td>${esc(o.paymentMethod || "")}</td><td><span class="tag ${tag}">${esc(status)}</span></td><td>${fmtDate(o.date)}</td><td style="white-space:nowrap"><button class="btn btn-sm btn-g" onclick="adminQuickUpdate('orders','${o.id}',{status:'paid'},'orders-mgr')">Paid</button> <button class="btn btn-sm btn-g" onclick="adminQuickUpdate('orders','${o.id}',{status:'fulfilled'},'orders-mgr')">Fulfilled</button> <button class="btn btn-sm btn-r" onclick="delItem('orders','${o.id}','orders-mgr')"><span class="ico ico-x" data-ico="x" aria-hidden="true"></span></button></td></tr>`;
            })
            .join("") ||
            '<tr><td colspan="8" style="text-align:center;color:var(--g400);padding:24px">No shop orders yet.</td></tr>') +
          `</tbody>`;
        hydrateIcons(document.getElementById("orders-table"));
      }

      function downloadOrderFulfillmentList() {
        const orders = DB.getAll("orders").filter((o) =>
          ["paid", "fulfilled", "completed", "pending", "pending_payment"].includes(String(o.status || "")),
        );
        if (!orders.length) {
          toast("No shop orders to export yet");
          return;
        }
        const lines = [
          "NJUASCO SCHOOL SHOP — WARD COLLECTION LIST",
          `Generated: ${new Date().toLocaleString("en-GB")}`,
          "Collection: Items are handed to wards at school by the form teacher in charge.",
          "",
        ];
        const grouped = {};
        orders.forEach((order) => {
          const wardKey = `${order.wardName || order.address || "Unknown Ward"}|${order.wardClass || ""}`;
          if (!grouped[wardKey]) {
            grouped[wardKey] = {
              wardName: order.wardName || order.address || "Unknown Ward",
              wardClass: order.wardClass || "",
              parent: order.customer || "",
              phone: order.phone || "",
              orders: [],
            };
          }
          grouped[wardKey].orders.push(order);
        });
        Object.values(grouped)
          .sort((a, b) => a.wardName.localeCompare(b.wardName))
          .forEach((group, index) => {
            lines.push(`${index + 1}. WARD: ${group.wardName}${group.wardClass ? ` (${group.wardClass})` : ""}`);
            lines.push(`   Parent/Guardian: ${group.parent}`);
            lines.push(`   Phone: ${group.phone || "—"}`);
            lines.push("   Items:");
            group.orders.forEach((order) => {
              lines.push(`   - Order ${order.ref || order.id} · ${fmtDate(order.date)} · ${String(order.status || "pending")}`);
              (order.items || []).forEach((item) => {
                lines.push(`     • ${item.name} × ${item.qty || item.quantity || 1}`);
              });
            });
            lines.push("");
          });
        const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `njuasco-shop-ward-collection-${new Date().toISOString().slice(0, 10)}.txt`;
        link.click();
        URL.revokeObjectURL(url);
        toast("Ward collection list downloaded");
      }

      function renderMessages() {
        const items = DB.getAll("messages").sort((a, b) => String(b.id || "").localeCompare(String(a.id || "")));
        document.getElementById("messages-table").innerHTML =
          `<thead><tr><th><input type="checkbox" style="accent-color:var(--b6)" onchange="document.querySelectorAll('.admin-message-select').forEach(el=>el.checked=this.checked)"></th><th>Name</th><th>Subject</th><th>Message</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>` +
          (items
            .map(
              (m) =>
                `<tr><td><input class="admin-message-select" type="checkbox" value="${m.id}" style="accent-color:var(--b6)"></td><td style="font-weight:600">${esc(m.name)}<div style="font-size:11px;color:var(--g400)">${esc(m.email || "")}</div></td><td>${esc(m.subject || "Website message")}</td><td style="max-width:340px;white-space:normal;line-height:1.45">${esc(m.message || "")}</td><td>${fmtDate(m.date)}${m.time ? `<div style="font-size:11px;color:var(--g400)">${esc(m.time)}</div>` : ""}</td><td><span class="tag ${m.status === "read" ? "tag-g" : "tag-b"}">${esc(m.status || "new")}</span></td><td style="white-space:nowrap"><button class="btn btn-sm btn-g" onclick="adminQuickUpdate('messages','${m.id}',{status:'read'},'messages-mgr')">Read</button> <button class="btn btn-sm btn-r" onclick="delItem('messages','${m.id}','messages-mgr')">Delete</button></td></tr>`,
            )
            .join("") ||
            '<tr><td colspan="7" style="text-align:center;color:var(--g400);padding:24px">No website messages yet.</td></tr>') +
          `</tbody>`;
      }

      function renderNotifs() {
        const items = DB.getAll("notifications");
        document.getElementById("notif-table").innerHTML =
          `<thead><tr><th>Title</th><th>Audience</th><th>Priority</th><th>Sent</th><th>Status</th><th>Actions</th></tr></thead><tbody>` +
          (items
            .map(
              (n) =>
                `<tr><td style="font-weight:600">${esc(n.title)}</td><td>${esc(n.audience)}</td><td><span class="tag ${n.priority === "urgent" ? "tag-r" : n.priority === "high" ? "tag-y" : "tag-b"}">${n.priority}</span></td><td>${fmtDate(n.sentDate)}</td><td><span class="tag tag-g">${n.status}</span></td><td><button class="btn btn-sm btn-r" onclick="delItem('notifications','${n.id}','notif-mgr')">Delete</button></td></tr>`,
            )
            .join("") ||
            '<tr><td colspan="6" style="text-align:center;color:var(--g400);padding:24px">No notifications yet.</td></tr>') +
          `</tbody>`;
      }

      // ── LOGS ───────────────────────────────────────────────────
      function renderLogs() {
        const logs = DB.getAll("logs");
        document.getElementById("logs-table").innerHTML =
          `<thead><tr><th>User</th><th>Action</th><th>Detail</th><th>IP</th><th>Time</th></tr></thead><tbody>` +
          logs
            .map(
              (l) =>
                `<tr><td style="font-weight:600">${esc(l.user)}</td><td><span class="tag tag-b">${esc(l.action)}</span></td><td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.detail)}</td><td style="font-family:monospace;font-size:11px">${esc(l.ip)}</td><td style="white-space:nowrap">${l.time}</td></tr>`,
            )
            .join("") +
          `</tbody>`;
      }

      function clearLogs() {
        confirmAct(
          "Clear all logs?",
          "This will permanently erase the activity log.",
          "Clear",
          async () => {
            DB._set("logs", []);
            renderLogs();
            await syncAfterChange("Logs cleared.", "logs-mgr");
          },
        );
      }

      // ── TABS ───────────────────────────────────────────────────
      function stab2(btn, pane) {
        btn
          .closest(".atabs")
          .querySelectorAll(".atab")
          .forEach((t) => t.classList.remove("active"));
        btn.classList.add("active");
        const pg = btn.closest(".apage");
        pg.querySelectorAll(".atpane").forEach((p) =>
          p.classList.remove("active"),
        );
        const target = document.getElementById(pane);
        if (target) target.classList.add("active");
      }

      function loadSettings() {
        const render = () => {
          const info = DB.getInfo();
          DB.getAuthUser?.().then((user) => {
            const emailEl = document.getElementById("pw-email");
            if (emailEl && !emailEl.value) {
              emailEl.value = user?.email || info.primaryAdminEmail || info.email || "info@njuasco.edu.gh";
            }
          });
          const set = (id, value) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (el.type === "checkbox") el.checked = !!value;
            else el.value = value ?? "";
          };
          set("set-logging", info.activityLogging !== false);
          set("set-maintenance", info.maintenanceMode === true);
          set("set-portal-coming-soon", info.portalComingSoon === true);
          set("set-site-url", info.siteUrl || "");
          set("set-maint-title", info.maintenanceTitle || "Site Under Maintenance");
          set(
            "set-maint-msg",
            info.maintenanceMessage ||
              "We are updating the website. Please check back soon.",
          );
          const topToggle = document.getElementById("top-maint-toggle");
          if (topToggle) topToggle.checked = info.maintenanceMode === true;
        };
        render();
        if (DB?.syncRemoteInfo) {
          DB.syncRemoteInfo().then(() => render());
        }
        if (DB?.subscribeRemoteInfo) {
          DB.subscribeRemoteInfo(() => render());
        }
      }

      async function toggleMaintenanceMode(enabled) {
        const info = {
          ...DB.getInfo(),
          maintenanceMode: !!enabled,
        };
        await persistSiteInfo(info, enabled ? "Maintenance mode enabled." : "Maintenance mode disabled.");
        const setMaint = document.getElementById("set-maintenance");
        if (setMaint) setMaint.checked = !!enabled;
        const topToggle = document.getElementById("top-maint-toggle");
        if (topToggle) topToggle.checked = !!enabled;
      }

      async function saveSettings() {
        const g = (id) => document.getElementById(id)?.value || "";
        const synced = await DB.saveInfo({
          ...DB.getInfo(),
          activityLogging: document.getElementById("set-logging")?.checked !== false,
          maintenanceMode: document.getElementById("set-maintenance")?.checked === true,
          portalComingSoon: document.getElementById("set-portal-coming-soon")?.checked === true,
          siteUrl: g("set-site-url"),
          maintenanceTitle: g("set-maint-title") || "Site Under Maintenance",
          maintenanceMessage:
            g("set-maint-msg") ||
            "We are updating the website. Please check back soon.",
        });
        updateSyncBanner(synced);
        const topToggle = document.getElementById("top-maint-toggle");
        if (topToggle) topToggle.checked = document.getElementById("set-maintenance")?.checked === true;
        toast(synced ? "Settings saved and synced to all devices." : "Settings saved locally. Sign in with Supabase Auth to sync.");
      }

      // ── PASSWORD ───────────────────────────────────────────────
      async function chpw() {
        const email = document.getElementById("pw-email").value.trim().toLowerCase();
        const cur = document.getElementById("pw-cur").value;
        const nw = document.getElementById("pw-new").value;
        const cn = document.getElementById("pw-con").value;
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          toast("Enter a valid admin email");
          return;
        }
        if (!cur) {
          toast("Enter your current password");
          return;
        }
        if (nw && nw.length < 8) {
          toast("New password must be at least 8 characters");
          return;
        }
        if (nw !== cn) {
          toast("Passwords do not match");
          return;
        }
        try {
          const result = await DB.updateCurrentUserCredentials(cur, {
            email,
            password: nw,
          });
          const info = DB.getInfo();
          const emails = DB.getAdminEmails ? DB.getAdminEmails() : ["info@njuasco.edu.gh", "novatech1025@gmail.com"];
          if (!emails.includes(email)) emails.push(email);
          DB.saveInfo({
            ...info,
            primaryAdminEmail: email,
            adminEmails: emails,
          });
          toast(
            result?.requestedEmail
              ? '<span class="ico ico-check" data-ico="check" aria-hidden="true"></span> Login updated. Confirm the new email if Supabase sends a confirmation link.'
              : '<span class="ico ico-check" data-ico="check" aria-hidden="true"></span> Admin login updated successfully!',
          );
          document.getElementById("pw-cur").value = "";
          document.getElementById("pw-new").value = "";
          document.getElementById("pw-con").value = "";
        } catch (error) {
          toast(error?.message || "Could not update Supabase admin login");
        }
      }

      // ── SUB-ADMINS ────────────────────────────────────────────
      DB._getSaAdmins = function () {
        return this._get("subadmins");
      };
      DB._saveSaAdmins = function (d) {
        this._set("subadmins", d);
      };
      function renderSubAdmins() {
        const admins = DB._getSaAdmins().map((a) => ({
          ...a,
          permissions: Array.isArray(a.permissions) ? a.permissions : [],
          active: a.active !== false,
        }));
        const allPerms = {
          school:
            '<span class="ico ico-landmark" data-ico="landmark" aria-hidden="true"></span> School Info',
          team:
            '<span class="ico ico-user" data-ico="user" aria-hidden="true"></span> Leadership',
          facilities:
            '<span class="ico ico-landmark" data-ico="landmark" aria-hidden="true"></span> Facilities',
          houses:
            '<span class="ico ico-home" data-ico="home" aria-hidden="true"></span> Houses',
          clubs:
            '<span class="ico ico-masks" data-ico="masks" aria-hidden="true"></span> Clubs',
          teachers:
            '<span class="ico ico-user" data-ico="user" aria-hidden="true"></span> Teachers',
          news: '<span class="ico ico-news" data-ico="news" aria-hidden="true"></span> News',
          gallery:
            '<span class="ico ico-image" data-ico="image" aria-hidden="true"></span> Gallery',
          documents:
            '<span class="ico ico-book" data-ico="book" aria-hidden="true"></span> Documents',
          slides:
            '<span class="ico ico-image" data-ico="image" aria-hidden="true"></span> Homepage Slides',
          notifications:
            '<span class="ico ico-bell" data-ico="bell" aria-hidden="true"></span> Notifications',
          applications: "📝 Applications",
          students:
            '<span class="ico ico-cap" data-ico="cap" aria-hidden="true"></span> Students',
          merchandise:
            '<span class="ico ico-shop" data-ico="shop" aria-hidden="true"></span> Merchandise',
          orders:
            '<span class="ico ico-cart" data-ico="cart" aria-hidden="true"></span> Orders',
        };
        const el = document.getElementById("sa-list");
        if (!el) return;
        el.innerHTML =
          admins
            .map(
              (a) => `
    <div style="background:#fff;border-radius:var(--rl);padding:20px;border:1px solid var(--g100);box-shadow:var(--sh1);display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap">
      <label style="display:flex;align-items:flex-start;gap:10px;padding-top:4px;cursor:pointer">
        <input class="admin-sa-select" type="checkbox" value="${a.id}" style="accent-color:var(--b6);width:16px;height:16px;margin-top:4px">
      </label>
      <div style="width:52px;height:52px;border-radius:var(--rl);background:${a.color || "var(--gp)"};display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#fff;flex-shrink:0">${a.name.slice(0, 2).toUpperCase()}</div>
      <div style="flex:1;min-width:200px">
        <div style="font-size:15px;font-weight:700;color:var(--g900);margin-bottom:2px">${esc(a.name)}</div>
        <div style="font-size:12px;color:var(--b6);font-weight:600;margin-bottom:2px">${esc(a.role || "")}</div>
        <div style="font-size:12px;color:var(--g500);margin-bottom:6px;font-family:monospace">${esc(a.email || a.username)}</div>
        <div style="font-size:12px;margin-bottom:10px;padding:8px 10px;background:var(--g50);border-radius:8px;border:1px solid var(--g100);display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="color:var(--g500);font-weight:600">Staff password:</span>
          <span id="sa-pass-${esc(a.id)}" data-hidden="true" data-password="${esc(a.staffPassword || "Set")}" style="font-family:monospace;color:${a.passwordSet ? "var(--g800)" : "var(--go)"};font-weight:700">${a.passwordSet ? "••••••••" : "Waiting for first login"}</span>
          ${a.passwordSet ? `<button class="btn btn-sm btn-g" type="button" onclick="toggleSubAdminPassword('${esc(a.id)}')" aria-label="Show or hide password"><span class="ico ico-eye" data-ico="eye" aria-hidden="true"></span></button>` : ""}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
          <span style="background:${a.active === false ? "rgba(220,38,38,.08)" : "rgba(16,185,129,.1)"};color:${a.active === false ? "var(--r6)" : "#059669"};padding:3px 10px;border-radius:100px;font-size:11px;font-weight:700">${a.active === false ? "Disabled" : "Active"}</span>
          <span style="background:var(--g50);color:var(--g500);padding:3px 10px;border-radius:100px;font-size:11px;font-weight:600">Last login: ${esc(a.lastLogin || "Never")}</span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${(a.permissions || []).map((p) => `<span style="background:rgba(37,99,235,.08);color:var(--b6);padding:3px 10px;border-radius:100px;font-size:11px;font-weight:600">${allPerms[p] || p}</span>`).join("") || '<span style="color:var(--g400);font-size:12px">No permissions</span>'}</div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0;flex-wrap:wrap">
        <button class="btn btn-sm btn-g" onclick="openModal('subadmin','${a.id}')">Edit</button>
        <button class="btn btn-sm btn-r" onclick="confirmAct('Delete sub-admin?','This will remove ${esc(a.name)}\'s access.','Delete',async()=>{const arr=DB._getSaAdmins().filter(x=>x.id!=='${a.id}');DB._saveSaAdmins(arr);DB._log('Deleted','Sub-admin','${esc(a.username)}');const synced=await flushRemoteSync();renderSubAdmins();toast(synced?'Sub-admin removed and synced.':'Sub-admin removed locally.');})">Remove</button>
      </div>
    </div>`,
            )
            .join("") ||
          '<div style="text-align:center;padding:40px;color:var(--g400)"><div style="font-size:48px;margin-bottom:12px">🛡️</div><div style="font-size:15px;font-weight:600;margin-bottom:6px">No sub-admins yet</div><div style="font-size:13px">Add sub-admins to delegate specific sections of the website to staff members.</div></div>';
      }

      function toggleSubAdminPassword(id) {
        const el = document.getElementById(`sa-pass-${id}`);
        if (!el) return;
        const hidden = el.dataset.hidden !== "false";
        el.textContent = hidden ? el.dataset.password || "Set" : "••••••••";
        el.dataset.hidden = hidden ? "false" : "true";
      }
      window.toggleSubAdminPassword = toggleSubAdminPassword;

      // ── KEYBOARD ──────────────────────────────────────────────
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          cmodal();
          csbmob();
          document.getElementById("confirm-ov").classList.remove("open");
        }
      });

      async function challengeDashboardPassword(role, email) {
        if (!email || !DB?.needsDashboardPasswordChallenge || !DB?.verifyDashboardPassword) return true;
        if (!DB.needsDashboardPasswordChallenge(role, email)) return true;
        let password;
        try {
          password = await showDashboardPasswordModal(email);
        } catch {
          throw new Error("Dashboard password is required to continue.");
        }
        if (!password) {
          throw new Error("Dashboard password is required to continue.");
        }
        if (!DB.verifyDashboardPassword(role, email, password)) {
          throw new Error("Incorrect admin password. Please try again.");
        }
        DB.saveDashboardPasswordTrust?.(role, email);
        return true;
      }

      async function adminLogout() {
        const user = await DB.getAuthUser?.();
        await DB.signOut?.();
        window.location.href = "index.html";
      }
      window.adminLogout = adminLogout;
      window.showPage = showPage;
      window.openModal = openModal;
      window.cmodal = cmodal;
      window.osbmob = osbmob;
      window.csbmob = csbmob;
      window.saveModal = saveModal;
      window.confirmAct = confirmAct;
      window.delItem = delItem;
      window.bulkDelete = bulkDelete;
      window.bulkDeleteSubAdmins = bulkDeleteSubAdmins;
      window.toggleMaintenanceMode = toggleMaintenanceMode;
      window.downloadOrderFulfillmentList = downloadOrderFulfillmentList;
      window.saveSchoolInfo = saveSchoolInfo;
      window.updateHeroStatsPreview = updateHeroStatsPreview;
      window.saveAboutPage = saveAboutPage;
      window.saveAIKnowledge = saveAIKnowledge;
      window.clearNotifs = clearNotifs;
      window.clearLogs = clearLogs;
      window.stab2 = stab2;

      function initAdminPanelScroll() {
        const main = document.querySelector(".main");
        const content = document.querySelector(".content");
        if (!main || !content) return;
        main.addEventListener(
          "wheel",
          (e) => {
            if (content.classList.contains("scroll-lock")) return;
            if (e.target.closest(".content, textarea, select, .modal-body")) return;
            content.scrollBy({ top: e.deltaY, left: e.deltaX });
          },
          { passive: true },
        );
      }

      // ── INIT ──────────────────────────────────────────────────
      document.addEventListener("DOMContentLoaded", async () => {
        initAdminPanelScroll();
        try {
          await DB.completeAuthRedirect?.();
        } catch (error) {
          toast(error?.message || "Google sign-in could not be completed.");
        }
        const user = await DB.requireFullAdminAuth?.();
        if (!user) {
          const authUser = await DB.getAuthUser?.();
          if (authUser) {
            await DB.signOut?.();
            window.location.replace("index.html?admin=1&auth=denied");
            return;
          }
          window.location.replace("index.html?admin=1");
          return;
        }
        DB.runLocalMigrations?.();
        refreshAdminPage();
        hydrateIcons(document);
        loadSettings();
        let syncBanner = document.getElementById("sync-banner");
        if (!syncBanner) {
          syncBanner = document.createElement("div");
          syncBanner.id = "sync-banner";
          syncBanner.setAttribute("role", "status");
          syncBanner.style.cssText =
            "display:block;margin:0 0 16px;padding:12px 14px;border-radius:12px;background:#fff7ed;border:1px solid #fdba74;color:#9a3412;font-size:13px;font-weight:600;line-height:1.5";
          const content = document.querySelector(".content");
          if (content) content.prepend(syncBanner);
        }
        await refreshSyncBanner();
        if (DB?.syncRemoteAll) {
          DB.syncRemoteAll()
            .then(() => {
              scheduleAdminRefresh();
              loadSettings();
              refreshSyncBanner();
            })
            .catch(() => {});
        }
        if (await DB.isSupabaseAuthenticated?.()) {
          DB.pushAllLocalToRemote?.()
            .then(async () => {
              await DB.syncRemoteAll?.();
              scheduleAdminRefresh();
              await refreshSyncBanner();
            })
            .catch(() => {});
        }
        setInterval(() => {
          if (document.hidden || !DB?.syncRemoteAll) return;
          DB.syncRemoteAll().then(scheduleAdminRefresh);
        }, 30000);
        if (DB?.subscribeRemoteInfo) {
          DB.subscribeRemoteInfo(scheduleAdminRefresh);
        }
        if (DB?.subscribeRemoteContent) {
          DB.subscribeRemoteContent(scheduleAdminRefresh);
        }
        hydrateIcons(document);
        const iconObserver = new MutationObserver(() => hydrateIcons(document));
        iconObserver.observe(document.body, { childList: true, subtree: true });
      });
