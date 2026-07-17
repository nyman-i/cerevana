// Quad Box page controller (quadbox.html): wires the promoted engine +
// vanilla renderer into the shared Cerevana chrome. Settings/scoring/
// storage semantics come from js/quadbox/engine/ and settings.js
// (Quad Box by soamsy, MIT — js/quadbox/LICENSE).
import { getSettings, getGameSettings, updateSetting, setGameField, subscribe, resetSettings } from './settings.js'
import { getLastMonthGames, deleteDB } from './engine/gamedb.js'
import { BoardRenderer } from './cube.js'
import { QuadBoxGame, getNumberKeys, displayTitle } from './game.js'
import { createFeedback, createTallyFeedback } from './feedback.js'
import { analytics } from './analytics.js'

const $ = (id) => document.getElementById(id)

// ---- theme follows the app-wide setting (like every game page) ----
appStateStartup()
document.body.classList.toggle('light-mode', appState.darkMode === false)
applySavedBackground()
{
  const theme = appState.darkMode === false ? 'light' : 'dark'
  if (getSettings().theme !== theme) updateSetting('theme', theme)
}

// ---- board + game ----
const renderer = new BoardRenderer($('qb-stage'))
let builtFor = {}

const currentGrid = () => {
  const settings = getSettings()
  if (settings.mode === 'vtally') return 'visualCrank'
  return getGameSettings().grid ?? 'rotate3D'
}

const rebuildBoard = () => {
  const settings = getSettings()
  const spec = { grid: currentGrid(), theme: settings.theme, rotationSpeed: settings.rotationSpeed }
  if (spec.grid !== builtFor.grid || spec.theme !== builtFor.theme) {
    renderer.build(spec)
    builtFor = spec
  } else if (spec.rotationSpeed !== builtFor.rotationSpeed) {
    renderer.setRotationSpeed(spec.rotationSpeed)
    builtFor = spec
  }
}

const FEEDBACK_CLASSES = {
  success: 'nback__match--right',
  failure: 'nback__match--wrong',
  'late-failure': 'nback__match--missed',
}

const feedback = createFeedback((state) => {
  for (const [tag, value] of Object.entries(state)) {
    const btn = $(`qb-match-${tag}`)
    if (!btn) continue
    btn.classList.remove(...Object.values(FEEDBACK_CLASSES))
    if (FEEDBACK_CLASSES[value]) btn.classList.add(FEEDBACK_CLASSES[value])
    btn.disabled = value === 'disabled'
  }
})

const tallyFeedback = createTallyFeedback((state) => {
  for (const [count, value] of Object.entries(state)) {
    const btn = $(`qb-tally-${count}`)
    if (!btn) continue
    btn.classList.remove(...Object.values(FEEDBACK_CLASSES))
    if (FEEDBACK_CLASSES[value]) btn.classList.add(FEEDBACK_CLASSES[value])
  }
})

let game = null
game = new QuadBoxGame({
  renderTrial: (trial, opts) => renderer.renderTrial(trial, getSettings(), opts),
  cacheNext: (trial) => renderer.cacheNext(trial, getSettings()),
  setCrankIndex: (i) => renderer.setCrankIndex(i),
  applyFeedback: (u) => feedback.apply(u),
  resetFeedback: () => { feedback.reset(); renderer.clear() },
  applyTallyFeedback: (u) => tallyFeedback.apply(u),
  resetTallyFeedback: () => { tallyFeedback.reset(); renderer.clear() },
  onProgression: (kind) => {
    const hud = $('qb-hud')
    hud.style.backgroundColor = kind === 'advance' ? '#4c8434' : '#a6712c'
    setTimeout(() => { hud.style.backgroundColor = '' }, 2500)
  },
  setAnswer: (text, verdict) => {
    const line = $('qb-answer')
    line.textContent = `Answer: ${text}`
    line.classList.remove('nback__answer--right', 'nback__answer--wrong')
    if (verdict) line.classList.add(`nback__answer--${verdict}`)
  },
  onState: () => { if (game) refreshUi() },
})

