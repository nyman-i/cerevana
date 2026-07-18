# Cerevana CCT - provenance

Cerevana's **CCT** (Cognitive Control Training) exercise mines its core
mechanics from **[tim22dev22/CCT](https://github.com/tim22dev22/CCT)**
(MIT, see `LICENSE` in this directory) - a PASAT-style serial-addition
trainer. CCT's own UI (settings panel, history table, hand-rolled SVG
charts, dashboard layout) was **not** ported; Cerevana's CCT reuses the
same page shell, settings-store, profile, history/chart, and export
conventions as RRT and N-Back instead. Only the game-mechanics layer -
the PASAT rule and its adaptive interval/streak state machine - was
lifted and restructured out of upstream's single 148KB global-scope
`script.js` into pure ES modules. Upstream's own footer credits "EEE"
for supplying its original source code; that lineage is noted here for
completeness but was not independently reviewed.

Pulled 2026-07-18 from the `main` branch of the upstream repo (no pinned
commit hash - the upstream repo has no tags/releases; re-pull and diff
`script.js` if attribution needs re-verifying).

## File map

**`engine/`** - pure upstream-derived mechanics (MIT headers):
`mechanics.js` (`getExpectedAnswer`, `randomDigit`, `isCorrectAnswer`,
the `recordAnswer`/`createIntervalState` adaptive-interval reducer -
restructured from upstream's global mutable state + DOM reads into pure
functions over an explicit state object; the clamp/threshold *logic* is
unchanged **except one Cerevana change**: upstream clamps the interval's
ceiling to `startingInterval` itself, so a session that starts with
wrong answers has nowhere to go - it's already at the ceiling. Cerevana
adds a separate `maximumInterval` setting so the interval can still
visibly rise above the starting pace on a bad streak), `migrations/`
(settings versioning, mirrors `js/quadbox/engine/migrations/`).

**Original Cerevana:** `settings.js`, `game.js`, `audio.js`,
`gamedb.js`, `profiles.js`, `page.js`, `../../cct.html`,
`../../css` additions - all written fresh against Cerevana's own
page-shell/settings-store/profile/history conventions (see
`js/quadbox/settings.js`, `js/quadbox/profiles.js`,
`js/shared/history-transfer.js` for the patterns followed). None of
CCT's original `script.js` DOM/rendering/persistence code was copied.

**Assets (upstream, MIT):** `audio/` - 4 pre-recorded voice packs
(`nathan`, `enhancednathan`, `samantha`, `siri4`), 9 digit clips each
(1-9, no 0), vendored verbatim from upstream's `audio/` directory.

## Data (NEVER rename)

- localStorage `cct-settings` (versioned via `engine/migrations/`) -
  the live settings store.
- IndexedDB `CCTHistory` v1, store `sessions` - every completed or
  exited CCT session (no minimum-duration/answer-count floor, unlike
  upstream - kept consistent with RRT/N-Back, which record everything).
- localStorage `sllgms-v3-cct-profiles` / `sllgms-v3-cct-selected-profile`
  - profiles; each carries the settings blob under `data.cct`.
