// Transfer page: log external test-battery scores (data/test-battery.md),
// see each test's full attempt history and where it's due for a retest, and
// see how much RRT/N-Back/CCT training happened alongside it. Original
// Cerevana code.
import { addScore, getAllScores, deleteScore } from './engine/gamedb.js'
import { computeDelta, computeTimeline, isDueForRetest, bucketByMonth } from './engine/delta.js'

const CATEGORY_ORDER = ['Fluid intelligence', 'Working memory', 'General aptitude', 'Personality & emotional control']
const CHART_PALETTE = ['#7cb6a8', '#a6712c', '#8a5264', '#4c8434', '#4a6a7a', '#6f9440', '#a67cb6', '#b6a67c']
// muted, deliberately un-vivid - these are a volume backdrop behind the score lines, not competing data
const TRAINING_COLORS = { RRT: '#5a6b78', 'N-Back': '#6b5a78', CCT: '#78685a' }

const listEl = document.getElementById('transfer-list')
const dueSection = document.getElementById('transfer-due-section')
const dueEl = document.getElementById('transfer-due')
const resultsSection = document.getElementById('transfer-results-section')
const resultsEl = document.getElementById('transfer-results')
const chartSection = document.getElementById('transfer-chart-section')

const popup = document.getElementById('test-popup')
const popupTitle = document.getElementById('test-popup-title')
const popupMeta = document.getElementById('test-popup-meta')
const popupSummary = document.getElementById('test-popup-summary')
const popupForm = document.getElementById('test-popup-log')
const popupDate = document.getElementById('test-popup-date')
const popupScore = document.getElementById('test-popup-score')
const popupNote = document.getElementById('test-popup-note')
const popupHistory = document.getElementById('test-popup-history')

const escapeHtml = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const fmtDate = ts => new Date(ts).toLocaleDateString()

// Entries start with "# Name". Fields are "Key: value" lines before the free-text
// summary; the last non-empty line is the source URL.
function parseTests(md) {
  return md.split(/^# /m).slice(1).map(block => {
    const lines = block.split('\n')
    const test = { name: lines[0].trim(), category: 'Other', access: '', time: '', summary: [], url: '' }
    for (const raw of lines.slice(1)) {
      const line = raw.trim()
      if (!line) continue
      const m = line.match(/^(Category|Access|Time):\s*(.+)$/i)
      if (m) { test[m[1].toLowerCase()] = m[2].trim(); continue }
      if (/^https?:\/\//.test(line)) { test.url = line.split(/\s/)[0]; continue }
      test.summary.push(raw.trim())
    }
    test.summary = test.summary.join(' ')
    test.id = slugify(test.name)
    return test
  })
}

function scoresByTestId(scores) {
  const map = new Map()
  for (const s of scores) {
    if (!map.has(s.testId)) map.set(s.testId, [])
    map.get(s.testId).push(s)
  }
  return map
}

function badgeHtml(records) {
  const parts = []
  if (records && records.length === 1) {
    parts.push(`<span class="test-card__badge">Score: ${records[0].score}</span>`)
  } else if (records && records.length > 1) {
    const delta = computeDelta(records)
    const sign = delta.deltaRaw > 0 ? '+' : ''
    const cls = delta.deltaRaw > 0 ? 'right' : (delta.deltaRaw < 0 ? 'wrong' : '')
    const warn = !delta.reliable ? ' <span class="test-card__badge-warn" title="Under 120 days between tests - see the reliability note">&#9888;</span>' : ''
    parts.push(`<span class="test-card__badge${cls ? ' test-card__badge--' + cls : ''}">${delta.baseline.score} &rarr; ${delta.latest.score} (${sign}${delta.deltaRaw})</span>${warn}`)
  }
  if (isDueForRetest(records)) parts.push(`<span class="test-card__badge test-card__badge--due">&#9200; Retest ready</span>`)
  return parts.join(' ')
}

