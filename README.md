# Intilaq · انطلاق

**The Start.** A competition-built incubator in Beirut. Five funded seats, twelve weeks, one measurable number per team, scored by working experts. No equity, ever.

This repository is the complete public site: a landing page and a six-step application form. Pages are plain static HTML. Cloudflare serves them from `public/` through a small pass-through Worker.

---

## What's here

| File | What it is |
|---|---|
| `index.html` / `apply.html` | Landing page and cohort application. Source of truth for the site. |
| `public/` | Cloudflare publish directory. Must contain those same HTML files. |
| `src/index.js` | Worker `fetch` handler. Serves `public/` and `POST /api/apply`. |
| `src/apply.js` | Validates an application and writes it to D1. |
| `migrations/` | D1 schema for the `applications` table. |
| `wrangler.jsonc` | Worker name `intilaq`, `main`, `assets.directory = "./public"`, and the `DB` D1 binding. |
| `tools/design-lab.html` | Internal tool. Try alternative colour palettes and typefaces. Not linked from the site. |
| `.nojekyll` | Tells GitHub Pages to serve the files as-is. |

Every page is a single self-contained file. All CSS and JavaScript is inline. The only external requests are to Google Fonts.

---

## Hosting it

There is no build step. Serve the folder.

**GitHub Pages** — Settings → Pages → Source: *Deploy from a branch* → `main` / `/ (root)`. Live in about a minute at `https://<user>.github.io/intilaq/`. Note that Pages on a **private** repository requires a paid GitHub plan; on a public repository it is free.

**Cloudflare Workers** — static HTML with a small pass-through Worker. `wrangler.jsonc` names the Worker `intilaq`, points `main` at `src/index.js`, and publishes **`./public`** (not the repo root). `public/` is a copy of the root HTML files so the deploy cannot ship an empty assets bundle.

Workers Builds settings that work with this repo:

- Root directory: `/` (leave empty)
- Build command: `npm run sync:assets` (copies `index.html`, `apply.html`, and `tools/` into `public/` and `dist/`)
- Deploy command: `npx wrangler deploy` — do **not** pass `--assets ./dist` unless that folder has been synced

If a previous dashboard template left the deploy command as `npx wrangler deploy --assets ./dist` (or `./public` against an empty folder), that is what produced the empty Worker and the `403 Forbidden` on intilaq.dev. Use the commands above, or `npm run deploy`.

**Netlify or Vercel** — connect the repo, leave the build command empty, set the publish directory to `/`.

**Any other host** — upload the files. Apache, nginx, S3, a USB stick. It is static HTML.

**Locally** —

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`. To preview the Worker + assets the same way Cloudflare will serve them: `npm install && npm run sync:assets && npm run preview`.

---

## Changing things you will actually want to change

**Where applications are stored.** Submit writes every field to a Cloudflare D1 database named `intilaq` (binding `DB`). The Worker also keeps a plain-text copy of the application. If the database write fails, the form falls back to the applicant's mail client, addressed to:

```js
var TO = "intilaq@lau.edu.lb";
```

Create the production database once (requires `wrangler login`):

```bash
npx wrangler d1 create intilaq
```

Put the returned `database_id` into `wrangler.jsonc`, then apply the schema and deploy:

```bash
npx wrangler d1 migrations apply intilaq --remote
npm run deploy
```

Local preview creates a local D1 automatically:

```bash
npx wrangler d1 migrations apply intilaq --local
npm run preview
```

List stored applications (set `ADMIN_TOKEN` as a Worker secret, or in `.dev.vars` locally):

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" https://intilaq.dev/api/applications
```

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
