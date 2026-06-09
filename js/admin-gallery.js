function cellHtml(p) {
  const { escapeHtml } = AdminUI;
  return `
    <figure class="admin-gallery-cell" data-id="${p.id}">
      <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.caption || "")}" />
      <figcaption>
        <input type="text" class="caption-input" data-act="caption" value="${escapeHtml(p.caption || "")}" placeholder="Caption" />
        <div class="admin-gallery-actions">
          <button class="btn btn-link" data-act="save" type="button">Save</button>
          <button class="btn btn-link admin-danger" data-act="delete" type="button">Delete</button>
        </div>
      </figcaption>
    </figure>
  `;
}

async function load() {
  const list = document.getElementById("gallery-list");
  list.innerHTML = `<p class="form-hint">Loading…</p>`;
  try {
    const data = await AdminUI.apiJSON("GET", "/api/admin/gallery");
    if (!data.items.length) {
      list.innerHTML = `<p class="form-hint">No photos yet.</p>`;
      return;
    }
    list.innerHTML = data.items.map(cellHtml).join("");
  } catch (err) {
    list.innerHTML = `<p class="form-hint">${AdminUI.escapeHtml(err.message)}</p>`;
  }
}

async function onUpload(e) {
  e.preventDefault();
  const form = e.target;
  const file = form.file.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append("file", file);
  if (form.caption.value.trim()) fd.append("caption", form.caption.value.trim());
  const submitBtn = form.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  try {
    await AdminUI.apiUpload("/api/admin/gallery", fd);
    form.reset();
    AdminUI.showMsg("ok", "Uploaded.");
    load();
  } catch (err) {
    AdminUI.showMsg("err", err.message);
  } finally {
    submitBtn.disabled = false;
  }
}

async function onListClick(e) {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  const cell = btn.closest(".admin-gallery-cell");
  const id = Number(cell.dataset.id);
  const act = btn.dataset.act;
  btn.disabled = true;
  try {
    if (act === "delete") {
      if (!AdminUI.confirmDelete("photo")) { btn.disabled = false; return; }
      await AdminUI.apiJSON("DELETE", `/api/admin/gallery/${id}`);
      AdminUI.showMsg("ok", "Deleted.");
      load();
    } else if (act === "save") {
      const caption = cell.querySelector('[data-act="caption"]').value;
      await AdminUI.apiJSON("PATCH", `/api/admin/gallery/${id}`, { caption });
      AdminUI.showMsg("ok", "Updated.");
      btn.disabled = false;
    }
  } catch (err) {
    AdminUI.showMsg("err", err.message);
    btn.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("gallery-form").addEventListener("submit", onUpload);
  document.getElementById("gallery-list").addEventListener("click", onListClick);
  load();
});