function historyRowHtml(record) {
  return `<div class="test-card__history-row" data-id="${record.id}">
    <span class="test-card__history-date">${fmtDate(record.timestamp)}</span>
    <span class="test-card__history-score">${record.score}</span>
    <span class="test-card__history-note">${record.note ? escapeHtml(record.note) : ''}</span>
    <button type="button" class="test-card__history-delete" aria-label="Delete this score">&times;</button>
  </div>`
}

function testCardHtml(test, records) {
  const due = isDueForRetest(records)
  return `<button type="button" class="test-card${due ? ' test-card--due' : ''}" data-test-id="${test.id}" title="${escapeHtml(test.name)}">
    <span class="test-card__name">${escapeHtml(test.name)}</span>
    ${badgeHtml(records)}
  </button>`
}

function renderTestList(tests, scores) {
  const byTestId = scoresByTestId(scores)
  const byCategory = new Map()
  for (const t of tests) {
    if (!byCategory.has(t.category)) byCategory.set(t.category, [])
    byCategory.get(t.category).push(t)
  }
  const ordered = CATEGORY_ORDER.filter(c => byCategory.has(c)).concat([...byCategory.keys()].filter(c => !CATEGORY_ORDER.includes(c)))
  listEl.innerHTML = ordered.map(cat => `
    <div class="panel-heading transfer-category">${escapeHtml(cat)}</div>
    ${byCategory.get(cat).map(t => testCardHtml(t, byTestId.get(t.id))).join('')}
  `).join('')
}

function renderDue(tests, scores) {
  const byTestId = scoresByTestId(scores)
  const due = tests
    .map(t => ({ test: t, records: byTestId.get(t.id) }))
    .filter(({ records }) => isDueForRetest(records))
    .map(({ test, records }) => {
      const latest = Math.max(...records.map(r => r.timestamp))
      const days = Math.round((Date.now() - latest) / 86400000)
      return { test, days }
    })
    .sort((a, b) => b.days - a.days)

  dueSection.hidden = due.length === 0
  dueEl.innerHTML = due.map(({ test, days }) =>
    `<button type="button" class="transfer-due__row" data-test-id="${test.id}">
      <span class="transfer-due__name">${escapeHtml(test.name)}</span>
      <span class="transfer-due__age">last taken ${days} days ago</span>
    </button>`).join('')
}

// Full history for a test: every attempt (not just baseline/latest), oldest
// first, each step flagged if that specific gap is too short to be reliable.
function timelineRowsHtml(records) {
  return computeTimeline(records).map(r => {
    if (r.deltaFromPrev === null) {
      return `<div class="transfer-result__row"><span class="transfer-result__row-date">${fmtDate(r.timestamp)}</span><span class="transfer-result__row-score">${r.score}</span><span class="transfer-result__row-delta">baseline</span></div>`
    }
    const sign = r.deltaFromPrev > 0 ? '+' : ''
    const cls = r.deltaFromPrev > 0 ? 'right' : (r.deltaFromPrev < 0 ? 'wrong' : '')
    const warn = !r.reliableStep ? ` <span class="test-card__badge-warn" title="Only ${r.daysFromPrev} days since the previous attempt">&#9888;</span>` : ''
    return `<div class="transfer-result__row"><span class="transfer-result__row-date">${fmtDate(r.timestamp)}</span><span class="transfer-result__row-score">${r.score}</span><span class="transfer-result__row-delta${cls ? ' transfer-result__row-delta--' + cls : ''}">${sign}${r.deltaFromPrev}${warn}</span></div>`
  }).join('')
}

function resultCardHtml(test, records) {
  const delta = computeDelta(records)
  const sign = delta.deltaRaw > 0 ? '+' : ''
  const cls = delta.deltaRaw > 0 ? 'right' : (delta.deltaRaw < 0 ? 'wrong' : '')
  const pct = delta.deltaPct !== null ? ` (${sign}${delta.deltaPct.toFixed(1)}%)` : ''
  const warning = !delta.reliable
    ? `<div class="transfer-result__warning" title="Only ${delta.daysElapsed} days baseline-to-latest overall - too soon to separate real change from practice effects (recommended: 120+).">&#9888; Too soon (${delta.daysElapsed}d)</div>`
    : `<div class="transfer-result__ok" title="${delta.daysElapsed} days baseline-to-latest overall">&#10003; ${delta.daysElapsed}d reliable</div>`
  return `<article class="transfer-result${cls ? ' transfer-result--' + cls : ''}">
    <h3 class="transfer-result__title">${escapeHtml(test.name)}</h3>
    <div class="transfer-result__timeline">${timelineRowsHtml(records)}</div>
    <div class="transfer-result__summary">Overall: <strong>${sign}${delta.deltaRaw}${pct}</strong> ${warning}</div>
  </article>`
}

