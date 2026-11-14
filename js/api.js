/* MNM API client and Clerk-backed authentication for the static frontend. */
(() => {
  const config = window.MNM_CONFIG || {};
  const API_BASE = String(config.apiBaseUrl || "").replace(/\/+$/, "");
  const ADMIN_KEY = "mnm-admin-session";
  const OAUTH_CALLBACK_HANDLED_KEY = "mnm-oauth-callback-handled";
  const OAUTH_SIGNUP_COMPLETED_KEY = "mnm-oauth-signup-completed";
  const tracks = { neuro: "neuroscience", med: "medicine", math: "mathematics" };
  const LOCAL_DEMO_ENABLED = location.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(location.hostname) &&
    new URLSearchParams(location.search).get("localDemo") === "1";
  const NEW_PASSWORD_PATTERN = /^(?=.*[A-Z])(?=(?:.*[a-z]){2})(?=.*\d)(?=.*[@$#&%*!]).*$/;
  let currentUser = null;
  let clerkPromise;
  let adminSubmissions = [];
  let adminInquiries = [];
  const localDemoUser = {
    id: "local-demo-student",
    name: "Alex Demo",
    email: "alex.demo@example.test",
    role: "student",
    track: "neuro",
    titles: ["Member"],
    avatarUrl: null,
    joinedAt: new Date().toISOString(),
  };
  const localDemoAdmin = {
    id: "local-demo-admin",
    name: "Riley Admin",
    email: "riley.admin@example.test",
    role: "admin",
    avatarUrl: null,
  };
  const localDemoProfile = {
    username: "alex_demo",
    avatarUrl: null,
    bio: "Exploring medicine, neuroscience, and mathematics.",
    school: "MNM Demo School",
    grade: "11th grade",
    location: "Local test environment",
    track: "neuro",
    interests: "",
    emailWorkshopUpdates: true,
  };
  const localDemoTracks = [
    { id: "neuro", name: "Neuroscience", color: "#b08cff", glyph: "◉", done: 3, total: 12, next: "How neurons communicate" },
    { id: "med", name: "Medicine", color: "#65ded5", glyph: "✚", done: 2, total: 10, next: "The immune response" },
    { id: "math", name: "Mathematics", color: "#83e6ba", glyph: "π", done: 4, total: 14, next: "Probability and chance" },
  ];
  const localDemoWorkshops = [
    {
      id: "demo-neuro-workshop",
      title: "Signals in the Brain",
      track: "neuro",
      date: new Date(Date.now() + 2 * 86400000).toISOString(),
      mins: 45,
      host: "MNM Demo Team",
      seats: 30,
      taken: 12,
      registered: true,
    },
    {
      id: "demo-math-workshop",
      title: "Math for Medical Research",
      track: "math",
      date: new Date(Date.now() + 5 * 86400000).toISOString(),
      mins: 60,
      host: "MNM Demo Team",
      seats: 24,
      taken: 8,
      registered: false,
    },
  ];
  const localDemoChallenge = {
    id: "demo-monthly-challenge",
    title: "Build a Neuron Model",
    description: "Create a simple model or visual explanation of how a neuron sends a signal.",
    points: 100,
    due: new Date(Date.now() + 21 * 86400000).toISOString(),
    submitted: false,
  };
  const localDemoApplications = [];
  const localDemoAdminApplications = [{
    applicationId: "MNM-STAFF-2026-LOCAL01",
    type: "staff",
    status: "submitted",
    applicant: { name: "Taylor Applicant", firstName: "", lastName: "", email: "taylor.applicant@example.test" },
    email: "taylor.applicant@example.test",
    submittedAt: new Date().toISOString(),
    responses: {
      fullName: "Taylor Applicant",
      email: "taylor.applicant@example.test",
      discordUsername: "taylor.demo#123",
      countryTimeZone: "Nepal, UTC+5:45",
      studyStage: "high_school",
      schoolName: "MNM Demo School",
      teams: ["web_tech", "programs_curriculum"],
      skillsExperience: "I have helped build a school science club website.",
      portfolioLink: "https://example.test/portfolio",
      hoursPerWeek: "3-5",
      motivation: "I want to help students find clear and engaging STEM resources.",
      idea: "Run a beginner-friendly neuroscience project week.",
      heardAbout: ["website"],
      consent: true,
    },
    publicMessage: "",
    legacyPrivateNotes: "",
    reviewers: [],
    notes: [],
    voteEvents: [],
  }];
  const localDemoReviewAdmins = [
    { id: localDemoAdmin.id, name: localDemoAdmin.name, verdict: null },
    { id: "local-demo-reviewer-2", name: "Morgan Demo", verdict: "approved" },
    { id: "local-demo-reviewer-3", name: "Casey Demo", verdict: "approved" },
    { id: "local-demo-reviewer-4", name: "Jordan Demo", verdict: "rejected" },
  ];

  function localDemoFailure(message, status = 400) {
    const error = new Error(message);
    error.status = status;
    return error;
  }

  function localDemoRequest(path, options = {}) {
    const route = path.split("?")[0];
    const method = options.method || "GET";
    const body = options.body || {};
    if (method === "GET" && route === "/admin/dashboard") {
      return {
        dashboard: {
          totals: {
            students: 2,
            newThisWeek: 1,
            workshopRegistrations30d: 3,
            pendingSubmissions: 0,
            pendingInquiries: 0,
          },
          registrationsByDay: [0, 1, 0, 0, 1, 0, 2, 0, 0, 1, 0, 0, 1, 0],
          studentsByTrack: { neuroscience: 1, medicine: 0, mathematics: 1, other: 0 },
          counts: {},
        },
      };
    }
    if (method === "GET" && route === "/admin/students") {
      const students = [
        { name: "Alex Demo", email: "alex.demo@example.test", country: "Local demo", track: "neuro", xp: 720, joined: new Date().toISOString(), status: "active" },
        { name: "Sam Example", email: "sam.example@example.test", country: "Local demo", track: "math", xp: 940, joined: new Date(Date.now() - 3 * 86400000).toISOString(), status: "new" },
      ];
      return { students, pagination: { page: 1, limit: 100, total: students.length } };
    }
    if (method === "GET" && route === "/admin/workshops") return { workshops: localDemoWorkshops };
    if (method === "GET" && route === "/admin/submissions") return { submissions: [] };
    if (method === "GET" && route === "/admin/inquiries") return { inquiries: [] };
    if (method === "GET" && route === "/admin/applications") {
      const params = new URLSearchParams(path.split("?")[1] || "");
      const type = params.get("type");
      const status = params.get("status") || "open";
      const search = (params.get("search") || "").toLowerCase();
      const filtered = localDemoAdminApplications.filter((application) =>
        (!type || application.type === type) &&
        (status === "all" || status === "open"
          ? status === "all" || ["submitted", "under_review"].includes(application.status)
          : application.status === status) &&
        (!search || `${application.applicationId} ${application.email}`.toLowerCase().includes(search)),
      );
      const page = Math.max(1, Number(params.get("page") || "1"));
      const limit = Math.max(1, Number(params.get("limit") || "25"));
      const start = (page - 1) * limit;
      return {
        applications: filtered.slice(start, start + limit).map((application) => ({
          applicationId: application.applicationId,
          type: application.type,
          status: application.status,
          applicant: application.applicant.name,
          email: application.email,
          submittedAt: application.submittedAt,
        })),
        pagination: { page, limit, total: filtered.length },
      };
    }
    const adminApplicationRoute = route.match(/^\/admin\/applications\/([^/]+)(?:\/(start-review|vote|review|decision))?$/);
    if (adminApplicationRoute) {
      const applicationId = decodeURIComponent(adminApplicationRoute[1]);
      const action = adminApplicationRoute[2];
      const application = localDemoAdminApplications.find((item) => item.applicationId === applicationId);
      if (!application) throw localDemoFailure("Application not found.", 404);
      if (method === "GET" && !action) return { application };
      if (method === "POST" && action === "start-review") {
        if (!["submitted", "under_review"].includes(application.status)) {
          throw localDemoFailure("A finalized application cannot be reopened for review.", 409);
        }
        if (!application.reviewers.length) {
          application.reviewers = localDemoReviewAdmins.map((reviewer) => ({
            adminId: reviewer.id,
            name: reviewer.name,
            verdict: reviewer.verdict,
            updatedAt: reviewer.verdict ? new Date().toISOString() : null,
          }));
          application.voteEvents.push({
            adminId: localDemoAdmin.id,
            adminName: localDemoAdmin.name,
            eventType: "review_started",
            previousVerdict: null,
            verdict: null,
            createdAt: new Date().toISOString(),
          });
        }
        application.status = "under_review";
        return { ok: true, review: { applicationId, status: application.status } };
      }
      if (method === "POST" && action === "vote") {
        if (application.status !== "under_review") throw localDemoFailure("Votes are locked because the application is not under review.", 409);
        if (!["approved", "rejected"].includes(body.verdict)) throw localDemoFailure("Vote must be Accepted or Rejected.", 400);
        const reviewer = application.reviewers.find((item) => item.adminId === localDemoAdmin.id);
        if (!reviewer) throw localDemoFailure("This admin is not part of the review roster.", 403);
        const previousVerdict = reviewer.verdict;
        reviewer.verdict = body.verdict;
        reviewer.updatedAt = new Date().toISOString();
        if (previousVerdict !== body.verdict) {
          application.voteEvents.push({
            adminId: reviewer.adminId,
            adminName: reviewer.name,
            eventType: "vote_changed",
            previousVerdict,
            verdict: body.verdict,
            createdAt: reviewer.updatedAt,
          });
        }
        const approvedCount = application.reviewers.filter((item) => item.verdict === "approved").length;
        const rejectedCount = application.reviewers.filter((item) => item.verdict === "rejected").length;
        return {
          ok: true,
          vote: {
            applicationId,
            adminId: reviewer.adminId,
            verdict: reviewer.verdict,
            totalVoters: application.reviewers.length,
            votedCount: approvedCount + rejectedCount,
            approvedCount,
            rejectedCount,
          },
        };
      }
      if (method === "POST" && action === "review") {
        if (application.status !== "under_review") throw localDemoFailure("Private notes are locked because the application is finalized.", 409);
        const noteText = String(body.notes || "").trim();
        if (!noteText || noteText.length > 5000) throw localDemoFailure("Private notes must contain 1 to 5000 characters.", 400);
        application.notes.push({
          id: `local-note-${application.notes.length + 1}`,
          adminId: localDemoAdmin.id,
          adminName: localDemoAdmin.name,
          note: noteText,
          createdAt: new Date().toISOString(),
        });
        return { ok: true, applicationId, noteId: application.notes.at(-1).id };
      }
      if (method === "POST" && action === "decision") {
        if (application.status !== "under_review") throw localDemoFailure("This application has already been finalized.", 409);
        const approvedCount = application.reviewers.filter((item) => item.verdict === "approved").length;
        const rejectedCount = application.reviewers.filter((item) => item.verdict === "rejected").length;
        const votedCount = approvedCount + rejectedCount;
        if (!application.reviewers.length || votedCount !== application.reviewers.length) {
          throw localDemoFailure("Every admin in the review roster must vote before finalization.", 409);
        }
        if (approvedCount === rejectedCount) throw localDemoFailure("The vote is tied; admins must resolve the tie before finalization.", 409);
        const decision = approvedCount > rejectedCount ? "approved" : "rejected";
        if (body.decision !== decision) throw localDemoFailure("The majority changed. Refresh the application and retry.", 409);
        const publicMessage = String(body.publicMessage || "").trim();
        if (!publicMessage || publicMessage.length > 2000) throw localDemoFailure("The final message must contain 1 to 2000 characters.", 400);
        application.status = decision;
        application.publicMessage = publicMessage;
        return { ok: true, applicationId, decision, publicMessage: application.publicMessage, reviewer: localDemoAdmin.email, reviewedAt: new Date().toISOString() };
      }
    }
    if (method === "GET" && route === "/student/overview") {
      return { overview: { xp: 720, level: 4, streak: 6, attended: 3, rank: 2, of: 12 } };
    }
    if (method === "GET" && route === "/student/tracks") return { tracks: localDemoTracks };
    if (method === "GET" && route === "/student/workshops") return { workshops: localDemoWorkshops };
    if (method === "GET" && route === "/student/challenges") return { challenge: localDemoChallenge };
    if (method === "GET" && route === "/student/announcements") {
      return {
        announcements: [{
          title: "Welcome to the local dashboard demo",
          body: "This sample environment does not connect to Clerk, MNM's API, or Supabase.",
          at: new Date().toISOString(),
        }],
      };
    }
    if (method === "GET" && route === "/student/leaderboard") {
      return {
        leaderboard: [
          { rank: 1, name: "Sam Example", xp: 940, isCurrentUser: false },
          { rank: 3, name: "Jordan Example", xp: 610, isCurrentUser: false },
        ],
      };
    }
    if (route === "/student/profile" && method === "PATCH") {
      for (const key of ["username", "bio", "school", "grade", "location", "interests"]) {
        if (body[key] !== undefined) localDemoProfile[key] = body[key];
      }
      if (body.track !== undefined) {
        localDemoProfile.track = Object.keys(tracks).find((key) => tracks[key] === body.track) || body.track;
      }
      if (body.emailWorkshopUpdates !== undefined) localDemoProfile.emailWorkshopUpdates = body.emailWorkshopUpdates;
      return {
        profile: {
          username: localDemoProfile.username,
          primary_track: tracks[localDemoProfile.track] || localDemoProfile.track,
          email_workshop_updates: localDemoProfile.emailWorkshopUpdates,
        },
      };
    }
    if (method === "GET" && route === "/applications/mine") {
      return { applications: [...localDemoApplications] };
    }
    if (method === "POST" && route === "/applications/staff") {
      const activeApplication = localDemoApplications.find(
        (application) => application.type === "staff" && application.status !== "rejected",
      );
      if (activeApplication) {
        throw localDemoFailure("You can apply for this role again after your current application is rejected.", 409);
      }
      const randomPart = Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join("").toUpperCase();
      const applicationId = `MNM-STAFF-${new Date().getUTCFullYear()}-${randomPart}`;
      const submittedAt = new Date().toISOString();
      localDemoApplications.unshift({
        applicationId,
        type: "staff",
        status: "submitted",
        publicMessage: "",
        submittedAt,
      });
      return { ok: true, applicationId, status: "submitted", submittedAt };
    }
    const registration = route.match(/^\/student\/workshops\/([^/]+)\/registration$/);
    if (registration && method === "PUT") {
      const workshop = localDemoWorkshops.find((item) => item.id === decodeURIComponent(registration[1]));
      if (!workshop) throw localDemoFailure("Workshop not found.", 404);
      const registered = Boolean(body.registered);
      if (registered !== workshop.registered) workshop.taken += registered ? 1 : -1;
      workshop.registered = registered;
      return { registered };
    }
    const challengeSubmission = route.match(/^\/student\/challenges\/([^/]+)\/submissions$/);
    if (challengeSubmission && method === "POST") {
      localDemoChallenge.submitted = true;
      return { submission: { id: "demo-submission", link: body.link, status: "submitted" } };
    }
    if (/^\/student\/lessons\/[^/]+\/completion$/.test(route) && ["PUT", "DELETE"].includes(method)) {
      return { ok: true };
    }
    throw localDemoFailure(`Local demo does not implement ${method} ${route}.`, 404);
  }

  function getAdminSession() {
    try { return JSON.parse(sessionStorage.getItem(ADMIN_KEY)); } catch { return null; }
  }

  function setAdminSession(session) {
    try { sessionStorage.setItem(ADMIN_KEY, JSON.stringify(session)); }
    catch { throw new Error("Could not save the admin session in this browser."); }
  }

  function clearAdminSession() {
    sessionStorage.removeItem(ADMIN_KEY);
    currentUser = null;
  }

  function decodeClerkHost(publishableKey) {
    const encodedHost = publishableKey.split("_")[2];
    if (!encodedHost) throw new Error("Clerk publishable key is invalid.");
    const normalized = encodedHost.replace(/-/g, "+").replace(/_/g, "/").replace(/\$$/, "");
    try {
      return atob(normalized).replace(/\$$/, "");
    } catch {
      throw new Error("Could not determine Clerk's frontend API domain from the publishable key.");
    }
  }

  function loadClerkScript(url, publishableKey) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.dataset.clerkPublishableKey = publishableKey;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Could not load Clerk. Check the Clerk publishable key and frontend domain."));
      document.head.append(script);
    });
  }

  async function getClerk() {
    if (!clerkPromise) {
      clerkPromise = (async () => {
        const publishableKey = String(config.clerkPublishableKey || "").trim();
        if (!publishableKey) {
          throw new Error("Clerk is not configured. Set MNM_CONFIG.clerkPublishableKey in js/config.js.");
        }
        if (!API_BASE) throw new Error("The MNM API base URL is not configured.");

        const frontendApi = decodeClerkHost(publishableKey).replace(/^https?:\/\//, "").replace(/\/+$/, "");
        const scriptUrl = `https://${frontendApi}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`;
        await loadClerkScript(scriptUrl, publishableKey);
        if (!window.Clerk) throw new Error("Clerk loaded without exposing its browser SDK.");
        const callbackUrls = getOAuthCallbackUrls();
        await window.Clerk.load({
          signInUrl: callbackUrls.signInUrl,
          signUpUrl: callbackUrls.signUpUrl,
          signInFallbackRedirectUrl: callbackUrls.signInFallbackRedirectUrl,
          signUpFallbackRedirectUrl: callbackUrls.signUpFallbackRedirectUrl,
        });
        return window.Clerk;
      })();
    }
    return clerkPromise;
  }

  function userFromClerk(clerk) {
    const user = clerk.user;
    if (!user) return null;
    const email = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || "";
    if (!email.trim()) return null;
    return {
      id: user.id,
      name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || email.split("@")[0] || "Student",
      email,
      role: "student",
      track: user.publicMetadata?.primary_track || user.unsafeMetadata?.primary_track || null,
      // MNM titles shown on the profile ("Director", "Design Lead", ...). Set by an admin in Clerk:
      // Users → user → Metadata → Public: { "mnm_titles": ["Director", "Tech Lead", "Staff"] }
      titles: normalizeTitles(user.publicMetadata?.mnm_titles ?? user.publicMetadata?.titles),
      avatarUrl: user.hasImage ? user.imageUrl : null,
      joinedAt: user.createdAt || null,
    };
  }

  function normalizeTitles(value) {
    const list = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[,/]/) : [];
    return [...new Set(list.map((t) => String(t).trim()).filter(Boolean))].slice(0, 8);
  }

  function getOAuthCallbackUrls() {
    const callbackUrl = new URL("oauth-callback.html", location.href).href;
    return {
      signInUrl: new URL("login.html", location.href).href,
      signUpUrl: callbackUrl,
      signInFallbackRedirectUrl: callbackUrl,
      signUpFallbackRedirectUrl: callbackUrl,
      transferable: true,
    };
  }

  async function handleOAuthRedirectOnce(clerk, force = false) {
    const hasRedirectStatus = new URLSearchParams(location.search).has("__clerk_status") ||
      new URLSearchParams(location.hash.slice(1)).has("__clerk_status");
    if ((!force && !hasRedirectStatus) || sessionStorage.getItem(OAUTH_CALLBACK_HANDLED_KEY) === "true") return;
    if (typeof clerk.handleRedirectCallback !== "function") {
      throw new Error("Clerk could not finish the sign-in redirect. Please try signing in again.");
    }

    sessionStorage.setItem(OAUTH_CALLBACK_HANDLED_KEY, "true");
    try {
      await clerk.handleRedirectCallback(getOAuthCallbackUrls());
    } catch (error) {
      sessionStorage.removeItem(OAUTH_CALLBACK_HANDLED_KEY);
      throw error;
    }
  }

  async function getToken() {
    const adminSession = getAdminSession();
    if (adminSession?.token) return adminSession.token;
    const clerk = await getClerk();
    return clerk.session?.getToken() ?? null;
  }

  async function request(path, options = {}) {
    if (LOCAL_DEMO_ENABLED) return localDemoRequest(path, options);
    if (!API_BASE) throw new Error("The MNM API base URL is not configured.");
    const { method = "GET", body, auth = true } = options;
    const headers = new Headers(options.headers || {});
    if (body !== undefined && !(body instanceof FormData)) headers.set("Content-Type", "application/json");
    if (auth) {
      const token = await getToken();
      if (!token) throw new Error("Your session has expired. Please sign in again.");
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
      credentials: "omit",
    });
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error(`The API returned an invalid response (HTTP ${response.status}).`);
    }
    if (!response.ok) {
      const error = new Error(payload?.error?.message || `Request failed (HTTP ${response.status}).`);
      error.code = payload?.error?.code;
      error.status = response.status;
      if (auth && response.status === 401 && getAdminSession()) {
        clearAdminSession();
        currentUser = null;
        location.replace("login.html");
      }
      throw error;
    }
    return payload;
  }

  async function getStudentProfile() {
    const { profile } = await request("/student/profile");
    return {
      name: currentUser?.name || "",
      email: profile.email,
      username: profile.username,
      avatarUrl: profile.avatar_url,
      bio: profile.bio,
      school: profile.school,
      grade: profile.grade,
      location: profile.location,
      track: tracks[profile.primary_track] || profile.primary_track || "",
      interests: profile.interests,
      emailWorkshopUpdates: profile.email_workshop_updates,
    };
  }

  async function saveStudentProfile(updates) {
    const payload = {};
    if (updates.username !== undefined) payload.username = updates.username;
    if (updates.track) payload.track = tracks[updates.track] || updates.track;
    if (updates.emailWorkshopUpdates !== undefined) payload.emailWorkshopUpdates = updates.emailWorkshopUpdates;
    for (const key of ["bio", "school", "grade", "location", "interests"]) {
      if (updates[key] !== undefined) payload[key] = updates[key];
    }
    const { profile } = await request("/student/profile", { method: "PATCH", body: payload });
    return {
      username: profile.username,
      track: tracks[profile.primary_track] || profile.primary_track || "",
      emailWorkshopUpdates: profile.email_workshop_updates,
    };
  }

  async function loadAllStudents() {
    const students = [];
    let page = 1;
    let total = Infinity;
    while (students.length < total) {
      const result = await request(`/admin/students?page=${page}&limit=100`);
      students.push(...result.students);
      total = result.pagination.total;
      page += 1;
    }
    return students;
  }

  window.MNM_API = {
    isLocalDemo: LOCAL_DEMO_ENABLED,
    auth: {
      async ready() {
        if (LOCAL_DEMO_ENABLED) {
          currentUser = document.body?.dataset.role === "admin"
            ? { ...localDemoAdmin }
            : { ...localDemoUser };
          return currentUser;
        }
        const admin = getAdminSession();
        if (admin?.token && admin?.user) {
          try {
            const result = await request("/admin/me");
            currentUser = {
              id: String(result.admin.sub),
              name: result.admin.name,
              email: result.admin.email,
              role: "admin",
              avatarUrl: result.admin.avatarUrl,
            };
            setAdminSession({ token: admin.token, user: currentUser });
            return currentUser;
          } catch (error) {
            if (error.status !== 401) throw error;
            clearAdminSession();
          }
        }

        const clerk = await getClerk();
        await handleOAuthRedirectOnce(clerk);
        currentUser = userFromClerk(clerk);
        return currentUser;
      },
      async completeOAuthRedirect() {
        const clerk = await getClerk();
        if (sessionStorage.getItem(OAUTH_SIGNUP_COMPLETED_KEY) === "true") {
          currentUser = userFromClerk(clerk);
          if (currentUser) return currentUser;
          sessionStorage.removeItem(OAUTH_SIGNUP_COMPLETED_KEY);
        }
        await handleOAuthRedirectOnce(clerk, true);
        const signUp = clerk.client?.signUp;
        const signIn = clerk.client?.signIn;
        const completedSignUp = signUp?.status === "complete" &&
          signUp.createdSessionId &&
          signIn?.status !== "complete";
        const pendingSignUp = signUp?.status === "missing_requirements" || completedSignUp;
        if (pendingSignUp) {
          return { pendingSignUp: true };
        }
        sessionStorage.removeItem(OAUTH_SIGNUP_COMPLETED_KEY);
        if (!clerk.session) {
          if (signIn?.status === "complete" && signIn.createdSessionId) {
            await clerk.setActive({ session: signIn.createdSessionId });
          }
        }
        currentUser = userFromClerk(clerk);
        if (!currentUser) {
          const signInStatus = clerk.client?.signIn?.status || "none";
          const signUpStatus = clerk.client?.signUp?.status || "none";
          const missingFields = clerk.client?.signUp?.missingFields || [];
          const details = missingFields.length
            ? ` Clerk still requires: ${missingFields.join(", ")}.`
            : signInStatus === "needs_identifier" && signUpStatus === "none"
              ? " Clerk did not complete the OAuth redirect. Check the browser console for blocked Clerk scripts and verify the configured OAuth callback URLs."
              : " Check the Clerk OAuth connection and callback configuration, then try again.";
          sessionStorage.removeItem(OAUTH_CALLBACK_HANDLED_KEY);
          throw new Error(`Clerk OAuth did not complete an active session (sign-in: ${signInStatus}, sign-up: ${signUpStatus}).${details}`);
        }
        return currentUser;
      },
      async completeOAuthSignUp(username, track) {
        const cleanUsername = String(username || "").trim();
        const canonicalTrack = tracks[track] || track;
        if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{2,29}$/.test(cleanUsername)) {
          throw new Error("Choose a username with 3–30 letters, numbers, dots, underscores or hyphens; it must start with a letter or number.");
        }
        if (!["neuroscience", "medicine", "mathematics"].includes(canonicalTrack)) {
          throw new Error("Choose a main interest to continue.");
        }
        const clerk = await getClerk();
        const signUp = clerk.client?.signUp;
        if (signUp?.status !== "missing_requirements" &&
            !(signUp?.status === "complete" && signUp.createdSessionId)) {
          sessionStorage.removeItem(OAUTH_SIGNUP_COMPLETED_KEY);
          sessionStorage.removeItem(OAUTH_CALLBACK_HANDLED_KEY);
          throw new Error("Clerk has no active sign-up to finish. Return to sign in and start a new Google or Discord attempt.");
        }
        const email = signUp.emailAddress ||
          signUp.emailAddresses?.[0]?.emailAddress ||
          clerk.client?.signIn?.userData?.emailAddress ||
          clerk.user?.primaryEmailAddress?.emailAddress ||
          clerk.user?.emailAddresses?.[0]?.emailAddress;
        if (!email?.trim()) {
          throw new Error("Clerk did not provide an email address for this account. Check the Google/Discord connection and try again.");
        }
        if (signUp.status === "missing_requirements") {
          const result = await signUp.update({ username: cleanUsername });
          if (result.status !== "complete" || !result.createdSessionId) {
            const missingFields = result.missingFields || [];
            throw new Error(missingFields.length
              ? `Clerk still requires: ${missingFields.join(", ")}.`
              : "Clerk could not complete this account. Please try again.");
          }
          if (clerk.session?.id !== result.createdSessionId) {
            await clerk.setActive({ session: result.createdSessionId });
          }
        } else if (signUp.status === "complete" && signUp.createdSessionId) {
          if (!clerk.session) await clerk.setActive({ session: signUp.createdSessionId });
          if (clerk.session?.id !== signUp.createdSessionId) {
            throw new Error("This session is not the pending account creation. Restart sign-in.");
          }
          if (clerk.user?.username !== cleanUsername) {
            await clerk.user.update({ username: cleanUsername });
          }
        } else {
          throw new Error("The pending Clerk sign-up is no longer available. Restart sign-in.");
        }
        currentUser = userFromClerk(clerk);
        if (!currentUser) throw new Error("Clerk created the account but did not activate its session.");
        await saveStudentProfileWhenAvailable({ username: cleanUsername, track: canonicalTrack });
        currentUser.username = cleanUsername;
        currentUser.track = canonicalTrack;
        sessionStorage.setItem(OAUTH_SIGNUP_COMPLETED_KEY, "true");
        return currentUser;
      },
      me() {
        return currentUser;
      },
      async signIn(email, password) {
        const clerk = await getClerk();
        try {
          const attempt = await clerk.client.signIn.create({ identifier: email, password });
          if (attempt.status !== "complete" || !attempt.createdSessionId) {
            throw new Error("Additional sign-in verification is required. Use the sign-in options configured in Clerk.");
          }
          await clerk.setActive({ session: attempt.createdSessionId });
          currentUser = userFromClerk(clerk);
          if (!currentUser) throw new Error("Clerk signed in but did not return a user profile.");
          return currentUser;
        } catch (studentError) {
          if (!studentError?.errors?.length) throw studentError;
          const result = await request("/admin/auth/login", {
            method: "POST",
            auth: false,
            body: { email, password },
          });
          const user = {
            id: String(result.admin.id),
            name: result.admin.name,
            email: result.admin.email,
            role: "admin",
            avatarUrl: result.admin.avatarUrl,
          };
          setAdminSession({ token: result.token, user });
          currentUser = user;
          return user;
        }
      },
      async signUp({ name, email, username, password, track }) {
        const cleanName = String(name || "").trim();
        const cleanEmail = String(email || "").trim();
        const cleanUsername = String(username || "").trim();
        const canonicalTrack = tracks[track] || track;
        if (!cleanName || !cleanEmail || !password) {
          throw new Error("Enter your name, email, and password to create an account.");
        }
        if (password.length < 8 || password.length > 30 || !NEW_PASSWORD_PATTERN.test(password)) {
          throw new Error("Password must be 8–30 characters and include an uppercase letter, at least two lowercase letters, a number, and one of these: @ $ # & % * !");
        }
        if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{2,29}$/.test(cleanUsername)) {
          throw new Error("Choose a username with 3–30 letters, numbers, dots, underscores or hyphens; it must start with a letter or number.");
        }
        if (!["neuroscience", "medicine", "mathematics"].includes(canonicalTrack)) {
          throw new Error("Choose a main interest to create an account.");
        }
        const clerk = await getClerk();
        const [firstName, ...rest] = cleanName.split(/\s+/);
        const attempt = await clerk.client.signUp.create({
          emailAddress: cleanEmail,
          password,
          firstName,
          lastName: rest.join(" "),
          username: cleanUsername,
        });
        if (attempt.status === "complete" && attempt.createdSessionId) {
          await clerk.setActive({ session: attempt.createdSessionId });
          currentUser = userFromClerk(clerk);
          try {
            await savePreferredTrack(canonicalTrack);
          } catch (error) {
            console.error("Student account was created, but the selected interest did not save:", error);
          }
          return currentUser;
        }
        await clerk.client.signUp.prepareEmailAddressVerification({ strategy: "email_code" });
        sessionStorage.setItem("mnm-signup-track", canonicalTrack);
        return { pendingVerification: true };
      },
      async verifySignUpCode(code) {
        const clerk = await getClerk();
        const attempt = await clerk.client.signUp.attemptEmailAddressVerification({ code });
        if (attempt.status !== "complete" || !attempt.createdSessionId) {
          throw new Error("Email verification is not complete. Check the code and try again.");
        }
        await clerk.setActive({ session: attempt.createdSessionId });
        const track = sessionStorage.getItem("mnm-signup-track");
        currentUser = userFromClerk(clerk);
        if (track) {
          try {
            await savePreferredTrack(track);
            sessionStorage.removeItem("mnm-signup-track");
          } catch (error) {
            console.error("Student account was verified, but the selected interest did not save:", error);
          }
        }
        return currentUser;
      },
      async resendSignUpCode() {
        const clerk = await getClerk();
        return clerk.client.signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      },
      async updateName(name) {
        if (LOCAL_DEMO_ENABLED) {
          currentUser = { ...currentUser, name: String(name || "").trim() || localDemoUser.name };
          localDemoUser.name = currentUser.name;
          return currentUser;
        }
        const clerk = await getClerk();
        const [firstName, ...rest] = name.trim().split(/\s+/);
        await clerk.user.update({ firstName, lastName: rest.join(" ") });
        currentUser = userFromClerk(clerk);
        return currentUser;
      },
      async oauth(provider) {
        const clerk = await getClerk();
        const strategy = provider === "google" ? "oauth_google" : provider === "discord" ? "oauth_discord" : null;
        if (!strategy) throw new Error("Unsupported sign-in provider.");
        sessionStorage.removeItem(OAUTH_CALLBACK_HANDLED_KEY);
        sessionStorage.removeItem(OAUTH_SIGNUP_COMPLETED_KEY);
        const callback = new URL("oauth-callback.html", location.href).href;
        await clerk.client.signIn.authenticateWithRedirect({
          strategy,
          redirectUrl: callback,
          redirectUrlComplete: callback,
        });
      },
      async startPasswordReset(email) {
        const clerk = await getClerk();
        await clerk.client.signIn.create({ identifier: email });
        await clerk.client.signIn.prepareFirstFactor({ strategy: "reset_password_email_code" });
      },
      async finishPasswordReset(code, password) {
        if (password.length < 8 || password.length > 30 || !NEW_PASSWORD_PATTERN.test(password)) {
          throw new Error("Password must be 8–30 characters and include an uppercase letter, at least two lowercase letters, a number, and one of these: @ $ # & % * !");
        }
        const clerk = await getClerk();
        const attempt = await clerk.client.signIn.attemptFirstFactor({
          strategy: "reset_password_email_code",
          code,
        });
        if (attempt.status !== "needs_new_password") {
          throw new Error("The reset code could not be verified. Request a new code and try again.");
        }
        const result = await clerk.client.signIn.resetPassword({ password });
        if (result.status === "complete" && result.createdSessionId) {
          await clerk.setActive({ session: result.createdSessionId });
          currentUser = userFromClerk(clerk);
          return currentUser;
        }
        throw new Error("The password reset is incomplete. Request a new code and try again.");
      },
      async signOut() {
        if (LOCAL_DEMO_ENABLED) {
          currentUser = null;
          return;
        }
        if (getAdminSession()) {
          clearAdminSession();
          return;
        }
        const clerk = await getClerk();
        await clerk.signOut();
        currentUser = null;
      },
    },
    student: {
      async overview() {
        return (await request("/student/overview")).overview;
      },
      async tracks() {
        return (await request("/student/tracks")).tracks;
      },
      async workshops() {
        return (await request("/student/workshops")).workshops;
      },
      async register(id, registered = true) {
        return request(`/student/workshops/${encodeURIComponent(id)}/registration`, {
          method: "PUT",
          body: { registered },
        });
      },
      async challenge() {
        return (await request("/student/challenges")).challenge;
      },
      async submit(id, link) {
        return (await request(`/student/challenges/${encodeURIComponent(id)}/submissions`, {
          method: "POST",
          body: { link },
        })).submission;
      },
      async announcements() {
        return (await request("/student/announcements")).announcements;
      },
      async leaderboard() {
        return (await request("/student/leaderboard")).leaderboard;
      },
      async profile() {
        if (LOCAL_DEMO_ENABLED) return { ...localDemoProfile };
        let lastError;
        for (let attempt = 0; attempt < 8; attempt += 1) {
          try {
            return await getStudentProfile();
          } catch (error) {
            lastError = error;
            if (error.status !== 404) throw error;
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
        throw lastError;
      },
      async updateProfile(updates) {
        return saveStudentProfile(updates);
      },
      async uploadAvatar(file) {
        if (LOCAL_DEMO_ENABLED) {
          localDemoProfile.avatarUrl = URL.createObjectURL(file);
          return { avatarUrl: localDemoProfile.avatarUrl, path: "local-demo/avatar" };
        }
        const formData = new FormData();
        formData.append("avatar", file);
        return request("/student/avatar", { method: "POST", body: formData });
      },
      async applications() {
        return (await request("/applications/mine")).applications;
      },
      async submitApplication(type, application) {
        return request(`/applications/${encodeURIComponent(type)}`, {
          method: "POST",
          body: application,
        });
      },
      async completeLesson(id, completed = true) {
        return request(`/student/lessons/${encodeURIComponent(id)}/completion`, {
          method: completed ? "PUT" : "DELETE",
        });
      },
    },
    admin: {
      async applications({ page = 1, limit = 25, status = "open", type = "", search = "" } = {}) {
        const params = new URLSearchParams({ page: String(page), limit: String(limit), status });
        if (type) params.set("type", type);
        if (search) params.set("search", search);
        return request(`/admin/applications?${params}`);
      },
      async application(applicationId) {
        return (await request(`/admin/applications/${encodeURIComponent(applicationId)}`)).application;
      },
      async startApplicationReview(applicationId) {
        return request(`/admin/applications/${encodeURIComponent(applicationId)}/start-review`, { method: "POST" });
      },
      async voteApplication(applicationId, verdict) {
        return request(`/admin/applications/${encodeURIComponent(applicationId)}/vote`, {
          method: "POST",
          body: { verdict },
        });
      },
      async addApplicationNote(applicationId, notes) {
        return request(`/admin/applications/${encodeURIComponent(applicationId)}/review`, {
          method: "POST",
          body: { notes },
        });
      },
      async finalizeApplication(applicationId, decision, publicMessage) {
        return request(`/admin/applications/${encodeURIComponent(applicationId)}/decision`, {
          method: "POST",
          body: { decision, publicMessage },
        });
      },
      async stats() {
        const { dashboard } = await request("/admin/dashboard");
        return {
          students: dashboard.totals.students,
          newThisWeek: dashboard.totals.newThisWeek,
          registrations: dashboard.totals.workshopRegistrations30d,
          pending: dashboard.totals.pendingSubmissions,
          inquiries: dashboard.totals.pendingInquiries,
          byDay: dashboard.registrationsByDay,
          studentsByTrack: dashboard.studentsByTrack,
        };
      },
      async students() {
        return loadAllStudents();
      },
      async workshops() {
        return (await request("/admin/workshops")).workshops;
      },
      async createWorkshop(workshop) {
        return (await request("/admin/workshops", { method: "POST", body: workshop })).workshop;
      },
      async deleteWorkshop(id) {
        return request(`/admin/workshops/${encodeURIComponent(id)}`, { method: "DELETE" });
      },
      async submissions() {
        adminSubmissions = (await request("/admin/submissions")).submissions;
        return adminSubmissions;
      },
      async review(id, status) {
        const { submission } = await request(`/admin/submissions/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: { status },
        });
        const existing = adminSubmissions.find((item) => item.id === id);
        if (existing) Object.assign(existing, submission);
        return existing ? { ...existing } : submission;
      },
      async inquiries() {
        adminInquiries = (await request("/admin/inquiries")).inquiries;
        return adminInquiries;
      },
      async markInquiry(id, status) {
        const { inquiry } = await request(`/admin/inquiries/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: { status },
        });
        const existing = adminInquiries.find((item) => item.id === id);
        if (existing) Object.assign(existing, inquiry);
        return existing ? { ...existing } : inquiry;
      },
    },
  };

  async function savePreferredTrack(track) {
    if (!track) return;
    const canonicalTrack = tracks[track] || track;
    let lastError;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        await saveStudentProfile({ track: canonicalTrack });
        return;
      } catch (error) {
        lastError = error;
        if (error.status !== 404 && error.status !== 409) throw error;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    throw new Error(`Your account was created, but the selected interest could not be saved yet. Please save it from your profile. ${lastError?.message || ""}`.trim());
  }

  async function saveStudentProfileWhenAvailable(updates) {
    let lastError;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        return await saveStudentProfile(updates);
      } catch (error) {
        lastError = error;
        if (error.status !== 404) throw error;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    throw lastError;
  }
})();
