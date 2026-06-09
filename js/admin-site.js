const TEXT_FORMS = [
  { id: "hero-text-form", keys: ["hero_eyebrow", "hero_name", "hero_meta"] },
  { id: "intro-form", keys: ["intro_heading", "intro_body"] },
  { id: "notice-form", keys: ["family_notice_heading", "family_notice_body"] },
];

function renderHero(url) {
  const el = document.getElementById("hero-preview");
  if (!el) return;
  el.innerHTML = url
    ? `<img src="${AdminUI.escapeHtml(url)}" alt="Hero photo" />`
    : `<div class="hero-empty">No hero photo yet</div>`;
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
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById("hero-file");
    const file = fileInput.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await AdminUI.apiUpload("/api/admin/settings", fd);
      renderHero(res.url);
      AdminUI.showMsg("ok", "Hero photo updated.");
      fileInput.value = "";
    } catch (err) {
      AdminUI.showMsg("err", err.message);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  TEXT_FORMS.forEach(bindTextForm);
  bindHeroUpload();
  loadSettings();
});
