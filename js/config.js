/* ============================================================
   MNM website — the only file you need to edit for links.
   Leave a link empty ("") and its buttons show "coming soon".
   ============================================================ */
window.MNM_LINKS = {
  discord: "https://discord.gg/FJd4udkpwB", // Discord invite, e.g. "https://discord.gg/xxxxxxx"
  apply: "mailto:medineuromatics@gmail.com?subject=MNM%20staff%20application&body=Hi MNM team,%0D%0A%0D%0AName:%0D%0AAge %26 country:%0D%0ATeam I want to join (Programs %26 Curriculum / Web %26 Tech / Media %26 Content / Design %26 Brand / Partnerships / Volunteering):%0D%0AWhat I can do (skills, links to work):%0D%0AHours per week I can give:%0D%0ADiscord username:%0D%0A%0D%0AThanks!",   // staff application: replace with a Google Form link when the team has one
  partner: "", // external partnership form (optional; the site already has sponsor.html#contact)
  formEndpoint: "", // backend URL for site forms, e.g. "https://api.mnmstem.study/forms" (empty = demo mode, see js/forms.js)
  email: "mailto:medineuromatics@gmail.com", // contact email
};

/* Public runtime values may be injected by the local server before this file loads. */
const runtimeEnv = window.MNM_ENV || {};
window.MNM_CONFIG = {
  apiBaseUrl: runtimeEnv.MNM_API_BASE_URL || runtimeEnv.API_BASE_URL || "https://mnm-web-ochre.vercel.app/api/v1",
  clerkPublishableKey: runtimeEnv.MNM_CLERK_PUBLISHABLE_KEY ||
    runtimeEnv.CLERK_PUBLISHABLE_KEY ||
    "pk_live_Y2xlcmsubW5tc3RlbS5zdHVkeSQ",
};
