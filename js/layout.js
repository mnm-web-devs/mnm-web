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
  const chevron = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';

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
        <button class="dd-btn" type="button" aria-expanded="false" aria-haspopup="true">Tracks ${chevron}</button>
        <div class="dd-menu" role="menu">
          ${tracks.map(([href, t, s, c, g]) => `<a role="menuitem" href="${href}"${is(href)} style="--c:${c}"><i aria-hidden="true">${g}</i><span><b>${t}</b><small>${s}</small></span></a>`).join("")}
        </div>
      </div>
      <div class="dd">
        <button class="dd-btn" type="button" aria-expanded="false" aria-haspopup="true">Interactives ${chevron}</button>
        <div class="dd-menu" role="menu">
          <a role="menuitem" href="${lab[0]}"${is(lab[0])} style="--c:${lab[3]}"><i aria-hidden="true">${lab[4]}</i><span><b>${lab[1]}</b><small>${lab[2]}</small></span></a>
        </div>
      </div>
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
    <div class="mobile-group">
      <button class="mobile-group-btn" type="button" aria-expanded="false" aria-controls="mobile-interactives">Interactives ${chevron}</button>
      <div class="mobile-submenu" id="mobile-interactives" hidden><a href="${lab[0]}" style="--c:${lab[3]}">${lab[1]}</a></div>
    </div>
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
        <div><b>Interactives</b><a href="neuron.html">Neuron Lab</a></div>
        <div><b>MNM</b><a href="hub.html">Opportunities</a><a href="about.html">About</a><a href="join.html">Join</a></div>
        <div><b>Support</b><a href="sponsor.html">Sponsor &amp; partner</a><a href="sponsor.html?type=volunteer#contact">Volunteer</a><a href="privacy.html">Privacy</a></div>
        <div><b>Community</b><a data-link="discord">Discord</a><a data-link="email">Email us</a></div>
      </nav>
    </div>
    <div class="footer-word" aria-hidden="true">MNM</div>
    <p class="wrap small">© ${new Date().getFullYear()} MNM. Made by students.</p>
  </footer>`;
  }

  /* dropdown */
  const dropdowns = [...document.querySelectorAll(".dd")];
  const closeDropdowns = (except) => dropdowns.forEach((dd) => {
    if (dd === except) return;
    const btn = dd.querySelector(".dd-btn");
    dd.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
  });
  dropdowns.forEach((dd) => {
    const btn = dd.querySelector(".dd-btn");
    const links = [...dd.querySelectorAll('[role="menuitem"]')];
    const set = (open, focus = false) => {
      closeDropdowns(open ? dd : null);
      dd.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", String(open));
      if (focus && open) links[0]?.focus();
      if (focus && !open) btn.focus();
    };
    btn.addEventListener("click", (e) => { e.stopPropagation(); set(!dd.classList.contains("open")); });
    dd.addEventListener("pointerenter", (e) => e.pointerType === "mouse" && set(true));
    dd.addEventListener("pointerleave", (e) => e.pointerType === "mouse" && set(false));
    btn.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); set(true, true); }
    });
    dd.addEventListener("keydown", (e) => {
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key) || !links.length) return;
      const index = links.indexOf(document.activeElement);
      if (index < 0) return;
      e.preventDefault();
      const next = e.key === "Home" ? 0 : e.key === "End" ? links.length - 1 :
        (index + (e.key === "ArrowDown" ? 1 : links.length - 1)) % links.length;
      links[next].focus();
    });
  });
  document.addEventListener("click", () => closeDropdowns());
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const open = dropdowns.find((dd) => dd.classList.contains("open"));
    if (!open) return;
    e.stopPropagation();
    open.querySelector(".dd-btn").focus();
    closeDropdowns();
  });

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
    mm.querySelectorAll(".mobile-group-btn").forEach((button) => {
      const submenu = button.nextElementSibling;
      button.addEventListener("click", () => {
        const expanded = button.getAttribute("aria-expanded") !== "true";
        button.setAttribute("aria-expanded", String(expanded));
        submenu.hidden = !expanded;
      });
    });
    document.addEventListener("keydown", (e) => {
      if (!document.body.classList.contains("menu-open")) return;
      if (e.key === "Escape") return setMenu(false);
      if (e.key !== "Tab") return;
      const visibleItems = [...mm.querySelectorAll("a, button")].filter((el) => !el.closest("[hidden]"));
      const f = [burger, ...visibleItems], i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    });
  }
})();
