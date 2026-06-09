window.AdminUI = (function () {
  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function fmtDate(iso) {
    if (!iso) return "";
    const d = new Date(String(iso).replace(" ", "T") + "Z");
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  function toastRoot() {
    let root = document.getElementById("toast-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "toast-root";
      document.body.appendChild(root);
    }
    return root;
  }

  function showMsg(type, text) {
    const root = toastRoot();
    const toast = document.createElement("div");
    const ok = type === "ok";
    toast.className = `toast ${ok ? "ok" : "err"}`;
    toast.innerHTML = `<span class="toast-ico">${ok ? "✓" : "!"}</span><span></span>`;
    toast.lastChild.textContent = text;
    root.appendChild(toast);
    const ttl = ok ? 2600 : 4500;
    setTimeout(() => {
      toast.classList.add("hide");
      setTimeout(() => toast.remove(), 220);
    }, ttl);
  }

  function initShell() {
    const toggle = document.querySelector(".admin-menu-toggle");
    const overlay = document.querySelector(".admin-overlay");
    if (toggle) toggle.addEventListener("click", () => document.body.classList.toggle("nav-open"));
    if (overlay) overlay.addEventListener("click", () => document.body.classList.remove("nav-open"));

    // fill signed-in email if endpoint available
    const who = document.querySelector("[data-admin-email]");
    if (who) {
      fetch("/api/admin/tributes?status=pending", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d && d.admin) who.textContent = d.admin; })
        .catch(() => {});
    }
  }

  async function apiJSON(method, url, body) {
    const res = await fetch(url, {
      method,
      credentials: "include",
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) {
      throw new Error("Not signed in. Refresh and sign in with the family admin email.");
    }
    if (!res.ok) {
      let msg;
      try { msg = (await res.json()).error; } catch {}
      throw new Error(msg || `HTTP ${res.status}`);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  async function apiUpload(url, formData) {
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    if (res.status === 401) throw new Error("Not signed in.");
    if (!res.ok) {
      let msg;
      try { msg = (await res.json()).error; } catch {}
      throw new Error(msg || `HTTP ${res.status}`);
    }
    return res.json();
  }

  function confirmDelete(thing) {
    return confirm(`Delete this ${thing}? This cannot be undone.`);
  }

  // Downscale + compress an image in the browser before upload.
  // Keeps small images untouched; large ones are scaled to fit maxDim and
  // re-encoded as JPEG so uploads stay well under the 5 MB limit.
  async function resizeImage(file, opts) {
    const o = opts || {};
    const maxDim = o.maxDim || 2400;
    const quality = o.quality || 0.85;
    const softLimit = o.softLimit || 1.5 * 1024 * 1024;
    if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type)) return file;

    let img;
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = () => reject(new Error("Could not read the image"));
        fr.readAsDataURL(file);
      });
      img = await new Promise((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = () => reject(new Error("Could not load the image"));
        im.src = dataUrl;
      });
    } catch {
      return file; // fall back to the original file on any failure
    }

    const { width, height } = img;
    if (width <= maxDim && height <= maxDim && file.size <= softLimit) {
      return file;
    }

    const scale = Math.min(1, maxDim / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) return file;
    const base = (file.name || "photo").replace(/\.[^.]+$/, "");
    return new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  }

  document.addEventListener("DOMContentLoaded", initShell);

  return { escapeHtml, fmtDate, showMsg, apiJSON, apiUpload, confirmDelete, resizeImage };
})();
