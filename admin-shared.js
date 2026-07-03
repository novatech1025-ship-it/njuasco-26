// Shared admin helpers: icons, media uploads, and previews (used by admin-dashboard.js)
const ICON_PATHS = {
  lock: '<rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  user: '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>',
  key: '<circle cx="7.5" cy="14.5" r="3.5"/><path d="M10 12l8-8 2 2-2 2 2 2-2 2-2-2-3 3"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
  cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L23 6H6"/>',
  heart:
    '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>',
  cap: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/><path d="M22 10v6"/>',
  news: '<path d="M4 19.5A2.5 2.5 0 0 1 1.5 17V5H18v12a2.5 2.5 0 0 0 5 0V8h-5"/><path d="M5 8h8"/><path d="M5 12h8"/><path d="M5 16h5"/>',
  image:
    '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  landmark:
    '<path d="M3 21h18"/><path d="M5 21V10"/><path d="M19 21V10"/><path d="M12 3 3 8h18l-9-5z"/><path d="M9 21V10"/><path d="M15 21V10"/>',
  masks:
    '<path d="M7 8h.01"/><path d="M11 8h.01"/><path d="M9 13a3 3 0 0 0 3-3V5H4v5a5 5 0 0 0 5 5"/><path d="M17 11h.01"/><path d="M21 11h.01"/><path d="M19 16a3 3 0 0 1-3-3V8h8v5a5 5 0 0 1-5 5"/>',
  shop: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10"/><path d="M9 21v-6h6v6"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"/>',
  clipboard:
    '<path d="M9 2h6v4H9z"/><path d="M9 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-4"/>',
  phone:
    '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z"/>',
  check: '<path d="m20 6-11 11-5-5"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  school:
    '<path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6"/><path d="M9 10h.01"/><path d="M15 10h.01"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  fileText:
    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
};

function adminEsc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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
  if (isImageAsset(src)) return `<img class="media-img ${cls}" src="${adminEsc(src)}" alt="">`;
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

async function prepareImageFile(file, maxDim = 1920, quality = 0.85) {
  if (!file?.type?.startsWith("image/")) return file;
  if (file.size <= 600_000) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height, 1));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("encode failed"))), "image/jpeg", quality);
    });
    const baseName = String(file.name || "image").replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}

async function uploadImageAsset(file, folder = "media") {
  if (!file) return "";
  const prepared = await prepareImageFile(file);
  return (await DB.uploadSiteAsset?.(prepared, folder)) || (await fileToDataURL(prepared));
}

async function docFileValue() {
  const file = document.getElementById("mf-doc-file")?.files?.[0];
  if (file) return (await DB.uploadSiteAsset?.(file, "documents")) || (await fileToDataURL(file));
  return gv("mf-file-url") || "#";
}

async function mediaValue(inputId = "mf-image", fileId = "mf-file", folder = "media") {
  const file = document.getElementById(fileId)?.files?.[0];
  if (file) return uploadImageAsset(file, folder);
  return gv(inputId);
}

function fileTitle(file) {
  return file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
}

async function bulkUploadGallery(input) {
  await bulkUploadMedia(input, "gallery", "gallery-mgr");
}

