(async function () {
  const targets = document.querySelectorAll("[data-setting]");
  const hero = document.querySelector("[data-hero]");
  if (!targets.length && !hero) return;

  try {
    const res = await fetch("/api/settings");
    if (!res.ok) return;
    const s = await res.json();
    targets.forEach((el) => {
      const key = el.dataset.setting;
      const value = s[key];
      if (value == null || value === "") return;
      if (el.dataset.html === "1") {
        el.textContent = "";
        for (const para of value.split(/\n\s*\n/)) {
          const p = document.createElement("p");
          p.textContent = para;
          el.appendChild(p);
        }
      } else {
        el.textContent = value;
      }
    });
    if (hero && s.hero_image_url) {
      hero.style.backgroundImage = `url("${s.hero_image_url}")`;
      hero.classList.add("has-photo");
    }
  } catch (_) {
    // leave defaults
  }
})();
