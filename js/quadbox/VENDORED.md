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
  `panelRequest` 'settings'; drawer rebuilt as an exact Cerevana offcanvas
  (`.offcanvas-body`/`.offcanvas-side` ✕, panel-heading sections Mode/
  Session/Stimuli/Display/Progression, inline-input numeric rows replacing
  ALL sliders, switch toggles); ThemeSwapper removed (theme follows the
  Cerevana host); game-area background made transparent.
- `src/lib/GameSettings.svelte` — full row rewrite to Cerevana controls
  (switch/select-item/inline-input/tooltip "?"), sliders and the
  variable-N gear popup REMOVED (Variable N-Back is an inline switch);
  all bindings/handlers unchanged.
- `src/lib/ChartPopup.svelte`, `src/lib/InfoPopup.svelte`,
  `src/lib/KeybindingsPopup.svelte` — trigger buttons hidden/restyled;
  open/close on `panelRequest`; daisyUI modals replaced with the
  `.cv-popup` panel (exact nback `.graph-popup` material) with
  `.graph-select` tab buttons and the `#graph-close-popup`-style Close.
- `src/lib/LargeKey.svelte`/`SmallKey.svelte`/`NumberKey.svelte` — compact
  N-Back-style match buttons ("Position (A)"); giant hotkey letters and
  per-key score readouts REMOVED (scores live in the HUD and history).
- `src/lib/DefaultGame.svelte`/`TallyGame.svelte` — keys in a bottom
  centered row with a START/STOP button (`.qb-start`, exact
  `.nback__start`); trial counter as a small bottom-right ghost.
- `src/lib/RecentGames.svelte` — score/status chips on Cerevana's verdict
  palette instead of traffic-light colors.
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
- `src/lib/ModeSwapper.svelte` — per-mode rainbow colors replaced by the
  single-accent `.cv-mode-pill` (logic/cycling untouched).
- `public/frame-dark.svg` / `frame-light.svg` — lattice lines tinted to
  Cerevana's sage accent (#7cb6a8 / #2f6b5c, slight opacity).
- `src/lib/Grid.svelte` / `Cell.svelte` — cube geometry scaled ~0.68×
  (scene 60.3→41.1svmin, cells 20.1→13.7, frame planes 30.15/10.05→
  20.55/6.85, 2D grid 81.3→55.2, cells 27.1→18.4; ratios preserved) and
  camera moved back (perspective 60svmin, scene -translate-z 10svmin →
  max corner magnification ~1.2×) so the rotating cube stays clear of
  the host nav/HUD/keys at every rotation phase. Purely visual — trial
  logic untouched.
- `src/app.css` (Cerevana control language section) — verbatim ports of
  styles.css recipes: `.nback__match` (game buttons), `.nback__start`
  (`.qb-start`), `.switch`, `.select-item`, `.inline-input__*`,
  `.ctrl__inner`, `.panel-heading`, `.tooltip-container/-text`,
  `.graph-popup` (`.cv-popup`), `.graph-controls/.graph-select`,
  `#graph-close-popup` (`.cv-popup-close`), Cerevana `button`/`.delete`
  (`.cv-button`), `.mb-*` spacing scoped to the panel; daisyUI's
  `:root` base-100 paint disabled via its `--root-bg` hook so the page
  shows the host's black background.
