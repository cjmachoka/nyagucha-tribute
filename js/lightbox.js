(function () {
  // Images matching these selectors become click-to-enlarge.
  var SELECTORS = [
    ".gallery-grid img",
    ".tribute-photos img",
    ".bio-photos img"
  ];

  var overlay, imgEl, captionEl, lastFocus;

  function build() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.className = "lightbox";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Image viewer");
    overlay.innerHTML =
      '<button type="button" class="lightbox-close" aria-label="Close">\u2715</button>' +
      '<figure class="lightbox-figure">' +
      '<img class="lightbox-img" alt="" />' +
      '<figcaption class="lightbox-caption"></figcaption>' +
      "</figure>";
    document.body.appendChild(overlay);
    imgEl = overlay.querySelector(".lightbox-img");
    captionEl = overlay.querySelector(".lightbox-caption");

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay || e.target.closest(".lightbox-close")) close();
    });
  }

  function open(src, caption) {
    build();
    lastFocus = document.activeElement;
    imgEl.src = src;
    imgEl.alt = caption || "";
    captionEl.textContent = caption || "";
    captionEl.style.display = caption ? "" : "none";
    document.body.classList.add("lightbox-open");
    overlay.classList.add("is-open");
    var btn = overlay.querySelector(".lightbox-close");
    if (btn) btn.focus();
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove("is-open");
    document.body.classList.remove("lightbox-open");
    imgEl.src = "";
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  document.addEventListener("click", function (e) {
    var img = e.target.closest("img");
    if (!img) return;
    if (!img.matches(SELECTORS.join(","))) return;
    if (!img.currentSrc && !img.src) return;
    e.preventDefault();
    open(img.currentSrc || img.src, img.getAttribute("alt") || "");
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && overlay && overlay.classList.contains("is-open")) close();
  });
})();
