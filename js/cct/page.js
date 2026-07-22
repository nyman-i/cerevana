// Original Cerevana code. Controller for cct.html - settings-panel wiring
// follows RRT's single id-to-key map convention (js/shared/constants.js
// keySettingMap / js/rrt/index.js), since CCT has no per-mode nesting like
// N-Back's qb-* three-table approach.
import { getSettings, subscribe, updateSetting, resetSettings } from './settings.js'
import './profiles.js'
import { isRunning, isPaused, startSession, submitAnswer, stopSession, pauseSession, resumeSession, timeLeftMs } from './game.js'
import { cctAudio } from './audio.js'
import { getExpectedAnswer } from './engine/mechanics.js'
import {
  storeSession, getLastMonthSessions, getPlayTimeSince4AM, getYearOfPlayTime, deleteDB as deleteCctDB,
} from './engine/gamedb.js'

const $ = id => document.getElementById(id)

// ---- theme follows the app-wide setting (like every game page) ----
appStateStartup()
document.body.classList.toggle('light-mode', appState.darkMode === false)
applySavedBackground()

const keySettingMap = {
  'cct-mode': 'arithmeticMode',
  'cct-endcondition': 'endCondition',
  'cct-duration': 'duration',
  'cct-targetcorrect': 'targetCorrect',
  'cct-startinginterval': 'startingInterval',
  'cct-mininterval': 'minimumInterval',
  'cct-maxinterval': 'maximumInterval',
  'cct-increment': 'intervalIncrement',
  'cct-correctthreshold': 'correctThreshold',
  'cct-incorrectthreshold': 'incorrectThreshold',
  'cct-voice': 'voice',
  'cct-playbackspeed': 'playbackSpeed',
  'cct-beepvolume': 'beepVolume',
  'cct-beepenabled': 'beepEnabled',
  'cct-presentation': 'presentationMode',
  'cct-inputmethod': 'inputMethod',
  'cct-dailygoal': 'dailyProgressGoal',
  'cct-weeklygoal': 'weeklyProgressGoal',
}

const NUMBER_KEYS = new Set([
  'duration', 'targetCorrect', 'startingInterval', 'minimumInterval', 'maximumInterval',
  'intervalIncrement', 'correctThreshold', 'incorrectThreshold',
  'playbackSpeed', 'beepVolume', 'dailyProgressGoal', 'weeklyProgressGoal',
])

// emptying one of these inputs clears the setting instead of being ignored
const NULLABLE_KEYS = new Set(['dailyProgressGoal', 'weeklyProgressGoal'])

// guarded against clobbering a focused input (lesson from N-Back's
// syncPanel - never overwrite what the user is mid-typing)
function populateSettings() {
  const settings = getSettings()
  for (const [id, key] of Object.entries(keySettingMap)) {
    const el = $(id)
    if (!el || el === document.activeElement) continue
    if (el.type === 'checkbox') el.checked = settings[key]
    else if (NULLABLE_KEYS.has(key)) el.value = settings[key] ?? ''
    // a missing key (e.g. stale cached settings.js next to fresh markup)
    // must not blank the field - leave it on what it already shows
    else if (settings[key] != null) el.value = settings[key]
  }
  syncConditionalRows(settings)
}

function syncConditionalRows(settings) {
  $('cct-row-duration').hidden = settings.endCondition !== 'timer'
  $('cct-row-targetcorrect').hidden = settings.endCondition !== 'correct'
}

// out-of-range typed values are ignored rather than applied (same convention
// as N-Back's bindNumber/clamp in js/quadbox/page.js) - e.g. typing "0" into
// Correct streak would otherwise fire the difficulty threshold on every answer
function clampNumber(value, min, max) {
  const v = Number(value)
  if (Number.isNaN(v) || v < min || v > max) return null
  return v
}

function registerEventHandlers() {
  for (const [id, key] of Object.entries(keySettingMap)) {
    const el = $(id)
    if (!el) continue
    const eventName = (el.tagName === 'SELECT' || el.type === 'checkbox') ? 'change' : 'input'
    el.addEventListener(eventName, () => {
      if (el.type === 'checkbox') {
        updateSetting(key, el.checked)
        // iOS: a mid-session beep enable must create/resume the AudioContext
        // inside this change gesture, or it stays suspended until next start
        if (key === 'beepEnabled' && el.checked && isRunning()) cctAudio.unlock(getSettings().voice)
        return
      }
      if (NUMBER_KEYS.has(key)) {
        if (NULLABLE_KEYS.has(key) && el.value === '') { updateSetting(key, null); return }
        const value = clampNumber(el.value, Number(el.min), Number(el.max))
        if (value === null) return
        updateSetting(key, value)
        // keep the interval floor/ceiling from inverting - dragging one past
        // the other pulls the other along instead of freezing the interval
        if (key === 'minimumInterval' && value > getSettings().maximumInterval) updateSetting('maximumInterval', value)
        if (key === 'maximumInterval' && value < getSettings().minimumInterval) updateSetting('minimumInterval', value)
        return
      }
      updateSetting(key, el.value)
      // iOS: a mid-session voice switch needs its clips gesture-blessed now -
      // timer-driven play() on never-blessed elements is silently refused
      if (key === 'voice' && isRunning()) cctAudio.unlock(el.value)
    })
  }
}