async function renderResults(tests, scores) {
  const byTest = new Map(tests.map(t => [t.id, t]))
  const scoresByTest = scoresByTestId(scores)
  const entries = []
  for (const [testId, records] of scoresByTest) {
    const test = byTest.get(testId)
    if (!test || records.length < 2) continue
    entries.push({ test, records })
  }
  resultsSection.hidden = entries.length === 0
  chartSection.hidden = entries.length === 0
  if (!entries.length) {
    resultsEl.innerHTML = ''
    if (chart) { chart.destroy(); chart = null }
    return
  }
  entries.sort((a, b) => Math.max(...b.records.map(r => r.timestamp)) - Math.max(...a.records.map(r => r.timestamp)))
  resultsEl.innerHTML = entries.map(({ test, records }) => resultCardHtml(test, records)).join('')
  await renderDeltaChart(entries, scores)
}

const formatDuration = (totalMinutes) => {
  const h = Math.floor(totalMinutes / 60)
  const m = Math.round(totalMinutes % 60)
  return h === 0 ? `${m}m` : `${h}h ${m}m`
}

// Training time between the earliest logged baseline and the latest retest
// across every test, bucketed by calendar month - same time accounting as
// js/menu/page.js's goal tracker (RRT timeElapsed ms from RRTHistory,
// N-Back elapsed seconds, CCT durationMs), just kept per-record instead of
// summed to one total so it can be plotted over time instead of printed.
async function fetchTrainingSeries(start, end) {
  let rrtRecords = []
  try { rrtRecords = (await getRRTProgressFrom(start)).filter(r => r.timestamp <= end) } catch (e) { /* best-effort */ }
  const rrt = bucketByMonth(rrtRecords.map(r => ({ timestamp: r.timestamp, minutes: (r.timeElapsed || 0) / 60000 })))

  let qbGames = []
  try { qbGames = (await getAllQuadBoxGames()).filter(g => g.status === 'completed' && g.timestamp >= start && g.timestamp <= end) } catch (e) { /* best-effort */ }
  const qbElapsedSec = g => 'start' in g ? (g.timestamp - g.start) / 1000 : (g.trialTime * g.completedTrials / 1000 || 0)
  const qb = bucketByMonth(qbGames.map(g => ({ timestamp: g.timestamp, minutes: qbElapsedSec(g) / 60 })))

  let cctSessions = []
  try { cctSessions = (await getAllCctSessions()).filter(s => s.status === 'Completed' && s.timestamp >= start && s.timestamp <= end) } catch (e) { /* best-effort */ }
  const cct = bucketByMonth(cctSessions.map(s => ({ timestamp: s.timestamp, minutes: (s.durationMs || 0) / 60000 })))

  return { RRT: rrt, 'N-Back': qb, CCT: cct }
}

