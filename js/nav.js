(function () {
  function init() {
    const headerInner = document.querySelector(".site-header .header-inner");
    const nav = document.querySelector('.site-header nav[aria-label="Main"]');
    if (!headerInner || !nav || headerInner.querySelector(".nav-toggle")) return;

    const btn = document.createElement("button");
    btn.className = "nav-toggle";
    btn.type = "button";
    btn.setAttribute("aria-label", "Open menu");
    btn.setAttribute("aria-expanded", "false");
    btn.textContent = "\u2630"; // ☰
    headerInner.appendChild(btn);

    function setOpen(open) {
      document.body.classList.toggle("nav-open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      btn.textContent = open ? "\u2715" : "\u2630"; // ✕ : ☰
    }

    btn.addEventListener("click", function () {
      setOpen(!document.body.classList.contains("nav-open"));
    });

    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 768) setOpen(false);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
