# Quad Box — provenance

Cerevana's Quad Box exercise is built on the game engine of
**[soamsy/quad-box](https://github.com/soamsy/quad-box)** (MIT, see
`LICENSE` in this directory), by soamsy — the same developer behind the
Syllogimous-v3 fork Cerevana's RRT grew from. The original Svelte/Vite
app was vendored 2026-07-16, run in an iframe for a while, and then
restructured (2026-07-17) into a first-class plain-JS Cerevana page:
engine copied, UI rewritten vanilla, Svelte app and build step removed.

- Upstream: https://github.com/soamsy/quad-box
- Base commit: `83a9718b371a2a747760dceac047b379a80a3ac5` (2025-11-08)
- Upstream sync: frozen at that commit; later upstream engine changes are
  hand-ported if wanted.

## What is upstream code vs. ours

**`engine/` — upstream code, MIT, near-verbatim.** Each file carries an
attribution header stating its changes. `nbackGame.js`, `nback.js`,
`constants.js`, `utils.js`, `shapeSvgPool.js`*, `gradient.js`,
`migrations/v2.js`, `migrations/v3.js` are byte-identical to upstream
`src/` (headers aside); `trialUtils.js`, `gamedb.js`, `svg.js`,
`voronoi.js`, `generative.js`, `migrations/migrations.js` differ only in
import specifiers (.js extensions / vendored d3 paths);
`autoProgression.js` is adapted off svelte stores (logic unchanged).
(*`shapeSvgPool.js` also has a module-relative sprite path.)
**Game mechanics live here and stay equivalent to upstream.** Tests:
`node --experimental-test-module-mocks --test tests/quadbox-pure.mjs`
(port of upstream's vitest suite).

**Ports (logic upstream, framework layer ours):** `settings.js`
(settingsStore defaults/merge/persistence — storage key
`quad-box-settings` and JSON shape unchanged), `analytics.js` (scoring),
`feedback.js` (feedback state machines), `game.js`
(DefaultGame/TallyGame flow: timings, guards, scoring, auto-progression),
`cube.js` (Grid/Cell/Frame/VisualCrank rendering), `audio.js` (howler →
plain `Audio`, same asset layout).

**Ours:** `../../quadbox.html` + `page.js` (Cerevana chrome and wiring),
`../../css/quadbox.css` (board CSS, geometry from upstream scaled 0.68×).

**Assets (upstream):** `audio/` (voice packs), `sprites/shapes.html`
(shape pool), `frame-dark.svg`/`frame-light.svg` (lattice, retinted to
Cerevana's accent).

**Vendored deps (for generated image stimuli):** `js/lib/d3-delaunay.esm.js`,
`delaunator.esm.js`, `robust-predicates.esm.js`, `d3-shape.esm.js`,
`d3-path.esm.js` — ISC, see `js/lib/LICENSE-d3-stimuli.txt`.

## Data (NEVER rename)

localStorage `quad-box-settings` (versioned, `engine/migrations/`);
IndexedDB `QuadBoxNBack` v1, store `games` (indexes status / timestamp /
status_timestamp). Both identical to upstream, so pre-restructuring user
data (and data from the upstream app) loads unchanged.

## Engine checksums (sha256 at promotion, upstream commit 83a9718)

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

(Note: `shapeSvgPool.js` and cutover path fixes postdate these sums;
`git log js/quadbox/engine/` is the authoritative change record.)