// ---- HUD / keys / counter ----
// One key per active tag; the tag list comes from the generated game's meta,
// so engine, preset and classic modes all render the right keys for free.
const TAG_LABELS = {
  position: 'Position', color: 'Color', shape: 'Shape', image: 'Image', audio: 'Audio',
  visvis: 'Visual', visaudio: 'Vis & Audio', audiovis: 'Audio & Vis',
  position0: 'Blue', position1: 'Green', position2: 'Yellow', position3: 'Red',
}

const tagHotkey = (settings, tag) =>
  settings.hotkeys[tag] ?? (tag === 'image' ? settings.hotkeys.shape : '')

// Rebuilt only when settings change (rebuilding per-trial would wipe
// feedback classes and re-run feedback.configure's reset mid-game).
function renderKeys() {
  const settings = getSettings()
  const keysEl = $('qb-keys')
  keysEl.innerHTML = ''
  if (game.tally) {
    for (const count of getNumberKeys(game.gameDisplayInfo)) {
      const btn = document.createElement('button')
      btn.className = 'nback__match'
      btn.id = `qb-tally-${count}`
      btn.textContent = count
      btn.tabIndex = -1
      btn.addEventListener('click', () => game.handleCount(count))
      keysEl.appendChild(btn)
    }
  } else {
    const tags = (game.gameDisplayInfo.tags ?? []).filter(t => t !== 'arithmetic')
    for (const tag of tags) {
      const btn = document.createElement('button')
      btn.className = 'nback__match'
      btn.id = `qb-match-${tag}`
      const key = tagHotkey(settings, tag)
      btn.textContent = `${TAG_LABELS[tag] ?? tag}${key ? ` (${key})` : ''}`
      btn.tabIndex = -1
      btn.addEventListener('click', () => { game.checkForMatch(tag) })
      keysEl.appendChild(btn)
    }
    feedback.configure(tags, settings.feedback)
  }
  $('qb-answer').hidden = !game.gameDisplayInfo.arithmetic
}

function renderHud() {
  const info = game.gameDisplayInfo
  const settings = getSettings()
  const parts = []
  parts.push(`N ${info.rules === 'variable' ? '≤' : '='} ${info.nBack ?? getGameSettings().nBack}`)
  if (settings.mode === 'tally') {
    const gs = getGameSettings()
    const w = gs.enablePositionWidthSequence
      ? gs.positionWidthSequence.slice(0, gs.nBack).join(',')
      : gs.positionWidth
    parts.push(`W = ${w}`)
  }
  parts.push(displayTitle(info).toUpperCase())
  if (info.squares) parts[parts.length - 1] = `${info.squares}× MULTI`
  if (info.crab) parts.push('CRAB')
  if (info.selfPaced) parts.push('SP')
  const a = analytics.get()
  if (!game.isPlaying && a.lastGame?.total) {
    parts.push(`Last: ${(a.lastGame.total.percent * 100).toFixed(0)}%`)
    if (a.lastGame.total.averageTrialTime) {
      parts.push(`${(a.lastGame.total.averageTrialTime / 1000).toFixed(2)}s/t`)
    }
  }
  if (!game.isPlaying && a.playTime) {
    parts.push(`Today: ${a.playTime}`)
  }
  $('qb-hud').innerHTML = parts.map(p => `<div>${p}</div>`).join('')
}

function refreshUi() {
  rebuildBoard()
  renderHud()
  $('qb-start').textContent = game.isPlaying ? 'STOP' : 'START'
  $('qb-next').hidden = !(game.isPlaying && game.gameDisplayInfo.selfPaced && !game.tally)
  $('qb-count').textContent = game.trialDisplay()
}

analytics.subscribe(() => renderHud())
$('qb-start').addEventListener('click', () => game.toggleGame())
$('qb-next').addEventListener('click', () => game.advance())

// ---- settings panel ----
// Out-of-range input is ignored (upstream clampNumber behavior). Bounds
// come from the input's own min/max attributes — one source of truth, so
// a setter can never be handed an out-of-range or NaN value.
function clamp(value, min, max) {
  const v = +value
  if (isNaN(v) || v < min || v > max) return null
  return v
}

