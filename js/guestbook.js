const CATEGORIES = [
  { id: "family", label: "Family" },
  { id: "friends", label: "Friends" },
  { id: "colleagues", label: "Professional colleagues" },
  { id: "patients", label: "Patients & families" },
  { id: "community", label: "Community" },
  { id: "other", label: "Other / not sure" },
];

function populateSelect() {
  const el = document.getElementById("category");
  if (!el) return;
  el.innerHTML =
    '<option value="">Section (optional)</option>' +
    CATEGORIES.map((c) => `<option value="${c.id}">${c.label}</option>`).join("");
}

function showMsg(type, text) {
  const el = document.getElementById("form-msg");
  if (!el) return;
  el.className = `form-msg ${type === "ok" ? "ok" : "err"}`;
  el.textContent = text;
  el.hidden = false;
}

const MAX_PHOTOS = 2;
const MAX_BYTES = 5 * 1024 * 1024;

async function onSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const name = form.name.value.trim();
  const message = form.message.value.trim();
  const category = form.category.value || "other";
  const photos = Array.from(form.photos.files || []);

  if (!name || !message) {
    showMsg("err", "Please enter your name and message.");
    return;
  }
  if (photos.length > MAX_PHOTOS) {
    showMsg("err", `Please attach no more than ${MAX_PHOTOS} photos.`);
    return;
  }
  for (const p of photos) {
    if (p.size > MAX_BYTES) {
      showMsg("err", `"${p.name}" is larger than 5 MB.`);
      return;
    }
  }

  const submitBtn = form.querySelector("button[type=submit]");
  if (submitBtn) submitBtn.disabled = true;

  try {
    const fd = new FormData();
    fd.append("name", name);
    fd.append("message", message);
    fd.append("category", category);
    for (const p of photos) fd.append("photos", p);

    const res = await fetch("/api/tributes", { method: "POST", body: fd });
    if (res.ok) {
      showMsg("ok", "Thank you — your message has been submitted.");
      form.reset();
      return;
    }
    const data = await res.json().catch(() => ({}));
    showMsg("err", data.error || "Something went wrong. Please try again.");
  } catch (_) {
    showMsg("err", "Network error. Please try again.");
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  populateSelect();
  document.getElementById("guestbook-form")?.addEventListener("submit", onSubmit);
});
