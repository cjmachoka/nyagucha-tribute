const TRIBUTE_CATEGORIES = [
  { id: "family", label: "Family" },
  { id: "friends", label: "Friends" },
  { id: "colleagues", label: "Professional colleagues" },
  { id: "patients", label: "Patients & families" },
  { id: "community", label: "Community" },
  { id: "other", label: "Other" },
];

function groupByCategory(tributes) {
  const grouped = Object.fromEntries(TRIBUTE_CATEGORIES.map((c) => [c.id, []]));
  for (const tribute of tributes) {
    const key = grouped[tribute.category] ? tribute.category : "other";
    grouped[key].push(tribute);
  }
  return grouped;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderCard(t) {
  const photo =
    t.has_photo || t.image_url
      ? `<div class="tribute-photo">Photo</div>`
      : "";
  return `<article class="tribute-card">${photo}<blockquote>${escapeHtml(t.message)}</blockquote><cite>— ${escapeHtml(t.name)}</cite></article>`;
}

function renderNav(items) {
  return items
    .map(
      ({ category, count }) =>
        `<a href="#${category.id}">${category.label} (${count})</a>`
    )
    .join("");
}

function renderSection(category, items) {
  return `
    <section class="tribute-section" id="${category.id}">
      <div class="tribute-section-head">
        <h2>${category.label}</h2>
        <span>${items.length} message${items.length === 1 ? "" : "s"}</span>
      </div>
      <div class="tribute-grid">${items.map(renderCard).join("")}</div>
    </section>`;
}

async function loadTributes() {
  try {
    const api = await fetch("/api/tributes");
    if (api.ok) return (await api.json()).grouped;
  } catch (_) {}
  const res = await fetch("data/tributes.json");
  return groupByCategory(await res.json());
}

async function init() {
  const nav = document.getElementById("tribute-nav");
  const main = document.getElementById("tribute-sections");
  if (!main) return;

  try {
    const grouped = await loadTributes();
    const sections = [];
    const navItems = [];

    for (const cat of TRIBUTE_CATEGORIES) {
      const items = grouped[cat.id];
      if (items?.length) {
        sections.push(renderSection(cat, items));
        navItems.push({ category: cat, count: items.length });
      }
    }

    if (nav) nav.innerHTML = renderNav(navItems);
    main.innerHTML = sections.join("");

    if (location.hash) {
      document.querySelector(location.hash)?.scrollIntoView({ behavior: "smooth" });
    }
  } catch (e) {
    main.innerHTML = "<p class='lead'>Unable to load tributes.</p>";
    console.error(e);
  }
}

document.addEventListener("DOMContentLoaded", init);