async function bulkUploadMedia(input, key, reload, extra = {}) {
  const files = Array.from(input?.files || []);
  if (!files.length) return;
  for (const [index, file] of files.entries()) {
    const src = (await uploadImageAsset(file, key)) || (await fileToDataURL(file));
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
      DB.add(key, { title: base.title, image: base.image, status: "active", order: base.order });
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
  if (typeof flushRemoteSync === "function") await flushRemoteSync();
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
  if (typeof flushRemoteSync === "function") flushRemoteSync();
  loadPage(reload);
  toast("Selected items arranged");
}

function bindMediaPreview(value = "") {
  const preview = document.getElementById("mf-preview");
  const input = document.getElementById("mf-image");
  const file = document.getElementById("mf-file");
  const paint = (src) => {
    if (!preview) return;
    preview.innerHTML = src ? mediaMarkup(src) : "<span>No image selected</span>";
    hydrateIcons(preview);
  };
  paint(value);
  input?.addEventListener("input", () => paint(input.value.trim()));
  file?.addEventListener("change", async () => {
    const f = file.files?.[0];
    if (!f) return;
    paint(await fileToDataURL(await prepareImageFile(f)));
  });
}

const SOLID_COLOR_PRESETS = [
  { value: "#ef4444", label: "Red" },
  { value: "#f97316", label: "Orange" },
  { value: "#eab308", label: "Gold" },
  { value: "#22c55e", label: "Green" },
  { value: "#14b8a6", label: "Teal" },
  { value: "#2563eb", label: "Blue" },
  { value: "#4338ca", label: "Indigo" },
  { value: "#9333ea", label: "Purple" },
  { value: "#db2777", label: "Pink" },
  { value: "#111827", label: "Black" },
  { value: "#6b7280", label: "Gray" },
  { value: "#ffffff", label: "White" },
];

const GRADIENT_PRESETS = [
  { value: "linear-gradient(135deg,#1e40af,#4f46e5)", label: "Blue" },
  { value: "linear-gradient(135deg,#2563eb,#4338ca)", label: "Royal Blue" },
  { value: "linear-gradient(135deg,#9333ea,#db2777)", label: "Purple Pink" },
  { value: "linear-gradient(135deg,#10b981,#059669)", label: "Green" },
  { value: "linear-gradient(135deg,#f59e0b,#d97706)", label: "Gold" },
  { value: "linear-gradient(135deg,#dc2626,#db2777)", label: "Red Pink" },
  { value: "linear-gradient(135deg,#0ea5e9,#2563eb)", label: "Sky Blue" },
  { value: "linear-gradient(135deg,#111827,#374151)", label: "Dark" },
];

function normalizeHexColor(value, fallback = "#2563eb") {
  const raw = String(value || "").trim();
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toLowerCase();
  const match = raw.match(/#([0-9a-f]{3,6})/i);
  if (!match) return fallback;
  let hex = match[0];
  if (hex.length === 4) {
    hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return hex.toLowerCase();
}

function resolveColorPreset(value, mode = "solid") {
  const presets = mode === "gradient" ? GRADIENT_PRESETS : SOLID_COLOR_PRESETS;
  const exact = presets.find((item) => item.value === value);
  if (exact) return exact.value;
  if (mode === "solid") return normalizeHexColor(value, presets[0].value);
  return presets[0].value;
}

function colorPickerField(inputId, currentValue, options = {}) {
  const mode = options.mode === "gradient" ? "gradient" : "solid";
  const label = options.label || (mode === "gradient" ? "Background Colour" : "Colour");
  const extraClass = options.extraClass || "";
  const presets = mode === "gradient" ? GRADIENT_PRESETS : SOLID_COLOR_PRESETS;
  const initial = resolveColorPreset(currentValue, mode);
  const swatches = presets
    .map(
      (preset) =>
        `<button type="button" class="color-swatch${preset.value === initial ? " active" : ""}" data-value="${adminEsc(preset.value)}" style="background:${preset.value}" title="${adminEsc(preset.label)}" aria-label="${adminEsc(preset.label)}"></button>`,
    )
    .join("");
  const native =
    mode === "solid"
      ? `<label class="color-custom"><span class="color-custom-label">Custom</span><input type="color" class="color-native" value="${adminEsc(normalizeHexColor(initial))}" aria-label="Choose custom colour"></label>`
      : "";
  return `<div class="fg color-picker-wrap">
    <label class="flbl">${label}</label>
    <div class="color-picker" data-color-mode="${mode}">
      <div class="color-swatches">${swatches}</div>
      ${native}
      <input type="hidden" class="finp color-value ${extraClass}" id="${inputId}" value="${adminEsc(initial)}">
    </div>
  </div>`;
}

function bindColorPickers(root = document) {
  root.querySelectorAll(".color-picker:not([data-bound])").forEach((picker) => {
    picker.dataset.bound = "1";
    const hidden = picker.querySelector(".color-value");
    if (!hidden) return;
    const mode = picker.dataset.colorMode || "solid";
    const setValue = (val) => {
      if (!val) return;
      const next = mode === "gradient" ? val : normalizeHexColor(val, hidden.value);
      hidden.value = next;
      picker.querySelectorAll(".color-swatch").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.value === next);
      });
      const native = picker.querySelector(".color-native");
      if (native) native.value = normalizeHexColor(next, native.value);
    };
    picker.querySelectorAll(".color-swatch").forEach((btn) => {
      btn.addEventListener("click", () => setValue(btn.dataset.value));
    });
    picker.querySelector(".color-native")?.addEventListener("input", (event) => {
      setValue(event.target.value);
    });
  });
}

window.bulkUploadGallery = bulkUploadGallery;
window.bulkUploadMedia = bulkUploadMedia;
window.selectAll = selectAll;
window.bulkArrange = bulkArrange;
window.colorPickerField = colorPickerField;
window.bindColorPickers = bindColorPickers;
