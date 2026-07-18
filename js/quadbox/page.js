// N-Back page controller (nback.html): wires the engine + classic
// generators + vanilla renderer into the shared Cerevana chrome.
// Settings/scoring/storage semantics come from js/quadbox/engine/ and
// settings.js (engine derived from Quad Box by soamsy, MIT —
// js/quadbox/LICENSE).
import { getSettings, getGameSettings, updateSetting, setGameField, subscribe, resetSettings } from './settings.js'
import './profiles.js'
import { getLastMonthGames, getYearOfPlayTime, deleteDB } from './engine/gamedb.js'
import { formatSeconds } from './engine/utils.js'
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

// Key slabs split across the two screen edges, like the original Quad Box:
// position/color-family keys on the left, shape/image/audio-family on the
// right; unknowns alternate to keep the sides balanced.
const LEFT_TAGS = new Set(['position', 'color', 'visvis',
  'position0', 'position1', 'position2', 'position3'])

const slabButton = (id, name, hot, onClick) => {
  const btn = document.createElement('button')
  btn.className = 'nback__match'
  btn.id = id
  btn.tabIndex = -1
  btn.innerHTML = `${name ? `<span class="qb-key-name">${name}</span>` : ''}<span class="qb-key-hot">${hot}</span>`
  btn.addEventListener('click', onClick)
  return btn
}

