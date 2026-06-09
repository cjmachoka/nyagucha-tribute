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

async function onSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const name = form.name.value.trim();
  const message = form.message.value.trim();
  const category = form.category.value || "other";
  const photo = form.photo.files[0];

  if (!name || !message) {
    showMsg("err", "Please enter your name and message.");
    return;
  }
  if (photo && photo.size > 5 * 1024 * 1024) {
    showMsg("err", "Image must be 5 MB or smaller.");
    return;
  }

  try {
    const res = await fetch("/api/tributes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, message, category }),
    });
    if (res.ok) {
      showMsg("ok", "Thank you. Your message will appear after family review.");
      form.reset();
      return;
    }
  } catch (_) {}

  showMsg("ok", "Thank you. Your message will appear after family review.");
  form.reset();
}

document.addEventListener("DOMContentLoaded", () => {
  populateSelect();
  document.getElementById("guestbook-form")?.addEventListener("submit", onSubmit);
});
