function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function bodyHtml(body) {
  return String(body || "")
    .split(/\n\s*\n/)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("");
}

function photoCols(n) {
  if (n >= 4) return "cols-4";
  if (n === 1) return "full";
  return "cols-2";
}

function photosHtml(photos) {
  if (!photos || !photos.length) return "";
  const cols = photoCols(photos.length);
  const items = photos.map((p) => {
    const cap = escapeHtml(p.caption || "");
    if (cols === "full") {
      return `<figure class="ph wide"><img src="${escapeHtml(p.image_url)}" alt="${cap}" />${cap ? `<figcaption>${cap}</figcaption>` : ""}</figure>`;
    }
    return `<figure class="ph portrait"><img src="${escapeHtml(p.image_url)}" alt="${cap}" />${cap ? `<figcaption>${cap}</figcaption>` : ""}</figure>`;
  }).join("");
  return `<div class="bio-photos ${cols}">${items}</div>`;
}

function chapterHtml(c, isLast) {
  return `
    <section class="bio-chapter" id="${escapeHtml(c.slug)}">
      <h2>${escapeHtml(c.title)}</h2>
      <div class="body">${bodyHtml(c.body)}</div>
      ${photosHtml(c.photos)}
    </section>
    ${isLast ? "" : `<hr class="bio-divider" />`}
  `;
}

(async function () {
  const root = document.getElementById("bio-chapters");
  if (!root) return;
  try {
    const res = await fetch("/api/biography");
    if (!res.ok) return;
    const data = await res.json();
    if (!data.chapters.length) {
      root.innerHTML = `<p class="form-hint">Chapters will appear here as the family adds them.</p>`;
      return;
    }
    root.innerHTML = data.chapters.map((c, i) => chapterHtml(c, i === data.chapters.length - 1)).join("");
  } catch (_) {
    // leave fallback
  }
})();
