"use strict";

(function () {
  let configPromise;
  let currentContext = null;
  const config = () => (configPromise ||= fetch("scripts/seo-pages.json", { cache: "no-store" }).then((response) => {
    if (!response.ok) throw new Error("Could not load the static SEO defaults.");
    return response.json();
  }));

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const clean = (value, max) => String(value || "").replace(/<[^>]*>/g, "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

  function isAllowedImage(value) {
    const src = String(value || "").trim();
    if (!src || /^data:/i.test(src) || /^javascript:/i.test(src)) return false;
    try {
      const url = new URL(src, location.href);
      if (url.origin === location.origin) {
        const filename = url.pathname.split("/").pop() || "";
        return /\.(?:png|jpe?g|webp|avif|gif|svg)$/i.test(filename);
      }
      const supabaseUrl = window.NJUASCO_SUPABASE?.url;
      return !!supabaseUrl && url.origin === new URL(supabaseUrl).origin && url.pathname.includes("/storage/v1/object/public/site-assets/");
    } catch (_) { return false; }
  }

  function collectMedia() {
    const media = new Map([["njuasco-logo.png", "NJUASCO logo"]]);
    const collections = ["gallery", "news", "team", "departments", "houses", "facilities", "clubs", "homepageSlides", "merchandise"];
    collections.forEach((key) => (DB.getAll?.(key) || []).forEach((item) => {
      [item.image, item.thumbnail, ...(Array.isArray(item.gallery) ? item.gallery.map((entry) => typeof entry === "string" ? entry : entry?.image) : [])].filter(Boolean).forEach((src) => {
        if (!isAllowedImage(src)) return;
        media.set(src, clean(item.title || item.name || item.caption || src.split("/").pop(), 90));
      });
    }));
    return [...media.entries()];
  }

  function readStored(key) {
    const value = DB?._get?.(key);
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function mediaOptions(media, selected) {
    return media.map(([src, label]) => `<option value="${esc(src)}" ${src === selected ? "selected" : ""}>${esc(label)}</option>`).join("");
  }

  function discoverMissingAlt() {
    const groups = [
      ["gallery", "Gallery", "gallery-mgr", "gallery"], ["news", "News and events", "news-mgr", "news"],
      ["team", "Leadership", "team-mgr", "team"], ["departments", "Departments", "departments-mgr", "department"],
      ["houses", "Houses", "houses-mgr", "house"], ["facilities", "Facilities", "facilities-mgr", "facility"],
      ["clubs", "Clubs", "clubs-mgr", "club"], ["homepageSlides", "Homepage slides", "slides-mgr", "slide"],
      ["merchandise", "Shop products", "merch-mgr", "merch"],
    ];
    const missingItems = groups.flatMap(([key, label, section, type]) => (DB.getAll?.(key) || []).filter((item) => item.image && isAllowedImage(item.image) && !item.decorative && !String(item.alt || "").trim()).map((item) => ({ key, label, section, type, item })));
    const missingHouseGalleryItems = (DB.getAll?.("houses") || []).flatMap((house) =>
      (Array.isArray(house.gallery) ? house.gallery : [])
        .map((entry, index) => ({ entry, index, image: typeof entry === "string" ? entry : entry?.image, alt: typeof entry === "string" ? "" : entry?.alt, decorative: typeof entry === "string" ? false : entry?.decorative === true }))
        .filter((entry) => entry.image && isAllowedImage(entry.image) && !entry.decorative && !String(entry.alt || "").trim())
        .map((entry) => ({ key: "houses", label: "House gallery", section: "houses-mgr", type: "house", item: house, entryName: `${house.name || "House"} gallery image ${entry.index + 1}` })),
    );
    return [...missingItems, ...missingHouseGalleryItems];
  }

  function warning(text, severity = "warn") { return text ? `<div class="seo-warning ${severity}">${esc(text)}</div>` : ""; }

  function render() {
    const host = document.getElementById(currentContext?.containerId || "seo-editor");
    if (!host || !currentContext?.data) return;
    const { config: seoConfig, pages, site } = currentContext.data;
    const media = collectMedia();
    const missing = discoverMissingAlt();
    const cards = seoConfig.pages.filter((page) => page.robots === "index").map((page) => {
      const value = pages[page.file] || page;
      const title = value.title || page.title;
      const description = value.description || page.description;
      const titleWarning = !title ? "Title is empty." : title.length > 60 ? "Title is over the 60 character target." : "";
      const descWarning = !description ? "Description is empty." : description.length < 120 ? "Description is shorter than the 120 character target." : description.length > 160 ? "Description is over the 160 character target." : "";
      const duplicates = seoConfig.pages.filter((other) => other.robots === "index" && other.file !== page.file && pages[other.file]?.title === title).length;
      const descDuplicates = seoConfig.pages.filter((other) => other.robots === "index" && other.file !== page.file && pages[other.file]?.description === description).length;
      return `<article class="seo-editor-card" data-seo-page="${esc(page.file)}">
        <header><div><h3>${esc(page.file)}</h3><small>Canonical: ${esc(page.file === "index.html" ? seoConfig.baseUrl : new URL(page.file, seoConfig.baseUrl).href)} (fixed)</small></div><button type="button" class="btn btn-sm btn-g" data-seo-reset="${esc(page.file)}">Reset to default</button></header>
        <label>Page title <small><span data-count="title">${title.length}</span>/60</small><input class="finp" data-field="title" maxlength="70" value="${esc(title)}"></label>${warning(titleWarning || (duplicates ? "Title duplicates another page." : ""))}
        <label>Meta description <small><span data-count="description">${description.length}</span>/120–160</small><textarea class="finp fta" data-field="description" maxlength="200">${esc(description)}</textarea></label>${warning(descWarning || (descDuplicates ? "Description duplicates another page." : ""))}
        <label>Share image<select class="finp" data-field="ogImage"><option value="">Use site default share image</option>${mediaOptions(media, value.ogImage || "")}</select></label>
        <label>Share image alt text<input class="finp" data-field="ogImageAlt" maxlength="125" value="${esc(value.ogImageAlt || page.ogImageAlt)}"></label>
        <label class="seo-toggle"><input type="checkbox" data-field="indexable" ${value.indexable !== false ? "checked" : ""}> Allow search engines to index this page</label>
        <div class="seo-previews"><section><b>Google search preview</b><div class="seo-google-title" data-preview="title">${esc(title)}</div><div class="seo-google-url">${esc(page.file === "index.html" ? seoConfig.baseUrl : new URL(page.file, seoConfig.baseUrl).href)}</div><div data-preview="description">${esc(description)}</div></section>
        <section><b>WhatsApp / Facebook preview</b><div class="seo-social"><img data-preview-image src="${esc(value.ogImage || site.defaultShareImage)}" alt=""><div><strong data-preview="social-title">${esc(title)}</strong><div data-preview="social-description">${esc(description)}</div><small>${esc(new URL(seoConfig.baseUrl).host)}</small></div></div></section></div>
      </article>`;
    }).join("");
    const missingMarkup = missing.map(({ label, section, type, item, entryName }) => `<li><span>${esc(label)}: ${esc(entryName || item.title || item.name || item.image)}</span><button type="button" class="btn btn-sm btn-g" data-open-alt="${esc(section)}" data-modal-type="${esc(type)}" data-item-id="${esc(item.id)}">Edit item</button></li>`).join("");
    host.innerHTML = `<div class="sec-hdr"><div class="sec-title">SEO &amp; Sharing</div><button type="button" class="btn btn-p" id="seo-save-all">Save SEO settings</button></div>
      <div class="card" style="margin-bottom:16px"><div class="card-title">Site sharing defaults</div><div class="form-grid"><label>Site name<input class="finp" id="seo-site-name" maxlength="100" value="${esc(site.siteName || seoConfig.siteName)}"></label><label>Default share image<select class="finp" id="seo-default-image">${mediaOptions(media, site.defaultShareImage || "njuasco-logo.png")}</select></label></div><p class="hint-text">Share images are selected from the site's own uploaded media.</p></div>
      <div class="card" style="margin-bottom:16px"><div class="card-title">Missing alt text (${missing.length})</div><p class="hint-text">These uploaded images do not yet have alt text.</p><ul class="seo-missing-list">${missingMarkup || "<li>No missing alt text found in current media records.</li>"}</ul></div>
      <p class="hint-text" style="margin:0 0 16px">Changes appear on the site straight away. Search results and WhatsApp/Facebook previews update after those services re-read the page; the daily sync keeps the static tags in step. Public-page runtime overrides and daily static sync are currently unavailable because the public Supabase read policy excludes seo_pages and seo_site; static tags remain active until an approved read-only access path is configured.</p>${cards}`;
    bindEditor(host, media);
  }

  function bindEditor(host, media) {
    host.querySelectorAll("[data-seo-page]").forEach((card) => {
      const file = card.dataset.seoPage;
      card.querySelectorAll("[data-field]").forEach((field) => field.addEventListener(field.tagName === "SELECT" ? "change" : "input", () => {
        const val = field.type === "checkbox" ? field.checked : field.value;
        if (field.dataset.field === "title") {
          card.querySelector('[data-count="title"]').textContent = String(val).length;
          card.querySelector('[data-preview="title"]').textContent = val;
          card.querySelector('[data-preview="social-title"]').textContent = val;
        }
        if (field.dataset.field === "description") {
          card.querySelector('[data-count="description"]').textContent = String(val).length;
          card.querySelector('[data-preview="description"]').textContent = val;
          card.querySelector('[data-preview="social-description"]').textContent = val;
        }
        if (field.dataset.field === "ogImage") {
          const image = val || currentContext.data.site.defaultShareImage;
          card.querySelector("[data-preview-image]").src = image;
        }
      }));
      card.querySelector(`[data-seo-reset="${CSS.escape(file)}"]`).addEventListener("click", () => {
        const page = currentContext.data.config.pages.find((entry) => entry.file === file);
        currentContext.data.pages[file] = { title: page.title, description: page.description, ogImage: "", ogImageAlt: page.ogImageAlt, indexable: true };
        render();
      });
    });
    host.querySelector("#seo-site-name")?.addEventListener("input", (event) => { currentContext.data.site.siteName = clean(event.target.value, 100); });
    host.querySelector("#seo-default-image")?.addEventListener("change", (event) => { currentContext.data.site.defaultShareImage = event.target.value; });
    host.querySelector("#seo-save-all")?.addEventListener("click", () => save());
    host.querySelectorAll("[data-open-alt]").forEach((button) => button.addEventListener("click", () => {
      currentContext.openPage?.(button.dataset.openAlt);
      window.openModal?.(button.dataset.modalType, button.dataset.itemId);
    }));
    // Re-evaluate duplicate and length warnings after any edited text.
    host.querySelectorAll('[data-field="title"], [data-field="description"]').forEach((field) => field.addEventListener("input", () => {
      const value = clean(field.value, field.dataset.field === "title" ? 70 : 200);
      const prop = field.dataset.field;
      const limit = prop === "title" ? 60 : 160;
      const target = field.closest("label").nextElementSibling;
      const others = Object.entries(currentContext.data.pages).filter(([name, entry]) => name !== field.closest("[data-seo-page]").dataset.seoPage && entry[prop] === value).length;
      const message = !value ? `${prop === "title" ? "Title" : "Description"} is empty.` : value.length > limit ? `${prop === "title" ? "Title" : "Description"} is over the ${limit} character target.` : prop === "description" && value.length < 120 ? "Description is shorter than the 120 character target." : others ? `${prop === "title" ? "Title" : "Description"} duplicates another page.` : "";
      target.innerHTML = warning(message);
    }));
  }

  async function save() {
    if (!currentContext?.canEdit?.()) { currentContext?.toast?.("You do not have permission to edit SEO settings."); return; }
    const { config: seoConfig, pages, site } = currentContext.data;
    const host = document.getElementById(currentContext.containerId);
    let invalidImage = false;
    host.querySelectorAll("[data-seo-page]").forEach((card) => {
      const file = card.dataset.seoPage;
      const original = pages[file] || {};
      const values = {};
      card.querySelectorAll("[data-field]").forEach((field) => {
        if (field.dataset.field === "indexable") values.indexable = field.checked;
        else if (field.dataset.field === "ogImage") values.ogImage = field.value;
        else values[field.dataset.field] = clean(field.value, field.dataset.field === "title" ? 70 : field.dataset.field === "description" ? 200 : 125);
      });
      if (values.ogImage && !isAllowedImage(values.ogImage)) {
        currentContext.toast?.("Choose a share image from this site's uploaded media.");
        invalidImage = true;
        return;
      }
      pages[file] = { ...original, ...values };
    });
    if (invalidImage) return;
    site.siteName = clean(host.querySelector("#seo-site-name")?.value || seoConfig.siteName, 100);
    const image = host.querySelector("#seo-default-image")?.value || "njuasco-logo.png";
    if (!isAllowedImage(image)) { currentContext.toast?.("Choose a share image from this site's uploaded media."); return; }
    site.defaultShareImage = image;
    try {
      DB._set("seo_pages", pages);
      DB._set("seo_site", site);
      const [pagesSaved, siteSaved] = await Promise.all([DB.saveRemoteContent("seo_pages", pages), DB.saveRemoteContent("seo_site", site)]);
      if (!pagesSaved || !siteSaved) throw new Error("Could not sync SEO settings to Supabase. Check your admin session and retry.");
      currentContext.data.pages = pages;
      currentContext.data.site = site;
      currentContext.toast?.("SEO settings saved and synced.");
      render();
    } catch (error) {
      currentContext.toast?.(error.message || "Could not save SEO settings.");
    }
  }

  window.initSeoAdminPanel = async function (options) {
    const host = document.getElementById(options.containerId);
    if (!host) return;
    currentContext = options;
    if (!options.canEdit?.()) { host.textContent = "You do not have permission to edit SEO settings."; return; }
    host.textContent = "Loading SEO settings…";
    try {
      const seoConfig = await config();
      let pages = readStored("seo_pages");
      let site = readStored("seo_site");
      let changedPages = false;
      seoConfig.pages.filter((page) => page.robots === "index").forEach((page) => {
        if (!pages[page.file]) { pages[page.file] = { title: page.title, description: page.description, ogImage: "", ogImageAlt: page.ogImageAlt, indexable: true }; changedPages = true; }
      });
      const siteChanged = !site.siteName || !site.defaultShareImage;
      if (!site.siteName) site.siteName = seoConfig.siteName;
      if (!site.defaultShareImage) site.defaultShareImage = "njuasco-logo.png";
      currentContext.data = { config: seoConfig, pages, site };
      if (changedPages) DB._set("seo_pages", pages);
      if (siteChanged) DB._set("seo_site", site);
      render();
    } catch (error) {
      host.textContent = error.message || "Could not load SEO settings.";
    }
  };
})();
