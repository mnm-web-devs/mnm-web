/* MNM — admin dashboard. Reads MNM_API.admin (js/api.js). */
(async () => {
  if (!window.MNM_UI) return;
  const { $, $$, esc, fmtDate, fmtTime, ago, initials, toast, openModal, closeModal } = MNM_UI;
  const API = MNM_API.admin;
  const TRACK = { neuro: ["Neuroscience", "var(--purple-hi)"], med: ["Medicine", "var(--teal-hi)"], math: ["Mathematics", "var(--mint)"] };
  const tag = (t) => `<span class="tag" style="--c:${TRACK[t][1]}">${TRACK[t][0]}</span>`;

  MNM_UI.start();
  const [stats, students, workshops, subs, inq] = await Promise.all([API.stats(), API.students(), API.workshops(), API.submissions(), API.inquiries()]);

  /* ---------- overview ---------- */
  const counts = () => {
    const p = subs.filter((s) => s.status === "pending").length, n = inq.filter((i) => i.status === "new").length;
    $("#c-sub").textContent = p || ""; $("#c-inq").textContent = n || "";
    return { p, n };
  };
  const drawStats = () => {
    const { p, n } = counts();
    $("#a-stats").innerHTML = [
      ["Students", stats.students, `+${stats.newThisWeek} this week`],
      ["Workshop registrations", stats.registrations, "last 30 days"],
      ["Pending reviews", p, p ? "waiting for you" : "all clear ✓"],
      ["Partner inquiries", n, "new"],
    ].map(([k, v, s]) => `<div class="stat"><small>${k}</small><b>${v}</b><span>${s}</span></div>`).join("");
  };
  drawStats();

  const max = Math.max(...stats.byDay);
  $("#chart-total").textContent = stats.byDay.reduce((a, b) => a + b, 0) + " total";
  $("#chart").innerHTML = stats.byDay.map((v, i) => {
    const d = new Date(Date.now() - (13 - i) * 864e5);
    return `<div class="col" title="${fmtDate(d)}: ${v}"><span style="--h:${(v / max) * 100}%"><em>${v}</em></span><small>${i % 2 ? "" : d.getDate()}</small></div>`;
  }).join("");

  const byTrack = Object.keys(TRACK).map((k) => [k, students.filter((s) => s.track === k).length]);
  const total = students.length;
  $("#split").innerHTML = byTrack.map(([k, n]) => `
    <div class="sb"><span class="sb-l">${TRACK[k][0]}</span><span class="bar" style="--c:${TRACK[k][1]}"><span style="width:${(n / total) * 100}%"></span></span><b>${Math.round((n / total) * 100)}%</b></div>`).join("");

  const drawMini = () => {
    const pend = subs.filter((s) => s.status === "pending");
    $("#a-review").innerHTML = pend.length ? pend.slice(0, 3).map((s) => `<li><span class="avatar sm">${initials(s.student)}</span><span class="grow"><b>${esc(s.student)}</b><small>${esc(s.challenge)}</small></span><time>${ago(s.at)}</time></li>`).join("") : `<li class="empty">Nothing to review 🎉</li>`;
    const nw = inq.filter((i) => i.status === "new");
    $("#a-inq").innerHTML = nw.length ? nw.map((i) => `<li><span class="grow"><b>${esc(i.org)}</b><small>${esc(i.type)} · ${esc(i.level)}</small></span><time>${ago(i.at)}</time></li>`).join("") : `<li class="empty">No new inquiries.</li>`;
  };
  drawMini();

  /* ---------- students ---------- */
  let sortKey = "joined", dir = -1;
  const visible = () => {
    const q = $("#q").value.trim().toLowerCase(), t = $("#f-track").value, st = $("#f-status").value;
    return students
      .filter((s) => (!q || (s.name + s.email + s.country).toLowerCase().includes(q)) && (!t || s.track === t) && (!st || s.status === st))
      .sort((a, b) => (a[sortKey] > b[sortKey] ? 1 : a[sortKey] < b[sortKey] ? -1 : 0) * dir);
  };
  const drawStudents = () => {
    const list = visible();
    $("#s-body").innerHTML = list.length ? list.map((s) => `
      <tr><td><span class="cell-user"><span class="avatar sm">${initials(s.name)}</span><span><b>${esc(s.name)}</b><small>${esc(s.email)}</small></span></span></td>
      <td>${esc(s.country)}</td><td>${tag(s.track)}</td><td>${s.xp.toLocaleString()}</td><td>${fmtDate(s.joined)}</td>
      <td><span class="status ${s.status}">${s.status}</span></td></tr>`).join("")
      : `<tr><td colspan="6" class="empty">No students match these filters.</td></tr>`;
    $("#s-count").textContent = `${list.length} of ${students.length} students`;
    $$("[data-sort]").forEach((b) => b.closest("th").setAttribute("aria-sort", b.dataset.sort === sortKey ? (dir > 0 ? "ascending" : "descending") : "none"));
  };
  ["#q", "#f-track", "#f-status"].forEach((s) => $(s).addEventListener("input", drawStudents));
  $$("[data-sort]").forEach((b) => b.addEventListener("click", () => { dir = sortKey === b.dataset.sort ? -dir : 1; sortKey = b.dataset.sort; drawStudents(); }));
  drawStudents();
  $("#export").addEventListener("click", () => {
    const rows = [["name", "email", "country", "track", "xp", "joined", "status"], ...visible().map((s) => [s.name, s.email, s.country, s.track, s.xp, s.joined, s.status])];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })), download: "mnm-students.csv" });
    a.click(); URL.revokeObjectURL(a.href);
    toast("CSV downloaded.");
  });

  /* ---------- workshops ---------- */
  const drawWs = () => {
    $("#w-body").innerHTML = workshops.length ? [...workshops].sort((a, b) => new Date(a.date) - new Date(b.date)).map((w) => `
      <tr><td><b>${esc(w.title)}</b><small class="block muted">${esc(w.host)}</small></td><td>${tag(w.track)}</td>
      <td>${fmtDate(w.date)} · ${fmtTime(w.date)}</td>
      <td><span class="seat-bar"><span style="width:${Math.min(100, (w.taken / w.seats) * 100)}%"></span></span><small>${w.taken}/${w.seats}</small></td>
      <td class="right"><button class="text-btn danger" data-del="${w.id}">Delete</button></td></tr>`).join("")
      : `<tr><td colspan="5" class="empty">No workshops yet. Create the first one.</td></tr>`;
  };
  drawWs();
  $("#w-body").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-del]"); if (!b) return;
    const w = workshops.find((x) => x.id === b.dataset.del);
    if (b.dataset.confirm !== "1") { b.dataset.confirm = "1"; b.textContent = "Sure? Delete"; setTimeout(() => { b.dataset.confirm = ""; b.textContent = "Delete"; }, 3000); return; }
    await API.deleteWorkshop(w.id); drawWs(); toast(`Deleted "${w.title}".`);
  });

  const modal = $("#ws-modal"), form = $("#ws-form");
  $$("[data-new-ws]").forEach((b) => b.addEventListener("click", () => { form.reset(); form.querySelector(".form-msg").textContent = ""; openModal(modal); }));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const bad = [...form.querySelectorAll("[required]")].find((i) => !i.checkValidity());
    if (bad) { form.querySelector(".form-msg").textContent = "Please fill in the title, date and seats."; return bad.focus(); }
    const f = Object.fromEntries(new FormData(form));
    const w = await API.createWorkshop({ title: f.title.trim(), track: f.track, seats: +f.seats, mins: +f.mins, date: new Date(f.date).toISOString(), host: f.host.trim() || "MNM" });
    closeModal(modal); drawWs(); toast(`"${w.title}" created.`);
    if (location.hash !== "#workshops") location.hash = "workshops";
  });

  /* ---------- submissions ---------- */
  let sf = "pending";
  const drawSubs = () => {
    const list = subs.filter((s) => s.status === sf);
    $("#sub-list").innerHTML = list.length ? list.map((s) => `
      <article class="sub">
        <span class="avatar">${initials(s.student)}</span>
        <div class="grow"><b>${esc(s.student)}</b><small>${esc(s.challenge)} · ${ago(s.at)}</small></div>
        <a class="text-btn" href="${esc(s.link)}" target="_blank" rel="noopener">Open work ↗</a>
        ${s.status === "pending" ? `<button class="btn btn-sm btn-ghost" data-rev="rejected" data-id="${s.id}"><span>Reject</span></button><button class="btn btn-sm" data-rev="approved" data-id="${s.id}"><span>Approve</span></button>` : `<span class="status ${s.status}">${s.status}</span>`}
      </article>`).join("") : `<p class="empty">No ${sf} submissions.</p>`;
  };
  drawSubs();
  $$("[data-sf]").forEach((b) => b.addEventListener("click", () => { sf = b.dataset.sf; $$("[data-sf]").forEach((x) => x.setAttribute("aria-pressed", x === b)); drawSubs(); }));
  $("#sub-list").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-rev]"); if (!b) return;
    const s = await API.review(b.dataset.id, b.dataset.rev);
    toast(`${s.student}: ${s.status}.`); drawSubs(); drawMini(); drawStats();
  });

  /* ---------- inquiries ---------- */
  const drawInq = () => {
    $("#inq-list").innerHTML = inq.map((i) => `
      <article class="sub">
        <span class="avatar">${initials(i.org)}</span>
        <div class="grow"><b>${esc(i.org)}</b><small>${esc(i.type)} · ${esc(i.level)} · ${ago(i.at)}</small></div>
        <a class="text-btn" href="mailto:${esc(i.contact)}">${esc(i.contact)}</a>
        ${i.status === "new" ? `<button class="btn btn-sm" data-inq="${i.id}"><span>Mark replied</span></button>` : `<span class="status replied">replied</span>`}
      </article>`).join("");
  };
  drawInq();
  $("#inq-list").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-inq]"); if (!b) return;
    await API.markInquiry(b.dataset.inq, "replied"); drawInq(); drawMini(); drawStats(); toast("Marked as replied.");
  });
})();
