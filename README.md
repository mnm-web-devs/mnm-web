# MNM website

The website of **MNM: Medicine · Neuroscience · Mathematics**, a YIMO-affiliated student STEM initiative.

It is a static site (HTML + CSS + JS). There is no build step and nothing to install: run `python3 -m http.server 3000` and open http://localhost:3000. Always use port 3000: the hosted backend only accepts requests from localhost:3000, mnm-liard.vercel.app and mnmstem.study.

## Pages

| File | Page |
| --- | --- |
| `index.html` | Home. A 3D particle brain morphs into a cross, then π, then MNM as you scroll. Also: marquee, tracks, horizontal "what we do", counters, hub teaser, teams, CTA. |
| `track-neuroscience.html`, `track-medicine.html`, `track-mathematics.html` | Track pages: topics, a scroll-animated roadmap and resources. |
| `hub.html` | Opportunities hub with search, category filters, sort and expandable cards. |
| `about.html` | Mission, a quote that lights up as you scroll, and values. |
| `join.html` | Member / Staff / Partner tabs, steps and FAQ. |

## Where to edit

- **Links** (Discord, staff form, partner form, email): `js/config.js`. Empty links show "coming soon".
- **Menu and footer** for every page: `js/layout.js`.
- **Opportunities in the hub:** `js/opportunities.js`. Copy a block to add one.
- **Colors and fonts:** the tokens at the top of `css/styles.css`, from the MNM Brand Guide.
- **3D particles:** `js/scene.js`.
  - Shapes in order: 0 brain, 1 cross, 2 π, 3 MNM, 4 cloud.
  - Each page picks its shapes with `data-seq` on `<body>`.

## Tech

- Three.js 0.160 renders the particle scene.
- GSAP 3.12 with ScrollTrigger runs the scroll animations.
- Lenis 1.1 gives smooth scrolling.

The libraries are vendored in `vendor/`, so the site works on any static host: GitHub Pages, Vercel or Netlify. If the visitor prefers reduced motion, the animations turn off. If WebGL is unavailable, the logo is shown instead.

## Accounts & dashboards (frontend ready, backend to wire)

New pages:

- `login.html`: sign in / create account (email + password, Google, Discord, forgot password)
- `dashboard.html`: student dashboard (overview, tracks, workshops with registration, monthly challenge submission, leaderboard, profile)
- `admin.html`: admin dashboard (stats + chart, students table with search/filter/sort/CSV export, create/delete workshops, review submissions, partner/sponsor inquiries)

Right now everything runs on **mock data** in `js/api.js`, so the pages work without a backend
(demo login: any email + 8+ character password; an email containing "admin" opens the admin dashboard).

To connect the backend, only touch `js/api.js`:

1. Replace each `MNM_API.student.*` and `MNM_API.admin.*` function body with a `fetch()` to the API.
   Keep the function names, arguments and return shapes (the mock tables at the top show the exact shapes).
2. Replace `MNM_API.auth.*` with Clerk (each function has a comment with the matching Clerk call).
   `auth.me()` must return `{ id, name, email, role }`, with `role: "admin"` for leads (e.g. from Clerk `publicMetadata.role`).
3. The admin redirect in `js/shell.js` is only a UI guard. The API must also check the role on every admin request.

Files: `js/api.js` (data), `js/auth.js` (login page), `js/shell.js` (shared sidebar/guard/toasts), `js/dashboard.js`, `js/admin.js`, `css/app.css`.

## Audit fixes (Nov 2026)

Fixes from `Audit.md`. Things to know when editing:

- **Fonts are self-hosted** (`assets/fonts/` + `css/fonts.css`). Don't add Google Fonts links back (privacy / GDPR).
- **Security headers + CSP** live in `vercel.json`. If you add an external service (Clerk, analytics, a form provider), add its domain to the matching CSP directive (`script-src`, `connect-src`, `frame-src`, `img-src`), or it will be blocked.
- **Vendor files are pinned** with SRI hashes. Versions and hashes are in `vendor/versions.txt`; if you replace a vendor file, update the `integrity` attribute in every HTML file.
- **Domain:** the site lives at https://mnmstem.study (canonical/OG URLs, `robots.txt` and `sitemap.xml` use it).
- **Opportunities:** entries in `js/opportunities.js` need `name`, `cat`, `url`, `desc`; incomplete ones are skipped with a console warning, and links must be `http(s)`.
- **Marquee:** list each word once; the loop copy is created by JS.
- New pages: `privacy.html`, `404.html`. New files: `robots.txt`, `sitemap.xml`, `favicon.ico`, `assets/og.png` (link previews), `assets/apple-touch-icon.png`.
