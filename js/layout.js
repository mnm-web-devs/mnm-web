/* MNM — shared header and footer for every page. Edit the menu here once. */
(() => {
  const here = location.pathname.split("/").pop() || "index.html";
  const is = (f) => (here === f ? ' aria-current="page"' : "");
  const tracks = [
    ["track-neuroscience.html", "Neuroscience", "The brain, mind and behaviour", "var(--purple-hi)", "◉"],
    ["track-medicine.html", "Medicine", "The body, disease and care", "var(--teal-hi)", "✚"],
    ["track-mathematics.html", "Mathematics", "The language of science", "var(--mint)", "π"],
  ];
  const lab = ["neuron.html", "Neuron Lab", "Fire a real neuron, interactive", "#ffd27a", "⚡"];

  /* Signed in? Clerk keeps a readable "__client_uat" cookie (non-zero when a session exists);
     admins use a session-storage token. The name comes from a small cache the dashboard writes. */
  const me = (() => {
    try {
      const uat = document.cookie.match(/(?:^|; )__client_uat=([^;]*)/);
      const signed = (uat && uat[1] && uat[1] !== "0") || !!sessionStorage.getItem("mnm-admin-session");
      if (!signed) return null;
      const cached = JSON.parse(localStorage.getItem("mnm-me") || "null") || {};
      return { name: cached.name || "", initials: cached.initials || "", avatar: cached.avatar || "" };
    } catch { return null; }
  })();
  const escTxt = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const meChip = me ? `<a class="me-chip" href="dashboard.html" title="My dashboard">${me.avatar ? `<img src="${escTxt(me.avatar)}" alt="" referrerpolicy="no-referrer" />` : `<span>${escTxt(me.initials || "★")}</span>`}<b>${escTxt(me.name ? me.name.split(" ")[0] : "My dashboard")}</b></a>` : "";

  const header = document.getElementById("site-header");
  if (header) {
    header.outerHTML = `
  <header class="nav">
    <a class="brand" href="index.html" aria-label="MNM home">
      <img src="assets/logo-dark.webp" alt="MNM" width="47" height="46" />
    </a>
    <nav class="nav-links" aria-label="Main">
      <a href="index.html"${is("index.html")}>Home</a>
      <div class="dd">
        <button class="dd-btn" type="button" aria-expanded="false" aria-haspopup="true">Tracks <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button>
        <div class="dd-menu" role="menu">
          ${[...tracks, lab].map(([href, t, s, c, g]) => `<a role="menuitem" href="${href}"${is(href)} style="--c:${c}"><i aria-hidden="true">${g}</i><span><b>${t}</b><small>${s}</small></span></a>`).join("")}
        </div>
      </div>
      <a href="workshops.html"${is("workshops.html")}>Workshops</a>
      <a href="hub.html"${is("hub.html")}>Opportunities</a>
      <a href="about.html"${is("about.html")}>About</a>
      ${me ? `<a class="btn btn-sm magnetic" href="dashboard.html"><span>Dashboard</span></a>${meChip}` : `<a href="login.html"${is("login.html")}>Sign in</a>
      <a class="btn btn-sm magnetic" href="join.html"${is("join.html")}><span>Join MNM</span></a>`}
    </nav>
    <button class="burger" type="button" aria-label="Open menu" aria-expanded="false"><i></i><i></i></button>
  </header>
  <div class="mobile-menu" aria-hidden="true">
    <a href="index.html">Home</a>
    ${tracks.map(([href, t, , c]) => `<a href="${href}" style="--c:${c}">${t}</a>`).join("")}
    <a href="neuron.html" style="--c:#ffd27a">Neuron Lab</a>
    <a href="workshops.html">Workshops</a>
    <a href="hub.html">Opportunities</a>
    <a href="about.html">About</a>
    ${me ? `<a class="btn" href="dashboard.html"><span>My dashboard →</span></a>` : `<a href="login.html">Sign in</a>
    <a class="btn" href="join.html"><span>Join MNM →</span></a>`}
  </div>`;
  }

  const footer = document.getElementById("site-footer");
  if (footer) {
    footer.outerHTML = `
  <footer class="footer">
    <div class="wrap footer-top">
      <div>
        <img class="footer-logo" src="assets/logo-dark.webp" alt="MNM — Medicine, Neuroscience, Mathematics" width="130" height="127" />
        <p>Medicine · Neuroscience · Mathematics.<br />A YIMO-affiliated STEM initiative.</p>
      </div>
      <nav class="footer-cols" aria-label="Footer">
        <div><b>Tracks</b>${tracks.map(([h, t]) => `<a href="${h}">${t}</a>`).join("")}</div>
        <div><b>MNM</b><a href="workshops.html">Workshops</a><a href="neuron.html">Neuron Lab</a><a href="hub.html">Opportunities</a><a href="about.html">About</a><a href="join.html">Join</a></div>
        <div><b>Support</b><a href="sponsor.html">Sponsor &amp; partner</a><a href="sponsor.html?type=volunteer#contact">Volunteer</a><a href="privacy.html">Privacy</a></div>
        <div><b>Community</b><a data-link="discord">Discord</a><a data-link="email">Email us</a></div>
      </nav>
    </div>
    <div class="footer-word" aria-hidden="true">MNM</div>
    <p class="wrap small">© ${new Date().getFullYear()} MNM. Made by students.</p>
  </footer>`;
  }

  /* dropdown */
  const dd = document.querySelector(".dd");
  if (dd) {
    const btn = dd.querySelector(".dd-btn");
    const set = (v) => { dd.classList.toggle("open", v); btn.setAttribute("aria-expanded", v); };
    btn.addEventListener("click", (e) => { e.stopPropagation(); set(!dd.classList.contains("open")); });
    dd.addEventListener("pointerenter", (e) => e.pointerType === "mouse" && set(true));
    dd.addEventListener("pointerleave", (e) => e.pointerType === "mouse" && set(false));
    document.addEventListener("click", () => set(false));
    document.addEventListener("keydown", (e) => e.key === "Escape" && set(false));
  }

  /* mobile menu: focus stays inside while open, Escape closes, focus returns to the burger */
  const burger = document.querySelector(".burger"), mm = document.querySelector(".mobile-menu");
  if (burger && mm) {
    const behind = () => document.querySelectorAll("main, .footer, .nav-links, .brand");
    const setMenu = (open) => {
      document.body.classList.toggle("menu-open", open);
      burger.setAttribute("aria-expanded", open);
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      mm.setAttribute("aria-hidden", !open);
      mm.inert = !open;
      behind().forEach((el) => (el.inert = open));
      if (open) mm.querySelector("a")?.focus(); else burger.focus();
    };
    mm.inert = true;
    burger.addEventListener("click", () => setMenu(!document.body.classList.contains("menu-open")));
    mm.addEventListener("click", (e) => e.target.closest("a") && setMenu(false));
    document.addEventListener("keydown", (e) => {
      if (!document.body.classList.contains("menu-open")) return;
      if (e.key === "Escape") return setMenu(false);
      if (e.key !== "Tab") return;
      const f = [burger, ...mm.querySelectorAll("a")], i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    });
  }
})();
