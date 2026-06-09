const ALBUMS = [
  { id: "childhood", label: "Childhood & early years" },
  { id: "family", label: "Family" },
  { id: "career", label: "Career & medicine" },
  { id: "friends", label: "Friends & community" },
  { id: "moments", label: "Travel & moments" },
  { id: "memorial", label: "Memorial & celebration of life" },
  { id: "other", label: "Other" },
];
const ALBUM_LABEL = Object.fromEntries(ALBUMS.map((a) => [a.id, a.label]));

let allItems = [];
let activeFilter = "all";

function albumOptions(selected) {
  return ALBUMS.map(
    (a) => `<option value="${a.id}" ${a.id === selected ? "selected" : ""}>${a.label}</option>`
  ).join("");
}

function cellHtml(p) {
  const { escapeHtml } = AdminUI;
  return `
    <figure class="admin-gallery-cell" data-id="${p.id}">
      <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.caption || "")}" />
      <figcaption>
        <input type="text" class="caption-input" data-act="caption" value="${escapeHtml(p.caption || "")}" placeholder="Caption" />
        <select class="album-select" data-act="album">${albumOptions(p.album || "other")}</select>
        <div class="admin-gallery-actions">
          <button class="btn btn-link" data-act="save" type="button">Save</button>
          <button class="btn btn-link admin-danger" data-act="delete" type="button">Delete</button>
        </div>
      </figcaption>
    </figure>
  `;
}

function renderFilter() {
  const bar = document.getElementById("gallery-filter");
  if (!bar) return;
  const counts = { all: allItems.length };
  for (const p of allItems) {
    const a = p.album || "other";
    counts[a] = (counts[a] || 0) + 1;
  }
  const chips = [{ id: "all", label: "All" }, ...ALBUMS.filter((a) => counts[a.id])];
  bar.innerHTML = chips
    .map((a) => `<button type="button" class="album-chip ${activeFilter === a.id ? "active" : ""}" data-album="${a.id}">${AdminUI.escapeHtml(a.label)} <span>${counts[a.id] || 0}</span></button>`)
    .join("");
}

function renderGrid() {
  const list = document.getElementById("gallery-list");
  const items = activeFilter === "all" ? allItems : allItems.filter((p) => (p.album || "other") === activeFilter);
  if (!items.length) {
    list.innerHTML = `<p class="muted-note">No photos${activeFilter === "all" ? " yet" : " in this album"}.</p>`;
    return;
  }
  list.innerHTML = items.map(cellHtml).join("");
}

async function load() {
  const list = document.getElementById("gallery-list");
  list.innerHTML = `<p class="muted-note">Loading…</p>`;
  try {
    const data = await AdminUI.apiJSON("GET", "/api/admin/gallery");
    allItems = data.items || [];
    renderFilter();
    renderGrid();
  } catch (err) {
    list.innerHTML = `<p class="muted-note">${AdminUI.escapeHtml(err.message)}</p>`;
  }
}

async function onUpload(e) {
  e.preventDefault();
  const form = e.target;
  const files = Array.from(form.file.files || []);
  if (!files.length) return;
  const album = form.album.value || "other";

  const submitBtn = form.querySelector("button[type=submit]");
  const progress = document.getElementById("upload-progress");
  submitBtn.disabled = true;

  let done = 0;
  let failed = 0;
  const total = files.length;
  if (progress) progress.hidden = false;

  for (const file of files) {
    if (progress) progress.textContent = `Uploading ${done + failed + 1} of ${total}…`;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("album", album);
    try {
      await AdminUI.apiUpload("/api/admin/gallery", fd);
      done++;
    } catch (err) {
      failed++;
      AdminUI.showMsg("err", `${file.name}: ${err.message}`);
    }
  }

  if (progress) progress.hidden = true;
  form.reset();
  populateUploadAlbum();
  submitBtn.disabled = false;

  if (done) AdminUI.showMsg("ok", `${done} photo${done > 1 ? "s" : ""} uploaded${failed ? `, ${failed} failed` : ""}.`);
  activeFilter = album;
  load();
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
      const album = cell.querySelector('[data-act="album"]').value;
      await AdminUI.apiJSON("PATCH", `/api/admin/gallery/${id}`, { caption, album });
      AdminUI.showMsg("ok", "Updated.");
      load();
    }
  } catch (err) {
    AdminUI.showMsg("err", err.message);
    btn.disabled = false;
  }
}

function onFilterClick(e) {
  const chip = e.target.closest(".album-chip");
  if (!chip) return;
  activeFilter = chip.dataset.album;
  renderFilter();
  renderGrid();
}

function populateUploadAlbum() {
  const sel = document.getElementById("gal-album");
  if (sel) sel.innerHTML = albumOptions("family");
}

document.addEventListener("DOMContentLoaded", () => {
  populateUploadAlbum();
  document.getElementById("gallery-form").addEventListener("submit", onUpload);
  document.getElementById("gallery-list").addEventListener("click", onListClick);
  document.getElementById("gallery-filter").addEventListener("click", onFilterClick);
  load();
});
