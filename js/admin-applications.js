/* MNM — administrator application queue and review workflow. */
(async () => {
  await window.MNM_UI_READY;
  if (!window.MNM_UI || MNM_UI.user.role !== "admin") return;

  const { $, $$, fmtDate, fmtTime, openModal, closeModal, toast, user } = MNM_UI;
  const API = MNM_API.admin;
  const modal = $("#application-modal");
  const list = $("#admin-applications-list");
  const statusMessage = $("#admin-applications-status");
  const typeFilter = $("#app-type-filter");
  const statusFilter = $("#app-status-filter");
  const searchInput = $("#app-search");
  const voteControls = $("#admin-application-vote-controls");
  const noteForm = $("#admin-application-note-form");
  const finalizeForm = $("#admin-application-finalize-form");
  const reviewMessage = $("#admin-application-review-message");
  const syncStatus = $("#admin-application-sync-status");
  const statusNames = {
    submitted: "Submitted",
    under_review: "Under Review",
    approved: "Accepted",
    rejected: "Rejected",
  };
  const liveUpdateMessage = "Review activity refreshes automatically every 5 seconds.";
  const labels = {
    fullName: "Full name",
    firstName: "First name",
    lastName: "Last name",
    email: "Email",
    phone: "Phone",
    discordUsername: "Discord username",
    countryTimeZone: "Country and time zone",
    studyStage: "Current study stage",
    studyStageOther: "Other study stage",
    schoolName: "School or university",
    school: "School",
    grade: "Grade / year",
    location: "Location",
    teams: "Teams requested",
    otherTeam: "Other team",
    skillsExperience: "Skills and experience",
    portfolioLink: "Work link",
    hoursPerWeek: "Hours per week",
    motivation: "Motivation",
    idea: "Idea for MNM",
    heardAbout: "How they heard about MNM",
    otherSource: "Other source",
    consent: "Contact consent",
    track: "Track",
    stemInterests: "STEM interests",
    experience: "Experience",
    availability: "Availability",
    links: "Links",
    leadershipExperience: "Leadership experience",
    projectIdeas: "Project ideas",
    preferredRoles: "Preferred roles",
    teamFit: "Team fit",
    portfolio: "Portfolio",
  };
  const valueLabels = {
    studyStage: {
      middle_school: "Middle school",
      high_school: "High school",
      university: "University",
      gap_year: "Gap year",
      other: "Other",
    },
    teams: {
      programs_curriculum: "Programs & Curriculum",
      web_tech: "Web & Tech",
      media_content: "Media & Content",
      design_brand: "Design & Brand",
      partnerships: "Partnerships",
      volunteering: "Volunteering",
      other: "Other",
    },
    hoursPerWeek: {
      "1-2": "1–2 hours",
      "3-5": "3–5 hours",
      "6-10": "6–10 hours",
      more_than_10: "More than 10 hours",
    },
    heardAbout: {
      discord: "Discord",
      instagram: "Instagram",
      friend: "A friend",
      school_teacher: "My school or teacher",
      website: "Website",
      other: "Other",
    },
    track: {
      neuroscience: "Neuroscience",
      medicine: "Medicine",
      mathematics: "Mathematics",
      all: "All STEM interests",
    },
  };
  const groups = [
    {
      title: "About you",
      keys: ["fullName", "firstName", "lastName", "email", "phone", "discordUsername", "countryTimeZone", "studyStage", "studyStageOther", "schoolName", "school", "grade", "location"],
    },
    {
      title: "Your role in MNM",
      keys: ["teams", "otherTeam", "skillsExperience", "portfolioLink", "leadershipExperience", "projectIdeas", "preferredRoles", "teamFit", "portfolio", "track", "stemInterests", "experience", "availability", "hoursPerWeek", "links"],
    },
    {
      title: "Motivation",
      keys: ["motivation", "idea", "heardAbout", "otherSource", "consent"],
    },
  ];
  const pageSize = 25;
  let page = 1;
  let pageCount = 1;
  let searchTimer;
  let detailPollTimer = null;
  let detailPollInProgress = false;
  let selectedApplication = null;
  let detail = null;

  const dateLabel = (iso) => {
    if (!iso) return "—";
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? "—" : `${fmtDate(date, { day: "numeric", month: "short", year: "numeric" })} · ${fmtTime(date)}`;
  };
  const makeText = (tagName, text, className) => {
    const element = document.createElement(tagName);
    element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  const formatValue = (key, value) => {
    if (Array.isArray(value)) return value.map((item) => valueLabels[key]?.[item] || String(item)).join(", ");
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (valueLabels[key]?.[value]) return valueLabels[key][value];
    return String(value);
  };
  const isHttpUrl = (value) => {
    try {
      return ["http:", "https:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  };

  function stopDetailPolling() {
    if (detailPollTimer) clearInterval(detailPollTimer);
    detailPollTimer = null;
  }

  function startDetailPolling() {
    stopDetailPolling();
    syncStatus.textContent = liveUpdateMessage;
    detailPollTimer = setInterval(async () => {
      if (
        modal.hidden ||
        document.visibilityState !== "visible" ||
        !selectedApplication ||
        detail?.status !== "under_review" ||
        detailPollInProgress
      ) return;

      detailPollInProgress = true;
      try {
        await refreshSelectedApplication();
        if (syncStatus.textContent !== liveUpdateMessage) syncStatus.textContent = liveUpdateMessage;
      } catch (error) {
        syncStatus.textContent = `Could not refresh review activity: ${error.message || "Please try again."}`;
      } finally {
        detailPollInProgress = false;
      }
    }, 5000);
  }

  function renderResponses(responses) {
    const container = $("#admin-application-responses");
    container.replaceChildren();
    const displayed = new Set();
    for (const group of groups) {
      const entries = group.keys
        .filter((key) => Object.hasOwn(responses, key) && responses[key] !== "" && responses[key] !== null && responses[key] !== undefined)
        .map((key) => [key, responses[key]]);
      if (!entries.length) continue;

      const section = document.createElement("section");
      section.className = "application-response-group";
      section.append(makeText("h4", group.title));
      for (const [key, value] of entries) {
        displayed.add(key);
        const row = document.createElement("div");
        row.className = "application-response";
        row.append(makeText("b", labels[key] || key));
        if (key === "portfolioLink" && typeof value === "string" && isHttpUrl(value)) {
          const link = document.createElement("a");
          link.href = value;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = value;
          row.append(link);
        } else {
          row.append(makeText("span", formatValue(key, value)));
        }
        section.append(row);
      }
      container.append(section);
    }

    const otherEntries = Object.entries(responses).filter(([key, value]) =>
      !displayed.has(key) && value !== "" && value !== null && value !== undefined,
    );
    if (otherEntries.length) {
      const section = document.createElement("section");
      section.className = "application-response-group";
      section.append(makeText("h4", "Other responses"));
      for (const [key, value] of otherEntries) {
        const row = document.createElement("div");
        row.className = "application-response";
        row.append(makeText("b", labels[key] || key));
        row.append(makeText("span", formatValue(key, value)));
        section.append(row);
      }
      container.append(section);
    }
    if (!container.childElementCount) container.append(makeText("p", "No response details are available.", "empty"));
  }

  function renderApplications(applications, total) {
    list.replaceChildren();
    if (!applications.length) {
      list.append(makeText("p", "No applications match these filters.", "empty"));
    } else {
      for (const application of applications) {
        const card = document.createElement("article");
        card.className = "application-admin-card";
        const content = document.createElement("div");
        content.className = "grow";
        content.append(makeText("h3", application.applicant || "Applicant name unavailable"));
        content.append(makeText("p", `${application.applicationId} · ${application.email}`, "muted small"));
        content.append(makeText("p", `${dateLabel(application.submittedAt)} · ${application.type[0].toUpperCase()}${application.type.slice(1)}`, "muted small"));
        const status = makeText("span", statusNames[application.status] || application.status, `application-status ${application.status}`);
        const open = document.createElement("button");
        open.type = "button";
        open.className = "btn btn-sm btn-ghost";
        open.dataset.openApplication = application.applicationId;
        open.textContent = application.status === "submitted" ? "Start review" : "Open";
        card.append(content, status, open);
        list.append(card);
      }
    }
    pageCount = Math.max(1, Math.ceil(total / pageSize));
    $("#app-page-label").textContent = `Page ${page} of ${pageCount} · ${total} applications`;
    $("#app-page-previous").disabled = page <= 1;
    $("#app-page-next").disabled = page >= pageCount;
    statusMessage.textContent = `${total} application${total === 1 ? "" : "s"} found.`;
  }

  async function loadApplications() {
    statusMessage.textContent = "Loading applications…";
    list.replaceChildren();
    try {
      const result = await API.applications({
        page,
        limit: pageSize,
        status: statusFilter.value,
        type: typeFilter.value,
        search: searchInput.value.trim(),
      });
      renderApplications(result.applications, result.pagination.total);
    } catch (error) {
      statusMessage.textContent = error.message || "Could not load applications.";
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "text-btn";
      retry.textContent = "Try again";
      retry.addEventListener("click", loadApplications, { once: true });
      statusMessage.append(" ", retry);
    }
  }

  function renderReviewActivity(application) {
    const votes = application.reviewers || [];
    const total = votes.length;
    const voted = votes.filter((vote) => vote.verdict).length;
    const accepted = votes.filter((vote) => vote.verdict === "approved").length;
    const rejected = votes.filter((vote) => vote.verdict === "rejected").length;
    const complete = total > 0 && voted === total;
    const tied = complete && accepted === rejected;
    const decision = accepted > rejected ? "approved" : "rejected";
    const currentVote = votes.find((vote) => vote.adminId === user.id);
    const canReview = application.status === "under_review" && Boolean(currentVote);

    if (application.status === "under_review") {
      $("#admin-application-vote-summary").textContent = `${voted} of ${total} admins voted · ${accepted} Accepted, ${rejected} Rejected`;
      if (tied) reviewMessage.textContent = "The vote is tied. Discuss and change a verdict to establish a majority.";
      else if (complete) reviewMessage.textContent = `All admins have voted. The majority is ${statusNames[decision]}. Any admin can send the final result.`;
      else reviewMessage.textContent = "Every admin in the review roster must vote before the result can be sent.";
    } else {
      $("#admin-application-vote-summary").textContent = `Final result: ${statusNames[application.status] || application.status}`;
      reviewMessage.textContent = "The final result has been sent. Votes are locked.";
    }

    const voterContainer = $("#admin-application-voters");
    voterContainer.replaceChildren();
    for (const vote of votes) {
      const row = document.createElement("div");
      row.className = "application-voter";
      const name = vote.adminId === user.id ? `${vote.name} (you)` : vote.name;
      row.append(makeText("b", name));
      row.append(makeText("span", vote.verdict ? statusNames[vote.verdict] : "No verdict yet"));
      voterContainer.append(row);
    }
    if (!votes.length) voterContainer.append(makeText("p", "Review roster is not available.", "empty"));

    const history = $("#admin-application-vote-history");
    history.replaceChildren();
    const events = (application.voteEvents || []).filter((event) => event.eventType === "vote_changed");
    if (events.length) {
      history.append(makeText("h4", "Vote changes"));
      for (const event of events) {
        const previous = event.previousVerdict ? statusNames[event.previousVerdict] : "No verdict";
        const next = statusNames[event.verdict] || event.verdict;
        history.append(makeText("p", `${event.adminName}: ${previous} → ${next} · ${dateLabel(event.createdAt)}`, "muted small"));
      }
    }

    voteControls.hidden = !canReview;
    noteForm.hidden = !canReview;
    if (application.status === "under_review" && !currentVote) {
      reviewMessage.textContent = "You were not part of this application’s review roster.";
    }
    finalizeForm.hidden = !(application.status === "under_review" && complete && !tied);
    if (!finalizeForm.hidden) {
      const finalTitle = $("#admin-application-finalize-title");
      const finalSummary = $("#admin-application-finalize-summary");
      finalTitle.textContent = `Send final result: ${statusNames[decision]}`;
      finalSummary.textContent = "The vote is complete. Sending this result updates the applicant's status and message in Check Status, then locks all votes.";
      finalizeForm.dataset.decision = decision;
    } else {
      finalizeForm.dataset.decision = "";
    }
  }

  function renderNotes(application) {
    const container = $("#admin-application-notes");
    container.replaceChildren();
    if (application.legacyPrivateNotes) {
      const note = document.createElement("article");
      note.className = "application-note";
      note.append(makeText("b", "Previous note · author not recorded"));
      note.append(makeText("p", application.legacyPrivateNotes));
      container.append(note);
    }
    for (const item of application.notes || []) {
      const note = document.createElement("article");
      note.className = "application-note";
      note.append(makeText("b", item.adminName));
      note.append(makeText("time", dateLabel(item.createdAt)));
      note.append(makeText("p", item.note));
      container.append(note);
    }
    if (!container.childElementCount) container.append(makeText("p", "No private notes yet.", "empty"));
  }

  function renderApplication(application) {
    detail = application;
    if (application.status !== "under_review") {
      stopDetailPolling();
      syncStatus.textContent = "";
    }
    $("#admin-application-title").textContent = application.applicant.name || application.applicationId;
    $("#admin-application-meta").textContent =
      `${application.applicationId} · ${application.applicant.email} · ${statusNames[application.status] || application.status} · Submitted ${dateLabel(application.submittedAt)}`;
    renderResponses(application.responses || {});
    renderReviewActivity(application);
    renderNotes(application);
    if (application.publicMessage) {
      reviewMessage.append(document.createElement("br"), makeText("span", `Message sent to applicant: ${application.publicMessage}`));
    }
  }

  async function openApplication(applicationId, applicationStatus) {
    stopDetailPolling();
    selectedApplication = applicationId;
    detail = null;
    $("#admin-application-title").textContent = applicationId;
    $("#admin-application-meta").textContent = "Loading application details…";
    $("#admin-application-responses").replaceChildren();
    $("#admin-application-voters").replaceChildren();
    $("#admin-application-notes").replaceChildren();
    voteControls.hidden = true;
    noteForm.hidden = true;
    finalizeForm.hidden = true;
    reviewMessage.textContent = "";
    syncStatus.textContent = "";
    openModal(modal);
    try {
      if (["submitted", "under_review"].includes(applicationStatus)) {
        await API.startApplicationReview(applicationId);
      }
      const application = await refreshSelectedApplication();
      if (application.status === "under_review" && !modal.hidden) startDetailPolling();
      await loadApplications();
    } catch (error) {
      $("#admin-application-meta").textContent = error.message || "Could not load this application.";
    }
  }

  async function refreshSelectedApplication() {
    if (!selectedApplication) return;
    const application = await API.application(selectedApplication);
    renderApplication(application);
    return application;
  }

  async function saveVote(verdict) {
    if (!detail || detail.status !== "under_review") return;
    const buttons = $$("[data-application-vote]");
    buttons.forEach((button) => { button.disabled = true; });
    reviewMessage.textContent = "Saving your verdict…";
    try {
      await API.voteApplication(detail.applicationId, verdict);
      await refreshSelectedApplication();
      await loadApplications();
      toast(`Your verdict is now ${statusNames[verdict]}.`);
    } catch (error) {
      reviewMessage.textContent = error.message || "Could not save your verdict.";
    } finally {
      buttons.forEach((button) => { button.disabled = false; });
    }
  }

  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-open-application]");
    if (!button) return;
    const application = button.closest(".application-admin-card");
    const status = application?.querySelector(".application-status")?.classList[1];
    openApplication(button.dataset.openApplication, status || "submitted");
  });
  $$("[data-application-vote]").forEach((button) => {
    button.addEventListener("click", () => saveVote(button.dataset.applicationVote));
  });
  noteForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!detail) return;
    const submit = noteForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    reviewMessage.textContent = "Adding private note…";
    try {
      await API.addApplicationNote(detail.applicationId, noteForm.elements.namedItem("notes").value);
      noteForm.reset();
      await refreshSelectedApplication();
      toast("Private note added.");
    } catch (error) {
      reviewMessage.textContent = error.message || "Could not add private note.";
    } finally {
      submit.disabled = false;
    }
  });
  finalizeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!detail || !finalizeForm.dataset.decision) return;
    const submit = finalizeForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    reviewMessage.textContent = "Sending final result…";
    try {
      await API.finalizeApplication(
        detail.applicationId,
        finalizeForm.dataset.decision,
        finalizeForm.elements.namedItem("publicMessage").value,
      );
      await refreshSelectedApplication();
      await loadApplications();
      toast("Final result sent to the applicant.");
    } catch (error) {
      reviewMessage.textContent = error.message || "Could not finalize this application.";
    } finally {
      submit.disabled = false;
    }
  });
  [typeFilter, statusFilter].forEach((control) => control.addEventListener("change", () => {
    page = 1;
    loadApplications();
  }));
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      page = 1;
      loadApplications();
    }, 250);
  });
  $("#app-refresh").addEventListener("click", loadApplications);
  $("#app-page-previous").addEventListener("click", () => {
    if (page > 1) {
      page -= 1;
      loadApplications();
    }
  });
  $("#app-page-next").addEventListener("click", () => {
    if (page < pageCount) {
      page += 1;
      loadApplications();
    }
  });

  document.addEventListener("mnm:view", (event) => {
    if (event.detail === "applications") loadApplications();
  });
  modal.addEventListener("click", (event) => {
    if (event.target === modal || event.target.closest("[data-close]")) stopDetailPolling();
  });
  modal.addEventListener("keydown", (event) => {
    if (event.key === "Escape") stopDetailPolling();
  });
  if (location.hash === "#applications") loadApplications();
})().catch((error) => {
  console.error("Could not load admin applications:", error);
  window.MNM_UI?.toast(error.message, "err");
});
