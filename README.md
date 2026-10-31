# MNM website

The website of **MNM: Medicine · Neuroscience · Mathematics**, a YIMO-affiliated student STEM initiative.

It is a plain static site (HTML + CSS + JS). There is no build step and nothing to install.

## Pages

| File | Page |
| --- | --- |
| `index.html` | Home: hero, pillars, what we do, teams, call to action |
| `join.html` | Join: three steps, member vs staff, FAQ |

## Run it locally

Open `index.html` in a browser, or start a local server:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Things to edit

- **Discord invite and staff application links:** at the top of `main.js` in `LINKS`. While a link is empty, its buttons show "coming soon".
- **Colors and fonts:** the tokens at the top of `styles.css` come from the MNM Brand Guide v1.0.
  - Navy `#0A2A57`, teal `#1AA7A8`, purple `#7B4BC4`, green `#1E8C5E`, mint `#30C39C`, light `#F4F6F8`.
  - Space Grotesk for headings, Inter for body text.
- **Logo:**
  - `assets/mark-dark.webp`: the symbol for dark backgrounds.
  - `assets/mark.png`: the favicon.

## Deploy

Any static host works: GitHub Pages, Vercel or Netlify. The repository root is the site root.
