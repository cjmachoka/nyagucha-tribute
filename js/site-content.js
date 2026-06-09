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
    const media = Array.isArray(s.hero_media) ? s.hero_media.filter((m) => m && m.url) : [];
    if (hero && media.length) {
      startHeroSlideshow(hero, media);
    } else if (hero && s.hero_image_url) {
      hero.style.backgroundImage = `url("${s.hero_image_url}")`;
      hero.classList.add("has-photo");
    }
  } catch (_) {
    // leave defaults
  }

  function startHeroSlideshow(hero, media) {
    const stage = hero.querySelector("[data-hero-slides]");
    if (!stage) return;
    hero.classList.add("has-media");
    stage.innerHTML = "";

    const slides = media.map((m, idx) => {
      const slide = document.createElement("div");
      slide.className = "hero-slide";
      const fit = m.fit === "contain" ? "contain" : "cover";
      const focus = m.focus || "center";
      if (m.type === "video") {
        const v = document.createElement("video");
        v.src = m.url;
        v.muted = true;
        v.defaultMuted = true;
        v.playsInline = true;
        v.setAttribute("playsinline", "");
        v.preload = idx === 0 ? "auto" : "none";
        v.style.objectFit = fit;
        v.style.objectPosition = focus;
        slide.appendChild(v);
      } else {
        const img = document.createElement("img");
        img.src = m.url;
        img.alt = "";
        img.loading = idx === 0 ? "eager" : "lazy";
        img.style.objectFit = fit;
        img.style.objectPosition = focus;
        slide.appendChild(img);
      }
      stage.appendChild(slide);
      return { el: slide, media: m };
    });

    if (slides.length === 1 && slides[0].media.type !== "video") {
      slides[0].el.classList.add("is-active");
      return;
    }

    const IMAGE_MS = 5000;
    let current = -1;
    let timer = null;

    function go(next) {
      if (timer) { clearTimeout(timer); timer = null; }
      if (current >= 0) {
        slides[current].el.classList.remove("is-active");
        const prevVid = slides[current].el.querySelector("video");
        if (prevVid) { try { prevVid.pause(); } catch (_) {} }
      }
      current = next % slides.length;
      const slide = slides[current];
      slide.el.classList.add("is-active");

      const vid = slide.el.querySelector("video");
      if (vid) {
        vid.currentTime = 0;
        const advance = () => go(current + 1);
        vid.onended = advance;
        const playPromise = vid.play();
        if (playPromise && playPromise.catch) {
          playPromise.catch(() => { timer = setTimeout(advance, IMAGE_MS); });
        }
        // Safety net if a clip stalls or has no duration metadata.
        timer = setTimeout(advance, 30000);
      } else {
        timer = setTimeout(() => go(current + 1), IMAGE_MS);
      }
    }

    go(0);
  }
})();
