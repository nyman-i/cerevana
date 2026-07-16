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
cd quadbox
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
  Grotesk/Oxanium/JetBrains Mono) replacing Go Mono, body font, `.font-hud`
  utility, feedback-flash colors mapped to Cerevana's verdict hues.
- `src/App.svelte` — theme names `black`/`bumblebee` → `cerevana-dark`/`-light`.
- `src/lib/Drawer.svelte` — "← CEREVANA" back link in the top bar (desktop
  only; mobile uses browser back), game-area bg hexes → Cerevana bg tokens,
  `font-hud` on the top bar.
- `src/lib/ProgressChart.svelte` — Chart.js default font → JetBrains Mono.
- `src/main.js` — one-time read of host localStorage `sllgms-v3-app-state`
  to follow Cerevana's dark/light mode at load (read-only).
- `index.html` — title "Quad Box — Cerevana".
- `public/fonts/` — Go-Mono.ttf removed; Cerevana woff2 fonts added
  (SIL OFL 1.1, license files in repo-root `fonts/`).
