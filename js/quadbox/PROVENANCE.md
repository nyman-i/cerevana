# Cerevana N-Back — provenance

Cerevana's **N-Back** exercise is one merged game with two lineages:

1. **Engine**: built on the game engine of
   **[soamsy/quad-box](https://github.com/soamsy/quad-box)** (MIT, see
   `LICENSE` in this directory), by soamsy — the same developer behind
   the Syllogimous-v3 fork Cerevana's RRT grew from. Vendored
   2026-07-16 as a Svelte app, restructured 2026-07-17 into plain JS,
   then merged with the classic exercise. The engine **has since
   diverged from upstream** as part of the merged game — it is Cerevana
   code now, with MIT attribution headers kept on every derived file.
2. **Classic protocol**: the classic mode families (Position/Sound
   presets, Combination, Arithmetic, Jaeggi, Multi-Square, crab,
   self-paced, daily reset) reimplement the protocol of **Brain
   Workshop** (Paul Hoskinson & Jonathan Toomim, GPL-2.0). Cerevana
   shares **no code** with Brain Workshop — `classic.js` is original
   Cerevana code (its precursor lived at `js/nback/game.js`; protocol
   details in `nback-spec.md`) and Brain Workshop is credited as
   inspiration only. Classic code must never be pasted into files
   carrying quad-box MIT headers' upstream-derived sections, and no
   Brain Workshop source may ever be copied.

- Upstream engine base: https://github.com/soamsy/quad-box, commit
  `83a9718b371a2a747760dceac047b379a80a3ac5` (2025-11-08).
- Divergences from upstream are marked in each engine file's header
  ("Cerevana changes: …") and covered by regression tests:
  `node --experimental-test-module-mocks --test tests/quadbox-pure.mjs`
  (engine, including Cerevana changes) and `node tests/nback-pure.mjs`
  (classic generators). Update the tests in the same commit as any
  deliberate engine change.

## File map

**`engine/`** — quad-box-derived core (MIT headers): generation
(`nbackGame.js`, `nback.js`), pools (`constants.js`), persistence
(`gamedb.js` — scoring metadata, ncalc), auto-progression, stimulus art
(`svg.js`, `voronoi.js`, `generative.js`, `gradient.js`,
`shapeSvgPool.js`, `trialUtils.js`), settings migrations. Cerevana
changes so far: explicit `gameSettings.title`, optional position
stimulus.

**Ports (upstream logic, framework layer rewritten, since extended):**
`settings.js` (defaults/merge/persistence + merged-mode defaults, voice,
daily reset), `analytics.js` (scoring), `feedback.js` (tag-list
feedback), `game.js` (game flow + arithmetic input, self-paced, Jaeggi
scoring), `cube.js` (board rendering + text stimuli, center overlay,
timed multi-position), `audio.js` (plain `Audio` + browser-voice TTS).

**Original Cerevana:** `classic.js` (classic mode generation + registry),
`profiles.js` (profile bridge), `page.js`, `../../nback.html`,
`../../css/quadbox.css`.

**Assets (upstream):** `audio/` (voice packs), `sprites/shapes.html`.
(The board lattice is an inline SVG in `cube.js`, accent-tinted via CSS.)

**Vendored deps (generated image stimuli):** `js/lib/d3-delaunay.esm.js`,
`delaunator.esm.js`, `robust-predicates.esm.js`, `d3-shape.esm.js`,
`d3-path.esm.js` — ISC, see `js/lib/LICENSE-d3-stimuli.txt`.

## Data (NEVER rename)

- localStorage `quad-box-settings` (versioned via `engine/migrations/`;
  merged-game keys are additive) — the live settings store.
- IndexedDB `QuadBoxNBack` v1, store `games` — all merged-game records
  (classic modes record here too, with their own titles/tags).
- localStorage `sllgms-v3-nback-profiles` / `sllgms-v3-nback-selected-profile`
  — profiles; each carries the merged settings blob under `data.quadbox`.
- IndexedDB `SyllDB`/`NBackHistory` — read-only legacy Brain
  Workshop-era sessions (still graphed, exported and importable).

Records and settings from the upstream quad-box app still load
unchanged.
