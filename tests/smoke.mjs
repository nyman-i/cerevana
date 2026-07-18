// Smoke test: every real page loads cleanly in a real browser, with no
// uncaught JS errors and its key content actually rendered. Run with:
// node tests/smoke.mjs
//
// Pure-logic tests (cct-pure.mjs, nback-pure.mjs, quadbox-pure.mjs,
// rrt-pure.mjs) never touch a DOM, so none of them would catch a broken
// cross-file reference, a malformed-HTML parse issue, or a failed page-load
// fetch. This is the only committed check that actually runs the app.
//
// Self-contained: spawns its own static file server + headless Chrome and
// drives it over raw CDP/WebSocket (no Playwright/Puppeteer — matches
// CLAUDE.md's no-dependencies rule and the project's `verify` skill, whose
// documented gotchas this follows: wait for real conditions instead of fixed
// sleeps, auto-accept JS dialogs, tolerate mid-navigation Runtime.evaluate
// errors, --disable-gpu for headless stability).
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const HTTP_PORT = 8099
const CDP_PORT = 9299
const BASE = `http://localhost:${HTTP_PORT}`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let fail = 0
const assert = (c, l) => { console.log((c ? 'PASS' : 'FAIL') + ' - ' + l); if (!c) fail++ }

async function waitFor(condFn, { timeout = 5000, interval = 100 } = {}) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await condFn()) return true
    await sleep(interval)
  }
  return false
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl)
    ws.addEventListener('open', () => resolve(ws))
    ws.addEventListener('error', reject)
  })
}

let msgId = 0
function send(ws, method, params = {}, sessionId) {
  return new Promise((resolve) => {
    const id = ++msgId
    const handler = (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id === id) { ws.removeEventListener('message', handler); resolve(msg.result ?? msg.error) }
    }
    ws.addEventListener('message', handler)
    const payload = { id, method, params }
    if (sessionId) payload.sessionId = sessionId
    ws.send(JSON.stringify(payload))
  })
}

