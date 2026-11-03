/* ============================================================
   MNM website — the only file you need to edit for links.
   Leave a link empty ("") and its buttons show "coming soon".
   ============================================================ */
window.MNM_LINKS = {
  discord: "https://discord.gg/FJd4udkpwB", // Discord invite, e.g. "https://discord.gg/xxxxxxx"
  apply: "",   // staff application form, e.g. a Google Form link
  partner: "", // external partnership form (optional; the site already has sponsor.html#contact)
  formEndpoint: "", // backend URL for site forms, e.g. "https://api.mnmstem.study/forms" (empty = demo mode, see js/forms.js)
  email: "mailto:medineuromatics@gmail.com", // contact email
};

/* Backend + sign-in (public values, safe to ship in the browser).
   Local dev: serve the site on port 3000 (python3 -m http.server 3000), the API only accepts
   http://localhost:3000, https://mnm-liard.vercel.app and https://mnmstem.study. */
window.MNM_ENV = {
  API_BASE_URL: "https://mnm-web-ochre.vercel.app/api/v1",
  CLERK_PUBLISHABLE_KEY: "pk_test_YWxlcnQtZG9nLTQyMzEuY2xlcmsuYWNjb3VudHMuZGV2JA",
};
