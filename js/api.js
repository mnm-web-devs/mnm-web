/* MNM API client and Clerk-backed authentication for the static frontend. */
(() => {
  const config = window.MNM_CONFIG || {};
  const API_BASE = String(config.apiBaseUrl || "").replace(/\/+$/, "");
  const ADMIN_KEY = "mnm-admin-session";
  const OAUTH_CALLBACK_HANDLED_KEY = "mnm-oauth-callback-handled";
  const OAUTH_SIGNUP_COMPLETED_KEY = "mnm-oauth-signup-completed";
  const tracks = { neuro: "neuroscience", med: "medicine", math: "mathematics" };
  let currentUser = null;
  let clerkPromise;
  let adminSubmissions = [];
  let adminInquiries = [];

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
        await window.Clerk.load();
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
    };
  }

  function getOAuthCallbackUrls() {
    const callbackUrl = new URL("oauth-callback.html", location.href).href;
    return {
      signInUrl: new URL("login.html", location.href).href,
      signUpUrl: callbackUrl,
      signInFallbackRedirectUrl: new URL("dashboard.html", location.href).href,
      signUpFallbackRedirectUrl: new URL("dashboard.html", location.href).href,
      transferable: true,
    };
  }

  async function handleOAuthRedirectOnce(clerk) {
    const hasRedirectStatus = new URLSearchParams(location.search).has("__clerk_status") ||
      new URLSearchParams(location.hash.slice(1)).has("__clerk_status");
    if (!hasRedirectStatus || sessionStorage.getItem(OAUTH_CALLBACK_HANDLED_KEY) === "true") return;
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
    auth: {
      async ready() {
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
        await handleOAuthRedirectOnce(clerk);
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
          const details = missingFields.length ? ` Clerk still requires: ${missingFields.join(", ")}.` : "";
          sessionStorage.removeItem(OAUTH_CALLBACK_HANDLED_KEY);
          throw new Error(`Clerk OAuth did not complete an active session (sign-in: ${signInStatus}, sign-up: ${signUpStatus}).${details} Finish the required fields in Clerk sign-up settings.`);
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
          redirectUrlComplete: new URL("dashboard.html", location.href).href,
        });
      },
      async startPasswordReset(email) {
        const clerk = await getClerk();
        await clerk.client.signIn.create({ identifier: email });
        await clerk.client.signIn.prepareFirstFactor({ strategy: "reset_password_email_code" });
      },
      async finishPasswordReset(code, password) {
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
      async completeLesson(id, completed = true) {
        return request(`/student/lessons/${encodeURIComponent(id)}/completion`, {
          method: completed ? "PUT" : "DELETE",
        });
      },
    },
    admin: {
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