// setters receive an already-validated number
const numberInputs = [
  ['qb-nback', v => setGameField('nBack', v)],
  ['qb-trialtime', v => setGameField('trialTime', v)],
  ['qb-numtrials', v => setGameField('numTrials', v)],
  ['qb-matchchance', v => setGameField('matchChance', v)],
  ['qb-interference', v => setGameField('interference', v)],
  ['qb-width', v => setGameField('positionWidth', v)],
  ['qb-squares', v => setGameField('squares', v)],
  ['qb-maxnumber', v => setGameField('arithMaxNumber', v)],
  ['qb-rotation', v => updateSetting('rotationSpeed', v)],
  ['qb-advance', v => {
    updateSetting('successCriteria', v)
    if (getSettings().failureCriteria > v) updateSetting('failureCriteria', v)
  }],
  ['qb-winafter', v => updateSetting('successComboRequired', v)],
  ['qb-dropbelow', v => {
    updateSetting('failureCriteria', v)
    if (getSettings().successCriteria < v) updateSetting('successCriteria', v)
  }],
  ['qb-loseafter', v => updateSetting('failureComboRequired', v)],
]

const bindNumber = (input, set) => {
  input.addEventListener('input', () => {
    const v = clamp(input.value, +input.min, +input.max)
    if (v !== null) set(v)
  })
}

for (const [id, set] of numberInputs) {
  bindNumber($(id), set)
}

const toggles = [
  ['qb-variable', v => setGameField('rules', v ? 'variable' : 'none')],
  ['qb-crab', v => setGameField('crab', v)],
  ['qb-selfpaced', v => setGameField('selfPaced', v)],
  ['qb-negatives', v => setGameField('arithNegatives', v)],
  ['qb-op-add', v => setGameField('arithOps', { ...getGameSettings().arithOps, add: v })],
  ['qb-op-sub', v => setGameField('arithOps', { ...getGameSettings().arithOps, sub: v })],
  ['qb-op-mul', v => setGameField('arithOps', { ...getGameSettings().arithOps, mul: v })],
  ['qb-op-div', v => setGameField('arithOps', { ...getGameSettings().arithOps, div: v })],
  ['qb-chain', v => setGameField('enablePositionWidthSequence', v)],
  ['qb-en-audio', v => setGameField('enableAudio', v)],
  ['qb-en-color', v => {
    setGameField('enableColor', v)
    if (v) setGameField('enableImage', false)
  }],
  ['qb-en-shape', v => {
    setGameField('enableShape', v)
    if (v) setGameField('enableImage', false)
  }],
  ['qb-en-image', v => {
    setGameField('enableImage', v)
    if (v) {
      setGameField('enableShape', false)
      setGameField('enableColor', false)
    }
  }],
  ['qb-autoprog', v => updateSetting('enableAutoProgression', v)],
]

for (const [id, set] of toggles) {
  $(id).addEventListener('change', (e) => set(e.target.checked))
}

const selects = [
  ['qb-mode', v => updateSetting('mode', v)],
  ['qb-grid', v => setGameField('grid', v)],
  ['qb-feedback', v => updateSetting('feedback', v)],
  ['qb-voice', v => updateSetting('voice', v)],
  ['qb-src-audio', v => setGameField('audioSource', v)],
  ['qb-src-color', v => setGameField('colorSource', v)],
  ['qb-src-shape', v => setGameField('shapeSource', v)],
  ['qb-src-image', v => setGameField('imageSource', v)],
]

for (const [id, set] of selects) {
  $(id).addEventListener('change', (e) => set(e.target.value))
}

for (const field of ['position', 'color', 'shape', 'audio']) {
  $(`qb-key-${field}`).addEventListener('input', (e) => {
    const key = e.target.value.toUpperCase().slice(-1)
    if (!key) return
    e.target.value = key
    updateSetting('hotkeys', { ...getSettings().hotkeys, [field]: key })
  })
}

// PgUp/PgDn cycle enabled modes (ModeSwapper behavior)
const MODE_ORDER = ['quad', 'dual', 'custom', 'customB',
  'position', 'sound', 'positionColor', 'colorSound', 'triple', 'jaeggi', 'multiSquare',
  'dualCombo', 'triCombo', 'quadCombo', 'triComboColor',
  'arithmetic', 'dualArithmetic', 'tripleArithmetic', 'tally', 'vtally']
