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

## Accounts & dashboards

New pages:

- `login.html`: sign in / create account (email + password, Google, Discord, forgot password)
- `dashboard.html`: student dashboard (overview, tracks, workshops with registration, monthly challenge submission, leaderboard, profile, Staff applications and status)
- `admin.html`: admin dashboard (stats + chart, students table with search/filter/sort/CSV export, create/delete workshops, application voting and private notes, review submissions, partner/sponsor inquiries)

The account and dashboard flows call the MNM API. For local development, copy `.env.example` to `.env`, set `MNM_CLERK_PUBLISHABLE_KEY` to your Clerk **publishable** key, then run `python serve_frontend.py`. This small local server exposes only those two public settings to the browser through `js/env.js`; the browser cannot read `.env` directly. Do not put Clerk's secret key, the Supabase service-role key, or the admin JWT signing secret in the frontend `.env`.

`MNM_API_BASE_URL` should point to the backend API, for example `https://mnm-web-ochre.vercel.app/api/v1`. `MNM_CLERK_PUBLISHABLE_KEY` is safe to expose; it must match the Clerk instance configured by the backend.

Students authenticate through Clerk. Set the OAuth callback/redirect URL for the local or deployed frontend to `oauth-callback.html` in Clerk. New Google/Discord accounts must choose a username and main interest before entering the dashboard. Email/password account creation also requires a user-chosen username and main interest, then verifies the email. These values are saved to the backend student profile. Admin email/password sign-in uses the backend and stores its short-lived bearer token in the current browser session. The API enforces authorization independently of the page-level dashboard guard.

For UI-only dashboard testing without Clerk or the backend, run `python serve_frontend.py` and open `http://127.0.0.1:3000/dashboard.html?localDemo=1`. The admin review demo is at `http://127.0.0.1:3000/admin.html?localDemo=1`; its sample review has four voters and starts with a 2–1 split so you can test tie resolution, vote changes, private notes, and finalization. This opt-in demo works only on localhost, uses sample data, and keeps changes in memory for the current page session. It does not create or modify real accounts or applications. Remove `?localDemo=1` to use the normal authentication flow.

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

The backend's `ALLOWED_ORIGINS` must include the exact frontend origins, including `https://mnm-liard.vercel.app` and, when live, `https://mnmstem.study`. Applications are separate from account creation and are available in the student dashboard.

API endpoints and request shapes are documented in the backend repository's `API_REFERENCE.md`.
