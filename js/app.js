/* MNM — page animations: smooth scroll, intro, text reveals, scroll scenes,
   horizontal scroll, counters, marquee, magnetic buttons, cursor, tilt cards. */
(() => {
  const root = document.documentElement;
  const page = document.body.dataset.page;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(pointer: fine)").matches;
  let mobileNow = innerWidth <= 820;
  addEventListener("resize", () => (mobileNow = innerWidth <= 820), { passive: true });
  const isMobile = () => mobileNow;
  const hasGsap = !!window.gsap && !!window.ScrollTrigger;
  root.classList.add("js");

  /* ---------- links from config.js ---------- */
  const LINKS = window.MNM_LINKS || {};
  document.querySelectorAll("[data-link]").forEach((el) => {
    const url = LINKS[el.dataset.link];
    if (url) { el.href = url; el.target = "_blank"; el.rel = "noopener"; return; }
    if (el.closest(".footer")) { const col = el.parentElement; el.remove(); if (col && col.querySelectorAll("a").length === 0) col.remove(); return; }
    el.removeAttribute("href");
    el.classList.add("is-soon");
    el.setAttribute("aria-disabled", "true");
    const label = el.querySelector("span") || el;
    label.textContent = el.classList.contains("btn") ? "Discord link coming soon" : "Coming soon";
  });
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();


  /* ---------- tabs (join page) ---------- */
  const tablist = document.querySelector(".tabs");
  if (tablist) {
    const tabs = [...tablist.querySelectorAll(".tab")], pill = tablist.querySelector(".tab-pill");
    const place = (t) => { pill.style.left = t.offsetLeft + "px"; pill.style.width = t.offsetWidth + "px"; };
    const select = (t, focus) => {
      tabs.forEach((x) => {
        const on = x === t;
        x.setAttribute("aria-selected", on); x.tabIndex = on ? 0 : -1;
        document.getElementById(x.getAttribute("aria-controls")).hidden = !on;
      });
      place(t); focus && t.focus();
      window.ScrollTrigger && ScrollTrigger.refresh();
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => select(t));
      t.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") select(tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length], true);
        else if (e.key === "Home" || e.key === "End") { e.preventDefault(); select(e.key === "Home" ? tabs[0] : tabs[tabs.length - 1], true); }
      });
    });
    const fromHash = tabs.find((t) => "#" + t.getAttribute("aria-controls") === location.hash);
    select(fromHash || tabs[0]);
    addEventListener("resize", () => place(tabs.find((t) => t.getAttribute("aria-selected") === "true")));
    document.fonts?.ready.then(() => place(tabs.find((t) => t.getAttribute("aria-selected") === "true")));
  }

  /* ---------- 3D bridge (scene.js loads as a module, maybe later, maybe never) ---------- */
  const OFFSETS = { home: 2.1, join: 3.3, hub: 3.3, about: 3.2, track: 3.1 };
  const BASE = OFFSETS[page] ?? 2.4;
  const want = { p: 0, x: 0 };
  const push = () => { if (window.MNM3D) { MNM3D.setProgress(want.p); MNM3D.setOffset(want.x); } };
  const offsetFor = (base) => (isMobile() ? 0 : base);
  want.x = offsetFor(BASE);
  addEventListener("mnm3d:ready", push);
  push(); // also covers the case where the scene was ready before this script ran

  /* ---------- marquee: build the second (looping) half from the first, so editors only keep one list ---------- */
  document.querySelectorAll(".mq-track").forEach((t) => {
    if (t.dataset.cloned) return;
    [...t.children].forEach((c) => { const k = c.cloneNode(true); k.setAttribute("aria-hidden", "true"); t.appendChild(k); });
    t.dataset.cloned = "1";
  });

  /* ---------- split headings into words ---------- */
  function split(el) {
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const w = document.createElement("span"); w.className = "w";
            const i = document.createElement("span"); i.className = "wi"; i.textContent = part;
            w.appendChild(i); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
  }
  document.querySelectorAll(".split").forEach(split);

  if (!hasGsap || reduce) {
    root.classList.add("static");
    document.querySelector(".intro")?.remove();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  document.querySelectorAll("a[data-scroll]").forEach((a) =>
    a.addEventListener("click", (e) => {
      const t = document.querySelector(a.getAttribute("href"));
      if (!t) return;
      e.preventDefault();
      lenis ? lenis.scrollTo(t, { duration: 1.6 }) : t.scrollIntoView({ behavior: "smooth" });
    })
  );

  /* ---------- intro curtain + hero entrance ---------- */
  const heroWords = document.querySelectorAll(".hero .wi, .page-hero .wi");
  const heroFades = document.querySelectorAll(".hero .fade-up, .page-hero .fade-up");
  if (heroWords.length) gsap.set(heroWords, { yPercent: 110 });
  if (heroFades.length) gsap.set(heroFades, { y: 24, opacity: 0 });
  const intro = document.querySelector(".intro");
  const tl = gsap.timeline({ paused: true });
  if (intro) {
    tl.from(".intro-word span", { yPercent: 120, stagger: 0.08, duration: 0.7, ease: "power4.out" })
      .to(".intro-bar i", { scaleX: 1, duration: 0.7, ease: "power2.inOut" }, 0.1)
      .to(".intro-word span", { yPercent: -120, stagger: 0.05, duration: 0.5, ease: "power3.in" }, "+=0.1")
      .to(intro, { yPercent: -100, duration: 0.9, ease: "expo.inOut" }, "-=0.25")
      .set(intro, { display: "none" });
  }
  if (heroWords.length) tl.to(heroWords, { yPercent: 0, duration: 1, stagger: 0.045, ease: "power4.out" }, intro ? "-=0.55" : 0);
  if (heroFades.length) tl.to(heroFades, { y: 0, opacity: 1, duration: 0.9, stagger: 0.1, ease: "power3.out" }, "-=0.7");
  tl.add(() => window.MNM3D && MNM3D.pulse(), "-=0.8");
  const go = () => tl.play();
  document.fonts?.ready ? document.fonts.ready.then(() => setTimeout(go, 150)) : go();

  /* ---------- generic reveals ---------- */
  document.querySelectorAll(".split").forEach((h) => {
    if (h.closest(".hero, .join-hero, .page-hero") || h.hasAttribute("data-light")) return;
    gsap.from(h.querySelectorAll(".wi"), {
      yPercent: 110, duration: 0.9, stagger: 0.04, ease: "power4.out",
      scrollTrigger: { trigger: h, start: "top 85%" },
    });
  });
  // stagger siblings in grids
  document.querySelectorAll(".teams, .steps, .tracks, .topics, .resources, .values").forEach((g) =>
    [...g.children].forEach((c, i) => (c.dataset.d = (i % 3) * 0.08))
  );
  gsap.utils.toArray(".reveal, .team, .step, .faq details, .num-item, .track-card, .topic, .res, .value, .hub-teaser, .side-card").forEach((el) => {
    gsap.from(el, {
      y: 40, opacity: 0, duration: 0.9, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 90%" },
      delay: (el.dataset.d || 0) * 1,
    });
  });

  /* ---------- home: story scene drives the particles ---------- */
  const story = document.querySelector(".story");
  if (story) {
    const panels = story.querySelectorAll(".panel");
    const dots = story.querySelectorAll(".story-dots li");
    let active = 0;
    ScrollTrigger.create({
      trigger: story, start: "top top", end: "bottom bottom",
      onUpdate: (s) => {
        // hold each shape, then morph quickly between them
        const raw = s.progress * 3.0, k = Math.floor(raw), f = raw - k;
        want.p = Math.min(3, k + gsap.utils.clamp(0, 1, (f - 0.3) / 0.4));
        want.x = offsetFor(2.1);
        push();
        const i = Math.min(3, Math.round(s.progress * 3));
        if (i !== active) {
          panels[active].classList.remove("is-active");
          dots[active].classList.remove("on");
          panels[i].classList.add("is-active");
          dots[i].classList.add("on");
          active = i;
          window.MNM3D && MNM3D.pulse();
        }
      },
    });
    // after the story: dissolve into a calm background cloud
    ScrollTrigger.create({
      trigger: story, start: "bottom bottom", end: "bottom top",
      onUpdate: (s) => { want.p = 3 + s.progress; want.x = offsetFor(2.1) * (1 - s.progress); push(); },
    });
    ScrollTrigger.create({
      trigger: story, start: "top bottom", end: "top top",
      onUpdate: (s) => { if (s.progress < 1) { want.p = 0; want.x = offsetFor(2.1); push(); } },
    });
  }

  /* ---------- other pages: the page's shape dissolves into the cloud ---------- */
  if (!story) {
    ScrollTrigger.create({
      start: 0, end: () => innerHeight * 0.9,
      onUpdate: (s) => { want.p = s.progress; want.x = offsetFor(BASE) * (1 - s.progress); push(); },
    });
  }

  /* ---------- horizontal "what we do" ---------- */
  const what = document.querySelector(".what");
  if (what) {
    const track = what.querySelector(".what-track");
    const mm = gsap.matchMedia();
    mm.add("(min-width: 821px)", () => {
      const dist = () => track.scrollWidth - innerWidth + 80;
      const setH = () => (what.style.height = dist() + innerHeight + "px");
      setH();
      const tween = gsap.to(track, {
        x: () => -dist(), ease: "none",
        scrollTrigger: { trigger: what, start: "top top", end: "bottom bottom", scrub: 0.6, invalidateOnRefresh: true, onRefreshInit: setH },
      });
      gsap.utils.toArray(".do-card").forEach((c) =>
        gsap.from(c, { opacity: 0.25, scale: 0.9, ease: "none",
          scrollTrigger: { trigger: c, containerAnimation: tween, start: "left 100%", end: "left 60%", scrub: true } })
      );
      return () => { what.style.height = ""; };
    });
  }


  /* ---------- roadmap line fills as you scroll ---------- */
  document.querySelectorAll(".roadmap").forEach((r) => {
    gsap.to(r.querySelector(".rm-fill"), { height: () => r.offsetHeight - 16 + "px", ease: "none",
      scrollTrigger: { trigger: r, start: "top 70%", end: "bottom 60%", scrub: true, invalidateOnRefresh: true } });
    r.querySelectorAll(".rm-step").forEach((st) => gsap.from(st, { y: 30, opacity: 0, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: st, start: "top 85%" } }));
  });

  /* ---------- quote lights up word by word ---------- */
  document.querySelectorAll("[data-light]").forEach((q) => {
    const words = q.querySelectorAll(".wi");
    ScrollTrigger.create({ trigger: q, start: "top 75%", end: "bottom 45%", scrub: true,
      onUpdate: (s) => words.forEach((w, i) => w.classList.toggle("lit", i / words.length < s.progress)) });
  });

  /* ---------- counters ---------- */
  document.querySelectorAll("[data-count]").forEach((el) => {
    const end = +el.dataset.count, suf = el.dataset.suffix || "", o = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: "top 90%", once: true,
      onEnter: () => gsap.to(o, { v: end, duration: 1.8, ease: "power3.out", onUpdate: () => (el.textContent = Math.round(o.v) + suf) }),
    });
  });

  /* ---------- marquee reacts to scroll speed ---------- */
  const tracks = document.querySelectorAll(".mq-track");
  if (tracks.length) {
    const skew = gsap.quickTo(tracks, "skewX", { duration: 0.5, ease: "power3" });
    ScrollTrigger.create({ onUpdate: (s) => skew(gsap.utils.clamp(-12, 12, s.getVelocity() / -250)) });
  }

  /* ---------- giant footer word ---------- */
  if (document.querySelector(".footer-word")) {
    gsap.from(".footer-word", { yPercent: 40, letterSpacing: "0.3em", opacity: 0.2, ease: "none",
      scrollTrigger: { trigger: ".footer", start: "top bottom", end: "bottom bottom", scrub: true } });
  }

  /* ---------- parallax CTA glow ---------- */
  if (document.querySelector(".cta-glow")) {
    gsap.to(".cta-glow", { rotate: 180, ease: "none", scrollTrigger: { trigger: ".cta-band", start: "top bottom", end: "bottom top", scrub: true } });
  }

  if (!fine) return; // the rest is for mouse users

  /* ---------- magnetic buttons ---------- */
  document.querySelectorAll(".magnetic").forEach((b) => {
    const xTo = gsap.quickTo(b, "x", { duration: 0.5, ease: "elastic.out(1, 0.4)" });
    const yTo = gsap.quickTo(b, "y", { duration: 0.5, ease: "elastic.out(1, 0.4)" });
    const inner = b.querySelector("span");
    b.addEventListener("pointermove", (e) => {
      const r = b.getBoundingClientRect(), dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2;
      xTo(dx * 0.35); yTo(dy * 0.35);
      inner && gsap.to(inner, { x: dx * 0.12, y: dy * 0.12, duration: 0.3 });
    });
    b.addEventListener("pointerleave", () => { xTo(0); yTo(0); inner && gsap.to(inner, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1,0.4)" }); });
  });

  /* ---------- tilt + spotlight cards ---------- */
  document.querySelectorAll(".tilt").forEach((c) => {
    c.addEventListener("pointermove", (e) => {
      const r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      c.style.setProperty("--mx", px * 100 + "%");
      c.style.setProperty("--my", py * 100 + "%");
      gsap.to(c, { rotateY: (px - 0.5) * 12, rotateX: (0.5 - py) * 10, duration: 0.4, ease: "power2.out", transformPerspective: 900 });
    });
    c.addEventListener("pointerleave", () => gsap.to(c, { rotateX: 0, rotateY: 0, duration: 0.7, ease: "elastic.out(1, 0.5)" }));
  });

  /* ---------- custom cursor ---------- */
  const cur = document.querySelector(".cursor");
  if (cur) {
    const cx = gsap.quickTo(cur, "x", { duration: 0.35, ease: "power3" });
    const cy = gsap.quickTo(cur, "y", { duration: 0.35, ease: "power3" });
    // hide the OS cursor only once ours is actually following the pointer; give it back on any JS error
    addEventListener("pointermove", (e) => { cx(e.clientX); cy(e.clientY); root.classList.add("has-cursor"); });
    addEventListener("error", () => root.classList.remove("has-cursor"));
    document.querySelectorAll("a, button, summary, .tilt").forEach((el) => {
      el.addEventListener("pointerenter", () => cur.classList.add("big"));
      el.addEventListener("pointerleave", () => cur.classList.remove("big"));
    });
    document.addEventListener("pointerleave", () => cur.classList.add("gone"));
    document.addEventListener("pointerenter", () => cur.classList.remove("gone"));
  }
})();
