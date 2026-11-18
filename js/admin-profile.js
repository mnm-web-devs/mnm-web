/* MNM — admin "My profile": hero card with MNM titles, plus name / bio / location / photo editing. */
(async () => {
  await window.MNM_UI_READY;
  if (!window.MNM_UI || MNM_UI.user.role !== "admin") return;
  const { $, esc, fmtDate, toast, user } = MNM_UI;
  const API = MNM_API.admin;
  const form = $("#admin-profile-form");
  const status = $("#aph-status");
  if (!form) return;

  const TITLE_ICON = { director: "★", lead: "◆", staff: "●", mentor: "✦", admin: "⚑", member: "○" };
  const titleKind = (t) => {
    const x = t.toLowerCase();
    if (x.includes("director") || x.includes("founder") || x.includes("president")) return "director";
    if (x.includes("lead") || x.includes("head") || x.includes("chief")) return "lead";
    if (x.includes("mentor") || x.includes("teacher")) return "mentor";
    if (x.includes("admin")) return "admin";
    return "staff";
  };
  const notReady = (error) => [404, 405, 501].includes(error?.status);
  const BACKEND_NOTE = "Saving admin profiles needs a small API update (PATCH /admin/me, POST /admin/avatar). Ask the backend dev to add it.";

  function render() {
    $("#aph-name").textContent = user.name || "Admin";
    $("#aph-email").textContent = user.email || "";
    const fromConfig = (window.MNM_TITLES || {})[(user.email || "").toLowerCase()];
    const titles = user.titles?.length ? user.titles : fromConfig?.length ? fromConfig : ["Admin"];
    $("#aph-titles").innerHTML = titles
      .map((t) => { const k = titleKind(t); return `<li class="ph-title ${k}"><i aria-hidden="true">${TITLE_ICON[k]}</i>${esc(t)}</li>`; })
      .join("");
    $("#aph-bio").textContent = user.bio || "";
    const meta = [];
    if (user.location) meta.push(["📍", user.location]);
    if (user.joinedAt) meta.push(["🗓", "Admin since " + fmtDate(new Date(user.joinedAt), { month: "short", year: "numeric" })]);
    $("#aph-meta").innerHTML = meta.map(([i, t]) => `<li><span aria-hidden="true">${i}</span>${esc(t)}</li>`).join("");
    const slot = $("#aph-avatar");
    const initials = slot.querySelector("span");
    let img = slot.querySelector("img");
    if (user.avatarUrl) {
      if (!img) { img = document.createElement("img"); img.alt = ""; img.referrerPolicy = "no-referrer"; slot.prepend(img); }
      img.src = user.avatarUrl;
      img.onerror = () => { img.remove(); initials.hidden = false; };
      initials.hidden = true;
    } else {
      img?.remove();
      initials.hidden = false;
    }
  }

  form.elements.namedItem("name").value = user.name || "";
  form.elements.namedItem("bio").value = user.bio || "";
  form.elements.namedItem("location").value = user.location || "";
  form.elements.namedItem("email").value = user.email || "";
  const bio = form.elements.namedItem("bio");
  const count = () => { $("#aph-bio-count").textContent = `${bio.value.length}/160`; };
  bio.addEventListener("input", count);
  count();
  render();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    const updates = {
      name: form.elements.namedItem("name").value.trim(),
      bio: bio.value.trim(),
      location: form.elements.namedItem("location").value.trim(),
    };
    if (!updates.name) { form.elements.namedItem("name").reportValidity(); return; }
    submit.disabled = true;
    status.textContent = "Saving…";
    try {
      await API.updateMe(updates);
      document.querySelectorAll("[data-user-name]").forEach((el) => { el.textContent = user.name; });
      render();
      status.textContent = "";
      toast("Profile saved.");
    } catch (error) {
      status.textContent = notReady(error) ? BACKEND_NOTE : (error.message || "Could not save your profile.");
    } finally {
      submit.disabled = false;
    }
  });

  $("#aph-avatar-edit").addEventListener("click", () => $("#aph-avatar-file").click());
  $("#aph-avatar-file").addEventListener("change", async (event) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) { toast("Choose a PNG, JPEG, or WebP image.", "err"); return; }
    if (file.size > 2 * 1024 * 1024) { toast("Photo must be no larger than 2 MB.", "err"); return; }
    toast("Uploading profile photo…");
    try {
      await API.uploadAvatar(file);
      render();
      toast("Profile photo updated.");
    } catch (error) {
      toast(notReady(error) ? BACKEND_NOTE : (error.message || "Could not upload the photo."), "err");
    }
  });
})().catch((error) => {
  console.error("Could not load admin profile:", error);
  window.MNM_UI?.toast(error.message, "err");
});
