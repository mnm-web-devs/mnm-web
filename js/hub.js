/* MNM Opportunities Hub — search, filter, sort, expand. */
(() => {
  /* only keep entries that have what a card needs; warn editors about the rest */
  const REQUIRED = ["name", "cat", "url", "desc"];
  const raw = window.MNM_OPPS;
  const data = (raw || []).filter((d, i) => {
    const miss = REQUIRED.filter((k) => !d || !d[k]);
    if (miss.length) console.warn(`opportunities.js entry #${i} skipped, missing: ${miss.join(", ")}`);
    return !miss.length;
  });
  const CATS = [
    ["all", "All"], ["featured", "Featured"], ["math", "Mathematics"], ["neuro", "Neuroscience"],
    ["med", "Medicine & Biology"], ["research", "Research & Programs"], ["online", "Learn online"],
  ];
  const COLOR = { math: "var(--mint)", neuro: "var(--purple-hi)", med: "var(--teal-hi)", research: "#ffd27a", online: "#9cc2ff" };
  const LABEL = Object.fromEntries(CATS);
  const list = document.getElementById("opps"), count = document.getElementById("hub-count");
  const chips = document.getElementById("chips"), q = document.getElementById("q"), sort = document.getElementById("sort");
  if (!list) return;
  if (!raw) {
    count.textContent = "";
    list.innerHTML = `<p class="empty">We couldn't load the opportunities. Please refresh the page.</p>`;
    return;
  }

  const params = new URLSearchParams(location.search);
  let cat = params.get("cat") || "all";

  const n = (c) => (c === "all" ? data.length : c === "featured" ? data.filter((d) => d.featured).length : data.filter((d) => d.cat === c).length);
  chips.innerHTML = CATS.map(([k, t]) => `<button class="chip${k === cat ? " on" : ""}" type="button" data-cat="${k}" aria-pressed="${k === cat}">${t} <em>${n(k)}</em></button>`).join("");

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // links may only be http(s); anything else (e.g. javascript:) becomes "#"
  const safeUrl = (u) => { try { const x = new URL(u, location.href); return /^https?:$/.test(x.protocol) ? x.href : "#"; } catch { return "#"; } };
  let refreshT; const refresh = () => { clearTimeout(refreshT); refreshT = setTimeout(() => window.ScrollTrigger && ScrollTrigger.refresh(), 200); };

  function render() {
    const term = q.value.trim().toLowerCase();
    let items = data.filter((d) =>
      (cat === "all" || (cat === "featured" ? d.featured : d.cat === cat)) &&
      (!term || (d.name + " " + d.desc + " " + d.type + " " + d.where).toLowerCase().includes(term))
    );
    if (sort.value === "alpha") items = [...items].sort((a, b) => a.name.localeCompare(b.name));
    else items = [...items].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

    count.textContent = `Showing ${items.length} of ${data.length} opportunities`;
    list.innerHTML = items.length ? items.map((d) => `
      <article class="opp spot" style="--c:${COLOR[d.cat] || "var(--mint)"}">
        <div class="opp-tags">${d.featured ? "<span>★ Featured</span>" : ""}<span>${esc(LABEL[d.cat] || d.cat)}</span><span class="lvl">${esc(d.type)}</span><span class="lvl">${esc(d.level)}</span></div>
        <h3>${esc(d.name)}</h3>
        <p>${esc(d.desc)}</p>
        <p class="more">${esc(d.more)} <br /><small>Where: ${esc(d.where)}</small></p>
        <div class="opp-foot">
          <button type="button" aria-expanded="false">Read more</button>
          <a href="${esc(safeUrl(d.url))}" target="_blank" rel="noopener noreferrer">Official site ↗</a>
        </div>
      </article>`).join("")
      : `<p class="empty">Nothing found. Try another word or category.</p>`;

    if (window.gsap && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.fromTo(list.children, { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.035, ease: "power3.out", overwrite: true });
    }
    refresh();
  }

  // one listener for every card (event delegation) instead of one per card per render
  list.addEventListener("pointermove", (e) => {
    const c = e.target.closest(".spot"); if (!c) return;
    const r = c.getBoundingClientRect();
    c.style.setProperty("--mx", e.clientX - r.left + "px");
    c.style.setProperty("--my", e.clientY - r.top + "px");
  });

  chips.addEventListener("click", (e) => {
    const b = e.target.closest(".chip"); if (!b) return;
    cat = b.dataset.cat;
    chips.querySelectorAll(".chip").forEach((c) => { const on = c === b; c.classList.toggle("on", on); c.setAttribute("aria-pressed", on); });
    const u = new URL(location.href); cat === "all" ? u.searchParams.delete("cat") : u.searchParams.set("cat", cat);
    history.replaceState(null, "", u);
    render();
  });
  list.addEventListener("click", (e) => {
    const b = e.target.closest(".opp-foot button"); if (!b) return;
    const card = b.closest(".opp"), open = card.classList.toggle("open");
    b.textContent = open ? "Show less" : "Read more";
    b.setAttribute("aria-expanded", open);
    refresh();
  });
  let t; q.addEventListener("input", () => { clearTimeout(t); t = setTimeout(render, 120); });
  sort.addEventListener("change", render);
  render();
})();