document.addEventListener('keydown', (event) => {
  if (event.code !== 'PageUp' && event.code !== 'PageDown') return
  const settings = getSettings()
  const modes = [...settings.enabledModes].sort((a, b) => MODE_ORDER.indexOf(a) - MODE_ORDER.indexOf(b))
  if (modes.length <= 1) return
  let i = modes.indexOf(settings.mode) + (event.code === 'PageDown' ? 1 : -1)
  if (i >= modes.length) i = 0
  if (i < 0) i = modes.length - 1
  updateSetting('mode', modes[i])
})

// The W1..Wn chain inputs are rebuilt only when their *structure* changes
// (row count / chain toggled), like rebuildBoard()'s builtFor guard above.
// Rebuilding on every keystroke would blow away the focused input.
let chainBuiltFor = null

function syncChainRows(gs) {
  const rows = $('qb-chain-rows')
  const signature = gs.enablePositionWidthSequence ? `chain|${gs.nBack}` : 'none'
  if (signature !== chainBuiltFor) {
    rows.innerHTML = ''
    if (gs.enablePositionWidthSequence) {
      for (let w = 0; w < gs.nBack; w++) {
        const div = document.createElement('div')
        div.className = 'mb-1'
        div.style.marginLeft = '2rem'
        div.innerHTML = `<div class="inline-input__outer">W${w + 1}<span class="inline-input__inner"><input type="number" min="1" max="4" step="1" style="width: 4ch"></span></div>`
        bindNumber(div.querySelector('input'), (v) => {
          const seq = [...getGameSettings().positionWidthSequence]
          seq[w] = v
          setGameField('positionWidthSequence', seq)
        })
        rows.appendChild(div)
      }
    }
    chainBuiltFor = signature
  }
  rows.querySelectorAll('input').forEach((input, w) => {
    if (input !== document.activeElement) input.value = gs.positionWidthSequence[w]
  })
}

