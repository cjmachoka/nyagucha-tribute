const TEXT_FORMS = [
  { id: "hero-text-form", keys: ["hero_eyebrow", "hero_name", "hero_meta"] },
  { id: "intro-form", keys: ["intro_heading", "intro_body"] },
  { id: "notice-form", keys: ["family_notice_heading", "family_notice_body"] },
];

function renderHero(url) {
  const el = document.getElementById("hero-preview");
  const removeBtn = document.getElementById("hero-remove-btn");
  const uploadBtn = document.getElementById("hero-upload-btn");
  const hasPhoto = !!url;
  if (el) {
    el.innerHTML = hasPhoto
      ? `<img src="${AdminUI.escapeHtml(url)}" alt="Hero photo" />`
      : `<div class="hero-empty">
           <span class="hero-empty-ico" aria-hidden="true">＋</span>
           <span>No hero photo yet</span>
           <span class="hero-empty-sub">Choose a file below to add one</span>
         </div>`;
  }
  if (removeBtn) removeBtn.hidden = !hasPhoto;
  if (uploadBtn) uploadBtn.textContent = hasPhoto ? "Upload & replace" : "Upload photo";
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
    renderHero(data.hero_image_url || "");
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
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById("hero-file");
    const file = fileInput.files[0];
    if (!file) {
      AdminUI.showMsg("err", "Choose a photo first.");
      return;
    }
    const label = uploadBtn ? uploadBtn.textContent : "";
    if (uploadBtn) { uploadBtn.disabled = true; uploadBtn.textContent = "Uploading…"; }
    try {
      const resized = await AdminUI.resizeImage(file, { maxDim: 2400, quality: 0.85 });
      const fd = new FormData();
      fd.append("file", resized);
      const res = await AdminUI.apiUpload("/api/admin/settings", fd);
      renderHero(res.url);
      AdminUI.showMsg("ok", "Hero photo updated.");
      fileInput.value = "";
    } catch (err) {
      AdminUI.showMsg("err", err.message);
    } finally {
      if (uploadBtn) { uploadBtn.disabled = false; uploadBtn.textContent = label || "Upload & replace"; }
    }
  });
}

function bindHeroRemove() {
  const btn = document.getElementById("hero-remove-btn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    if (!confirm("Remove the hero photo? The home page will fall back to the plain header.")) return;
    btn.disabled = true;
    try {
      await AdminUI.apiJSON("DELETE", "/api/admin/settings");
      const fileInput = document.getElementById("hero-file");
      if (fileInput) fileInput.value = "";
      renderHero("");
      AdminUI.showMsg("ok", "Hero photo removed.");
    } catch (err) {
      AdminUI.showMsg("err", err.message);
    } finally {
      btn.disabled = false;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  TEXT_FORMS.forEach(bindTextForm);
  bindHeroUpload();
  bindHeroRemove();
  loadSettings();
});
