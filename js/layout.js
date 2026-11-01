/* MNM — shared header and footer for every page. Edit the menu here once. */
(() => {
  const here = location.pathname.split("/").pop() || "index.html";
  const is = (f) => (here === f ? ' aria-current="page"' : "");
  const tracks = [
    ["track-neuroscience.html", "Neuroscience", "The brain, mind and behaviour", "var(--purple-hi)", "◉"],
    ["track-medicine.html", "Medicine", "The body, disease and care", "var(--teal-hi)", "✚"],
    ["track-mathematics.html", "Mathematics", "The language of science", "var(--mint)", "π"],
  ];

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
          ${tracks.map(([href, t, s, c, g]) => `<a role="menuitem" href="${href}"${is(href)} style="--c:${c}"><i>${g}</i><span><b>${t}</b><small>${s}</small></span></a>`).join("")}
        </div>
      </div>
      <a href="hub.html"${is("hub.html")}>Opportunities</a>
      <a href="about.html"${is("about.html")}>About</a>
      <a href="login.html"${is("login.html")}>Sign in</a>
      <a class="btn btn-sm magnetic" href="join.html"${is("join.html")}><span>Join MNM</span></a>
    </nav>
    <button class="burger" type="button" aria-label="Open menu" aria-expanded="false"><i></i><i></i></button>
  </header>
  <div class="mobile-menu" aria-hidden="true">
    <a href="index.html">Home</a>
    ${tracks.map(([href, t, , c]) => `<a href="${href}" style="--c:${c}">${t}</a>`).join("")}
    <a href="hub.html">Opportunities</a>
    <a href="about.html">About</a>
    <a href="login.html">Sign in</a>
    <a class="btn" href="join.html"><span>Join MNM →</span></a>
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
        <div><b>MNM</b><a href="hub.html">Opportunities</a><a href="about.html">About</a><a href="join.html">Join</a></div>
        <div><b>Community</b><a data-link="discord" href="#">Discord</a><a data-link="email" href="#">Email us</a></div>
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

  /* mobile menu */
  const burger = document.querySelector(".burger"), mm = document.querySelector(".mobile-menu");
  if (burger && mm) {
    burger.addEventListener("click", () => {
      const open = !document.body.classList.contains("menu-open");
      document.body.classList.toggle("menu-open", open);
      burger.setAttribute("aria-expanded", open);
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      mm.setAttribute("aria-hidden", !open);
    });
  }
})();
