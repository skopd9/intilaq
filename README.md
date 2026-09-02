# Intilaq · انطلاق

**The Start.** A competition-built incubator in Beirut. Five funded seats, twelve weeks, one measurable number per team, scored by working experts. No equity, ever.

This repository is the complete public site: a landing page and a six-step application form. The pages themselves are plain static HTML with no build step and no dependencies. Deployed on Cloudflare Workers, a small Worker also stores each submitted application in D1 and serves a password-protected admin page to view them — see [Applications: where they're stored](#applications-where-theyre-stored) below.

---

## What's here

| File | What it is |
|---|---|
| `index.html` | The landing page. Format, seats, the standard, the money ladder, partners, dates. |
| `apply.html` | The cohort application. Six steps, autosaved draft, live win-condition builder. |
| `tools/design-lab.html` | Internal tool. Try alternative colour palettes and typefaces on the real components. Not linked from the site. |
| `admin.html` | Password-protected list of submitted applications. Not linked from the site. |
| `worker/index.js` | Cloudflare Worker: `POST /api/apply` stores a submission in D1, `GET /api/applications` returns them (password-gated). Everything else falls through to the static files. |
| `worker/schema.sql` | D1 table definition for stored applications. |
| `.nojekyll` | Tells GitHub Pages to serve the files as-is. |

Every page is a single self-contained file. All CSS and JavaScript is inline. The only external requests are to Google Fonts.

---

## Hosting it

The site itself needs no build step. Serving `index.html` and `apply.html` from any static host works — but only Cloudflare Workers also runs `worker/index.js`, which is what saves applications (see below). On any other host, submissions fall back to the applicant's own mail client only.

**Cloudflare Workers (recommended — this is what saves applications)** — this repo ships a `wrangler.jsonc` (Worker name `intilaq`, static `assets` served from `/`, `main` pointing at `worker/index.js`) and an `.assetsignore` that keeps `.git`, `.wrangler`, source, and docs out of the asset upload. In the dashboard: Root directory `/`, Build command empty, Deploy command `npx wrangler deploy`. One-time setup before the first deploy:

```bash
# 1. Create the D1 database and copy the database_id it prints
npx wrangler d1 create intilaq-applications
# paste that id into wrangler.jsonc → d1_databases[0].database_id

# 2. Create the applications table
npx wrangler d1 execute intilaq-applications --remote --file=worker/schema.sql

# 3. Set the admin page password (pick your own)
npx wrangler secret put ADMIN_PASSWORD
```

Then deploy (`npx wrangler deploy`, or via the dashboard). Applications submitted after that point are saved and visible at `/admin.html`.

**GitHub Pages** — Settings → Pages → Source: *Deploy from a branch* → `main` / `/ (root)`. Live in about a minute at `https://<user>.github.io/intilaq/`. Note that Pages on a **private** repository requires a paid GitHub plan; on a public repository it is free. No Worker runs here, so applications are not saved — only the mailto/clipboard fallback works.

**Netlify or Vercel** — connect the repo, leave the build command empty, set the publish directory to `/`. Same caveat: no Worker, no saved applications.

**Any other host** — upload the files. Apache, nginx, S3, a USB stick. It is static HTML, same caveat.

**Locally** —

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`. (This serves the static pages only. To run the Worker and D1 locally too, use `npx wrangler dev`.)

---

## Applications: where they're stored

Submitting the form does two things at once:

1. **POSTs to `/api/apply`** (handled by `worker/index.js`), which writes the answers into a `applications` table in Cloudflare D1.
2. **Opens the applicant's own mail client**, pre-addressed to `intilaq@lau.edu.lb` and pre-filled, and copies the full application to their clipboard — this is the same fallback as before, kept so nothing is lost if the API call fails (offline, ad blocker, etc).

**To view what's been submitted**, open `/admin.html` on the deployed site and enter the password you set with `wrangler secret put ADMIN_PASSWORD`. It lists every application (newest first), lets you expand each one's full answers, and has an "Export CSV" button. The page itself is public, but the data behind it is not — `GET /api/applications` requires that password as a bearer token.

To change the admin password later: `npx wrangler secret put ADMIN_PASSWORD` again.

---

## Changing things you will actually want to change

**Where applications are sent.** One line, at the top of the `<script>` block in `apply.html`:

```js
var TO = "intilaq@lau.edu.lb";
```

This only changes the mailto fallback's address — it does not affect where submissions are saved (that's always the D1 database behind the Worker deployment, see above).

**Dates.** The deadline appears in three places: the countdown target in the `<script>` at the bottom of `index.html` (an ISO timestamp), the ticker text, and the dates section.

**The cohort model numbers.** The animated chart in `index.html` is driven by `data-cut` and `data-win` attributes on each `.g-row`, and the running totals in the `setFrame()` function. The payment ladder is $1,000 on day one, then +$1,500, +$3,000, +$3,500, and +$12,000 for hitting the number — $21,000 per team that clears everything. If you change the ladder, update `setFrame()` and the per-team "KEPT" tags together, or the arithmetic stops tying out.

---

## Design system

**Colour — Graphite.** No hue in the brand itself; the type and the glass carry the page.

| Token | Value | Use |
|---|---|---|
| `--acc-text` | `#2B3440` | Small accent text on light (11.2:1) |
| `--acc` | `#151B23` | Fills, large marks |
| `--acc-hi` / `--acc-deep` | `#39434F` / `#04070B` | Gradient ends |
| `--win` / `--win-dark` | `#0F9D63` / `#37D399` | **Reserved:** hit the number |
| `--cut` | `#C2321F` | **Reserved:** elimination |

Green and red are signal colours with exactly one meaning each. Do not use them decoratively — the cohort chart depends on that discipline to be readable.

**Type.** Calibri Light for display and body, with [Carlito](https://fonts.google.com/specimen/Carlito) loaded as a metric-compatible fallback for machines without Calibri. Geist Mono for labels, data, and buttons. Noto Kufi Arabic for انطلاق.

**Buttons — liquid glass.** No library. `backdrop-filter` blur/saturate/brightness, a four-edge inset rim light, a specular highlight that tracks the pointer via `--mx`/`--my`, and an inline SVG `feTurbulence` + `feDisplacementMap` (`#lg-warp`) that refracts the backdrop. The refraction is behind `@supports (backdrop-filter: url(#lg-warp))`, so engines that support it get it and the rest fall back cleanly.

---

## Browser support

Chrome, Edge, Safari, and Firefox, current versions. The backdrop refraction is a progressive enhancement. `prefers-reduced-motion` is respected throughout — the scroll-driven chart falls back to its final state. The chart also renders statically on screens under 760px rather than pinning.

---

## Status

Cohort one, pre-launch. There are no alumni yet, and the site says so rather than implying otherwise.

© Intilaq. All rights reserved.
