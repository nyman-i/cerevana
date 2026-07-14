---
name: verify
description: Build/launch/drive recipe for verifying changes to this static web app end-to-end in headless Chrome.
---

# Verifying Syllogimous-v3 changes

Pure static site — no build. Serve + drive headless Chrome over raw CDP (no deps; Node 22+ has global WebSocket, no Playwright installed).

## Launch

```bash
python3 -m http.server 8080 &                 # from repo root
google-chrome --headless=new --remote-debugging-port=9222 \
  --user-data-dir=$SCRATCH/profile --no-first-run &
# CDP: fetch http://localhost:9222/json → connect page's webSocketDebuggerUrl,
# then Runtime.evaluate / Page.* / DOM.setFileInputFiles.
```

A working driver template lives in session scratchpads as `verify-import-export.mjs` (export/import history feature); copy its send/evaluate/waitFor/dialog plumbing.

## Gotchas learned the hard way

- **Answering questions**: wait for `processingAnswer === false && !!question` before clicking `trueButton`/`falseButton`, then wait for `appState.questions.length` to increment. Fixed sleeps are flaky.
- **Timer mode**: RRT progress-graph rows are only written when the timer is on. Enable via `timerToggle.click()` (it listens to *click*, not change). Toggle state resets after a storage wipe + reload — re-enable for later steps.
- **`DOM.setFileInputFiles` fires the `change` event itself** — do NOT also dispatch one manually or handlers run twice, concurrently.
- **Dialogs**: `Page.enable`, then auto-accept via `Page.handleJavaScriptDialog` on `Page.javascriptDialogOpening`; record messages as evidence.
- **Downloads**: `Page.setDownloadBehavior {behavior:'allow', downloadPath}` (page-level works).
- `resetApp()` works (db.js's shared connection closes itself on `versionchange`); CDP `Storage.clearDataForOrigin {origin:'http://localhost:8080', storageTypes:'all'}` + `Page.navigate` is an alternative fresh-device simulation that skips the confirm dialog.
- `Runtime.evaluate` during a navigation returns a CDP error response (`r.error`, no `r.result`) — tolerate it in wait loops.

## State to inspect

- localStorage `sllgms-v3-app-state` → `appState.score`, `appState.questions`
- IndexedDB `SyllDB`/`RRTHistory` → `await getAllRRTProgress()` (global from js/db.js)
- History list DOM: `#history-list` children
