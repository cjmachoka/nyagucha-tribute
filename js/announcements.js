const KIND_LABELS = {
  "family-notice": "Family notice",
  "funeral": "Funeral",
  "memorial": "Memorial",
  "condolence": "Condolence",
  "news": "News",
  "general": "Announcement",
};

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function itemHtml(a) {
  const featured = a.pinned ? " featured" : "";
  const linkHtml = a.link_url
    ? ` <a href="${escapeHtml(a.link_url)}" target="_blank" rel="noopener">Read more</a>`
    : "";
  const bodyParas = String(a.body || "")
    .split(/\n\s*\n/)
    .map((p) => `<p>${escapeHtml(p)}${linkHtml && p === a.body.split(/\n\s*\n/).slice(-1)[0] ? linkHtml : ""}</p>`)
    .join("");
  return `
    <article class="announce-item${featured}">
      <p class="announce-type">${escapeHtml(KIND_LABELS[a.kind] || a.kind)}</p>
      <h3>${escapeHtml(a.title)}</h3>
      ${bodyParas}
    </article>
  `;
}

(async function () {
  const list = document.querySelector(".announce-list");
  if (!list) return;
  try {
    const res = await fetch("/api/announcements");
    if (!res.ok) return;
    const data = await res.json();
    if (!data.items.length) {
      list.innerHTML = `<p class="form-hint">No announcements yet.</p>`;
      return;
    }
    list.innerHTML = data.items.map(itemHtml).join("");
  } catch (_) {
    // leave fallback
  }
})();
