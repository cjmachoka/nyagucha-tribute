const ALBUM_LABEL = {
  childhood: "Childhood & early years",
  family: "Family",
  career: "Career & medicine",
  friends: "Friends & community",
  moments: "Travel & moments",
  memorial: "Memorial & celebration of life",
  other: "Other",
};

let allItems = [];
let activeAlbum = "all";

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function cellHtml(p) {
  return `
    <figure class="gallery-cell">
      <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.caption || "")}" loading="lazy" />
      ${p.caption ? `<figcaption>${escapeHtml(p.caption)}</figcaption>` : ""}
    </figure>
  `;
}

function renderTabs(albums) {
  const bar = document.getElementById("gallery-tabs");
  if (!bar || albums.length <= 1) return;
  const tabs = ["all", ...albums];
  bar.innerHTML = tabs
    .map((a) => {
      const label = a === "all" ? "All" : (ALBUM_LABEL[a] || a);
      return `<button type="button" class="gallery-tab ${activeAlbum === a ? "active" : ""}" data-album="${a}">${escapeHtml(label)}</button>`;
    })
    .join("");
  bar.hidden = false;
}

function renderGrid() {
  const grid = document.querySelector(".gallery-grid");
  const items = activeAlbum === "all" ? allItems : allItems.filter((p) => (p.album || "other") === activeAlbum);
  if (!items.length) {
    grid.innerHTML = `<p class="form-hint">No photos in this album yet.</p>`;
    return;
  }
  grid.innerHTML = items.map(cellHtml).join("");
}

(async function () {
  const grid = document.querySelector(".gallery-grid");
  if (!grid) return;
  try {
    const res = await fetch("/api/gallery");
    if (!res.ok) return;
    const data = await res.json();
    allItems = data.items || [];
    if (!allItems.length) {
      grid.innerHTML = "";
      return;
    }
    renderTabs(data.albums || []);
    renderGrid();

    const bar = document.getElementById("gallery-tabs");
    if (bar) {
      bar.addEventListener("click", (e) => {
        const tab = e.target.closest(".gallery-tab");
        if (!tab) return;
        activeAlbum = tab.dataset.album;
        renderTabs(data.albums || []);
        renderGrid();
      });
    }
  } catch (_) {
    // leave placeholders
  }
})();
