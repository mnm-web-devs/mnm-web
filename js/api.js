/* ============================================================
   MNM — data layer for login + dashboards.
   EVERYTHING here is MOCK DATA so the pages work today.
   Backend: replace each function body with a real fetch() to the API
   (keep the same name, arguments and return shape) and the pages keep working.
   Auth: replace MNM_API.auth.* with Clerk (see README "Accounts & dashboards").
   ============================================================ */
(() => {
  const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));
  const KEY = "mnm-demo-session";
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } },
    set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} },
    clear() { try { localStorage.removeItem(KEY); } catch {} },
  };

  /* ---------- mock tables (shape = what the API should return) ---------- */
  const tracks = [
    { id: "neuro", name: "Neuroscience", color: "var(--purple-hi)", glyph: "◉", done: 7, total: 12, next: "Synapses & neurotransmitters" },
    { id: "med", name: "Medicine", color: "var(--teal-hi)", glyph: "✚", done: 4, total: 12, next: "The cardiovascular system" },
    { id: "math", name: "Mathematics", color: "var(--mint)", glyph: "π", done: 9, total: 12, next: "Probability in diagnostics" },
  ];
  const workshops = [
    { id: "w1", title: "How neurons fire: an intro to action potentials", track: "neuro", date: "2026-11-08T14:00:00Z", mins: 60, host: "MNM Neuro team", seats: 40, taken: 31, registered: true },
    { id: "w2", title: "Probability & medical tests", track: "math", date: "2026-11-12T15:00:00Z", mins: 45, host: "MNM Math team", seats: 50, taken: 18, registered: false },
    { id: "w3", title: "Reading a research paper in 30 minutes", track: "med", date: "2026-11-15T13:00:00Z", mins: 30, host: "Programs & Curriculum", seats: 60, taken: 59, registered: false },
    { id: "w4", title: "Olympiad problem night: number theory", track: "math", date: "2026-11-20T16:00:00Z", mins: 90, host: "MNM Math team", seats: 30, taken: 9, registered: false },
  ];
  const challenge = { id: "c11", title: "November Challenge: Model a heartbeat", track: "math", due: "2026-11-30T23:59:00Z", points: 300, status: "open", submitted: false };
  const announcements = [
    { id: "a1", title: "Week 2 sessions are live", body: "New workshops added for neuroscience and math. Seats are limited.", at: "2026-11-01T18:00:00Z" },
    { id: "a2", title: "Monthly challenge opens", body: "Model a heartbeat with math. Top 3 get featured on our page.", at: "2026-10-30T12:00:00Z" },
  ];
  const students = [
    ["Aruzhan K.", "aruzhan@example.com", "Kazakhstan", "neuro", 1240, "2026-10-12", "active"],
    ["Daniel O.", "daniel@example.com", "Nigeria", "math", 980, "2026-10-14", "active"],
    ["Marie L.", "marie@example.com", "DR Congo", "med", 760, "2026-10-18", "active"],
    ["Yuna P.", "yuna@example.com", "South Korea", "neuro", 1510, "2026-10-03", "active"],
    ["Omar H.", "omar@example.com", "Egypt", "math", 430, "2026-10-25", "new"],
    ["Sofia R.", "sofia@example.com", "Brazil", "med", 210, "2026-10-29", "new"],
    ["Liam C.", "liam@example.com", "Canada", "math", 1120, "2026-10-07", "active"],
    ["Priya S.", "priya@example.com", "India", "neuro", 890, "2026-10-16", "active"],
    ["Jean-Paul M.", "jp@example.com", "DR Congo", "math", 120, "2026-10-31", "new"],
    ["Emma W.", "emma@example.com", "United Kingdom", "med", 0, "2026-11-01", "pending"],
  ].map(([name, email, country, track, xp, joined, status], i) => ({ id: "s" + (i + 1), name, email, country, track, xp, joined, status }));
  const submissions = [
    { id: "sub1", student: "Yuna P.", challenge: "Model a heartbeat", at: "2026-11-01T09:12:00Z", link: "#", status: "pending" },
    { id: "sub2", student: "Liam C.", challenge: "Model a heartbeat", at: "2026-10-31T20:40:00Z", link: "#", status: "pending" },
    { id: "sub3", student: "Aruzhan K.", challenge: "Model a heartbeat", at: "2026-10-31T16:05:00Z", link: "#", status: "pending" },
    { id: "sub4", student: "Daniel O.", challenge: "October: Neural networks by hand", at: "2026-10-28T11:30:00Z", link: "#", status: "approved" },
  ];
  const inquiries = [
    { id: "i1", org: "Example Science Foundation", type: "Sponsor", level: "STEM Partner · $1,000", contact: "grants@example.org", at: "2026-11-01T10:00:00Z", status: "new" },
    { id: "i2", org: "Example University Outreach", type: "Partner", level: "Guest lecture", contact: "outreach@example.edu", at: "2026-10-30T15:20:00Z", status: "replied" },
    { id: "i3", org: "Example Robotics Club", type: "Volunteer", level: "Workshop help", contact: "club@example.com", at: "2026-10-29T08:45:00Z", status: "new" },
  ];
  const registrationsByDay = [12, 18, 9, 22, 31, 27, 40, 35, 44, 38, 52, 61, 48, 70];

  /* ---------- API ---------- */
  window.MNM_API = {
    auth: {
      /* -> Clerk: clerk.signIn.create({ identifier, password }) */
      async signIn(email, password) {
        await wait(500);
        if (!email || !password) throw new Error("Enter your email and password.");
        if (password.length < 8) throw new Error("Wrong email or password.");
        const role = /admin|lead|staff/i.test(email) ? "admin" : "student";
        const user = { id: "u1", name: email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), email, role };
        store.set(user);
        return user;
      },
      /* -> Clerk: clerk.signUp.create({ emailAddress, password, firstName }) + email code */
      async signUp({ name, email, password, track }) {
        await wait(600);
        if (!name || !email) throw new Error("Fill in your name and email.");
        if (!password || password.length < 8) throw new Error("Password needs at least 8 characters.");
        const user = { id: "u1", name, email, role: "student", track };
        store.set(user);
        return user;
      },
      /* -> Clerk: clerk.authenticateWithRedirect({ strategy: "oauth_google" | "oauth_discord" }) */
      async oauth(provider) {
        await wait(500);
        const user = { id: "u1", name: "Demo Student", email: `demo@${provider}.com`, role: "student" };
        store.set(user);
        return user;
      },
      /* -> Clerk: clerk.client.signIn.create({ strategy: "reset_password_email_code", identifier }) */
      async resetPassword(email) { await wait(500); if (!email) throw new Error("Enter your email first."); return true; },
      /* -> Clerk: clerk.user (+ publicMetadata.role for admin) */
      me() { return store.get(); },
      /* -> Clerk: clerk.signOut() */
      async signOut() { store.clear(); },
    },

    student: {
      async overview() { await wait(); return { xp: 1240, level: 7, streak: 5, attended: 6, rank: 14, of: 312 }; },
      async tracks() { await wait(); return tracks; },
      async workshops() { await wait(); return workshops; },
      async register(id, on = true) { await wait(); const w = workshops.find((x) => x.id === id); if (w.taken >= w.seats && on) throw new Error("This workshop is full."); w.registered = on; w.taken += on ? 1 : -1; return w; },
      async challenge() { await wait(); return challenge; },
      async submit(id, link) { await wait(600); if (!/^https?:\/\//.test(link)) throw new Error("Paste a link that starts with https://"); challenge.submitted = true; return challenge; },
      async announcements() { await wait(); return announcements; },
    },

    admin: {
      async stats() { await wait(); return { students: 312, newThisWeek: 41, registrations: 186, pending: submissions.filter((s) => s.status === "pending").length, inquiries: inquiries.filter((i) => i.status === "new").length, byDay: registrationsByDay }; },
      async students() { await wait(); return students; },
      async workshops() { await wait(); return workshops; },
      async createWorkshop(w) { await wait(500); const n = { id: "w" + (workshops.length + 1), taken: 0, registered: false, host: "MNM", ...w }; workshops.push(n); return n; },
      async deleteWorkshop(id) { await wait(); const i = workshops.findIndex((w) => w.id === id); if (i >= 0) workshops.splice(i, 1); return true; },
      async submissions() { await wait(); return submissions; },
      async review(id, status) { await wait(); const s = submissions.find((x) => x.id === id); s.status = status; return s; },
      async inquiries() { await wait(); return inquiries; },
      async markInquiry(id, status) { await wait(); const q = inquiries.find((x) => x.id === id); q.status = status; return q; },
    },
  };
})();