// ---- daily/weekly goal bars (same widget + thresholds as RRT's
// fillProgressTracker in js/rrt/progress.js) ----
function fillTracker(tracker, minutesSpent, goal) {
  const percent = Math.max(0, Math.min(100 * minutesSpent / goal, 100))
  const fill = tracker.querySelector('.progress-fill')
  fill.style.height = `${percent}%`
  tracker.querySelector('.progress-value').innerText = `${Math.floor(minutesSpent)} / ${goal}`
  fill.classList.toggle('complete', percent >= 100)
  fill.classList.toggle('halfway', percent >= 50 && percent < 100)
}

async function renderGoalTrackers() {
  const settings = getSettings()
  const daily = $('daily-progress-container')
  const weekly = $('weekly-progress-container')
  daily.classList.toggle('visible', !!settings.dailyProgressGoal)
  weekly.classList.toggle('visible', !!settings.weeklyProgressGoal)
  if (settings.dailyProgressGoal) {
    fillTracker(daily, (await getPlayTimeSince4AM()) / 60000, settings.dailyProgressGoal)
  }
  if (settings.weeklyProgressGoal) {
    const wk = goalWeekStartKey() // global from js/shared/db.js
    const byDay = await getYearOfPlayTime()
    const weekMinutes = Object.entries(byDay).reduce((s, [d, m]) => d >= wk ? s + m : s, 0)
    fillTracker(weekly, weekMinutes, settings.weeklyProgressGoal)
  }
}

subscribe(() => { populateSettings(); renderGoalTrackers() })

$('cct-reset-settings').addEventListener('click', () => {
  resetSettings()
  alert('Settings reset to default.')
})

$('cct-reset-all').addEventListener('click', async () => {
  if (!confirm('Erase ALL CCT data (profiles, settings and session history)? This cannot be undone.')) return
  await deleteCctDB()
  resetSettings()
  // after resetSettings: its notify re-persists the profile list, so the
  // removal has to come last or the old profiles survive the reload
  localStorage.removeItem('sllgms-v3-cct-profiles')
  localStorage.removeItem('sllgms-v3-cct-selected-profile')
  location.reload()
})

populateSettings()
registerEventHandlers()
renderGoalTrackers()

// ---- gameplay ----
let stats = { correctAnswers: 0, totalQuestions: 0, streak: 0, interval: 0 }
// end condition captured at session start (mid-session settings edits
// shouldn't move the goalposts the HUD reports against)
let hudGoal = { endCondition: 'timer', targetCorrect: 0 }
let intervalTrend = '' // arrow for the last adaptive step, until the next one
let hudTimer = null

