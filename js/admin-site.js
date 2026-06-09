const TEXT_FORMS = [
  { id: "hero-text-form", keys: ["hero_eyebrow", "hero_name", "hero_meta"] },
  { id: "intro-form", keys: ["intro_heading", "intro_body"] },
  { id: "notice-form", keys: ["family_notice_heading", "family_notice_body"] },
];

let heroItems = [];

function renderHeroMedia() {
  const grid = document.getElementById("hero-media-grid");
  if (!grid) return;
  if (!heroItems.length) {
    grid.innerHTML = `<div class="hero-empty">
        <span class="hero-empty-ico" aria-hidden="true">＋</span>
        <span>No slideshow media yet</span>
        <span class="hero-empty-sub">Add photos or short clips below</span>
      </div>`;
    return;
  }
  grid.innerHTML = "";
  heroItems.forEach((item, idx) => {
    const cell = document.createElement("figure");
    cell.className = "hero-media-cell";
    const fit = item.fit === "contain" ? "contain" : "cover";
    const focus = item.focus || "center";
    const frameVal = fit === "contain" ? "contain|center" : `cover|${focus}`;
    const objStyle = `object-fit:${fit};object-position:${focus};`;
    const media = item.type === "video"
      ? `<video src="${AdminUI.escapeHtml(item.image_url)}" style="${objStyle}" muted playsinline preload="metadata"></video><span class="hero-media-badge">▶ clip</span>`
      : `<img src="${AdminUI.escapeHtml(item.image_url)}" style="${objStyle}" alt="" />`;
    cell.innerHTML = `
      ${media}
      <figcaption>
        <select class="hero-frame-select" aria-label="Framing">
          <option value="cover|center">Fill · center</option>
          <option value="cover|top">Fill · top</option>
          <option value="cover|bottom">Fill · bottom</option>
          <option value="contain|center">Whole image</option>
        </select>
        <div class="hero-media-controls">
          <button class="btn btn-link" data-move="up" ${idx === 0 ? "disabled" : ""} aria-label="Move earlier">↑</button>
          <span class="hero-media-pos">${idx + 1}</span>
          <button class="btn btn-link" data-move="down" ${idx === heroItems.length - 1 ? "disabled" : ""} aria-label="Move later">↓</button>
          <button class="btn btn-link admin-danger" data-del aria-label="Delete">Delete</button>
        </div>
      </figcaption>`;
    const select = cell.querySelector(".hero-frame-select");
    select.value = frameVal;
    select.addEventListener("change", () => setHeroFraming(item, cell, select.value));
    cell.querySelector("[data-del]").addEventListener("click", () => deleteHeroItem(item.id));
    cell.querySelector('[data-move="up"]').addEventListener("click", () => moveHeroItem(idx, -1));
    cell.querySelector('[data-move="down"]').addEventListener("click", () => moveHeroItem(idx, 1));
    grid.appendChild(cell);
  });
}

async function loadHeroMedia() {
  try {
    const data = await AdminUI.apiJSON("GET", "/api/admin/hero");
    heroItems = data.items || [];
    renderHeroMedia();
  } catch (err) {
    AdminUI.showMsg("err", err.message);
  }
}

async function deleteHeroItem(id) {
  if (!confirm("Remove this from the slideshow? This cannot be undone.")) return;
  try {
    await AdminUI.apiJSON("DELETE", `/api/admin/hero/${id}`);
    heroItems = heroItems.filter((i) => i.id !== id);
    renderHeroMedia();
    AdminUI.showMsg("ok", "Removed.");
  } catch (err) {
    AdminUI.showMsg("err", err.message);
  }
}

async function setHeroFraming(item, cell, value) {
  const [fit, focus] = value.split("|");
  item.fit = fit;
  item.focus = focus;
  const mediaEl = cell.querySelector("img, video");
  if (mediaEl) {
    mediaEl.style.objectFit = fit;
    mediaEl.style.objectPosition = focus;
  }
  try {
    await AdminUI.apiJSON("PATCH", `/api/admin/hero/${item.id}`, { fit, focus });
    AdminUI.showMsg("ok", "Framing updated.");
  } catch (err) {
    AdminUI.showMsg("err", err.message);
  }
}

async function moveHeroItem(idx, dir) {
  const target = idx + dir;
  if (target < 0 || target >= heroItems.length) return;
  const a = heroItems[idx];
  const b = heroItems[target];
  heroItems[idx] = b;
  heroItems[target] = a;
  renderHeroMedia();
  try {
    await Promise.all([
      AdminUI.apiJSON("PATCH", `/api/admin/hero/${a.id}`, { position: target + 1 }),
      AdminUI.apiJSON("PATCH", `/api/admin/hero/${b.id}`, { position: idx + 1 }),
    ]);
  } catch (err) {
    AdminUI.showMsg("err", err.message);
    loadHeroMedia();
  }
}

const SECTION_PHOTOS = [
  { slot: "notice", label: "Family notice" },
  { slot: "biography", label: "Biography" },
  { slot: "tributes", label: "Tributes" },
  { slot: "gallery", label: "Gallery" },
  { slot: "guestbook", label: "Guestbook" },
];