const syncPanel = () => {
  const settings = getSettings()
  const gs = getGameSettings()
  const mode = settings.mode
  const isTally = mode === 'tally' || mode === 'vtally'
  const hasToggles = mode.startsWith('custom') || isTally
  const isArith = 'arithOps' in gs
  const isJaeggi = mode === 'jaeggi'

  // don't clobber what the user is mid-way through typing
  const setValue = (id, value) => {
    const input = $(id)
    if (input !== document.activeElement) input.value = value
  }

  $('qb-mode').value = mode
  $('qb-grid').value = gs.grid ?? 'rotate3D'
  setValue('qb-nback', gs.nBack)
  $('qb-variable').checked = gs.rules === 'variable'
  if ('trialTime' in gs) setValue('qb-trialtime', gs.trialTime)
  setValue('qb-numtrials', gs.numTrials)
  setValue('qb-matchchance', gs.matchChance)
  setValue('qb-interference', gs.interference)
  $('qb-feedback').value = settings.feedback
  $('qb-voice').value = settings.voice
  setValue('qb-rotation', settings.rotationSpeed)
  $('qb-autoprog').checked = settings.enableAutoProgression
  setValue('qb-advance', settings.successCriteria)
  setValue('qb-winafter', settings.successComboRequired)
  setValue('qb-dropbelow', settings.failureCriteria)
  setValue('qb-loseafter', settings.failureComboRequired)
  for (const field of ['position', 'color', 'shape', 'audio']) {
    $(`qb-key-${field}`).value = settings.hotkeys[field]
  }

  // classic-family rows
  $('qb-row-crab').hidden = isTally || isJaeggi || !!gs.enableShape || !!gs.enableImage
  $('qb-crab').checked = !!gs.crab
  $('qb-row-selfpaced').hidden = isTally || isJaeggi
  $('qb-selfpaced').checked = !!gs.selfPaced
  $('qb-row-squares').hidden = mode !== 'multiSquare'
  if (mode === 'multiSquare') setValue('qb-squares', gs.squares)
  $('qb-arith-rows').hidden = !isArith
  if (isArith) {
    $('qb-op-add').checked = gs.arithOps.add !== false
    $('qb-op-sub').checked = gs.arithOps.sub !== false
    $('qb-op-mul').checked = gs.arithOps.mul !== false
    $('qb-op-div').checked = gs.arithOps.div !== false
    setValue('qb-maxnumber', gs.arithMaxNumber)
    $('qb-negatives').checked = !!gs.arithNegatives
  }

  // visibility rules (GameSettings.svelte conditions)
  $('qb-row-variable').hidden = isTally || isJaeggi || !!gs.crab
  $('qb-row-matchchance').hidden = isJaeggi
  $('qb-row-interference').hidden = isJaeggi
  $('qb-row-trialtime').hidden = !('trialTime' in gs)
  $('qb-row-grid').hidden = mode === 'vtally'
  $('qb-row-rotation').hidden = mode === 'vtally'
  $('qb-progression-rows').hidden = isTally
  $('qb-tally-rows').hidden = !isTally
  if (isTally) {
    const noun = mode === 'vtally' ? 'visual' : 'position'
    $('qb-chain-label').textContent = `Define ${noun} chain`
    $('qb-width-label').textContent = `Concurrent ${noun}s`
    $('qb-chain').checked = !!gs.enablePositionWidthSequence
    setValue('qb-width', gs.positionWidth)
    $('qb-row-width').hidden = !!gs.enablePositionWidthSequence
    syncChainRows(gs)
  }

  // stimuli rows (arithmetic speaks operations via TTS — no stimulus sources)
  $('qb-stimuli-heading').hidden = isArith
  $('qb-stimuli-rows').hidden = isArith
  $('qb-row-audio').hidden = mode === 'vtally'
  $('qb-en-audio').parentElement.hidden = !hasToggles
  $('qb-en-color').parentElement.hidden = !hasToggles
  $('qb-en-shape').parentElement.hidden = !hasToggles
  $('qb-row-image').hidden = !hasToggles
  // preset modes have fixed stimuli but still expose the source pickers
  $('qb-row-color').hidden = !(hasToggles || mode === 'quad' || gs.enableColor)
  $('qb-row-shape').hidden = !(hasToggles || mode === 'quad' || gs.enableShape)
  $('qb-en-audio').checked = !!gs.enableAudio
  $('qb-en-color').checked = !!gs.enableColor
  $('qb-en-shape').checked = !!gs.enableShape
  $('qb-en-image').checked = !!gs.enableImage
  $('qb-src-audio').value = gs.audioSource
  $('qb-src-color').value = gs.colorSource
  $('qb-src-shape').value = gs.shapeSource
  $('qb-src-image').value = gs.imageSource
}

subscribe(() => { syncPanel(); renderKeys(); refreshUi() })

// ---- info sidebar: resets ----
$('qb-reset-settings').addEventListener('click', () => {
  resetSettings()
  alert('Settings reset to default.')
})

$('qb-reset-all').addEventListener('click', async () => {
  if (!confirm('Erase ALL Quad Box data (settings and game history)? This cannot be undone.')) return
  await deleteDB()
  resetSettings()
  location.reload()
})

// ---- graph popup ----
const popup = $('graph-popup')
$('graph-label').addEventListener('click', async () => {
  popup.classList.add('visible')
  await renderGames()
})
$('graph-close-popup').addEventListener('click', () => popup.classList.remove('visible'))
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && popup.classList.contains('visible')) popup.classList.remove('visible')
})

$('qb-tab-recent').addEventListener('click', () => switchTab('recent'))
$('qb-tab-progress').addEventListener('click', () => switchTab('progress'))

const switchTab = async (tab) => {
  $('qb-tab-recent').classList.toggle('selected', tab === 'recent')
  $('qb-tab-progress').classList.toggle('selected', tab === 'progress')
  $('qb-recent-view').classList.toggle('visible', tab === 'recent')
  $('qb-progress-view').classList.toggle('visible', tab === 'progress')
  if (tab === 'progress') await renderChart()
}

$('qb-show-cancelled').addEventListener('change', () => renderGames())

