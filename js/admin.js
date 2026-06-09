const CATEGORIES = [
  { id: "family", label: "Family" },
  { id: "friends", label: "Friends" },
  { id: "colleagues", label: "Professional colleagues" },
  { id: "patients", label: "Patients & families" },
  { id: "community", label: "Community" },
  { id: "other", label: "Other / not sure" },
];

const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));

let currentStatus = "pending";

function showMsg(type, text) {
  if (window.AdminUI) return AdminUI.showMsg(type, text);
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function categoryOptions(selected) {
  return CATEGORIES.map(
    (c) => `<option value="${c.id}" ${c.id === selected ? "selected" : ""}>${c.label}</option>`
  ).join("");
}

function cardHtml(t) {
  const isPending = t.status === "pending";
  const isApproved = t.status === "approved";
  const photo = t.image_url
    ? `<div class="admin-card-photo"><img src="${escapeHtml(t.image_url)}" alt="" /></div>`
    : "";
  return `
    <article class="admin-card" data-id="${t.id}">
      ${photo}
      <div class="admin-card-body">
        <header class="admin-card-head">
          <div>
            <h3>${escapeHtml(t.name)}</h3>
            <p class="admin-meta">
              <span class="admin-cat">${escapeHtml(CATEGORY_LABEL[t.category] || t.category)}</span>
              · <span>${fmtDate(t.created_at)}</span>
              ${t.email ? `· <span>${escapeHtml(t.email)}</span>` : ""}
            </p>
          </div>
          <span class="admin-status admin-status-${t.status}">${t.status}</span>
        </header>
        <p class="admin-message">${escapeHtml(t.message)}</p>
        <div class="admin-card-actions">
          <label class="admin-inline">
            <span>Section</span>
            <select data-act="category">${categoryOptions(t.category)}</select>
          </label>
          ${isPending || !isApproved
            ? `<button class="btn btn-primary" data-act="approve" type="button">Approve</button>`
            : ""}
          ${isPending
            ? `<button class="btn btn-ghost" data-act="reject" type="button">Reject</button>`
            : ""}
          ${!isPending
            ? `<button class="btn btn-ghost" data-act="repend" type="button">Back to pending</button>`
            : ""}
          <button class="btn btn-link admin-danger" data-act="delete" type="button">Delete</button>
        </div>
      </div>
    </article>
  `;
}

async function loadList(status) {
  currentStatus = status;
  document.querySelectorAll(".admin-tab").forEach((el) => {
    el.classList.toggle("active", el.dataset.status === status);
  });

  const list = document.getElementById("admin-list");
  list.innerHTML = `<p class="form-hint">Loading…</p>`;

  try {
    const res = await fetch(`/api/admin/tributes?status=${encodeURIComponent(status)}`, {
      credentials: "include",
    });
    if (res.status === 401) {
      list.innerHTML = `<p class="muted-note">Not signed in. Refresh and sign in with the family admin email.</p>`;
      return;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    document.getElementById("count-pending").textContent = data.counts.pending || 0;
    document.getElementById("count-approved").textContent = data.counts.approved || 0;
    document.getElementById("count-rejected").textContent = data.counts.rejected || 0;
    if (data.admin) {
      const who = document.querySelector("[data-admin-email]");
      if (who) who.textContent = data.admin;
    }

    if (!data.items.length) {
      list.innerHTML = `<p class="muted-note">No ${status} tributes.</p>`;
      return;
    }
    list.innerHTML = data.items.map(cardHtml).join("");
  } catch (err) {
    list.innerHTML = `<p class="muted-note">Could not load tributes (${escapeHtml(err.message)}).</p>`;
  }
}

async function patchTribute(id, payload) {
  const res = await fetch(`/api/admin/tributes/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function deleteTribute(id) {
  const res = await fetch(`/api/admin/tributes/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function onCardClick(e) {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  const card = btn.closest(".admin-card");
  if (!card) return;
  const id = Number(card.dataset.id);
  const act = btn.dataset.act;
  const catSel = card.querySelector('select[data-act="category"]');
  const category = catSel ? catSel.value : undefined;

  btn.disabled = true;
  try {
    if (act === "approve") {
      await patchTribute(id, { status: "approved", category });
      showMsg("ok", "Approved.");
    } else if (act === "reject") {
      await patchTribute(id, { status: "rejected" });
      showMsg("ok", "Rejected.");
    } else if (act === "repend") {
      await patchTribute(id, { status: "pending" });
      showMsg("ok", "Moved back to pending.");
    } else if (act === "delete") {
      if (!confirm("Delete this tribute permanently?")) { btn.disabled = false; return; }
      await deleteTribute(id);
      showMsg("ok", "Deleted.");
    }
    await loadList(currentStatus);
  } catch (err) {
    showMsg("err", err.message);
    btn.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".admin-tab").forEach((el) => {
    el.addEventListener("click", () => loadList(el.dataset.status));
  });
  document.getElementById("admin-list").addEventListener("click", onCardClick);
  loadList("pending");
});