// Score lines (one per test, every attempt) plus stacked training-time bars
// (one per exercise, per month) on a shared time x-axis, so a month of heavy
// training lines up under the score change it may have contributed to.
let chart
async function renderDeltaChart(entries, scores) {
  const canvas = document.getElementById('transfer-chart')
  const style = getComputedStyle(document.body)
  const fg = style.getPropertyValue('--text-color')
  const start = Math.min(...scores.map(s => s.timestamp))
  const end = Math.max(Math.max(...scores.map(s => s.timestamp)), Date.now())
  const training = await fetchTrainingSeries(start, end)

  if (chart) chart.destroy()
  const scoreDatasets = entries.map(({ test, records }, i) => ({
    type: 'line',
    label: test.name,
    data: [...records].sort((a, b) => a.timestamp - b.timestamp).map(r => ({ x: r.timestamp, y: r.score })),
    borderColor: CHART_PALETTE[i % CHART_PALETTE.length],
    backgroundColor: CHART_PALETTE[i % CHART_PALETTE.length],
    tension: 0.2,
    pointRadius: 4,
    yAxisID: 'y',
  }))
  const trainingDatasets = Object.entries(training)
    .filter(([, points]) => points.length)
    .map(([label, points]) => ({
      type: 'bar',
      label: `${label} (training time)`,
      data: points,
      backgroundColor: TRAINING_COLORS[label],
      yAxisID: 'y1',
      stack: 'training',
    }))

  chart = new Chart(canvas, {
    data: { datasets: [...scoreDatasets, ...trainingDatasets] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { type: 'time', stacked: true, ticks: { color: fg }, grid: { color: '#4444' } },
        y: { position: 'left', title: { display: true, text: 'score', color: fg }, ticks: { color: fg }, grid: { color: '#4444' } },
        y1: { position: 'right', stacked: true, title: { display: true, text: 'training time', color: fg }, ticks: { color: fg, callback: formatDuration }, grid: { drawOnChartArea: false } },
      },
      plugins: {
        legend: { labels: { color: fg, boxWidth: 12 } },
        tooltip: { callbacks: { label: (ctx) => ctx.dataset.yAxisID === 'y1' ? `${ctx.dataset.label}: ${formatDuration(ctx.parsed.y)}` : `${ctx.dataset.label}: ${ctx.parsed.y}` } },
      },
    },
  })
}

let allTests = []
let allScores = []
let openTestId = null

function openPopup(testId) {
  openTestId = testId
  fillPopup(testId)
  popup.classList.add('visible')
}

function closePopup() {
  popup.classList.remove('visible')
  openTestId = null
}

function fillPopup(testId) {
  const test = allTests.find(t => t.id === testId)
  if (!test) return
  const records = (scoresByTestId(allScores).get(testId) || []).slice().sort((a, b) => b.timestamp - a.timestamp)
  const meta = [test.access, test.time].filter(Boolean).join(' &middot; ')
  popupTitle.textContent = test.name
  popupMeta.innerHTML = `${escapeHtml(meta)} &middot; <a href="${escapeHtml(test.url)}" target="_blank" rel="noopener">test site &#8599;</a>`
  popupSummary.textContent = test.summary
  popupForm.dataset.testId = testId
  popupHistory.innerHTML = records.length ? records.map(historyRowHtml).join('') : '<p class="panel-empty">No scores logged yet.</p>'
}

async function refresh(tests) {
  allScores = await getAllScores()
  renderTestList(tests, allScores)
  renderDue(tests, allScores)
  await renderResults(tests, allScores)
  if (openTestId) fillPopup(openTestId) // keep the open popup's history/badge in sync
}

document.addEventListener('click', (e) => {
  const opener = e.target.closest('.test-card, .transfer-due__row')
  if (opener) { openPopup(opener.dataset.testId); return }
  if (e.target.id === 'test-popup-close') { closePopup(); return }
  if (popup.classList.contains('visible') && !popup.contains(e.target)) closePopup()
})
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closePopup()
})

popupForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  const testId = popupForm.dataset.testId
  const test = allTests.find(t => t.id === testId)
  const date = popupDate.value
  const score = Number(popupScore.value)
  const note = popupNote.value.trim()
  if (!date || Number.isNaN(score)) return
  await addScore({ testId, testName: test.name, category: test.category, timestamp: new Date(date).getTime(), score, note })
  popupForm.reset()
  await refresh(allTests)
})

popupHistory.addEventListener('click', async (e) => {
  if (!e.target.classList.contains('test-card__history-delete')) return
  const row = e.target.closest('.test-card__history-row')
  await deleteScore(Number(row.dataset.id))
  await refresh(allTests)
})

appStateStartup()
document.body.classList.toggle('light-mode', appState.darkMode === false)
applySavedBackground()

fetch('data/test-battery.md')
  .then(r => r.text())
  .then(async md => {
    allTests = parseTests(md)
    await refresh(allTests)
  })
