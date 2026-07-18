// Original Cerevana code. Controller for cct.html - settings-panel wiring
// follows RRT's single id-to-key map convention (js/shared/constants.js
// keySettingMap / js/rrt/index.js), since CCT has no per-mode nesting like
// N-Back's qb-* three-table approach.
import { getSettings, subscribe, updateSetting, resetSettings } from './settings.js'
import './profiles.js'
import { isRunning, startSession, submitAnswer, stopSession } from './game.js'
import {
  storeSession, getLastMonthSessions, getPlayTimeSince4AM, getYearOfPlayTime, deleteDB as deleteCctDB,
} from './engine/gamedb.js'

const $ = id => document.getElementById(id)

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
  'cct-intervaltiming': 'showIntervalTiming',
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
    else el.value = settings[key] ?? ''
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
      if (el.type === 'checkbox') { updateSetting(key, el.checked); return }
      if (NUMBER_KEYS.has(key)) {
        if (NULLABLE_KEYS.has(key) && el.value === '') { updateSetting(key, null); return }
        const value = clampNumber(el.value, Number(el.min), Number(el.max))
        if (value !== null) updateSetting(key, value)
        return
      }
      updateSetting(key, el.value)
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
  if (!confirm('Erase ALL CCT data (settings and session history)? This cannot be undone.')) return
  await deleteCctDB()
  resetSettings()
  location.reload()
})

populateSettings()
registerEventHandlers()
renderGoalTrackers()

// ---- gameplay ----
let stats = { correctAnswers: 0, totalQuestions: 0, interval: 0 }

function renderHud() {
  $('cct-hud').textContent =
    `Correct: ${stats.correctAnswers}/${stats.totalQuestions} · Interval: ${stats.interval}ms`
}

function flash(className) {
  const input = $('cct-answer')
  input.classList.remove('cct-flash-right', 'cct-flash-wrong')
  // reflow so a repeated class re-triggers the transition
  void input.offsetWidth
  input.classList.add(className)
  setTimeout(() => input.classList.remove(className), 300)
}

function beginUi() {
  $('cct-start').hidden = true
  $('cct-result').hidden = true
  $('cct-digit').hidden = false
  $('cct-hud').hidden = false
  const answer = $('cct-answer')
  answer.hidden = false
  answer.value = ''
  answer.focus()
  stats = { correctAnswers: 0, totalQuestions: 0, interval: getSettings().startingInterval }
  renderHud()
}

function endUi(record) {
  $('cct-digit').hidden = true
  $('cct-hud').hidden = true
  $('cct-answer').hidden = true
  $('cct-start').hidden = false
  const result = $('cct-result')
  result.hidden = false
  result.textContent =
    `${record.status} · ${record.correctAnswers}/${record.totalQuestionsAsked} correct ` +
    `(${record.accuracy.toFixed(0)}%) · ${Math.round(record.durationMs / 1000)}s`
}

function begin() {
  if (isRunning()) return
  beginUi()
  startSession({
    onTick: ({ digit }) => {
      $('cct-digit').textContent = digit
      $('cct-answer').value = ''
    },
    onAnswer: ({ isCorrect, interval, correctAnswers, totalQuestions }) => {
      stats = { correctAnswers, totalQuestions, interval }
      renderHud()
      flash(isCorrect ? 'cct-flash-right' : 'cct-flash-wrong')
    },
    onEnd: async (record) => {
      endUi(record)
      await storeSession(record)
      renderGoalTrackers()
      if ($('offcanvas-history').checked) renderSessions()
    },
  })
}

function end() {
  if (!isRunning()) return
  stopSession('exited')
}

$('cct-start').addEventListener('click', begin)

$('cct-answer').addEventListener('input', (e) => {
  submitAnswer(e.target.value)
})