// Score tiers on the Cerevana verdict palette (as in the Svelte port)
const tierColor = (percent) => {
  if (percent > 0.7) return '#4c8434'
  if (percent > 0.6) return '#6f9440'
  if (percent > 0.5) return '#a6712c'
  if (percent > 0.4) return '#9c5a3a'
  return '#8a5264'
}

const fmtElapsed = (s) => `${Math.floor(s / 60)}m ${String(Math.floor(s % 60)).padStart(2, '0')}s`

const renderGames = async () => {
  const showCancelled = $('qb-show-cancelled').checked
  const games = (await getLastMonthGames())
    .filter(g => g.status !== 'tombstone')
    .filter(g => showCancelled || g.status === 'completed')
  $('qb-games-empty').hidden = games.length > 0
  const table = $('qb-games-table')
  // columns = union of tags present in the fetched games, in display order
  const TAG_ORDER = ['position', 'position0', 'position1', 'position2', 'position3',
    'audio', 'color', 'shape', 'image', 'visvis', 'visaudio', 'audiovis', 'arithmetic']
  const present = new Set()
  for (const g of games) {
    for (const t of Object.keys(g.scores ?? {})) present.add(t)
  }
  const tags = TAG_ORDER.filter(t => present.has(t))
  const colName = (t) => TAG_LABELS[t] ?? (t === 'arithmetic' ? 'Arith' : t)
  const head = `<tr><th>Date</th><th>Game</th><th>Total</th>${tags.map(t => `<th>${colName(t)}</th>`).join('')}<th>Time</th></tr>`
  const rows = games.map(g => {
    const date = new Date(g.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    const name = `${displayTitle(g).toUpperCase()} ${g.nBack}B${g.status === 'cancelled' ? ' ✕' : ''}`
    const total = g.total?.possible > 0
      ? `<span class="qb-chip" style="background:${tierColor(g.total.percent)}">${(g.total.percent * 100).toFixed(0)}%</span>` : ''
    const cells = tags.map(t => {
      const s = g.scores?.[t]
      if (!s || !(s.possible > 0)) return '<td></td>'
      return `<td><span class="qb-chip" style="background:${tierColor(s.percent)}">${(s.percent * 100).toFixed(0)}%</span></td>`
    }).join('')
    const time = g.total?.averageTrialTime
      ? `${fmtElapsed(g.elapsedSeconds)} | ${(g.total.averageTrialTime / 1000).toFixed(2)}s/t`
      : fmtElapsed(g.elapsedSeconds)
    return `<tr><td>${date}</td><td>${name}</td><td>${total}</td>${cells}<td>${time}</td></tr>`
  }).join('')
  table.innerHTML = head + rows
  const a = analytics.get()
  $('qb-playtime').textContent = a.playTime ? `Today: ${a.playTime}` : ''
}

let chart
const renderChart = async () => {
  const games = (await getLastMonthGames())
    .filter(g => g.status === 'completed' && g.ncalc)
    .sort((a, b) => a.timestamp - b.timestamp)
  const byTitle = {}
  for (const g of games) {
    const key = displayTitle(g)
    byTitle[key] = byTitle[key] ?? []
    byTitle[key].push({ x: g.timestamp, y: g.ncalc })
  }
  const accent = document.body.classList.contains('light-mode') ? '#2f6b5c' : '#7cb6a8'
  const palette = [accent, '#a6712c', '#8a5264', '#4c8434', '#4a6a7a', '#6f9440']
  const datasets = Object.entries(byTitle).map(([title, data], i) => ({
    label: title, data, borderColor: palette[i % palette.length],
    backgroundColor: palette[i % palette.length], tension: 0.2, pointRadius: 3,
  }))
  const fg = document.body.classList.contains('light-mode') ? '#171613' : '#fffffd'
  chart?.destroy()
  chart = new Chart($('qb-graph-canvas'), {
    type: 'line',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { type: 'time', ticks: { color: fg }, grid: { color: '#4444' } },
        y: { title: { display: true, text: 'n-back level (ncalc)', color: fg }, ticks: { color: fg }, grid: { color: '#4444' } },
      },
      plugins: { legend: { labels: { color: fg } } },
    },
  })
}

// ---- boot ----
syncPanel()
renderKeys()
refreshUi()
