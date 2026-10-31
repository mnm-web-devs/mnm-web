/* ============================================================
   MNM website — edit the links here, nothing else needed.
   Leave a link empty ("") and its buttons show "coming soon".
   ============================================================ */
const LINKS = {
  discord: "", // e.g. "https://discord.gg/xxxxxxx"
  apply: "",   // staff application form, e.g. a Google Form link
};

/* ---------- links ---------- */
document.querySelectorAll("[data-link]").forEach((el) => {
  const url = LINKS[el.dataset.link];
  if (url) {
    el.href = url;
    el.target = "_blank";
    el.rel = "noopener";
  } else {
    el.removeAttribute("href");
    el.classList.add("is-soon");
    el.setAttribute("aria-disabled", "true");
    el.title = "Link coming soon";
    el.textContent = el.classList.contains("btn") ? "Discord link coming soon" : "Coming soon";
  }
});

/* ---------- footer year ---------- */
const y = document.getElementById("year");
if (y) y.textContent = new Date().getFullYear();

/* ---------- reveal on scroll ---------- */
const reveals = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }),
    { threshold: 0.12 }
  );
  reveals.forEach((el, i) => { el.style.transitionDelay = (i % 4) * 70 + "ms"; io.observe(el); });
} else {
  reveals.forEach((el) => el.classList.add("in"));
}

/* ---------- neural-network background ---------- */
(() => {
  const canvas = document.getElementById("net");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const COLORS = ["26,167,168", "123,75,196", "48,195,156", "120,160,230"];
  let w, h, dpr, nodes = [];
  const mouse = { x: -9999, y: -9999 };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.width = innerWidth * dpr;
    h = canvas.height = innerHeight * dpr;
    canvas.style.width = innerWidth + "px";
    canvas.style.height = innerHeight + "px";
    const count = Math.round(Math.min(90, (innerWidth * innerHeight) / 16000));
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.25 * dpr, vy: (Math.random() - 0.5) * 0.25 * dpr,
      r: (Math.random() * 1.6 + 0.8) * dpr,
      c: COLORS[(Math.random() * COLORS.length) | 0],
    }));
  }

  function frame() {
    ctx.clearRect(0, 0, w, h);
    const link = 140 * dpr;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      if (!still) {
        a.x += a.vx; a.y += a.vy;
        if (a.x < 0 || a.x > w) a.vx *= -1;
        if (a.y < 0 || a.y > h) a.vy *= -1;
        const dx = a.x - mouse.x, dy = a.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < (120 * dpr) ** 2) { a.x += dx * 0.01; a.y += dy * 0.01; }
      }
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
        if (d < link) {
          ctx.strokeStyle = `rgba(${a.c},${(1 - d / link) * 0.28})`;
          ctx.lineWidth = dpr * 0.8;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      ctx.fillStyle = `rgba(${a.c},0.75)`;
      ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
    }
    if (!still) requestAnimationFrame(frame);
  }

  addEventListener("resize", () => { resize(); if (still) frame(); });
  addEventListener("pointermove", (e) => { mouse.x = e.clientX * dpr; mouse.y = e.clientY * dpr; });
  resize();
  frame();
})();
