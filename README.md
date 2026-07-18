# Cerevana

**Live at [cerevana.com](https://cerevana.com)** - free, no account needed.

Cerevana is an open, local-first brain-training app that unites multiple
evidence-based cognitive exercises under one roof. Today that's **RRT**
(relational reasoning), **N-Back** (working memory - one merged game
taking the best of the modern Quad Box protocol and the classic Brain
Workshop one), and **CCT** (Cognitive Control Training - adaptive-interval
serial addition); the ambition is one place for the whole training stack.
It is a plain static site - no build step, no dependencies, no accounts -
and all of your data stays in your browser (localStorage and IndexedDB).

## The exercises

### RRT

*Trains: fluid reasoning - relational integration, logical inference and
mental-model building under time pressure.*

Relational reasoning training: read a set of premises like "A is north-east
of B", hold the relations in mind, and judge whether a conclusion follows.
Question types include distinction (same/opposite), linear orderings,
syllogisms, and spatial reasoning in 2D, 3D and 4D, with optional transforms,
negation, and anti-strategy scrambling. Play untimed, or against a timer with
auto-progression that raises premise count and tightens the clock as your
accuracy holds up.

### N-Back

*Trains: working memory - continuous updating, attention control and
interference resolution.*

One n-back, best of both worlds. The core is the modern community
protocol, built to resist the strategies that make n-back gameable:
positions on a rotating 3D cube, audio, colors, shapes and unnameable
generated images tracked simultaneously, deliberate n±1 interference
lures, variable N, and self-paced tally modes where you enter the
*count* of matches instead of reacting to each one - with tunable
auto-progression and per-mode levels. On top of it, the classic Brain
Workshop mode families: Position/Sound/Color presets, cross-modal
combination modes, arithmetic modes (a number is shown, an operation is
spoken, and you type the answer against the number from N back),
multi-square tracking, a Jaeggi mode reproducing the original-study
protocol, and crab / self-paced variants - plus an optional daily level
reset and a choice between recorded voices and your browser's speech
synthesis. Built on the game engine of soamsy's Quad Box (see Credits);
the classic modes reimplement Brain Workshop's protocol without sharing
any code with it. Implementation notes and the classic-mode protocol
spec live in [`nback-spec.md`](nback-spec.md).

### CCT

*Trains: cognitive control - divided attention, processing speed and
resistance to interference under time pressure.*

Cognitive Control Training: the classic PASAT (Paced Auditory Serial
Addition Test) protocol. Digits from 1–9 play one at a time - for each new
one, answer with the result of it and the digit right before it (addition
by default; multiplication, subtraction and difference are also available).
The pace is adaptive: answer streaks speed the interval up, miss streaks
slow it back down, clamped between a configurable floor and ceiling. Choose
from four pre-recorded voice packs and an adjustable playback speed. Core
mechanics adapted from tim22dev22's CCT (see Credits).

## Roadmap

The goal is to grow Cerevana into one roof for the training methods the
[Mindbuilding community](https://discord.gg/brain) has converged on.
Possible future exercises - no promises, in no particular order - include
3D Multiple Object Tracking, the Posner task, and UFOV. Suggestions and
implementations are welcome.

## Features

- Main menu with a live overview of the exercises: active profile, totals,
  accuracy and recent results at a glance.
- Studies library: browse, search and filter the research behind cognitive
  training, collected by the Mindbuilding community.
- Transfer page: log your scores on an external test battery (fluid
  intelligence, working memory, general aptitude, personality/mental
  control) before starting training and again after 4-6+ months, and see
  each test's baseline-to-latest delta - flagged if retested too soon to be
  reliable - next to how much RRT/N-Back/CCT training happened in that same
  window.
- In-app Credits page with the full attribution: exercise lineage, protocol
  sources and bundled assets.
- Per-exercise profiles, each with its own settings and progress.
- Profile sharing via URL - copy a share link on one device, paste it into
  the Import box on another.
- History export/import to a JSON file, with **merge** (timestamp-deduplicated)
  or **overwrite** semantics, covering score, question history, progress-graph
  data, all n-back games, all CCT sessions and all logged test-battery scores
  (older export files remain importable).
- The same four corner panels on every game page: Settings, History (RRT's
  per-question log; N-Back's per-game list with score chips; CCT's
  per-session list with accuracy chips), Info (how to play, keyboard
  shortcuts, credits, resets) and Graphs.
- Progress graphs: time spent, average correct times, premise speed and totals
  for RRT; per-mode level history and daily time spent for N-Back, with
  pre-merge sessions shown as legacy lines; accuracy-per-session and daily
  time spent for CCT.
- Timers with auto-progression (RRT), adaptive per-mode levels (N-Back), and
  an adaptive answer interval (CCT).
- Daily and weekly play-time goals for every exercise - progress bars beside
  the play area on RRT and CCT, HUD and history readouts on N-Back - plus a
  combined tracker on the main menu that sums the goals you've set across
  exercises and derives a monthly target from them.
- A calm, focus-first look in both dark and light: one restrained accent,
  spent only where attention is earned (selected states, the active tab, the
  timer). The accent hue is **yours to choose** - a slider in the menu's
  Appearance section recolours the whole app (both themes, every page) from a
  single hue, defaulting to the original sage-teal; every shade is derived at
  fixed saturation/lightness so it stays WCAG-AA readable at any hue. The
  correct/wrong colours are tuned against a colour-blindness simulation -
  always paired with a word, never colour alone. Custom background image and
  sound effects.
- Desktop launcher installer for Linux (`create-shortcut.sh`) that serves the
  app locally and opens it in its own app window.

## Running locally

No build step, no dependencies - it's a static site. Serve the folder over
localhost (the History API and IndexedDB behave better than on `file://`):

```bash
python3 -m http.server 8080
```

then open http://localhost:8080. For an app-like window:

```bash
chromium --app=http://localhost:8080
```

Or run `./create-shortcut.sh` once to install a "Cerevana" entry in your
application launcher that does both.

## Contributing

Issues and pull requests are welcome. The codebase is deliberately simple:
plain HTML/CSS/JS, no build step, no framework - clone, serve, edit, reload.
Shared UI building blocks (settings rows, panels, tooltips) are native web
components in `js/components/` - light-DOM custom elements, one small file
each, no compiler involved.
Note the license below is **NonCommercial** (inherited from the Syllogimous
lineage), so contributions land under CC BY-NC 3.0 too.

Development happens on `dev`, which auto-deploys to a preview at
[cerevana-dev.fly.dev](https://cerevana-dev.fly.dev) on every push; `main`
is release-only and only moves via pull request. Every push to `dev` and
every PR into `main` runs the same gate: ESLint, Stylelint, html-validate,
a gitleaks secret scan, four pure-logic test suites (`tests/*.mjs`), and a
headless-browser smoke test that loads every page and checks for console
errors.

## Credits

**RRT** is built directly on **Syllogimous**: created by
[4skinSkywalker](https://github.com/4skinSkywalker/), developed into
Syllogimous-v3 by [ikokusovereignty](https://github.com/ikokusovereignty/),
and forked and refined by [soamsy](https://github.com/soamsy/) -
[soamsy/Syllogimous-v3](https://github.com/soamsy/Syllogimous-v3) is the
codebase Cerevana grew from
([playable original](https://soamsy.github.io/Syllogimous-v3/)).
[giladkingsley](https://github.com/giladkingsley/) is also a credited
Syllogimous contributor.

**N-Back** merges two lineages. It is built on the game engine of
[soamsy/quad-box](https://github.com/soamsy/quad-box)
(MIT, [playable original](https://quad-box.netlify.app)) by
[soamsy](https://github.com/soamsy/) - the same developer behind the
Syllogimous-v3 fork RRT grew from; the engine lives in
`js/quadbox/engine/` with per-file MIT attribution headers and its
license at `js/quadbox/LICENSE` (full provenance in
`js/quadbox/PROVENANCE.md`). Its classic mode families are inspired by
**Brain Workshop** by Paul Hoskinson with Jonathan Toomim
([brainworkshop.sourceforge.net](https://brainworkshop.sourceforge.net/),
[maintained fork](https://github.com/brain-workshop/brainworkshop)) -
Cerevana reimplements the protocol in JavaScript and shares no code with
Brain Workshop.

**CCT**'s core mechanics - the adaptive-interval PASAT rule - are adapted
from [tim22dev22/CCT](https://github.com/tim22dev22/CCT) (MIT,
[playable original](https://tim22dev22.github.io/CCT/)); the derived files
live in `js/cct/engine/` with per-file MIT attribution headers and their
license at `js/cct/LICENSE` (full provenance in `js/cct/PROVENANCE.md`).
The four pre-recorded voice packs (`js/cct/audio/`) are vendored from the
same source under the same MIT license. CCT's own README credits "EEE" for
supplying its original source code.

The menu background photo is by
[Simon Berger on Pexels](https://www.pexels.com/photo/photography-of-mountains-under-cloudy-sky-1183099/)
(Pexels License, free to use), bundled locally as `img/menu-bg.jpg`.

The favicon and app icon are the Cerevana head logo, created with
[Canva Pro](https://www.canva.com/) and used under the
[Canva Content License](https://www.canva.com/policies/content-license-agreement/);
bundled as `favicon.png` and `img/icon-512.png`. Note: the logo is licensed
separately from the app - the repository's CC BY-NC license does not apply
to it.

The body typeface is [Space Grotesk](https://github.com/floriankarsten/space-grotesk)
by Florian Karsten, licensed under the
[SIL Open Font License 1.1](fonts/OFL-SpaceGrotesk.txt) and bundled locally.
The header/logo typeface is [Zen Dots](https://fonts.google.com/specimen/Zen+Dots)
by Yoshimichi Ohira, the display/HUD typeface is
[Oxanium](https://github.com/sevmeyer/oxanium) by Severin Meyer, and the
monospace typeface is
[JetBrains Mono](https://github.com/JetBrains/JetBrainsMono) by JetBrains, and
the CEREVANA wordmark on the menu is set in
[Format 1452](https://github.com/velvetyne/Format_1452) by
Frank Adebiaye (Velvetyne) -
all licensed under the SIL Open Font License 1.1
([Zen Dots](fonts/OFL-ZenDots.txt), [Oxanium](fonts/OFL-Oxanium.txt),
[JetBrains Mono](fonts/OFL-JetBrainsMono.txt),
[Format 1452](fonts/OFL-Format1452.txt)) and bundled locally.

Bundled libraries, all vendored in `js/lib/`:
[Chart.js](https://www.chartjs.org/) (MIT) for the progress graphs, and -
for Quad Box's generated image stimuli -
[d3-delaunay](https://github.com/d3/d3-delaunay)/[delaunator](https://github.com/mapbox/delaunator)/[robust-predicates](https://github.com/mourner/robust-predicates)
and [d3-shape](https://github.com/d3/d3-shape)/[d3-path](https://github.com/d3/d3-path)
(ISC, see [js/lib/LICENSE-d3-stimuli.txt](js/lib/LICENSE-d3-stimuli.txt)).

## License

[Attribution-NonCommercial 3.0 Unported (CC BY-NC 3.0)](LICENSE) - inherited
from the Syllogimous lineage. See [LICENSE](LICENSE) for the terms and the
provenance of each exercise.