function renderSectionPhotos(settings) {
  const wrap = document.getElementById("section-photos");
  if (!wrap) return;
  wrap.innerHTML = "";
  SECTION_PHOTOS.forEach((sec) => {
    const url = settings[`${sec.slot}_image_url`] || "";
    const cell = document.createElement("div");
    cell.className = "section-photo";
    cell.innerHTML = `
      <h3>${sec.label}</h3>
      <div class="section-photo-preview">${url ? `<img src="${AdminUI.escapeHtml(url)}" alt="" />` : `<span class="section-photo-empty">No photo</span>`}</div>
      <div class="section-photo-actions">
        <input type="file" accept="image/jpeg,image/png,image/webp" />
        <button class="btn btn-primary" data-up>Upload</button>
        <button class="btn btn-link admin-danger" data-rm ${url ? "" : "hidden"}>Remove</button>
      </div>`;
    const fileInput = cell.querySelector("input");
    cell.querySelector("[data-up]").addEventListener("click", () => uploadSectionPhoto(sec.slot, fileInput, cell));
    cell.querySelector("[data-rm]").addEventListener("click", () => removeSectionPhoto(sec.slot, cell));
    wrap.appendChild(cell);
  });
}

async function uploadSectionPhoto(slot, fileInput, cell) {
  const file = fileInput.files[0];
  if (!file) { AdminUI.showMsg("err", "Choose a photo first."); return; }
  const btn = cell.querySelector("[data-up]");
  btn.disabled = true;
  try {
    const resized = await AdminUI.resizeImage(file, { maxDim: 2000, quality: 0.85 });
    const fd = new FormData();
    fd.append("file", resized);
    fd.append("slot", slot);
    const res = await AdminUI.apiUpload("/api/admin/settings", fd);
    cell.querySelector(".section-photo-preview").innerHTML = `<img src="${AdminUI.escapeHtml(res.url)}" alt="" />`;
    cell.querySelector("[data-rm]").hidden = false;
    fileInput.value = "";
    AdminUI.showMsg("ok", "Photo updated.");
  } catch (err) {
    AdminUI.showMsg("err", err.message);
  } finally {
    btn.disabled = false;
  }
}

async function removeSectionPhoto(slot, cell) {
  if (!confirm("Remove this photo?")) return;
  try {
    await AdminUI.apiJSON("DELETE", `/api/admin/settings?slot=${slot}`);
    cell.querySelector(".section-photo-preview").innerHTML = `<span class="section-photo-empty">No photo</span>`;
    cell.querySelector("[data-rm]").hidden = true;
    AdminUI.showMsg("ok", "Removed.");
  } catch (err) {
    AdminUI.showMsg("err", err.message);
  }
}

async function loadSettings() {
  try {
    const data = await AdminUI.apiJSON("GET", "/api/admin/settings");
    for (const form of TEXT_FORMS) {
      const el = document.getElementById(form.id);
      if (!el) continue;
      for (const k of form.keys) {
        const input = el.querySelector(`[name="${k}"]`);
        if (input) input.value = data[k] || "";
      }
    }
    renderSectionPhotos(data);
  } catch (err) {
    AdminUI.showMsg("err", err.message);
  }
}

function bindTextForm({ id, keys }) {
  const form = document.getElementById(id);
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {};
    for (const k of keys) {
      const input = form.querySelector(`[name="${k}"]`);
      if (input) payload[k] = input.value;
    }
    try {
      await AdminUI.apiJSON("PATCH", "/api/admin/settings", payload);
      AdminUI.showMsg("ok", "Saved.");
    } catch (err) {
      AdminUI.showMsg("err", err.message);
    }
  });
}

function bindHeroUpload() {
  const form = document.getElementById("hero-form");
  if (!form) return;
  const uploadBtn = document.getElementById("hero-upload-btn");
  const progress = document.getElementById("hero-progress");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById("hero-file");
    const files = Array.from(fileInput.files || []);
    if (!files.length) {
      AdminUI.showMsg("err", "Choose at least one photo or clip.");
      return;
    }
    const label = uploadBtn ? uploadBtn.textContent : "";
    if (uploadBtn) uploadBtn.disabled = true;

    let done = 0;
    let failed = 0;
    for (const file of files) {
      done += 1;
      if (progress) progress.textContent = `Uploading ${done} of ${files.length}…`;
      try {
        const isVideo = /^video\//.test(file.type);
        const payload = isVideo ? file : await AdminUI.resizeImage(file, { maxDim: 2400, quality: 0.85 });
        const fd = new FormData();
        fd.append("file", payload);
        await AdminUI.apiUpload("/api/admin/hero", fd);
      } catch (err) {
        failed += 1;
        AdminUI.showMsg("err", `${file.name}: ${err.message}`);
      }
    }

    if (progress) progress.textContent = "";
    fileInput.value = "";
    if (uploadBtn) { uploadBtn.disabled = false; uploadBtn.textContent = label || "Add to slideshow"; }
    await loadHeroMedia();
    if (failed < files.length) {
      AdminUI.showMsg("ok", `Added ${files.length - failed} item${files.length - failed === 1 ? "" : "s"} to the slideshow.`);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  TEXT_FORMS.forEach(bindTextForm);
  bindHeroUpload();
  loadHeroMedia();
  loadSettings();
});
