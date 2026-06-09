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

  function showMsg(type, text, autoHide = true) {
    const el = document.getElementById("admin-msg");
    if (!el) return;
    el.className = `form-msg ${type === "ok" ? "ok" : "err"}`;
    el.textContent = text;
    el.hidden = false;
    if (autoHide && type === "ok") {
      clearTimeout(showMsg._t);
      showMsg._t = setTimeout(() => { el.hidden = true; }, 2500);
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

  return { escapeHtml, fmtDate, showMsg, apiJSON, apiUpload, confirmDelete };
})();
