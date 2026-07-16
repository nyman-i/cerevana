# Vendored: Quad Box

- Upstream: https://github.com/soamsy/quad-box
- Commit: `83a9718b371a2a747760dceac047b379a80a3ac5` (upstream date 2025-11-08)
- Vendored: 2026-07-16
- License: MIT (see `LICENSE` in this directory)
- Author: soamsy — the same developer behind the Syllogimous-v3 fork
  Cerevana's RRT is built on.

This directory is the **single build-step exception** in Cerevana. The rest
of the repo is served as-is; `quadbox/dist/` is the built output and is
**committed**, so serving the repo root needs no tooling. Never edit
`dist/` by hand — change `src/` and rebuild.

## Rebuild

```bash
cd js/quadbox
npm install
npm test        # vitest — must be green
npm run build   # writes dist/
```

Excluded from upstream: `.git/`, `.github/`, `netlify/`, `.vscode/`.
`.gitignore` replaced (upstream ignored `dist/`, which we commit).

## Files modified relative to upstream

Styling/integration only — game mechanics, stores, gamedb, migrations are
untouched. Keep this list current with any new change.

- `src/app.css` — custom daisyUI themes `cerevana-dark`/`cerevana-light`
  (colors from Cerevana's design tokens), Cerevana @font-faces (Space
  Grotesk/Oxanium/JetBrains Mono) replacing Go Mono, transparent html/body
  (host background shows through the iframe), `.font-hud`/`.hud-strip`
  floating HUD pill, `.offcanvas-skin`/`.settings-heading`/
  `.offcanvas-close-btn` (drawer skinned like Cerevana's offcanvas),
  feedback-flash colors mapped to Cerevana's verdict hues.
- `src/App.svelte` — theme names `black`/`bumblebee` → `cerevana-dark`/`-light`.
- `src/lib/Drawer.svelte` — top bar replaced by the floating `.hud-strip`
  (panel-toggle/back-link/Info/Chart trigger buttons removed — the host
  page's corner tabs drive panels via postMessage); drawer opens on
  `panelRequest` 'settings'; drawer restyled `.offcanvas-skin` with a ✕
  close; ThemeSwapper removed (theme follows the Cerevana host);
  game-area background made transparent.
- `src/lib/ChartPopup.svelte`, `src/lib/InfoPopup.svelte` — trigger buttons
  hidden; open/close on `panelRequest` 'chart'/'info'.
- `src/lib/ProgressChart.svelte` — Chart.js default font → JetBrains Mono.
- `src/main.js` — one-time read of host localStorage `sllgms-v3-app-state`
  to follow Cerevana's dark/light mode at load (read-only); postMessage
  listener forwarding the host's corner-tab toggles to `panelRequest`.
- `src/stores/panelRequestStore.js` — NEW (integration): tiny event-bus
  store for the host bridge.
- `index.html` — title "Quad Box — Cerevana"; PWA manifest/apple metas
  removed (embedded page, not a standalone installable app).
- `public/fonts/` — Go-Mono.ttf removed; Cerevana woff2 fonts added
  (SIL OFL 1.1, license files in repo-root `fonts/`).
- `src/lib/ThemeSwapper.svelte` — no longer mounted (file kept to minimize
  the diff vs upstream).
