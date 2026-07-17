# Vendored: Quad Box

> **Restructuring in progress (Option C′ — engine promotion).** Upstream
> sync is FROZEN at commit `83a9718b371a2a747760dceac047b379a80a3ac5`.
> The framework-free game engine has been promoted to `engine/` (buildless
> ES modules, MIT headers per file); the Svelte app in `src/` + `dist/`
> remains the live page until the vanilla cutover. Engine equivalence is
> by construction: 8 files byte-identical to `src/` (headers aside),
> 6 differ only in import-specifier lines (.js extensions / vendored d3
> paths), `autoProgression.js` adapted off svelte stores (logic
> unchanged). Tests: `node --experimental-test-module-mocks --test
> tests/quadbox-pure.mjs` (port of `src`'s vitest suite) — 5/5 green.
> d3 stimulus deps are vendored buildless in `js/lib/`:
> `d3-delaunay.esm.js` + `delaunator.esm.js` + `robust-predicates.esm.js`
> (ISC), `d3-shape.esm.js` + `d3-path.esm.js` (ISC) — jsDelivr +esm
> bundles with sub-dep specifiers rewritten to local files.

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

## Engine promotion checksums (sha256, at promotion)

```
  78e041a87c6d1af847f8776b90be2b5c863be1ad99568f36588fd32807e73d63  autoProgression.js
  4492a953a97536425bb1d041c2544f4b250e4e9542ec5e0e4842532b4ee9afd9  constants.js
  fe928211d20c9f0bbf250c87782374f27f66e6e19c6d35f10c5b2224437b3458  gamedb.js
  c9a384028579dd55d233552c46a1d4c5bc38d1c83f91416b85ed19bcb4a4c317  generative.js
  2e209235e88e01c668b28c9aa4fb091ddea015f060b8243a87799ccfe5465f78  gradient.js
  9983f87dd95e28cd1cc2c76a9944a2d44bd3e0056bf17a573ef18f8efacbd9a8  nbackGame.js
  7ecb732025a428f1411fe096afb296392c2599ac204a910fcf34d8b2b42ecbf4  nback.js
  93e55848563bcb666cd3aa67b25bf444283732264dd8b996319c0307e898d54b  shapeSvgPool.js
  2404ece680f134ccbc1f16c43e3360339a153dcff37dfbc790413715b088954f  svg.js
  9cff10ea3bb4219893fbc80f4db6b588dc698e1229ec5c0db586ddc7d83d188d  trialUtils.js
  4cf141645613ced8f0e9193d430528f448f5d10841bb7eb8d8049a0767db1998  utils.js
  f4360fd957aed6d8cf73faad490ca7aa0b388541c51f55d1f09ff318101b32b8  voronoi.js
  4de0b59925cc43aacc142481c158cdb64f3fbc9fe41299c6ead4e3efb5171d6e  migrations/migrations.js
  9dfd62cbb68db6ae693e1da5cdc0b2b2dc3727d752dc32855edcbad6306f679b  migrations/v2.js
  1598d215a7de2d4d424a8de1d1ebd1670d0882c82a506401e7f298f872a9d2a9  migrations/v3.js
```