function renderHud() {
  const parts = []
  if (isPaused()) parts.push('PAUSED')
  if (hudGoal.endCondition === 'timer') {
    const left = timeLeftMs()
    if (left != null) {
      const s = Math.max(0, Math.ceil(left / 1000))
      parts.push(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} left`)
    }
  } else {
    parts.push(`${stats.correctAnswers}/${hudGoal.targetCorrect} target`)
  }
  parts.push(`Correct ${stats.correctAnswers}/${stats.totalQuestions}`)
  parts.push(`Streak ${stats.streak}`)
  parts.push(`Interval ${stats.interval}ms${intervalTrend}`)
  $('cct-hud').innerHTML = parts.map(p => `<div>${p}</div>`).join('')
}

// same green/amber flash N-Back's HUD gives on auto-progression
// (js/quadbox/page.js onProgression) - here it marks an adaptive
// interval step: green = pace went up, amber = pace dropped
function flashHudIntervalChange(faster) {
  const hud = $('cct-hud')
  hud.style.backgroundColor = faster ? '#4c8434' : '#a6712c'
  setTimeout(() => { hud.style.backgroundColor = '' }, 2500)
}

function setVerdict(isCorrect, expectedAnswer) {
  const v = $('cct-verdict')
  v.textContent = isCorrect ? `✓ ${expectedAnswer}` : `✗ was ${expectedAnswer}`
  v.classList.remove('nback__answer--right', 'nback__answer--wrong')
  v.classList.add(isCorrect ? 'nback__answer--right' : 'nback__answer--wrong')
}

// one button per answer the active operation can produce (e.g. 2-18 for
// addition) - a single click answers, no digit-by-digit entry
let lastKeyBtn = null

function buildKeypad(mode) {
  const values = new Set()
  for (let a = 1; a <= 9; a++) {
    for (let b = 1; b <= 9; b++) values.add(getExpectedAnswer(a, b, mode))
  }
  lastKeyBtn = null
  $('cct-keypad').innerHTML = [...values].sort((x, y) => x - y)
    .map(v => `<button type="button" class="nback__match" data-key="${v}" tabindex="-1">${v}</button>`)
    .join('')
  return values.size
}

function flash(className) {
  const input = $('cct-answer')
  input.classList.remove('cct-flash-right', 'cct-flash-wrong')
  // reflow so a repeated class re-triggers the transition
  void input.offsetWidth
  input.classList.add(className)
  setTimeout(() => input.classList.remove(className), 300)
  // keypad-only mode has no visible input - flash the clicked button instead
  // (a wrong answer only ever comes from a timeout, so no button to flash there)
  if (input.hidden && lastKeyBtn && className === 'cct-flash-right') {
    const btn = lastKeyBtn
    btn.classList.add('nback__match--right')
    setTimeout(() => btn.classList.remove('nback__match--right'), 300)
  }
}

// Keep the screen awake during a session - an audio-mode player may not
// touch the screen for minutes. Best-effort: denial (battery saver) or an
// unsupported browser just means the OS default wins.
// ponytail: copied from js/quadbox/page.js syncWakeLock (js/shared/ is
// classic scripts, both consumers are ES modules) - extract to a shared
// module if a third game needs it
let wakeLock = null
let wakeLockBusy = false
async function syncWakeLock() {
  if (!('wakeLock' in navigator) || wakeLockBusy) return
  wakeLockBusy = true
  try {
    if (isRunning() && !wakeLock && document.visibilityState === 'visible') {
      wakeLock = await navigator.wakeLock.request('screen')
      wakeLock.addEventListener('release', () => { wakeLock = null })
    } else if (!isRunning() && wakeLock) {
      await wakeLock.release()
      wakeLock = null
    }
  } catch { /* not granted - fine */ } finally {
    wakeLockBusy = false
  }
}
// the OS releases the lock on tab switch; re-acquire when the game resumes view
document.addEventListener('visibilitychange', () => syncWakeLock())

function beginUi() {
  const { inputMethod, presentationMode, startingInterval, arithmeticMode,
    endCondition, targetCorrect } = getSettings()
  $('cct-start').textContent = 'STOP'
  $('cct-pause').hidden = false
  $('cct-pause').textContent = 'PAUSE'
  $('cct-result').hidden = true
  $('cct-digit').hidden = presentationMode === 'audio'
  $('cct-hud').hidden = false
  // each input method gets exactly one input UI: physical types into the
  // answer field, on-screen taps the grid (upstream CCT showed both at
  // once - redundant with a dedicated keypad mode)
  const keypad = $('cct-keypad')
  keypad.hidden = inputMethod !== 'keypad'
  if (inputMethod === 'keypad') {
    const keyCount = buildKeypad(arithmeticMode)
    // no digit on screen - the grid alone fills the frame, so grow more
    // (but not for multiplication's 36 buttons, which would overflow the screen)
    keypad.classList.toggle('cct-keypad--hero',
      presentationMode === 'audio' && keyCount <= 20)
  }
  $('cct-stage').classList.remove('cct-stage--paused')
  const answer = $('cct-answer')
  answer.hidden = inputMethod === 'keypad'
  // numeric touch keyboards have no minus key, and subtraction's answers go
  // down to -8 - only that mode pays the full-keyboard price
  answer.inputMode = arithmeticMode === 'subtraction' ? 'text' : 'numeric'
  answer.value = ''
  answer.readOnly = inputMethod === 'keypad'
  // no digit on screen + typing: let the input take the digit's space
  answer.classList.toggle('cct-answer-input--hero',
    presentationMode === 'audio' && inputMethod === 'physical')
  if (inputMethod !== 'keypad') answer.focus()
  const verdict = $('cct-verdict')
  verdict.hidden = false
  verdict.textContent = ''
  verdict.classList.remove('nback__answer--right', 'nback__answer--wrong')
  stats = { correctAnswers: 0, totalQuestions: 0, streak: 0, interval: startingInterval }
  hudGoal = { endCondition, targetCorrect }
  intervalTrend = ''
  if (endCondition === 'timer') hudTimer = setInterval(renderHud, 1000)
  renderHud()
  syncWakeLock()
}

function endUi(record) {
  $('cct-digit').hidden = true
  $('cct-hud').hidden = true
  $('cct-keypad').hidden = true
  $('cct-answer').hidden = true
  $('cct-verdict').hidden = true
  $('cct-start').textContent = 'START'
  $('cct-pause').hidden = true
  clearInterval(hudTimer)
  hudTimer = null
  syncWakeLock()
  const result = $('cct-result')
  result.hidden = false
  const tiles = [
    [`${record.accuracy.toFixed(0)}%`, 'accuracy'],
    [`${record.correctAnswers}/${record.totalQuestionsAsked}`, 'correct'],
    [`${record.bestStreak}`, 'best streak'],
    [fmtElapsed(record.durationMs / 1000), 'time'],
  ]
  if (record.averageResponseTimeMs != null) {
    tiles.push([`${Math.round(record.averageResponseTimeMs)}ms`, 'avg response'])
    tiles.push([`${Math.round(record.fastestResponseTimeMs)}ms`, 'fastest response'])
  }
  // "fastest" pace only earns a mention when the session ended slower than
  // its best moment (and actually moved off the start)
  const fastest = record.lowestIntervalMs < Math.min(record.startingInterval, record.finalIntervalMs)
    ? ` · fastest ${record.lowestIntervalMs} ms` : ''
  result.innerHTML = `
    <div class="cct-result-status">${record.status.toUpperCase()}</div>
    <div class="cct-result-grid">${tiles.map(([v, l]) =>
      `<div><div class="cct-result-value">${v}</div><div class="cct-result-label">${l}</div></div>`).join('')}</div>
    <div class="cct-result-interval">Interval ${record.startingInterval} → ${record.finalIntervalMs} ms${fastest}</div>`
}

function begin() {
  if (isRunning()) return
  beginUi()
  startSession({
    onTick: ({ digit }) => {
      const d = $('cct-digit')
      d.textContent = digit
      if (!d.hidden) {
        d.classList.remove('cct-digit--pop')
        // reflow so a repeated class re-triggers the animation (same trick as flash())
        void d.offsetWidth
        d.classList.add('cct-digit--pop')
      }
      $('cct-answer').value = ''
    },
    onAnswer: ({ isCorrect, expectedAnswer, interval, correctAnswers, totalQuestions, streak }) => {
      if (interval !== stats.interval) {
        intervalTrend = interval < stats.interval ? ' ↓' : ' ↑'
        flashHudIntervalChange(interval < stats.interval)
      }
      stats = { correctAnswers, totalQuestions, streak, interval }
      renderHud()
      flash(isCorrect ? 'cct-flash-right' : 'cct-flash-wrong')
      setVerdict(isCorrect, expectedAnswer)
    },
    onEnd: async (record) => {
      // next session picks up at the pace this one ended on (same idea as
      // N-Back auto-progression writing the level back); the settings input
      // shows the new value and stays editable
      // ponytail: carries over on manual exit too - a bailed session barely
      // moved the interval, and a too-fast start self-corrects upward.
      // Clamped to the input's own range so the field never holds a value
      // its min/max reject
      const si = $('cct-startinginterval')
      const carried = Math.min(Number(si.max), Math.max(Number(si.min), record.finalIntervalMs))
      if (carried !== getSettings().startingInterval) {
        updateSetting('startingInterval', carried)
      }
      endUi(record)
      await storeSession(record)
      renderGoalTrackers()
      if ($('offcanvas-history').checked) renderSessions()
    },
  })
  // beginUi's render ran before the session existed - now the countdown has
  // a clock to read
  renderHud()
}

function end() {
  if (!isRunning()) return
  stopSession('exited')
}

// blur on click so the focused button can't be retriggered by Space mid-game
// (same lesson as N-Back's qb-start)
$('cct-start').addEventListener('click', (e) => {
  e.currentTarget.blur()
  if (isRunning()) end()
  else begin()
})

$('cct-answer').addEventListener('input', (e) => {
  submitAnswer(e.target.value)
})

$('cct-keypad').addEventListener('click', (e) => {
  const btn = e.target.closest('button')
  if (!btn?.dataset.key || !isRunning()) return
  lastKeyBtn = btn
  $('cct-answer').value = btn.dataset.key
  submitAnswer(btn.dataset.key)
})

$('cct-pause').addEventListener('click', (e) => {
  e.currentTarget.blur()
  if (!isRunning()) return
  if (isPaused()) { resumeSession(); e.target.textContent = 'PAUSE' }
  else { pauseSession(); e.target.textContent = 'RESUME' }
  $('cct-stage').classList.toggle('cct-stage--paused', isPaused())
  renderHud()
})

document.addEventListener('keydown', (event) => {
  if (event.code === 'Escape' && isRunning()) { end(); return }
  if ((event.code === 'Space' || event.code === 'Enter' || event.code === 'NumpadEnter') && !isRunning() && !event.target.closest?.('input, select, textarea')) {
    event.preventDefault()
    begin()
  }
})

// ---- history panel (top-right offcanvas) ----
// same tier-color scheme as N-Back's qb-hist-card (js/quadbox/page.js)
const tierColor = (percent) => {
  if (percent > 0.7) return '#4c8434'
  if (percent > 0.6) return '#6f9440'
  if (percent > 0.5) return '#a6712c'
  if (percent > 0.4) return '#9c5a3a'
  return '#8a5264'
}

const fmtElapsed = (s) => `${Math.floor(s / 60)}m ${String(Math.floor(s % 60)).padStart(2, '0')}s`
const fmtPlayTime = (ms) => fmtElapsed(ms / 1000)

// mode labels + variant grouping are canonical in js/cct/graphs.js (classic
// <head> script shared with stats.html, so it always runs before this module)
const MODE_LABELS = window.cvCctDisplay.modeLabels

const renderSessions = async () => {
  const showCancelled = $('cct-show-cancelled').checked
  const all = await getLastMonthSessions()
  const completed = all.filter(s => s.status === 'Completed')
  const sessions = showCancelled ? all : completed

  $('cct-hist-count').textContent = completed.length
  const last10 = completed.filter(s => s.totalQuestionsAsked > 0).slice(0, 10)
  $('cct-hist-avg').textContent = last10.length
    ? `${(last10.reduce((sum, s) => sum + s.accuracy, 0) / last10.length).toFixed(0)}%` : '-'
  $('cct-playtime').textContent = fmtPlayTime(await getPlayTimeSince4AM())

  $('cct-sessions-empty').hidden = sessions.length > 0
  $('cct-history-list').innerHTML = sessions.map(s => {
    const date = new Date(s.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    const name = `${MODE_LABELS[s.arithmeticMode] ?? s.arithmeticMode}${s.status !== 'Completed' ? ' ✕' : ''}`
    const chip = s.totalQuestionsAsked > 0
      ? `<span class="cct-chip" style="background:${tierColor(s.accuracy / 100)}">${s.accuracy.toFixed(0)}%</span>` : ''
    const stripe = s.totalQuestionsAsked > 0 ? ` style="border-left: 4px solid ${tierColor(s.accuracy / 100)}"` : ''
    return `<div class="hqli${s.status !== 'Completed' ? ' hqli--cancelled' : ''}"${stripe}><div class="cct-hist-card">
      <div class="cct-hist-card__head"><strong>${name}</strong> ${chip}</div>
      <div class="hqli-footer"><span>${date}</span><span>${s.correctAnswers}/${s.totalQuestionsAsked} · ${fmtElapsed(s.durationMs / 1000)}${s.finalIntervalMs ? ` · ${s.finalIntervalMs}ms` : ''}</span></div>
    </div></div>`
  }).join('')
}

// render on open (sidebar-events dispatches `change` for keyboard toggles too)
$('offcanvas-history').addEventListener('change', (e) => {
  if (e.target.checked) renderSessions()
})
$('cct-show-cancelled').addEventListener('change', () => renderSessions())

// 'H' opens History, like RRT/N-Back - guarded to skip while an input has
// focus (CCT answers are numeric, so 'h' never reaches the answer field
// anyway, but keep the same convention as the other two pages).
document.addEventListener('keydown', (e) => {
  if (e.code !== 'KeyH') return
  if (e.target.closest?.('input, select, textarea')) return
  if (isRunning()) return
  const cb = $('offcanvas-history')
  cb.checked = !cb.checked
  cb.dispatchEvent(new Event('change'))
})

// ---- graph popup (charts live in <cct-graphs>, js/cct/graphs.js) ----
const popup = $('graph-popup')
const graphs = document.querySelector('cct-graphs')
$('graph-label').addEventListener('click', async () => {
  popup.classList.add('visible')
  graphs.update({ records: await getLastMonthSessions(), byDay: await getYearOfPlayTime() })
})
$('graph-close-popup').addEventListener('click', () => popup.classList.remove('visible'))
// ESC + outside-click dismissal is shared: js/shared/sidebar-events.js