// Rebuilt only when settings change (rebuilding per-trial would wipe
// feedback classes and re-run feedback.configure's reset mid-game).
function renderKeys() {
  const settings = getSettings()
  const left = $('qb-keys-left')
  const right = $('qb-keys-right')
  left.innerHTML = ''
  right.innerHTML = ''
  if (game.tally) {
    const counts = getNumberKeys(game.gameDisplayInfo)
    counts.forEach((count, i) => {
      const btn = slabButton(`qb-tally-${count}`, '', count, () => game.handleCount(count))
      ;(i < Math.ceil(counts.length / 2) ? left : right).appendChild(btn)
    })
  } else {
    const tags = (game.gameDisplayInfo.tags ?? []).filter(t => t !== 'arithmetic')
    let alternate = 0
    for (const tag of tags) {
      const key = tagHotkey(settings, tag)
      const btn = slabButton(`qb-match-${tag}`, TAG_LABELS[tag] ?? tag, key || '·',
        () => { game.checkForMatch(tag) })
      const side = LEFT_TAGS.has(tag) ? left
        : (tag === 'audio' || tag === 'shape' || tag === 'image' || tag === 'visaudio' || tag === 'audiovis') ? right
          : (alternate++ % 2 === 0 ? left : right)
      side.appendChild(btn)
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

analytics.subscribe(() => {
  renderHud()
  // keep the history panel live if it's open when a game records
  if ($('offcanvas-history').checked) renderGames()
})
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
  ['qb-lattice-theme', v => updateSetting('latticeMatchesTheme', v)],
]

for (const [id, set] of toggles) {
  $(id).addEventListener('change', (e) => set(e.target.checked))
}

// Two mode dropdowns (Game Mode / Advanced Modes), one state: both write
// settings.mode; syncPanel shows the active mode in its own select and the
// '' placeholder in the other. Empty values (placeholder) never write.
const selects = [
  ['qb-mode-main', v => { if (v) updateSetting('mode', v) }],
  ['qb-mode', v => { if (v) updateSetting('mode', v) }],
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

const PRIMARY_MODES = ['dual', 'quad', 'custom', 'customB']

// Per-mode game settings are view-only outside the Custom modes: presets
// are fixed protocols, so their scores stay comparable. nBack is exempt —
// it's the level (auto-progression / daily reset / manual play write it),
// not mode configuration.
const MODE_SETTING_INPUTS = [
  'qb-variable', 'qb-trialtime', 'qb-numtrials', 'qb-matchchance',
  'qb-interference', 'qb-crab', 'qb-selfpaced', 'qb-squares',
  'qb-op-add', 'qb-op-sub', 'qb-op-mul', 'qb-op-div', 'qb-negatives',
  'qb-maxnumber', 'qb-chain', 'qb-width', 'qb-grid',
  'qb-en-audio', 'qb-en-color', 'qb-en-shape', 'qb-en-image',
  'qb-src-audio', 'qb-src-color', 'qb-src-shape', 'qb-src-image',
]

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

  const isPrimary = PRIMARY_MODES.includes(mode)
  $('qb-mode-main').value = isPrimary ? mode : ''
  $('qb-mode').value = isPrimary ? '' : mode
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
  $('qb-lattice-theme').checked = !!settings.latticeMatchesTheme
  // same shape as the light-mode toggle at the top of this file: a body
  // class the CSS keys off, applied on load and on every settings change
  document.body.classList.toggle('qb-lattice-accent', !!settings.latticeMatchesTheme)
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

  // presets are view-only; only the Custom modes unlock their settings
  // (runs last so the rebuilt chain-row inputs are covered too)
  const editable = mode === 'custom' || mode === 'customB'
  for (const id of MODE_SETTING_INPUTS) $(id).disabled = !editable
  $('qb-chain-rows').querySelectorAll('input').forEach(i => { i.disabled = !editable })
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

// ---- history panel (top-right offcanvas) ----
// Score tiers on the Cerevana verdict palette (as in the Svelte port)
const tierColor = (percent) => {
  if (percent > 0.7) return '#4c8434'
  if (percent > 0.6) return '#6f9440'
  if (percent > 0.5) return '#a6712c'
  if (percent > 0.4) return '#9c5a3a'
  return '#8a5264'
}

const fmtElapsed = (s) => `${Math.floor(s / 60)}m ${String(Math.floor(s % 60)).padStart(2, '0')}s`

const chip = (percent) =>
  `<span class="qb-chip" style="background:${tierColor(percent)}">${(percent * 100).toFixed(0)}%</span>`

const renderGames = async () => {
  const showCancelled = $('qb-show-cancelled').checked
  const all = (await getLastMonthGames()).filter(g => g.status !== 'tombstone')
  const completed = all.filter(g => g.status === 'completed')
  const games = showCancelled ? all : completed

  // summary lines (games come newest-first from the gamedb cursor)
  $('qb-hist-count').textContent = completed.length
  const last10 = completed.filter(g => g.total?.possible > 0).slice(0, 10)
  $('qb-hist-avg').textContent = last10.length
    ? `${(100 * last10.reduce((s, g) => s + g.total.percent, 0) / last10.length).toFixed(0)}%` : '—'
  const a = analytics.get()
  $('qb-playtime').textContent = a.playTime || '0m 00s'

  $('qb-games-empty').hidden = games.length > 0
  $('qb-history-list').innerHTML = games.map(g => {
    const date = new Date(g.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    const name = `${displayTitle(g).toUpperCase()} ${g.nBack}B${g.status === 'cancelled' ? ' ✕' : ''}`
    const total = g.total?.possible > 0 ? chip(g.total.percent) : ''
    const tags = Object.entries(g.scores ?? {})
      .filter(([, s]) => s.possible > 0)
      .map(([t, s]) => `<span class="qb-chip" style="background:${tierColor(s.percent)}">${TAG_LABELS[t] ?? t} ${(s.percent * 100).toFixed(0)}%</span>`)
      .join(' ')
    const time = g.total?.averageTrialTime
      ? `${fmtElapsed(g.elapsedSeconds)} | ${(g.total.averageTrialTime / 1000).toFixed(2)}s/t`
      : fmtElapsed(g.elapsedSeconds)
    return `<div class="hqli"><div class="qb-hist-card">
      <div><strong>${name}</strong> ${total}</div>
      ${tags ? `<div class="qb-hist-tags">${tags}</div>` : ''}
      <div class="hqli-footer"><span>${date}</span><span>${time}</span></div>
    </div></div>`
  }).join('')
}

// render on open (sidebar-events dispatches `change` for keyboard toggles too)
$('offcanvas-history').addEventListener('change', (e) => {
  if (e.target.checked) renderGames()
})
$('qb-show-cancelled').addEventListener('change', () => renderGames())

// ---- graph popup (charts only) ----
const popup = $('graph-popup')
$('graph-label').addEventListener('click', async () => {
  popup.classList.add('visible')
  await renderChart()
})
$('graph-close-popup').addEventListener('click', () => popup.classList.remove('visible'))
// ESC + outside-click dismissal is shared: js/shared/sidebar-events.js

// 'H' opens History, like RRT. Never while playing: match hotkeys are
// user-configurable, so a remapped H must not be stolen mid-game.
document.addEventListener('keydown', (e) => {
  if (e.code !== 'KeyH') return
  if (e.target.closest?.('input, select, textarea')) return
  if (game.isPlaying) return
  const cb = $('offcanvas-history')
  cb.checked = !cb.checked
  cb.dispatchEvent(new Event('change'))
})

$('qb-tab-progress').addEventListener('click', () => switchTab('progress'))
$('qb-tab-time').addEventListener('click', () => switchTab('time'))

const switchTab = async (tab) => {
  $('qb-tab-progress').classList.toggle('selected', tab === 'progress')
  $('qb-tab-time').classList.toggle('selected', tab === 'time')
  $('qb-progress-view').classList.toggle('visible', tab === 'progress')
  $('qb-time-view').classList.toggle('visible', tab === 'time')
  if (tab === 'progress') await renderChart()
  else await renderTimeChart()
}

// Legacy Brain Workshop-era sessions (IndexedDB NBackHistory, read-only):
// shown as dashed stepped level lines alongside the merged game's data.
const LEGACY_LABELS = {
  dual: 'Dual', position: 'Position', sound: 'Sound', 'position-color': 'PC',
  'color-sound': 'CA', triple: 'Triple', 'dual-combo': 'DC', 'tri-combo': 'TC',
  'quad-combo': 'QC', 'tri-combo-color': 'TCC', arithmetic: 'Arith',
  'dual-arithmetic': 'DA', 'triple-arithmetic': 'TA',
}

const legacyDatasets = async (fg) => {
  if (typeof getAllNBackSessions !== 'function') return []
  const sessions = (await getAllNBackSessions()).sort((a, b) => a.timestamp - b.timestamp)
  const byMode = {}
  for (const s of sessions) {
    const key = s.modeName ?? 'dual'
    byMode[key] = byMode[key] ?? []
    byMode[key].push({ x: s.timestamp, y: s.n })
  }
  return Object.entries(byMode).map(([modeName, data]) => ({
    label: `${LEGACY_LABELS[modeName] ?? modeName} (legacy)`,
    data,
    borderColor: fg + '8',
    backgroundColor: fg + '8',
    borderDash: [6, 4],
    stepped: true,
    pointRadius: 2,
  }))
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
  // Canvas can't read CSS vars, but JS can — pull the themed accent + text colour
  // from the computed tokens so the chart follows the user's hue and theme.
  const token = name => getComputedStyle(document.body).getPropertyValue(name).trim()
  const accent = token('--accent-color')
  const fg = token('--text-color')
  const palette = [accent, '#a6712c', '#8a5264', '#4c8434', '#4a6a7a', '#6f9440']
  const datasets = Object.entries(byTitle).map(([title, data], i) => ({
    label: title, data, borderColor: palette[i % palette.length],
    backgroundColor: palette[i % palette.length], tension: 0.2, pointRadius: 3,
  }))
  datasets.push(...await legacyDatasets(fg))
  $('qb-graph-empty').hidden = datasets.some(d => d.data.length > 0)
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

// Daily play time over the last year (engine's 4 AM day boundary).
// Legacy NBackHistory time is deliberately excluded: its per-session time
// was an estimate (trials × tick length), not measured like game records.
let timeChart
const renderTimeChart = async () => {
  const byDay = await getYearOfPlayTime()
  const data = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b))
    .map(([day, minutes]) => ({ x: day, y: minutes }))
  $('qb-graph-empty').hidden = data.length > 0
  const token = name => getComputedStyle(document.body).getPropertyValue(name).trim()
  const accent = token('--accent-color')
  const fg = token('--text-color')
  const totalMinutes = data.reduce((s, d) => s + d.y, 0)
  timeChart?.destroy()
  timeChart = new Chart($('qb-time-canvas'), {
    type: 'bar',
    data: { datasets: [{ label: 'Minutes played', data, backgroundColor: accent }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { type: 'time', time: { unit: 'day' }, ticks: { color: fg }, grid: { color: '#4444' } },
        y: { title: { display: true, text: 'minutes', color: fg }, ticks: { color: fg }, grid: { color: '#4444' } },
      },
      plugins: {
        legend: { labels: { color: fg } },
        title: { display: true, text: `Total: ${formatSeconds(totalMinutes * 60)}`, color: fg },
      },
    },
  })
}

// ---- boot ----
syncPanel()
renderKeys()
refreshUi()
