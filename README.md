# Cerevana

Cerevana is an open, local-first brain-training app that unites multiple
evidence-based cognitive exercises under one roof. Today that's **RRT**
(relational reasoning) and **Dual N-Back** (working memory); the ambition is
one place for the whole training stack. It is a plain static site — no build
step, no dependencies, no accounts — and all of your data stays in your
browser (localStorage and IndexedDB).

## The exercises

### RRT

Relational reasoning training: read a set of premises like "A is north-east
of B", hold the relations in mind, and judge whether a conclusion follows.
Question types include distinction (same/opposite), linear orderings,
syllogisms, and spatial reasoning in 2D, 3D and 4D, with optional transforms,
negation, and anti-strategy scrambling. Play untimed, or against a timer with
auto-progression that raises premise count and tightens the clock as your
accuracy holds up.

### Dual N-Back

The classic dual n-back protocol: squares light up on a 3×3 grid while
letters are spoken, and you signal whenever the position or the sound matches
the one from N trials back. The level adapts per mode based on your session
scores; a Jaeggi mode reproduces the original-study protocol, and a manual
mode lets you play any level freely. Beyond the classic dual mode there are
color and combination variants, arithmetic modes (a number is shown, an
operation is spoken, and you type the answer against the number from N back),
multi-square tracking, and anti-strategy options like variable-N, crab and
self-paced play, with tunable progression thresholds and an optional daily
level reset.

## Roadmap

The goal is to grow Cerevana into one roof for the training methods the
[Mindbuilding community](https://discord.gg/brain) has converged on.
Possible future exercises — no promises, in no particular order — include
Cognitive Control Training (CCT), 3D Multiple Object Tracking, the Posner
task, and UFOV. Suggestions and implementations are welcome.

## Features

- Main menu with a live overview of both exercises: active profile, totals,
  accuracy and recent results at a glance.
- Studies library: browse, search and filter the research behind cognitive
  training, collected by the Mindbuilding community.
- In-app Credits page with the full attribution: exercise lineage, protocol
  sources and bundled assets.
- Per-exercise profiles, each with its own settings and progress.
- Profile sharing via URL — copy a share link on one device, paste it into
  the Import box on another.
- History export/import to a JSON file, with **merge** (timestamp-deduplicated)
  or **overwrite** semantics, covering score, question history, progress-graph
  data and n-back sessions.
- Progress graphs: time spent, average correct times, premise speed and totals
  for RRT; per-mode level and score history for N-Back.
- Timers with auto-progression (RRT) and adaptive levels (N-Back).
- Dark and light themes, custom background image, sound effects.
- Desktop launcher installer for Linux (`create-shortcut.sh`) that serves the
  app locally and opens it in its own app window.

## Running locally

No build step, no dependencies — it's a static site. Serve the folder over
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
plain HTML/CSS/JS, no build step, no framework — clone, serve, edit, reload.
Note the license below is **NonCommercial** (inherited from the Syllogimous
lineage), so contributions land under CC BY-NC 3.0 too.

## Credits

**RRT** is built directly on **Syllogimous**: created by
[4skinSkywalker](https://github.com/4skinSkywalker/), developed into
Syllogimous-v3 by [ikokusovereignty](https://github.com/ikokusovereignty/),
and forked and refined by [soamsy](https://github.com/soamsy/) —
[soamsy/Syllogimous-v3](https://github.com/soamsy/Syllogimous-v3) is the
codebase Cerevana grew from
([playable original](https://soamsy.github.io/Syllogimous-v3/)).
[giladkingsley](https://github.com/giladkingsley/) is also a credited
Syllogimous contributor.

**Dual N-Back** is inspired by **Brain Workshop** by Paul Hoskinson with
Jonathan Toomim ([brainworkshop.sourceforge.net](https://brainworkshop.sourceforge.net/),
[maintained fork](https://github.com/brain-workshop/brainworkshop)).
Cerevana reimplements the protocol in JavaScript and shares no code with
Brain Workshop.

The menu background photo is by
[Simon Berger on Pexels](https://www.pexels.com/photo/photography-of-mountains-under-cloudy-sky-1183099/)
(Pexels License, free to use), bundled locally as `img/menu-bg.jpg`.

The favicon and app icon are the Cerevana circuit-head logo, provided by the
project maintainer and bundled locally as `favicon.png` and `img/icon-512.png`.

The body typeface is [Space Grotesk](https://github.com/floriankarsten/space-grotesk)
by Florian Karsten, licensed under the
[SIL Open Font License 1.1](fonts/OFL-SpaceGrotesk.txt) and bundled locally.
The header/logo typeface is [Zen Dots](https://fonts.google.com/specimen/Zen+Dots)
by Yoshimichi Ohira, the display/HUD typeface is
[Oxanium](https://github.com/sevmeyer/oxanium) by Severin Meyer, and the
monospace typeface is
[JetBrains Mono](https://github.com/JetBrains/JetBrainsMono) by JetBrains —
all licensed under the SIL Open Font License 1.1
([Zen Dots](fonts/OFL-ZenDots.txt), [Oxanium](fonts/OFL-Oxanium.txt),
[JetBrains Mono](fonts/OFL-JetBrainsMono.txt)) and bundled locally.

## License

[Attribution-NonCommercial 3.0 Unported (CC BY-NC 3.0)](LICENSE) — inherited
from the Syllogimous lineage. See [LICENSE](LICENSE) for the terms and the
provenance of each exercise.
