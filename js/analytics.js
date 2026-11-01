/* MNM — Vercel Web Analytics (cookie-free page views). Turn it on once in Vercel: project → Analytics → Enable.
   Only loads on the live site, so local testing doesn't count as visits. */
(() => {
  if (!/(^|\.)mnmstem\.study$|\.vercel\.app$/.test(location.hostname)) return;
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  const s = document.createElement("script");
  s.defer = true; s.src = "/_vercel/insights/script.js";
  document.head.appendChild(s);
})();
