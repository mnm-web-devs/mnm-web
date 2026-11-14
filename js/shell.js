/* MNM — shared dashboard shell: auth guard, sidebar sections, mobile drawer, toasts, helpers. */
window.MNM_UI_READY = (async () => {
  const need = document.body.dataset.role; // "student" | "admin"
  let user;
  try {
    user = await MNM_API.auth.ready();
  } catch (error) {
    console.error(error);
    location.replace("login.html");
    return;
  }
  if (!user) { location.replace("login.html"); return; }
  if (need === "admin" && user.role !== "admin") { location.replace("dashboard.html"); return; }

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  if (MNM_API.isLocalDemo) {
    const notice = document.createElement("aside");
    notice.className = "local-demo-notice";
    notice.setAttribute("role", "status");
    notice.textContent = "Local demo only — sample data; changes are not saved to MNM.";
    document.querySelector(".main")?.prepend(notice);
  }
  const fmtDate = (iso, opt = { day: "numeric", month: "short" }) => new Date(iso).toLocaleDateString("en-GB", opt);
  const fmtTime = (iso) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const ago = (iso) => {
    const h = Math.round((Date.now() - new Date(iso)) / 36e5);
    if (h < 1) return "just now"; if (h < 24) return h + "h ago";
    const d = Math.round(h / 24); return d < 0 ? fmtDate(iso) : d + "d ago";
  };
  const initials = (n) => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  /* user chip */
  $$("[data-user-name]").forEach((el) => (el.textContent = user.name));
  $$("[data-user-first]").forEach((el) => (el.textContent = user.name.split(" ")[0]));
  $$("[data-user-email]").forEach((el) => (el.textContent = user.email));
  $$("[data-user-initials]").forEach((el) => (el.textContent = initials(user.name)));
  if (user.role === "admin") $$("[data-admin-only]").forEach((el) => (el.hidden = false));
  try { localStorage.setItem("mnm-me", JSON.stringify({ name: user.name, initials: initials(user.name), avatar: user.avatarUrl || "" })); } catch {}

  /* sections (#hash routing) */
  const links = $$(".side-nav a[href^='#']");
  const show = (id, focus) => {
    const target = document.getElementById(id) ? id : links[0].getAttribute("href").slice(1);
    $$(".view").forEach((v) => (v.hidden = v.id !== target));
    links.forEach((a) => a.toggleAttribute("aria-current", a.getAttribute("href") === "#" + target));
    $("#view-title").textContent = links.find((a) => a.getAttribute("href") === "#" + target)?.dataset.title || "";
    document.body.classList.remove("drawer-open");
    scrollTo(0, 0);
    if (focus) $("#" + target + " h2, #" + target)?.focus?.();
    document.dispatchEvent(new CustomEvent("mnm:view", { detail: target }));
  };
  addEventListener("hashchange", () => show(location.hash.slice(1), true));
  $$("[data-go]").forEach((b) => b.addEventListener("click", () => (location.hash = b.dataset.go)));

  /* mobile drawer */
  $(".menu-btn")?.addEventListener("click", () => document.body.classList.toggle("drawer-open"));
  $(".scrim")?.addEventListener("click", () => document.body.classList.remove("drawer-open"));
  addEventListener("keydown", (e) => e.key === "Escape" && document.body.classList.remove("drawer-open"));

  /* sign out */
  $$("[data-signout]").forEach((b) => b.addEventListener("click", async () => { await MNM_API.auth.signOut(); try { localStorage.removeItem("mnm-me"); } catch {} location.href = "login.html"; }));

  /* toast */
  const toastBox = document.createElement("div");
  toastBox.className = "toasts"; toastBox.setAttribute("aria-live", "polite");
  document.body.append(toastBox);
  const toast = (text, kind = "ok") => {
    const t = document.createElement("div");
    t.className = "toast " + kind; t.textContent = text;
    toastBox.append(t);
    setTimeout(() => t.classList.add("out"), 2600);
    setTimeout(() => t.remove(), 3000);
  };

  /* modal */
  const openModal = (m) => { m.hidden = false; requestAnimationFrame(() => m.classList.add("open")); m.querySelector("input,select,textarea,button")?.focus(); };
  const closeModal = (m) => { m.classList.remove("open"); setTimeout(() => (m.hidden = true), 200); };
  $$(".modal").forEach((m) => {
    m.addEventListener("click", (e) => { if (e.target === m || e.target.closest("[data-close]")) closeModal(m); });
    m.addEventListener("keydown", (e) => e.key === "Escape" && closeModal(m));
  });

  window.MNM_UI = { $, $$, esc, fmtDate, fmtTime, ago, initials, toast, openModal, closeModal, user, start: () => show(location.hash.slice(1)) };
})();
