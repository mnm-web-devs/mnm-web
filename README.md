# MNM website

The website of **MNM: Medicine · Neuroscience · Mathematics**, a YIMO-affiliated student STEM initiative.

It is a static site (HTML + CSS + JS). There is no build step and nothing to install: open `index.html`, or run `python3 -m http.server 8000`.

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
