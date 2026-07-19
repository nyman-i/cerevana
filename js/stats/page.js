// Stats overview page controller (stats.html). Fetches every exercise's
// full history once, then filters in memory by the selected date range and
// feeds the shared graph components (<rrt-graphs>, <nback-graphs>,
// <cct-graphs>) plus the combined training-time chart.
import { getGamesTimeRange } from '../quadbox/engine/gamedb.js'
import { getGameDay } from '../quadbox/engine/utils.js'

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

let combinedChart
function renderCombined(rrt, games, sessions) {
  const series = [
    ['RRT', minutesByDay(rrt, rrtMinutes)],
    ['N-Back', minutesByDay(games, qbMinutes)],
    ['CCT', minutesByDay(sessions, cctMinutes)],
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
  const total = totalMinutes >= 60
    ? `${Math.floor(totalMinutes / 60)}h ${String(Math.floor(totalMinutes % 60)).padStart(2, '0')}m`
    : `${Math.round(totalMinutes)}m`
  combinedChart?.destroy()
  combinedChart = new Chart($('stats-combined-canvas'), {
    type: 'bar',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { stacked: true, type: 'time', time: { unit: 'day' }, ticks: { color: fg }, grid: { color: '#4444' } },
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
  renderCombined(rrt, games, sessions)
  document.querySelector('rrt-graphs').update(rrt)
  document.querySelector('nback-graphs').update({ records: games, byDay: minutesByDay(games, qbMinutes) })
  document.querySelector('cct-graphs').update({ records: sessions, byDay: minutesByDay(sessions, cctMinutes) })
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
renderAll()
