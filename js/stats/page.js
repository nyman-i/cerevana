// Stats overview page controller (stats.html). Fetches every exercise's
// full history once, then filters in memory by the selected date range and
// feeds the shared graph components (<rrt-graphs>, <nback-graphs>,
// <cct-graphs>) plus the combined training-time chart.
import { getGamesTimeRange } from '../quadbox/engine/gamedb.js'
import { getGameDay, getLocalDateString } from '../quadbox/engine/utils.js'

appStateStartup()
document.body.classList.toggle('light-mode', appState.darkMode === false)
applySavedBackground()

const $ = id => document.getElementById(id)

// full history, fetched once - range changes only re-filter in memory
const all = { rrt: [], games: [], sessions: [] }

async function loadAll() {
  // stores are independent; one exercise failing must not blank the rest
  try { all.rrt = await getAllRRTProgress() } catch (e) { console.error(e) }
  try {
    // the ranged engine getter (not history-transfer's raw rows): it stamps
    // ncalc/total/elapsedSeconds onto each record at read time
    all.games = (await getGamesTimeRange(new Date(0), new Date(Date.now() + 24 * 60 * 60 * 1000)))
      .filter(g => g.status !== 'tombstone')
  } catch (e) { console.error(e) }
  try { all.sessions = await getAllCctSessions() } catch (e) { console.error(e) }
}

// ---- date range ----
const startOfDay = v => new Date(`${v}T00:00`).getTime()
const endOfDay = v => new Date(`${v}T23:59:59.999`).getTime()

function currentRange() {
  const from = $('stats-from').value
  const to = $('stats-to').value
  if (from || to) return { from: from ? startOfDay(from) : 0, to: to ? endOfDay(to) : Infinity }
  const days = $('stats-range').value
  if (days === 'all') return { from: 0, to: Infinity }
  return { from: Date.now() - Number(days) * 24 * 60 * 60 * 1000, to: Infinity }
}

// ---- minutes/day buckets (engine's 4 AM day boundary, same math as each
// game's own getYearOfPlayTime / the menu's goal tracker) ----
const qbMinutes = g => (g.elapsedSeconds || 0) / 60
const cctMinutes = s => (s.durationMs || 0) / 60000
const rrtMinutes = q => (q.timeElapsed || 0) / 60000

const minutesByDay = (rows, minutesOf) => {
  const byDay = {}
  for (const r of rows) {
    const day = getGameDay(r.timestamp)
    byDay[day] = (byDay[day] ?? 0) + minutesOf(r)
  }
  return byDay
}

const fmtMinutes = m => m >= 60
  ? `${Math.floor(m / 60)}h ${String(Math.floor(m % 60)).padStart(2, '0')}m`
  : `${Math.round(m)}m`

// ---- summary tiles ----

// day-string arithmetic on the engine's 'YYYY-MM-DD' keys (noon anchor: DST
// shifts can't move the date)
const shiftDay = (day, n) => {
  const d = new Date(`${day}T12:00`)
  d.setDate(d.getDate() + n)
  return getLocalDateString(d)
}

// Streaks are a "now" stat over the whole history - they ignore the date
// filter (the tiles' tooltips say so).
function renderStreaks() {
  const days = new Set([...all.rrt, ...all.games, ...all.sessions].map(r => getGameDay(r.timestamp)))
  let best = 0, run = 0, prev = null
  for (const d of [...days].sort()) {
    run = prev !== null && shiftDay(prev, 1) === d ? run + 1 : 1
    if (run > best) best = run
    prev = d
  }
  // current: unbroken run ending today - or yesterday, so the streak doesn't
  // read as broken before today's first session
  let cur = 0
  let d = getGameDay(Date.now())
  if (!days.has(d)) d = shiftDay(d, -1)
  while (days.has(d)) { cur++; d = shiftDay(d, -1) }
  const days_ = n => `${n} day${n === 1 ? '' : 's'}`
  $('stats-tile-streak').textContent = days_(cur)
  $('stats-tile-best').textContent = days_(best)
}

