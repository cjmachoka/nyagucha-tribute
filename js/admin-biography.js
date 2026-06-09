function photoHtml(p) {
  const { escapeHtml } = AdminUI;
  return `
    <figure class="admin-bio-photo" data-photo-id="${p.id}">
      <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.caption || "")}" />
      <button class="btn btn-link admin-danger" data-act="delete-photo" type="button">Remove</button>
    </figure>
  `;
}

function chapterHtml(c) {
  const { escapeHtml } = AdminUI;
  return `
    <article class="admin-chapter" data-id="${c.id}">
      <div class="admin-card-head">
        <div style="flex:1">
          <input type="text" class="chapter-title-input" data-act="title" value="${escapeHtml(c.title)}" />
        </div>
        <span class="admin-status admin-status-${c.status === "published" ? "approved" : "pending"}">${c.status}</span>
      </div>
      <textarea class="chapter-body-input" data-act="body" rows="6">${escapeHtml(c.body)}</textarea>
      <div class="admin-bio-photos">
        ${(c.photos || []).map(photoHtml).join("")}
      </div>
      <form class="photo-upload" enctype="multipart/form-data" data-chapter-id="${c.id}">
        <input type="file" name="file" accept="image/jpeg,image/png,image/webp" required />
        <input type="text" name="caption" placeholder="Caption (optional)" />
        <button class="btn btn-ghost" type="submit">Add photo</button>
      </form>
      <div class="admin-card-actions">
        <button class="btn btn-primary" data-act="save" type="button">Save chapter</button>
        ${c.status === "published"
          ? `<button class="btn btn-ghost" data-act="unpublish" type="button">Move to draft</button>`
          : `<button class="btn btn-ghost" data-act="publish" type="button">Publish</button>`}
        <button class="btn btn-link admin-danger" data-act="delete" type="button">Delete chapter</button>
      </div>
    </article>
  `;
}

async function load() {
  const list = document.getElementById("chapter-list");
  list.innerHTML = `<p class="form-hint">Loading…</p>`;
  try {
    const data = await AdminUI.apiJSON("GET", "/api/admin/biography");
    if (!data.chapters.length) {
      list.innerHTML = `<p class="form-hint">No chapters yet.</p>`;
      return;
    }
    list.innerHTML = data.chapters.map(chapterHtml).join("");
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
  };
  if (!payload.title || !payload.body) return;
  try {
    await AdminUI.apiJSON("POST", "/api/admin/biography", payload);
    form.reset();
    AdminUI.showMsg("ok", "Chapter added.");
    load();
  } catch (err) {
    AdminUI.showMsg("err", err.message);
  }
}

async function onListClick(e) {
  const photoForm = e.target.closest("form.photo-upload");
  if (photoForm && e.target.matches("button[type=submit]")) return;

  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  const chapter = btn.closest(".admin-chapter");
  const id = Number(chapter.dataset.id);
  const act = btn.dataset.act;

  btn.disabled = true;
  try {
    if (act === "delete") {
      if (!AdminUI.confirmDelete("chapter (and its photos)")) { btn.disabled = false; return; }
      await AdminUI.apiJSON("DELETE", `/api/admin/biography/${id}`);
      AdminUI.showMsg("ok", "Deleted.");
      load();
    } else if (act === "publish") {
      await AdminUI.apiJSON("PATCH", `/api/admin/biography/${id}`, { status: "published" });
      AdminUI.showMsg("ok", "Published.");
      load();
    } else if (act === "unpublish") {
      await AdminUI.apiJSON("PATCH", `/api/admin/biography/${id}`, { status: "draft" });
      AdminUI.showMsg("ok", "Moved to draft.");
      load();
    } else if (act === "save") {
      const title = chapter.querySelector('[data-act="title"]').value;
      const body = chapter.querySelector('[data-act="body"]').value;
      await AdminUI.apiJSON("PATCH", `/api/admin/biography/${id}`, { title, body });
      AdminUI.showMsg("ok", "Saved.");
      btn.disabled = false;
    } else if (act === "delete-photo") {
      if (!AdminUI.confirmDelete("photo")) { btn.disabled = false; return; }
      const figure = btn.closest(".admin-bio-photo");
      const photoId = Number(figure.dataset.photoId);
      await AdminUI.apiJSON("DELETE", `/api/admin/biography/${id}/photos/${photoId}`);
      AdminUI.showMsg("ok", "Photo removed.");
      load();
    }
  } catch (err) {
    AdminUI.showMsg("err", err.message);
    btn.disabled = false;
  }
}

async function onListSubmit(e) {
  const form = e.target.closest("form.photo-upload");
  if (!form) return;
  e.preventDefault();
  const chapterId = Number(form.dataset.chapterId);
  const fd = new FormData(form);
  const submitBtn = form.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  try {
    await AdminUI.apiUpload(`/api/admin/biography/${chapterId}/photos`, fd);
    form.reset();
    AdminUI.showMsg("ok", "Photo added.");
    load();
  } catch (err) {
    AdminUI.showMsg("err", err.message);
    submitBtn.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("chapter-form").addEventListener("submit", onCreate);
  const list = document.getElementById("chapter-list");
  list.addEventListener("click", onListClick);
  list.addEventListener("submit", onListSubmit);
  load();
});
