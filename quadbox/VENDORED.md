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

(populated by the retheme commit)
