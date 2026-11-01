/* MNM — login / sign-up page. Talks only to MNM_API.auth (js/api.js). */
(() => {
  const go = (user) => { location.href = user.role === "admin" ? "admin.html" : "dashboard.html"; };
  const busy = (form, on, label) => {
    const b = form.querySelector('button[type="submit"]');
    b.disabled = on; b.classList.toggle("is-busy", on);
    if (label) b.querySelector("span").firstChild.textContent = label + " ";
  };
  const msg = (form, text, ok) => { const m = form.querySelector(".form-msg"); m.textContent = text || ""; m.classList.toggle("ok", !!ok); };
  const invalid = (form) => {
    const bad = [...form.querySelectorAll("input[required]")].find((i) => !i.checkValidity());
    form.querySelectorAll(".field input").forEach((i) => i.removeAttribute("aria-invalid"));
    if (!bad) return null;
    bad.setAttribute("aria-invalid", "true"); bad.focus();
    if (bad.type === "email") return "Enter a valid email address.";
    if (bad.type === "password") return "Password needs at least 8 characters.";
    if (bad.type === "checkbox") return "Please tick the box to continue.";
    return "Please fill in this field.";
  };

  /* already signed in → straight to the dashboard */
  const me = MNM_API.auth.me();
  if (me && !location.search.includes("switch")) return go(me);

  if (location.hash === "#signup") document.getElementById("t-signup")?.click();

  document.querySelectorAll(".pw-toggle").forEach((t) => t.addEventListener("click", () => {
    const i = t.previousElementSibling, show = i.type === "password";
    i.type = show ? "text" : "password"; t.textContent = show ? "Hide" : "Show";
    t.setAttribute("aria-label", show ? "Hide password" : "Show password");
  }));

  const signin = document.getElementById("signin-form");
  signin.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = invalid(signin); if (err) return msg(signin, err);
    msg(signin, ""); busy(signin, true, "Signing in");
    try { go(await MNM_API.auth.signIn(signin.email.value.trim(), signin.password.value)); }
    catch (x) { msg(signin, x.message); busy(signin, false, "Sign in"); }
  });

  document.getElementById("forgot").addEventListener("click", async () => {
    const email = signin.email.value.trim();
    if (!email) { msg(signin, "Enter your email above, then tap Forgot? again."); return signin.email.focus(); }
    try { await MNM_API.auth.resetPassword(email); msg(signin, `We sent a reset link to ${email}.`, true); }
    catch (x) { msg(signin, x.message); }
  });

  const signup = document.getElementById("signup-form");
  signup.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = invalid(signup); if (err) return msg(signup, err);
    msg(signup, ""); busy(signup, true, "Creating account");
    try {
      go(await MNM_API.auth.signUp({ name: signup.name.value.trim(), email: signup.email.value.trim(), password: signup.password.value, track: signup.track.value }));
    } catch (x) { msg(signup, x.message); busy(signup, false, "Create account"); }
  });

  document.querySelectorAll("[data-oauth]").forEach((b) => b.addEventListener("click", async () => {
    b.disabled = true; b.classList.add("is-busy");
    try { go(await MNM_API.auth.oauth(b.dataset.oauth)); } catch { b.disabled = false; b.classList.remove("is-busy"); }
  }));
})();
