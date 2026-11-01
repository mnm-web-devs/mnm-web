/* MNM — site forms (workshop registration, partner / sponsor / volunteer enquiries).
   Any <form data-form="<kind>"> on a page is handled here: validation, spam trap, consent, success state.

   Where submissions go:
   - If js/config.js sets MNM_LINKS.formEndpoint (e.g. "https://api.mnmstem.study/forms"),
     each form is POSTed as JSON to  <formEndpoint>/<kind>  →  backend stores it (DB) and emails the team.
   - If it's empty (today), submissions are kept in this browser only (demo mode) so the flow can be tested.
   Payload: { kind, submittedAt, page, fields: { ...named inputs } } */
(() => {
  const ENDPOINT = (window.MNM_LINKS && window.MNM_LINKS.formEndpoint) || "";
  const KEY = "mnm-form-submissions";

  async function send(kind, fields) {
    const payload = { kind, submittedAt: new Date().toISOString(), page: location.pathname, fields };
    if (ENDPOINT) {
      const r = await fetch(ENDPOINT.replace(/\/$/, "") + "/" + encodeURIComponent(kind), {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error("Something went wrong. Please try again or email us.");
      return;
    }
    await new Promise((r) => setTimeout(r, 500));
    try { const all = JSON.parse(localStorage.getItem(KEY) || "[]"); all.push(payload); localStorage.setItem(KEY, JSON.stringify(all)); } catch {}
  }
  window.MNM_FORMS = { send };

  const message = (input) => {
    if (input.validity.valueMissing) return input.type === "checkbox" ? "Please tick this box to continue." : "Please fill in this field.";
    if (input.validity.typeMismatch && input.type === "email") return "Enter a valid email address.";
    if (input.validity.typeMismatch && input.type === "url") return "Enter a link that starts with https://";
    if (input.validity.tooShort) return `Please write at least ${input.minLength} characters.`;
    return "Please check this field.";
  };

  document.querySelectorAll("form[data-form]").forEach((form) => {
    const status = form.querySelector(".form-status");
    const btn = form.querySelector('button[type="submit"]');
    const label = btn.querySelector("span").innerHTML;
    form.noValidate = true;

    form.addEventListener("input", (e) => e.target.removeAttribute("aria-invalid"));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (form.elements.website && form.elements.website.value) return; // honeypot: bots fill hidden fields
      const fields = [...form.elements].filter((el) => el.name && el.name !== "website" && !el.disabled);
      fields.forEach((el) => el.removeAttribute("aria-invalid"));
      const bad = fields.find((el) => el.willValidate && !el.checkValidity());
      if (bad) { bad.setAttribute("aria-invalid", "true"); bad.focus(); status.textContent = message(bad); status.className = "form-status err"; return; }

      const data = {};
      fields.forEach((el) => {
        if (el.type === "checkbox") data[el.name] = el.checked;
        else if (el.type === "radio") { if (el.checked) data[el.name] = el.value; }
        else data[el.name] = el.value.trim();
      });
      btn.disabled = true; btn.querySelector("span").textContent = "Sending…"; status.textContent = ""; status.className = "form-status";
      try {
        await send(form.dataset.form, data);
        const done = form.parentElement.querySelector(".form-done");
        if (done) {
          done.querySelector("[data-done-name]") && (done.querySelector("[data-done-name]").textContent = (data.name || "").split(" ")[0] || "there");
          form.hidden = true; done.hidden = false; done.focus();
        } else { status.textContent = "Thanks! We'll be in touch soon."; status.className = "form-status ok"; form.reset(); }
      } catch (x) {
        status.textContent = x.message; status.className = "form-status err";
      } finally { btn.disabled = false; btn.querySelector("span").innerHTML = label; }
    });
  });

  /* "Send another" buttons on success panels */
  document.querySelectorAll("[data-form-again]").forEach((b) => b.addEventListener("click", () => {
    const done = b.closest(".form-done"), form = done.parentElement.querySelector("form[data-form]");
    form.reset(); done.hidden = true; form.hidden = false; form.querySelector("input,select,textarea")?.focus();
  }));

  /* sponsor form: ?type=volunteer preselects the radio; the level field only shows for sponsors */
  document.querySelectorAll("form[data-form]").forEach((form) => {
    const t = new URLSearchParams(location.search).get("type");
    const r = t && form.querySelector(`input[type=radio][name=type][value="${CSS.escape(t)}"]`);
    if (r) r.checked = true;
    const sync = () => {
      const v = form.querySelector("input[name=type]:checked")?.value;
      form.querySelectorAll("[data-show]").forEach((el) => (el.hidden = !!v && el.dataset.show !== v));
    };
    form.addEventListener("change", (e) => e.target.name === "type" && sync());
    sync();
  });

  /* preselect from the URL, e.g. sponsor.html?type=volunteer#contact or workshops.html?w=neurons */
  const q = new URLSearchParams(location.search);
  document.querySelectorAll("form[data-form] select[data-from-query]").forEach((s) => {
    const v = q.get(s.dataset.fromQuery); if (v && [...s.options].some((o) => o.value === v)) s.value = v;
  });
})();