function renderSummary(byDay, from, to) {
  const maps = [byDay.rrt, byDay.games, byDay.sessions]
  const totalMinutes = maps.reduce((s, m) => s + Object.values(m).reduce((a, v) => a + v, 0), 0)
  const activeDays = new Set(maps.flatMap(Object.keys)).size
  // the range's span in days: presets/custom bring their own bounds, "all
  // time" spans from the first recorded activity to today
  const first = Math.min(...[...all.rrt, ...all.games, ...all.sessions].map(r => r.timestamp))
  const start = from > 0 ? from : first
  const end = Math.min(to, Date.now())
  // elapsed 24h periods, not calendar dates touched - "Last 7 days" must read
  // "x / 7", and a rolling window straddles 8 calendar dates
  const spanDays = Number.isFinite(start) && end >= start
    ? Math.max(1, Math.ceil((end - start) / 86400000))
    : 0
  $('stats-tile-total').textContent = fmtMinutes(totalMinutes)
  $('stats-tile-days').textContent = `${activeDays}${spanDays ? ` / ${spanDays}` : ''}`
  $('stats-tile-avg').textContent = activeDays ? fmtMinutes(totalMinutes / activeDays) : '0m'
}

let combinedChart
function renderCombined(byDay) {
  const series = [
    ['RRT', byDay.rrt],
    ['N-Back', byDay.games],
    ['CCT', byDay.sessions],
  ]
  const token = name => getComputedStyle(document.body).getPropertyValue(name).trim()
  const fg = token('--text-color')
  const palette = [token('--accent-color'), '#a6712c', '#4c8434']
  const datasets = series.map(([label, byDay], i) => ({
    label,
    data: Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([day, m]) => ({ x: day, y: m })),
    backgroundColor: palette[i],
  }))
  const totalMinutes = datasets.reduce((s, d) => s + d.data.reduce((a, p) => a + p.y, 0), 0)
  $('stats-combined-empty').hidden = totalMinutes > 0
  // no data -> just the message, not a bare 0-1.0 axes grid next to it
  $('stats-combined-canvas').parentElement.hidden = totalMinutes === 0
  if (totalMinutes === 0) { combinedChart?.destroy(); combinedChart = null; return }
  const total = fmtMinutes(totalMinutes)
  combinedChart?.destroy()
  combinedChart = new Chart($('stats-combined-canvas'), {
    type: 'bar',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { stacked: true, type: 'time', time: { unit: 'day' }, ticks: { color: fg, maxTicksLimit: 8, maxRotation: 0 }, grid: { color: '#4444' } }, // capped labels: autoskip alone crams in ~40 rotated dates on a month of data
        y: { stacked: true, title: { display: true, text: 'minutes', color: fg }, ticks: { color: fg }, grid: { color: '#4444' } },
      },
      plugins: {
        legend: { labels: { color: fg } },
        title: { display: true, text: `Total: ${total}`, color: fg },
      },
    },
  })
}

function renderAll() {
  const { from, to } = currentRange()
  const inRange = r => r.timestamp >= from && r.timestamp <= to
  const rrt = all.rrt.filter(inRange)
  const games = all.games.filter(inRange)
  const sessions = all.sessions.filter(inRange)
  const byDay = {
    rrt: minutesByDay(rrt, rrtMinutes),
    games: minutesByDay(games, qbMinutes),
    sessions: minutesByDay(sessions, cctMinutes),
  }
  renderSummary(byDay, from, to)
  renderCombined(byDay)
  document.querySelector('rrt-graphs').update(rrt)
  document.querySelector('nback-graphs').update({ records: games, byDay: byDay.games })
  document.querySelector('cct-graphs').update({ records: sessions, byDay: byDay.sessions })
}

// a preset pick clears any custom dates (custom wins whenever either is set)
$('stats-range').addEventListener('change', () => {
  $('stats-from').value = ''
  $('stats-to').value = ''
  renderAll()
})
$('stats-from').addEventListener('change', renderAll)
$('stats-to').addEventListener('change', renderAll)

await loadAll()
renderStreaks()
renderAll()