document.addEventListener('keydown', (event) => {
  if (event.code === 'Escape' && isRunning()) { end(); return }
  if (event.code === 'Space' && !isRunning() && !event.target.closest?.('input, select, textarea')) {
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

const MODE_LABELS = { addition: 'Addition', subtraction: 'Subtraction', multiplication: 'Multiplication', difference: 'Difference' }

const renderSessions = async () => {
  const sessions = await getLastMonthSessions()
  const completed = sessions.filter(s => s.status === 'Completed')

  $('cct-hist-count').textContent = sessions.length
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
    return `<div class="hqli"><div class="cct-hist-card">
      <div><strong>${name}</strong> ${chip}</div>
      <div class="hqli-footer"><span>${date}</span><span>${s.correctAnswers}/${s.totalQuestionsAsked} · ${fmtElapsed(s.durationMs / 1000)}</span></div>
    </div></div>`
  }).join('')
}

// render on open (sidebar-events dispatches `change` for keyboard toggles too)
$('offcanvas-history').addEventListener('change', (e) => {
  if (e.target.checked) renderSessions()
})

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

// ---- graph popup (charts only) ----
const popup = $('graph-popup')
$('graph-label').addEventListener('click', async () => {
  popup.classList.add('visible')
  await renderChart()
})
$('graph-close-popup').addEventListener('click', () => popup.classList.remove('visible'))
// ESC + outside-click dismissal is shared: js/shared/sidebar-events.js

$('cct-tab-progress').addEventListener('click', () => switchTab('progress'))
$('cct-tab-time').addEventListener('click', () => switchTab('time'))

const switchTab = async (tab) => {
  $('cct-tab-progress').classList.toggle('selected', tab === 'progress')
  $('cct-tab-time').classList.toggle('selected', tab === 'time')
  $('cct-progress-view').classList.toggle('visible', tab === 'progress')
  $('cct-time-view').classList.toggle('visible', tab === 'time')
  if (tab === 'progress') await renderChart()
  else await renderTimeChart()
}

let chart
const renderChart = async () => {
  const sessions = (await getLastMonthSessions())
    .filter(s => s.status === 'Completed' && s.totalQuestionsAsked > 0)
    .sort((a, b) => a.timestamp - b.timestamp)
  const byMode = {}
  for (const s of sessions) {
    const key = MODE_LABELS[s.arithmeticMode] ?? s.arithmeticMode
    byMode[key] = byMode[key] ?? []
    byMode[key].push({ x: s.timestamp, y: s.accuracy })
  }
  // Canvas can't read CSS vars, but JS can - pull the themed accent + text colour
  // from the computed tokens so the chart follows the user's hue and theme.
  const token = name => getComputedStyle(document.body).getPropertyValue(name).trim()
  const accent = token('--accent-color')
  const fg = token('--text-color')
  const palette = [accent, '#a6712c', '#8a5264', '#4c8434']
  const datasets = Object.entries(byMode).map(([label, data], i) => ({
    label, data, borderColor: palette[i % palette.length],
    backgroundColor: palette[i % palette.length], tension: 0.2, pointRadius: 3,
  }))
  $('cct-graph-empty').hidden = datasets.some(d => d.data.length > 0)
  chart?.destroy()
  chart = new Chart($('cct-graph-canvas'), {
    type: 'line',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { type: 'time', ticks: { color: fg }, grid: { color: '#4444' } },
        y: { min: 0, max: 100, title: { display: true, text: 'accuracy %', color: fg }, ticks: { color: fg }, grid: { color: '#4444' } },
      },
      plugins: { legend: { labels: { color: fg } } },
    },
  })
}

let timeChart
const renderTimeChart = async () => {
  const byDay = await getYearOfPlayTime()
  const data = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b))
    .map(([day, minutes]) => ({ x: day, y: minutes }))
  $('cct-graph-empty').hidden = data.length > 0
  const token = name => getComputedStyle(document.body).getPropertyValue(name).trim()
  const accent = token('--accent-color')
  const fg = token('--text-color')
  const totalMinutes = data.reduce((sum, d) => sum + d.y, 0)
  timeChart?.destroy()
  timeChart = new Chart($('cct-time-canvas'), {
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
        title: { display: true, text: `Total: ${fmtElapsed(totalMinutes * 60)}`, color: fg },
      },
    },
  })
}
