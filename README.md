# Cerevana

**Live at [cerevana.com](https://cerevana.com)** - free, no account needed.

Cerevana is an open, local-first Mindbuilding app that unites multiple
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
any code with it.

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
- Profile sharing via URL on every game page - copy a share link on one
  device, open it on another and the profile imports itself. Links always
  point at cerevana.com so they work for anyone, even when copied from a
  locally running copy.
- History export/import to a JSON file, with **merge** (timestamp-deduplicated)
  or **overwrite** semantics, covering score, question history, progress-graph
  data, all n-back games, all CCT sessions and all logged test-battery scores
  (the current and previous export format import; older ones don't).
- The same four corner panels on every game page: Settings (organized into
  the same collapsible sections on all three exercises), History (RRT's
  per-question log; N-Back's per-game list with score chips; CCT's
  per-session list with accuracy chips), Info (how to play, keyboard
  shortcuts, credits, resets) and Graphs.
- Progress graphs - one dedicated graph per metric: time spent, average
  correct times, premise speed and totals for RRT; per-mode level, accuracy,
  reaction time and daily time spent for N-Back; accuracy, response time and
  daily time spent for CCT.
- Stats page: every exercise's progress graphs gathered on one page over
  your full history (the game pages' popups show the recent window), plus a
  combined minutes-per-day chart across all three exercises - filterable to
  presets (last week/month/90 days/year) or any custom date range.
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
  sound effects. A main-font picker in the same Appearance section (Oxanium,
  JetBrains Mono, Zen Dots, or the default per-role mix) applies app-wide.
- Desktop launcher installer for Linux (`create-shortcut.sh`) that serves the
  app locally and opens it in its own app window - in Chrome (recommended,
  gets a real chromeless app window) or Firefox (opens as a normal browser
  window, since Firefox dropped its app-mode support). Works on any distro
  with a `.desktop`-entry-compatible desktop (GNOME, KDE, XFCE, Cinnamon,
  MATE, etc.) with `git`, `python3` and Chrome/Chromium or Firefox installed
  - not tied to a specific distro. A "Run Locally" panel on the main menu
  offers a one-line `curl | bash` install command for either browser, or a
  plain download of the script.
- Installable as a PWA: any browser's "Install app" adds Cerevana as a
  standalone window with its own icon (no service worker, so it still needs a
  connection - this is install convenience, not offline support).
- Mobile-friendly play: on phones the TRUE/FALSE controls become a fixed
  full-width bar in the thumb zone, panels and graphs go full-screen,
  landscape scrolls instead of clipping, and the UI respects notches and
  home-indicator safe areas in standalone/PWA mode. CCT reflows into a
  single column with a finger-sized answer grid (all 36 multiplication
  answers fit on screen) and defaults to on-screen keypad input on touch
  devices so the OS keyboard never covers the game. N-Back pins its match
  keys in an RRT-style edge-to-edge bar at the bottom of the screen (the
  corner tabs slide up to sit on the bar, whose height adapts to however
  many keys the mode needs), scales the board to the remaining space, gets
  a dedicated phone-landscape layout, adds an on-screen digit pad to the
  arithmetic modes (previously physical-keyboard-only), keeps the screen
  awake during a session, and offers an optional vibration cue on match
  presses. On iOS Safari all game audio (N-Back stimuli, CCT digits and
  beep, RRT sound effects) is unlocked during the session-start tap so
  Apple's autoplay policy doesn't silence timer-driven sounds, and the app
  requests persistent storage so Safari's 7-day inactivity cleanup doesn't
  evict training history.

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

Or, on Linux, run `./create-shortcut.sh` from a clone of this repo once to
install a "Cerevana" entry in your application launcher that does both - pass
`--browser=firefox` to launch in Firefox instead of the Chrome/Chromium
default (the script refuses to run on macOS/Windows). Without a local clone,
the same script is self-contained:

```bash
curl -fsSL https://cerevana.com/create-shortcut.sh | bash -s -- --browser=chrome
```

(`--browser=firefox` also works here) clones the app into
`~/.local/share/cerevana-app` first, then installs the launcher.

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
a gitleaks secret scan, five pure-logic test suites (`tests/*-pure.mjs`,
covering RRT, N-Back, Quad Box, CCT and the transfer tracker), and a
headless-browser smoke test (`tests/smoke.mjs`) that loads every page and
checks for console errors.

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
[Kieren Ridley on Pexels](https://www.pexels.com/photo/fog-over-green-forest-in-mountains-5407567/)
(Pexels License, free to use), bundled locally as `img/menu-bg.jpg`.

The favicon and app icon are the Cerevana head logo, created with
[Canva Pro](https://www.canva.com/) and used under the
[Canva Content License](https://www.canva.com/policies/content-license-agreement/);
bundled as `favicon.png`, `img/icon-512.png`, `img/icon-192.png` and
`img/apple-touch-icon.png` (the PWA/iOS icons). The social-preview image
`img/og-image.jpg` is the same logo set beside the CEREVANA wordmark (Format
1452, below). Note: the logo is licensed separately from the app - the
repository's CC BY-NC license does not apply to it.

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

The UI icons are [coolicons](https://github.com/krystonschwarze/coolicons)
by Kryston Schwarze (MIT), bundled as an icon webfont in `fonts/cool/`
(license: [fonts/cool/LICENSE-coolicons.txt](fonts/cool/LICENSE-coolicons.txt)).

Bundled libraries, all vendored in `js/lib/`:
[Chart.js](https://www.chartjs.org/) (MIT) for the progress graphs, with
[date-fns](https://github.com/date-fns/date-fns) and
[chartjs-adapter-date-fns](https://github.com/chartjs/chartjs-adapter-date-fns)
(both MIT, license: [js/lib/LICENSE-date-fns.txt](js/lib/LICENSE-date-fns.txt))
powering the Transfer chart's time axis; and - for Quad Box's generated image
stimuli -
[d3-delaunay](https://github.com/d3/d3-delaunay)/[delaunator](https://github.com/mapbox/delaunator)/[robust-predicates](https://github.com/mourner/robust-predicates)
and [d3-shape](https://github.com/d3/d3-shape)/[d3-path](https://github.com/d3/d3-path)
(ISC, see [js/lib/LICENSE-d3-stimuli.txt](js/lib/LICENSE-d3-stimuli.txt)).

## License

[Attribution-NonCommercial 3.0 Unported (CC BY-NC 3.0)](LICENSE) - inherited
from the Syllogimous lineage. See [LICENSE](LICENSE) for the terms and the
provenance of each exercise.
