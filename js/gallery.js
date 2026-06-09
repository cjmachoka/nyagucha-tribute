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

(async function () {
  const grid = document.querySelector(".gallery-grid");
  if (!grid) return;
  try {
    const res = await fetch("/api/gallery");
    if (!res.ok) return;
    const data = await res.json();
    if (!data.items.length) {
      grid.innerHTML = `<p class="form-hint">Photos will appear here as the family adds them.</p>`;
      return;
    }
    grid.innerHTML = data.items.map(cellHtml).join("");
  } catch (_) {
    // leave placeholders
  }
})();
