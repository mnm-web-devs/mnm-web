/* MNM — student dashboard. Reads MNM_API.student (js/api.js). */
const dashboardLoading = document.getElementById("dashboard-loading");
const setDashboardReady = () => {
  dashboardLoading.hidden = true;
  document.body.removeAttribute("aria-busy");
  [document.querySelector(".skip"), document.querySelector(".side"), document.getElementById("main")].forEach((region) => {
    region.inert = false;
    region.removeAttribute("aria-hidden");
  });
};
const showDashboardError = (error) => {
  document.getElementById("dashboard-loading-status").hidden = true;
  document.getElementById("dashboard-loading-error").hidden = false;
  document.getElementById("dashboard-loading-message").textContent =
    error?.message || "We couldn't load your dashboard. Please try again.";
  document.getElementById("dashboard-retry").addEventListener("click", () => location.reload(), { once: true });
};

(async () => {
  await window.MNM_UI_READY;
  if (!window.MNM_UI) return;
  const { $, $$, esc, fmtDate, fmtTime, toast, user } = MNM_UI;
  const API = MNM_API.student;
  const TRACK = { neuro: ["Neuroscience", "var(--purple-hi)", "◉"], med: ["Medicine", "var(--teal-hi)", "✚"], math: ["Mathematics", "var(--mint)", "π"] };
  const pct = (t) => t.total ? Math.round((t.done / t.total) * 100) : 0;

  MNM_UI.start();

  const [ov, tracks, workshops, initialChallenge, news, leaderboard, profile] = await Promise.all([
    API.overview(), API.tracks(), API.workshops(), API.challenge(), API.announcements(), API.leaderboard(), API.profile(),
  ]);
  let ch = initialChallenge;
  const profileForm = $("#profile-form");
  profileForm.elements.namedItem("name").value = profile.name || user.name;
  profileForm.elements.namedItem("username").value = profile.username || "";
  profileForm.elements.namedItem("email").value = profile.email || user.email;
  profileForm.elements.namedItem("track").value = profile.track || "";
  profileForm.querySelector('input[type="checkbox"]').checked = profile.emailWorkshopUpdates;
  for (const key of ["bio", "school", "grade", "location"]) {
    const input = profileForm.elements.namedItem(key);
    if (input) input.value = profile[key] || "";
  }
  if (!profile.track) {
    const trackSelect = profileForm.elements.namedItem("track");
    const choose = document.createElement("option");
    choose.value = "";
    choose.textContent = "Choose your main interest";
    choose.disabled = true;
    trackSelect.prepend(choose);
    trackSelect.value = "";
    trackSelect.required = true;
    location.hash = "settings";
    $$(".side-nav a[href^='#']").forEach((link) => {
      if (link.getAttribute("href") !== "#settings") link.hidden = true;
    });
  }


  /* profile card: avatar, MNM titles, bio, meta, stats */
  const TITLE_ICON = { director: "★", lead: "◆", staff: "●", mentor: "✦", admin: "⚑", member: "○" };
  const titleKind = (t) => {
    const x = t.toLowerCase();
    if (x.includes("director") || x.includes("founder") || x.includes("president")) return "director";
    if (x.includes("lead") || x.includes("head") || x.includes("chief")) return "lead";
    if (x.includes("mentor") || x.includes("teacher")) return "mentor";
    if (x.includes("admin")) return "admin";
    if (x.includes("member")) return "member";
    return "staff";
  };
  const TRACK_NAME = { neuro: "Neuroscience", med: "Medicine", math: "Mathematics", all: "All STEM interests" };
  function renderProfileHero() {
    const byUsername = (window.MNM_TITLES || {})[(profile.username || "").toLowerCase()];
    const titles = user.titles?.length ? user.titles : byUsername?.length ? byUsername : [user.role === "admin" ? "Admin" : "Member"];
    $("#ph-titles").innerHTML = titles
      .map((t) => { const k = titleKind(t); return `<li class="ph-title ${k}"><i aria-hidden="true">${TITLE_ICON[k]}</i>${esc(t)}</li>`; })
      .join("");
    $("#ph-handle").textContent = profile.username ? "@" + profile.username : "Pick a username below";
    $("#ph-bio").textContent = profile.bio || "";
    const meta = [];
    const trackKey = profileForm.elements.namedItem("track").value;
    if (TRACK_NAME[trackKey]) meta.push(["🧭", TRACK_NAME[trackKey]]);
    if (profile.school) meta.push(["🎓", [profile.school, profile.grade].filter(Boolean).join(" · ")]);
    else if (profile.grade) meta.push(["🎓", profile.grade]);
    if (profile.location) meta.push(["📍", profile.location]);
    if (user.joinedAt) meta.push(["🗓", "Joined " + fmtDate(new Date(user.joinedAt), { month: "short", year: "numeric" })]);
    $("#ph-meta").innerHTML = meta.map(([i, t]) => `<li><span aria-hidden="true">${i}</span>${esc(t)}</li>`).join("");
    const slot = $("#ph-avatar");
    const initials = slot.querySelector("span");
    const existingImage = slot.querySelector("img");
    const avatarUrl = profile.avatarUrl || user.avatarUrl;
    if (avatarUrl) {
      const img = existingImage || document.createElement("img");
      img.src = avatarUrl; img.alt = ""; img.referrerPolicy = "no-referrer";
      img.onerror = () => { img.remove(); initials.hidden = false; };
      if (!existingImage) slot.prepend(img);
      initials.hidden = true;
    } else {
      existingImage?.remove();
      initials.hidden = false;
    }
  }
  renderProfileHero();
  $("#avatar-edit").addEventListener("click", () => $("#avatar-file").click());
  $("#avatar-file").addEventListener("change", async (event) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast("Choose a PNG, JPEG, or WebP image.", "err");
      input.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast("Avatar must be no larger than 2 MB.", "err");
      input.value = "";
      return;
    }
    const button = $("#avatar-edit");
    button.disabled = true;
    toast("Uploading profile photo…");
    try {
      const uploaded = await API.uploadAvatar(file);
      profile.avatarUrl = uploaded.avatarUrl;
      renderProfileHero();
      toast("Profile photo updated.");
    } catch (error) {
      toast(error.message, "err");
    } finally {
      button.disabled = false;
      input.value = "";
    }
  });

  /* stats + level ring */
  $("#stats").innerHTML = [
    ["XP", ov.xp.toLocaleString(), `Level ${ov.level}`],
    ["Day streak", ov.streak + " 🔥", "Current streak"],
    ["Workshops attended", ov.attended ?? 0, "Recorded attendance"],
    ["Leaderboard", "#" + ov.rank, "of " + ov.of + " students"],
  ].map(([k, v, s]) => `<div class="stat"><small>${k}</small><b>${v}</b><span>${s}</span></div>`).join("");
  $("#ph-stats").innerHTML = [
    [`${ov.level}`, "Level"], [ov.xp.toLocaleString(), "XP"], [`${ov.streak}`, "🔥 Streak"], [`#${ov.rank}`, "Leaderboard"],
  ].map(([v, k]) => `<div class="ph-stat"><b>${v}</b><small>${k}</small></div>`).join("");
  const ring = $("#level-ring .fill"), C = 2 * Math.PI * 52;
  const levelProgress = ((ov.xp % 200) / 200);
  ring.style.strokeDasharray = C;
  ring.style.strokeDashoffset = C * (1 - levelProgress);
  $("#level-ring b").textContent = ov.level;

  /* tracks */
  const trackRow = (t) => `
    <a class="track-row" href="track-${{ neuro: "neuroscience", med: "medicine", math: "mathematics" }[t.id]}.html" style="--c:${t.color}">
      <i>${t.glyph}</i>
      <span class="grow"><b>${t.name}</b><small>Next: ${esc(t.next)}</small>
        <span class="bar"><span style="width:${pct(t)}%"></span></span></span>
      <em>${pct(t)}%</em>
    </a>`;
  $("#ov-tracks").innerHTML = tracks.map(trackRow).join("");
  $("#track-cards").innerHTML = tracks.map((t) => `
    <article class="track-tile" style="--c:${t.color}">
      <i>${t.glyph}</i><h3>${t.name}</h3>
      <p class="muted">${t.done} of ${t.total} lessons done</p>
      <span class="bar"><span style="width:${pct(t)}%"></span></span>
      <p class="next"><small>Up next</small>${esc(t.next)}</p>
      <a class="btn btn-sm" href="track-${{ neuro: "neuroscience", med: "medicine", math: "mathematics" }[t.id]}.html"><span>Continue <b aria-hidden="true">→</b></span></a>
    </article>`).join("");

  /* workshops */
  const wsCard = (w) => {
    const [name, c] = TRACK[w.track], full = w.taken >= w.seats && !w.registered, left = w.seats - w.taken;
    return `
    <article class="ws" style="--c:${c}">
      <div class="ws-date"><b>${fmtDate(w.date, { day: "numeric" })}</b><small>${fmtDate(w.date, { month: "short" })}</small></div>
      <div class="grow">
        <span class="tag" style="--c:${c}">${name}</span>
        <h3>${esc(w.title)}</h3>
        <p class="muted">${fmtTime(w.date)} · ${w.mins} min · ${esc(w.host)}</p>
        <p class="seats ${left <= 3 ? "low" : ""}">${full ? "Full" : left + (left === 1 ? " seat left" : " seats left")}</p>
      </div>
      <button class="btn btn-sm ${w.registered ? "btn-ghost" : ""}" type="button" data-reg="${w.id}" ${full ? "disabled" : ""}>
        <span>${w.registered ? "✓ Registered" : full ? "Full" : "Register"}</span></button>
    </article>`;
  };
  let filter = "all";
  const drawWs = () => {
    const list = workshops.filter((w) => filter === "all" || (filter === "mine" ? w.registered : w.track === filter));
    $("#ws-grid").innerHTML = list.length ? list.map(wsCard).join("") : `<p class="empty">No workshops here yet. Check back soon.</p>`;
    const mine = workshops.filter((w) => w.registered);
    $("#ov-workshops").innerHTML = mine.length
      ? mine.map((w) => `<li><span class="dot" style="--c:${TRACK[w.track][1]}"></span><span class="grow"><b>${esc(w.title)}</b><small>${fmtDate(w.date, { weekday: "short", day: "numeric", month: "short" })} · ${fmtTime(w.date)}</small></span></li>`).join("")
      : `<li class="empty">You haven't registered yet. <button class="text-btn" data-go2="workshops">Find one →</button></li>`;
    $("[data-go2]")?.addEventListener("click", () => (location.hash = "workshops"));
  };
  drawWs();
  $$(".seg-btn").forEach((b) => b.addEventListener("click", () => {
    filter = b.dataset.filter;
    $$(".seg-btn").forEach((x) => x.setAttribute("aria-pressed", x === b));
    drawWs();
  }));
  $("#ws-grid").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-reg]"); if (!b) return;
    const w = workshops.find((x) => x.id === b.dataset.reg);
    b.disabled = true;
    try {
      const registering = !w.registered;
      const result = await API.register(w.id, registering);
      w.registered = result.registered;
      w.taken += registering ? 1 : -1;
      toast(registering ? "You're registered! We'll email you the link." : "Registration cancelled.");
    } catch (x) { toast(x.message, "err"); }
    drawWs();
  });

  /* challenge */
  const chHtml = (big) => {
    if (!ch) return `<header><h3>${big ? "This month's challenge" : "Monthly challenge"}</h3></header><p class="empty">No challenge is open right now. Check back soon.</p>`;
    const due = Math.max(0, Math.ceil((new Date(ch.due) - Date.now()) / 864e5));
    return `
    <header><h3>${big ? "This month's challenge" : "Monthly challenge"}</h3><span class="tag" style="--c:var(--mint)">${ch.points} pts</span></header>
    <h4>${esc(ch.title)}</h4>
    <p class="muted">${esc(ch.description)}</p>
    <p class="due">⏳ ${due} days left · due ${fmtDate(ch.due, { day: "numeric", month: "long" })}</p>
    ${ch.submitted ? `<p class="done-badge">✓ Submitted. We'll review it soon.</p>` : big ? `
      <form class="form submit-form" novalidate>
        <label class="field"><span>Link to your work (Google Doc, GitHub, Drive…)</span><input name="link" type="url" placeholder="https://" required /></label>
        <p class="form-msg" role="alert"></p>
        <button class="btn btn-sm" type="submit"><span>Submit <b aria-hidden="true">→</b></span></button>
      </form>` : `<button class="btn btn-sm" type="button" data-go-ch><span>Take part <b aria-hidden="true">→</b></span></button>`}`;
  };
  const drawCh = () => {
    $("#ov-challenge").innerHTML = chHtml(false);
    $("#ch-main").innerHTML = chHtml(true);
    $("[data-go-ch]")?.addEventListener("click", () => (location.hash = "challenges"));
    const f = $("#ch-main .submit-form");
    f?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const m = f.querySelector(".form-msg"); m.textContent = "";
      f.querySelector("button").disabled = true;
      try {
        await API.submit(ch.id, f.link.value.trim());
        ch = await API.challenge();
        toast("Submitted! Good luck 🎉");
        drawCh();
      }
      catch (x) { m.textContent = x.message; f.querySelector("button").disabled = false; }
    });
  };
  drawCh();

  const currentUserInBoard = leaderboard.some((item) => item.isCurrentUser);
  $("#board").innerHTML = leaderboard.map((item) => `
    <li class="${item.isCurrentUser ? "me" : ""}">
      <em>${item.rank}</em><span class="avatar sm">${MNM_UI.initials(item.name)}</span>
      <span class="grow">${esc(item.name)}</span><b>${item.xp.toLocaleString()} XP</b>
    </li>`).join("") + (currentUserInBoard ? "" : `
    <li class="me"><em>${ov.rank}</em><span class="avatar sm">${MNM_UI.initials(user.name)}</span>
      <span class="grow">You</span><b>${ov.xp.toLocaleString()} XP</b></li>`);

  /* news */
  $("#ov-news").innerHTML = news.map((n) => `<li><span class="grow"><b>${esc(n.title)}</b><small>${esc(n.body)}</small></span><time>${MNM_UI.ago(n.at)}</time></li>`).join("");

  /* profile */
  const bio = profileForm.elements.namedItem("bio");
  const bioCount = () => ($("#bio-count").textContent = `${bio.value.length}/160`);
  bio.addEventListener("input", bioCount); bioCount();
  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submit = profileForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      const name = profileForm.elements.namedItem("name").value.trim();
      const username = profileForm.elements.namedItem("username").value.trim();
      if (!profileForm.elements.namedItem("username").checkValidity()) {
        profileForm.elements.namedItem("username").reportValidity();
        submit.disabled = false;
        return;
      }
      if (name && name !== user.name) {
        Object.assign(user, await MNM_API.auth.updateName(name));
        $$("[data-user-name]").forEach((el) => (el.textContent = user.name));
        $$("[data-user-first]").forEach((el) => (el.textContent = user.name.split(" ")[0]));
      }
      const savedProfile = await API.updateProfile({
        username,
        track: profileForm.elements.namedItem("track").value,
        emailWorkshopUpdates: profileForm.querySelector('input[type="checkbox"]').checked,
      });
      profile.username = savedProfile.username;
      profileForm.elements.namedItem("username").value = savedProfile.username;
      const extras = {};
      for (const key of ["bio", "school", "grade", "location"]) {
        const v = profileForm.elements.namedItem(key).value.trim();
        if (v !== (profile[key] || "")) extras[key] = v;
      }
      if (Object.keys(extras).length) {
        try {
          await API.updateProfile(extras);
          Object.assign(profile, extras);
        } catch (extraError) {
          toast("Saved, but bio/school/location could not be saved: " + extraError.message, "err");
        }
      }
      renderProfileHero();
      toast("Profile saved.");
      submit.disabled = false;
      const needsReload = !profile.track;
      profile.track = profileForm.elements.namedItem("track").value;
      if (location.hash === "#settings" && needsReload) location.reload();
    } catch (error) {
      toast(error.message, "err");
      submit.disabled = false;
    }
  });
  setDashboardReady();
})().catch((error) => {
  console.error("Could not load the student dashboard:", error);
  showDashboardError(error);
});
