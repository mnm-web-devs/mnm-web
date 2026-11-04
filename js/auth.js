/* MNM — login / sign-up page. Talks only to MNM_API.auth (js/api.js). */
(async () => {
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
    if (bad.type === "radio") return "Choose your main interest.";
    if (bad.name === "username") return "Choose a username using 3–30 letters, numbers, dots, underscores or hyphens.";
    return "Please fill in this field.";
  };

  let authReadyError = null;
  try {
    const me = await MNM_API.auth.ready();
    if (me && !location.search.includes("switch")) return go(me);
  } catch (error) {
    authReadyError = error;
  }

  if (location.hash === "#signup") document.getElementById("t-signup")?.click();

  document.querySelectorAll(".pw-toggle").forEach((t) => t.addEventListener("click", () => {
    const i = t.previousElementSibling, show = i.type === "password";
    i.type = show ? "text" : "password"; t.textContent = show ? "Hide" : "Show";
    t.setAttribute("aria-label", show ? "Hide password" : "Show password");
  }));

  const signin = document.getElementById("signin-form");
  if (authReadyError) msg(signin, authReadyError.message);
  signin.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = invalid(signin); if (err) return msg(signin, err);
    msg(signin, ""); busy(signin, true, "Signing in");
    try { go(await MNM_API.auth.signIn(signin.email.value.trim(), signin.password.value)); }
    catch (x) { msg(signin, x.message); busy(signin, false, "Sign in"); }
  });

  const forgot = document.getElementById("forgot");
  let resetting = false;
  let resetFields;
  forgot.addEventListener("click", async () => {
    const email = signin.email.value.trim();
    if (!email) { msg(signin, "Enter your email above, then tap Forgot? again."); return signin.email.focus(); }
    try {
      if (!resetting) {
        await MNM_API.auth.startPasswordReset(email);
        resetFields = document.createElement("div");
        resetFields.className = "field";
        resetFields.innerHTML = `
          <label class="field"><span>Email verification code</span><input name="reset-code" inputmode="numeric" autocomplete="one-time-code" required /></label>
          <label class="field"><span>New password</span><input name="reset-password" type="password" autocomplete="new-password" minlength="8" required /></label>`;
        signin.insertBefore(resetFields, signin.querySelector(".form-msg"));
        resetting = true;
        forgot.textContent = "Set new password";
        msg(signin, `We sent a reset code to ${email}.`, true);
        return;
      }

      const code = resetFields.querySelector('[name="reset-code"]').value.trim();
      const password = resetFields.querySelector('[name="reset-password"]').value;
      if (!code || password.length < 8) {
        msg(signin, "Enter the email code and a new password with at least 8 characters.");
        return;
      }
      await MNM_API.auth.finishPasswordReset(code, password);
      resetFields.remove();
      resetFields = null;
      resetting = false;
      forgot.textContent = "Forgot?";
      msg(signin, "Password updated. Sign in with your new password.", true);
    } catch (x) {
      msg(signin, x.message);
    }
  });

  const signup = document.getElementById("signup-form");
  signup.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = invalid(signup); if (err) return msg(signup, err);
    msg(signup, ""); busy(signup, true, "Creating account");
    try {
      const result = await MNM_API.auth.signUp({
        name: signup.name.value.trim(),
        email: signup.email.value.trim(),
        username: signup.username.value.trim(),
        password: signup.password.value,
        track: signup.elements.namedItem("track").value,
      });
      if (result.pendingVerification) {
        const verification = document.createElement("form");
        verification.className = "form";
        verification.innerHTML = `
          <p class="muted">Enter the verification code sent to ${MNM_API.auth.me()?.email || signup.email.value.trim()}.</p>
          <label class="field"><span>Email verification code</span><input name="code" inputmode="numeric" autocomplete="one-time-code" required /></label>
          <p class="form-msg" role="alert" aria-live="polite"></p>
          <button class="btn btn-block" type="submit"><span>Verify email <b aria-hidden="true">→</b></span></button>
          <button class="link-btn" type="button" data-resend>Resend code</button>`;
        signup.replaceWith(verification);
        verification.addEventListener("submit", async (event) => {
          event.preventDefault();
          const button = verification.querySelector('button[type="submit"]');
          const status = verification.querySelector(".form-msg");
          button.disabled = true;
          try { go(await MNM_API.auth.verifySignUpCode(verification.elements.namedItem("code").value.trim())); }
          catch (error) { status.textContent = error.message; button.disabled = false; }
        });
        verification.querySelector("[data-resend]").addEventListener("click", async () => {
          try {
            await MNM_API.auth.resendSignUpCode();
            verification.querySelector(".form-msg").textContent = "A new code was sent.";
          } catch (error) {
            verification.querySelector(".form-msg").textContent = error.message;
          }
        });
        return;
      }
      go(result);
    } catch (x) { msg(signup, x.message); busy(signup, false, "Create account"); }
  });

  document.querySelectorAll("[data-oauth]").forEach((b) => b.addEventListener("click", async () => {
    b.disabled = true; b.classList.add("is-busy");
    try { await MNM_API.auth.oauth(b.dataset.oauth); }
    catch (error) {
      msg(signin, error.message);
      b.disabled = false;
      b.classList.remove("is-busy");
    }
  }));
})().catch((error) => {
  const message = document.querySelector("#signin-form .form-msg");
  if (message) message.textContent = error.message;
});
