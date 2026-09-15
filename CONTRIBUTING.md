# Contributing to Cerevana

Issues and pull requests are welcome. This guide is everything you need to
get a change merged.

## Get it running

There is no build step, no `package.json`, no dependencies - clone, serve,
edit, reload:

```bash
git clone https://github.com/nyman-i/cerevana.git
cd cerevana
python3 -m http.server 8080
```

Open <http://localhost:8080>. Any static file server works; the app must be
served over HTTP (opening `index.html` as a `file://` URL breaks the ES
modules).

All user data lives in the browser (localStorage + IndexedDB), so there is
no backend to set up and nothing to configure.

## Run the checks before you push

CI runs exactly this, and a PR can't merge until it passes. The linters are
installed on the fly so they never become project dependencies:

```bash
npm install --no-save --no-package-lock eslint@9 @eslint/js@9 \
  stylelint@16 stylelint-config-standard@36 html-validate@8
npx eslint .
npx stylelint "css/**/*.css" --config .stylelintrc.js
npx html-validate --config .htmlvalidate.js *.html

node tests/cct-pure.mjs
node tests/nback-pure.mjs
node tests/rrt-pure.mjs
node tests/testtracker-pure.mjs
node --experimental-test-module-mocks --test tests/quadbox-pure.mjs
node tests/smoke.mjs
```

The `*-pure.mjs` suites are pure logic, no DOM. `tests/smoke.mjs` is the one
check that runs the real app: it spawns its own static server and headless
Chrome, loads every page and fails on console errors - so it needs Node 22+
and a `chromium`/`google-chrome` binary on your `PATH`. CI also runs a
gitleaks secret scan.

Changing game logic? Add a case to the matching `tests/*-pure.mjs` in the
same commit.

## Open the pull request

Fork the repo, branch off `main`, and open the PR against `main`. (`dev` is
the maintainer's branch - it auto-deploys to a preview - so don't target
it.)

On your **first** PR, GitHub holds the CI run until a maintainer clicks
"Approve and run". If your checks look stuck before they ever start, that's
why - say so in the PR and it'll get approved.

Keep PRs focused: one change per PR, and a title that says what it does.

## House rules

The codebase is deliberately small and obvious. A change should be findable
by opening *one* file.

- **No dependencies and no build step.** Chart.js and the d3 stimulus libs
  are vendored in `js/lib/`; nothing else gets added. Plain HTML/CSS/JS.
- **Many small single-purpose files over few big ones.** Split a file when
  it stops being scannable; don't grow one with speculative abstractions.
- **Reuse what's there.** Shared behavior lives in `js/shared/`, shared
  markup in `js/components/` (native web components, light DOM, one small
  file each). Each exercise folder (`js/rrt/`, `js/quadbox/`, `js/cct/`)
  never imports from another exercise.
- **Support dark and light mode.** Light mode is the `light-mode` class on
  `<body>`. Reuse the existing CSS classes and design tokens rather than
  inventing new ones.
- **Never bare-rename a stored key.** The app is live at
  [cerevana.com](https://cerevana.com) and all data is in real users'
  browsers - localStorage keys, IndexedDB database/store names and the
  export format need a migration path, never a rename. (The historical
  `sllgms-v3-` prefix and the `js/quadbox/` path stay for that reason.)
- **Don't touch attribution.** The MIT headers in `js/quadbox/engine/` and
  `js/cct/engine/`, the `PROVENANCE.md` files, `js/*/LICENSE`, and the
  credit lines in `README.md`, `credits.html` and the in-app info sidebars
  are license obligations. Brain Workshop is credited as *inspiration* -
  never copy its code.
- **Update `README.md`** in the same PR if you change user-facing behavior.

`README.md` has the page/code map if you're looking for where something
lives.

## License

Cerevana is **CC BY-NC 3.0** (NonCommercial, inherited from the Syllogimous
lineage) - see [`LICENSE`](LICENSE). By opening a pull request you agree
your contribution ships under that license too.
