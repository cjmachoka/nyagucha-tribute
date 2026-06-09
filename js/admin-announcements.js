const KIND_LABELS = {
  "family-notice": "Family notice",
  "funeral": "Funeral",
  "memorial": "Memorial",
  "condolence": "Condolence",
  "news": "News",
  "general": "General",
};

const KIND_OPTIONS = Object.entries(KIND_LABELS)
  .map(([id, label]) => `<option value="${id}">${label}</option>`)
  .join("");

function cardHtml(a) {
  const { escapeHtml, fmtDate } = AdminUI;
  return `
    <article class="admin-card" data-id="${a.id}">
      <div class="admin-card-body">
        <header class="admin-card-head">
          <div>
            <h3>${escapeHtml(a.title)}</h3>
            <p class="admin-meta">
              <span class="admin-cat">${escapeHtml(KIND_LABELS[a.kind] || a.kind)}</span>
              · <span>${fmtDate(a.created_at)}</span>
              ${a.pinned ? `· <span class="admin-pin">pinned</span>` : ""}
            </p>
          </div>
          <span class="admin-status admin-status-${a.status === "published" ? "approved" : "pending"}">${a.status}</span>
        </header>
        <p class="admin-message">${escapeHtml(a.body)}</p>
        ${a.link_url ? `<p class="form-hint">Link: <a href="${escapeHtml(a.link_url)}" target="_blank" rel="noopener">${escapeHtml(a.link_url)}</a></p>` : ""}
        <div class="admin-card-actions">
          <label class="admin-inline">
            <span>Type</span>
            <select data-act="kind">${KIND_OPTIONS.replace(`value="${a.kind}"`, `value="${a.kind}" selected`)}</select>
          </label>
          <label class="admin-inline">
            <input type="checkbox" data-act="pinned" ${a.pinned ? "checked" : ""}/> Pinned
          </label>
          <button class="btn btn-primary" data-act="save" type="button">Save changes</button>
          ${a.status === "published"
            ? `<button class="btn btn-ghost" data-act="unpublish" type="button">Move to draft</button>`
            : `<button class="btn btn-ghost" data-act="publish" type="button">Publish</button>`}
          <button class="btn btn-link admin-danger" data-act="delete" type="button">Delete</button>
        </div>
      </div>
    </article>
  `;
}

async function load() {
  const list = document.getElementById("ann-list");
  list.innerHTML = `<p class="form-hint">Loading…</p>`;
  try {
    const data = await AdminUI.apiJSON("GET", "/api/admin/announcements");
    if (!data.items.length) {
      list.innerHTML = `<p class="form-hint">No announcements yet.</p>`;
      return;
    }
    list.innerHTML = data.items.map(cardHtml).join("");
  } catch (err) {
    list.innerHTML = `<p class="form-hint">${AdminUI.escapeHtml(err.message)}</p>`;
  }
}

async function onCreate(e) {
  e.preventDefault();
  const form = e.target;
  const payload = {
    title: form.title.value.trim(),
    body: form.body.value.trim(),
    kind: form.kind.value,
    link_url: form.link_url.value.trim() || null,
    pinned: form.pinned.checked,
  };
  if (!payload.title || !payload.body) return;
  try {
    await AdminUI.apiJSON("POST", "/api/admin/announcements", payload);
    form.reset();
    AdminUI.showMsg("ok", "Added.");
    load();
  } catch (err) {
    AdminUI.showMsg("err", err.message);
  }
}

async function onListClick(e) {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  const card = btn.closest(".admin-card");
  const id = Number(card.dataset.id);
  const act = btn.dataset.act;
  btn.disabled = true;
  try {
    if (act === "delete") {
      if (!AdminUI.confirmDelete("announcement")) { btn.disabled = false; return; }
      await AdminUI.apiJSON("DELETE", `/api/admin/announcements/${id}`);
      AdminUI.showMsg("ok", "Deleted.");
    } else if (act === "publish") {
      await AdminUI.apiJSON("PATCH", `/api/admin/announcements/${id}`, { status: "published" });
      AdminUI.showMsg("ok", "Published.");
    } else if (act === "unpublish") {
      await AdminUI.apiJSON("PATCH", `/api/admin/announcements/${id}`, { status: "draft" });
      AdminUI.showMsg("ok", "Moved to draft.");
    } else if (act === "save") {
      const kind = card.querySelector('[data-act="kind"]').value;
      const pinned = card.querySelector('[data-act="pinned"]').checked;
      await AdminUI.apiJSON("PATCH", `/api/admin/announcements/${id}`, { kind, pinned });
      AdminUI.showMsg("ok", "Updated.");
    }
    load();
  } catch (err) {
    AdminUI.showMsg("err", err.message);
    btn.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("ann-form").addEventListener("submit", onCreate);
  document.getElementById("ann-list").addEventListener("click", onListClick);
  load();
});
