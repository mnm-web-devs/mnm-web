/* MNM — student dashboard. Reads MNM_API.student (js/api.js). */
(async () => {
  if (!window.MNM_UI) return;
  const { $, $$, esc, fmtDate, fmtTime, toast, user } = MNM_UI;
  const API = MNM_API.student;
  const TRACK = { neuro: ["Neuroscience", "var(--purple-hi)", "◉"], med: ["Medicine", "var(--teal-hi)", "✚"], math: ["Mathematics", "var(--mint)", "π"] };
  const pct = (t) => Math.round((t.done / t.total) * 100);

  MNM_UI.start();
  $$("[data-user-value]").forEach((i) => (i.value = user[i.dataset.userValue] || ""));

  const [ov, tracks, workshops, ch, news] = await Promise.all([API.overview(), API.tracks(), API.workshops(), API.challenge(), API.announcements()]);

  /* stats + level ring */
  $("#stats").innerHTML = [
    ["XP", ov.xp.toLocaleString(), "+120 this week"],
    ["Day streak", ov.streak + " 🔥", "Keep it going"],
    ["Workshops attended", ov.attended, "2 this month"],
    ["Leaderboard", "#" + ov.rank, "of " + ov.of + " students"],
  ].map(([k, v, s]) => `<div class="stat"><small>${k}</small><b>${v}</b><span>${s}</span></div>`).join("");
  const ring = $("#level-ring .fill"), C = 2 * Math.PI * 52;
  ring.style.strokeDasharray = C; ring.style.strokeDashoffset = C;
  requestAnimationFrame(() => (ring.style.strokeDashoffset = C * (1 - 0.58)));

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
      await API.register(w.id, !w.registered);
      toast(w.registered ? "You're registered! We'll email you the link." : "Registration cancelled.");
    } catch (x) { toast(x.message, "err"); }
    drawWs();
  });

  /* challenge */
  const due = Math.max(0, Math.ceil((new Date(ch.due) - Date.now()) / 864e5));
  const chHtml = (big) => `
    <header><h3>${big ? "This month's challenge" : "Monthly challenge"}</h3><span class="tag" style="--c:var(--mint)">${ch.points} pts</span></header>
    <h4>${esc(ch.title)}</h4>
    <p class="muted">Build a simple math model of a heartbeat (e.g. a periodic function or a spreadsheet simulation) and explain what each part means in the body.</p>
    <p class="due">⏳ ${due} days left · due ${fmtDate(ch.due, { day: "numeric", month: "long" })}</p>
    ${ch.submitted ? `<p class="done-badge">✓ Submitted. We'll review it soon.</p>` : big ? `
      <form class="form submit-form" novalidate>
        <label class="field"><span>Link to your work (Google Doc, GitHub, Drive…)</span><input name="link" type="url" placeholder="https://" required /></label>
        <p class="form-msg" role="alert"></p>
        <button class="btn btn-sm" type="submit"><span>Submit <b aria-hidden="true">→</b></span></button>
      </form>` : `<button class="btn btn-sm" type="button" data-go-ch><span>Take part <b aria-hidden="true">→</b></span></button>`}`;
  const drawCh = () => {
    $("#ov-challenge").innerHTML = chHtml(false);
    $("#ch-main").innerHTML = chHtml(true);
    $("[data-go-ch]")?.addEventListener("click", () => (location.hash = "challenges"));
    const f = $("#ch-main .submit-form");
    f?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const m = f.querySelector(".form-msg"); m.textContent = "";
      f.querySelector("button").disabled = true;
      try { await API.submit(ch.id, f.link.value.trim()); toast("Submitted! Good luck 🎉"); drawCh(); }
      catch (x) { m.textContent = x.message; f.querySelector("button").disabled = false; }
    });
  };
  drawCh();

  $("#board").innerHTML = [["Yuna P.", 1510], ["Aruzhan K.", 1240], ["Liam C.", 1120], ["Daniel O.", 980], ["Priya S.", 890]]
    .map(([n, xp], i) => `<li class="${n.startsWith(user.name.split(" ")[0]) ? "me" : ""}"><em>${i + 1}</em><span class="avatar sm">${MNM_UI.initials(n)}</span><span class="grow">${n}</span><b>${xp.toLocaleString()} XP</b></li>`).join("")
    + `<li class="me"><em>${ov.rank}</em><span class="avatar sm">${MNM_UI.initials(user.name)}</span><span class="grow">You</span><b>${ov.xp.toLocaleString()} XP</b></li>`;

  /* news */
  $("#ov-news").innerHTML = news.map((n) => `<li><span class="grow"><b>${esc(n.title)}</b><small>${esc(n.body)}</small></span><time>${MNM_UI.ago(n.at)}</time></li>`).join("");

  /* profile */
  $("#profile-form").addEventListener("submit", (e) => { e.preventDefault(); toast("Profile saved."); });
})();