async function evaluate(ws, sessionId, expression) {
  const result = await send(ws, 'Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId)
  return result?.result?.value
}

async function main() {
  const httpLog = []
  const httpServer = spawn('python3', ['-m', 'http.server', String(HTTP_PORT)], { cwd: ROOT })
  httpServer.stdout?.on('data', (d) => httpLog.push(d))
  httpServer.stderr?.on('data', (d) => httpLog.push(d))

  const profileDir = mkdtempSync(path.join(tmpdir(), 'cerevana-smoke-'))
  const chromeBin = process.env.CHROME_BIN || 'google-chrome'
  const chrome = spawn(chromeBin, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-sandbox',
    `--remote-debugging-port=${CDP_PORT}`, '--remote-debugging-address=127.0.0.1',
    `--user-data-dir=${profileDir}`,
  ])
  const chromeLog = []
  chrome.stdout?.on('data', (d) => chromeLog.push(d))
  chrome.stderr?.on('data', (d) => chromeLog.push(d))

  try {
    const httpReady = await waitFor(async () => {
      try { return (await fetch(`${BASE}/index.html`)).ok } catch { return false }
    }, { timeout: 10000 })
    assert(httpReady, 'local static server came up')
    if (!httpReady) throw new Error('http server never became ready')

    let info
    const cdpReady = await waitFor(async () => {
      try { info = await (await fetch(`http://localhost:${CDP_PORT}/json/version`)).json(); return true } catch { return false }
    }, { timeout: 10000 })
    assert(cdpReady, 'headless Chrome CDP endpoint came up')
    if (!cdpReady) throw new Error('chrome never became ready: ' + Buffer.concat(chromeLog).toString())

    const browserWs = await connect(info.webSocketDebuggerUrl)
    const { targetId } = await send(browserWs, 'Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await send(browserWs, 'Target.attachToTarget', { targetId, flatten: true })
    await send(browserWs, 'Page.enable', {}, sessionId)
    await send(browserWs, 'Runtime.enable', {}, sessionId)

    let pageErrors = []
    browserWs.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.method === 'Runtime.exceptionThrown') {
        pageErrors.push(msg.params.exceptionDetails.text + ': ' + JSON.stringify(msg.params.exceptionDetails.exception?.description ?? ''))
      }
      if (msg.method === 'Page.javascriptDialogOpening') {
        send(browserWs, 'Page.handleJavaScriptDialog', { accept: true }, sessionId)
      }
    })

    const checkPage = async (name, path, extraCheck) => {
      pageErrors = []
      await send(browserWs, 'Page.navigate', { url: `${BASE}/${path}` }, sessionId)
      const loaded = await waitFor(() => evaluate(browserWs, sessionId, 'document.readyState === "complete"'), { timeout: 8000 })
      assert(loaded, `${name}: page reaches readyState=complete`)
      await sleep(300) // let post-load async work (profile bridge, appStateStartup) settle
      if (extraCheck) await extraCheck()
      assert(pageErrors.length === 0, `${name}: no uncaught JS errors`)
      if (pageErrors.length) console.log('  ' + pageErrors.join('\n  '))
      const popupVisible = await evaluate(browserWs, sessionId, `document.getElementById('error-popup')?.style.display === 'flex'`)
      assert(!popupVisible, `${name}: app's own error popup never shown`)
    }

    await checkPage('index.html', 'index.html', async () => {
      const cards = await evaluate(browserWs, sessionId, `document.querySelectorAll('.menu-card').length`)
      assert(cards === 3, 'index.html: all 3 exercise cards render (RRT/N-Back/CCT)')
    })

    await checkPage('rrt.html', 'rrt.html', async () => {
      const ready = await waitFor(() => evaluate(browserWs, sessionId, 'typeof question !== "undefined" && !!question'), { timeout: 5000 })
      assert(ready, 'rrt.html: a question actually generates')
      const buttonsExist = await evaluate(browserWs, sessionId, `!!document.getElementById('true-button') && !!document.getElementById('false-button')`)
      assert(buttonsExist, 'rrt.html: TRUE/FALSE buttons render')
    })

    await checkPage('nback.html', 'nback.html', async () => {
      const hasStart = await evaluate(browserWs, sessionId, `!!document.getElementById('qb-start')`)
      assert(hasStart, 'nback.html: START button renders')
    })

    await checkPage('cct.html', 'cct.html', async () => {
      const hasStart = await evaluate(browserWs, sessionId, `!!document.getElementById('cct-start')`)
      assert(hasStart, 'cct.html: START button renders')
    })

    await checkPage('studies.html', 'studies.html', async () => {
      const loaded = await waitFor(() => evaluate(browserWs, sessionId, `document.getElementById('studies-list')?.children.length > 0`), { timeout: 5000 })
      assert(loaded, 'studies.html: study list renders after its data/studies.md fetch completes')
    })

    await checkPage('credits.html', 'credits.html', async () => {
      const heading = await evaluate(browserWs, sessionId, `document.querySelector('h1')?.textContent`)
      assert(heading?.trim() === 'CREDITS', 'credits.html: main heading renders')
    })

    // quadbox.html is a redirect stub (<meta http-equiv="refresh">), not a real page
    pageErrors = []
    await send(browserWs, 'Page.navigate', { url: `${BASE}/quadbox.html` }, sessionId)
    const redirected = await waitFor(() => evaluate(browserWs, sessionId, 'location.pathname.endsWith("/nback.html")'), { timeout: 5000 })
    assert(redirected, 'quadbox.html: redirects to nback.html')
  } finally {
    httpServer.kill()
    chrome.kill()
    try { rmSync(profileDir, { recursive: true, force: true }) } catch { /* best-effort cleanup */ }
  }

  console.log(fail ? fail + ' FAILURES' : 'ALL PASS')
  process.exit(fail ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(1) })
