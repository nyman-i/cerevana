// Transfer page: log external test-battery scores (data/test-battery.md),
// browse/log them grouped by real-world test (a test with several metrics -
// e.g. IPIP-120/300's five Big Five traits - collapses to one card; picking
// a metric happens inside its popup), and compare any combination of test
// scores against RRT/N-Back/CCT training time on one user-filtered chart.
// Original Cerevana code.
import { addScore, getAllScores, deleteScore } from './engine/gamedb.js'
import { computeDelta, computeTimeline, isDueForRetest, bucketByMonth, deltaClass } from './engine/delta.js'

const CATEGORY_ORDER = ['Fluid intelligence', 'Working memory', 'General aptitude', 'Personality & emotional control']
// ponytail: fixed palette, colors repeat past this length - widen if that's regularly hit
const PALETTE = ['#7cb6a8', '#a6712c', '#8a5264', '#4c8434', '#4a6a7a', '#6f9440', '#a67cb6', '#b6a67c']
// muted, deliberately un-vivid - training time is a backdrop behind score lines, not competing data
const TRAINING_COLORS = { RRT: '#5a6b78', 'N-Back': '#6b5a78', CCT: '#78685a' }
const TRAINING_KEYS = ['RRT', 'N-Back', 'CCT']

const listEl = document.getElementById('transfer-list')
const dueSection = document.getElementById('transfer-due-section')
const dueEl = document.getElementById('transfer-due')

const chartAddSelect = document.getElementById('transfer-chart-add')
const chartLinesEl = document.getElementById('transfer-chart-lines')
const chartEmptyEl = document.getElementById('transfer-chart-empty')
const chartCanvas = document.getElementById('transfer-chart')

const popup = document.getElementById('test-popup')
const popupBackdrop = document.getElementById('test-popup-backdrop')
const popupTitle = document.getElementById('test-popup-title')
const popupMetrics = document.getElementById('test-popup-metrics')
const popupMeta = document.getElementById('test-popup-meta')
const popupSummary = document.getElementById('test-popup-summary')
const popupForm = document.getElementById('test-popup-log')
const popupDate = document.getElementById('test-popup-date')
const popupVariantField = document.getElementById('test-popup-variant-field')
const popupVariant = document.getElementById('test-popup-variant')
const popupScore = document.getElementById('test-popup-score')
const popupNote = document.getElementById('test-popup-note')
const popupDelta = document.getElementById('test-popup-delta')
const popupHistory = document.getElementById('test-popup-history')

const escapeHtml = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const fmtDate = ts => new Date(ts).toLocaleDateString()

// Entries start with "# Name". Fields are "Key: value" lines before the free-text
// summary; the last non-empty line is the source URL. Direction (higher/lower/neutral)
// is optional and defaults to 'higher' - most tests don't need to state it. Variants
// (comma-separated, e.g. "120-item, 300-item") is optional too - only tests with more
// than one non-equivalent administration form need it.
function parseTests(md) {
  return md.split(/^# /m).slice(1).map(block => {
    const lines = block.split('\n')
    const test = { name: lines[0].trim(), category: 'Other', access: '', time: '', direction: 'higher', variants: [], summary: [], url: '' }
    for (const raw of lines.slice(1)) {
      const line = raw.trim()
      if (!line) continue
      const m = line.match(/^(Category|Access|Time|Direction|Variants):\s*(.+)$/i)
      if (m) {
        const key = m[1].toLowerCase()
        if (key === 'direction') test.direction = m[2].trim().toLowerCase()
        else if (key === 'variants') test.variants = m[2].split(',').map(v => v.trim()).filter(Boolean)
        else test[key] = m[2].trim()
        continue
      }
      if (/^https?:\/\//.test(line)) { test.url = line.split(/\s/)[0]; continue }
      test.summary.push(raw.trim())
    }
    test.summary = test.summary.join(' ')
    test.id = slugify(test.name)
    return test
  })
}

// A test whose name is "Parent - Metric" (the catalog's own convention for
// splitting a multi-construct battery into single-construct rows, e.g.
// "IPIP-120/300 - Neuroticism") groups under "Parent" for browsing; a plain
// name is its own parent with one implicit metric.
function parentName(test) {
  const i = test.name.indexOf(' - ')
  return i === -1 ? test.name : test.name.slice(0, i)
}
function metricName(test) {
  const i = test.name.indexOf(' - ')
  return i === -1 ? test.name : test.name.slice(i + 3)
}
function groupByParent(tests) {
  const groups = new Map()
  for (const t of tests) {
    const name = parentName(t)
    if (!groups.has(name)) groups.set(name, [])
    groups.get(name).push(t)
  }
  return groups
}

function scoresByTestId(scores) {
  const map = new Map()
  for (const s of scores) {
    if (!map.has(s.testId)) map.set(s.testId, [])
    map.get(s.testId).push(s)
  }
  return map
}

// A neutral-direction delta is never colored (deltaClass returns '') since
// there's no stated better/worse for it - without this note that reads as
// unstyled/broken rather than "intentionally no verdict".
const neutralNote = test => test.direction === 'neutral'
  ? ' <span class="test-card__badge-warn" title="No stated better/worse direction for this trait - tracked for information only">&#8776;</span>'
  : ''

function badgeHtml(test, records) {
  const parts = []
  if (records && records.length === 1) {
    parts.push(`<span class="test-card__badge">Score: ${records[0].score}</span>`)
  } else if (records && records.length > 1) {
    const delta = computeDelta(records)
    const sign = delta.deltaRaw > 0 ? '+' : ''
    const cls = deltaClass(delta.deltaRaw, test.direction)
    const warn = !delta.reliable ? ' <span class="test-card__badge-warn" title="Under 120 days between tests - see the reliability note">&#9888;</span>' : ''
    parts.push(`<span class="test-card__badge${cls ? ' test-card__badge--' + cls : ''}">${delta.baseline.score} &rarr; ${delta.latest.score} (${sign}${delta.deltaRaw})</span>${warn}${neutralNote(test)}`)
  }
  if (isDueForRetest(records)) parts.push(`<span class="test-card__badge test-card__badge--due">&#9200; Retest ready</span>`)
  return parts.join(' ')
}

// One merged history: every attempt oldest-first, each row carrying its
// step delta (vs the previous attempt), variant tag, note and a delete
// button - the increase timeline and the editable log used to be two
// separate near-identical lists in the popup.
function historyRowsHtml(test, records) {
  return computeTimeline(records).map(r => {
    let delta
    if (r.deltaFromPrev === null) {
      delta = '<span class="transfer-result__row-delta">baseline</span>'
    } else {
      const sign = r.deltaFromPrev > 0 ? '+' : ''
      const cls = deltaClass(r.deltaFromPrev, test.direction)
      const warn = !r.reliableStep ? ` <span class="test-card__badge-warn" title="Only ${r.daysFromPrev} days since the previous attempt">&#9888;</span>` : ''
      delta = `<span class="transfer-result__row-delta${cls ? ' transfer-result__row-delta--' + cls : ''}">${sign}${r.deltaFromPrev}${warn}</span>`
    }
    const variantTag = r.variant ? `<span class="test-card__history-variant">${escapeHtml(r.variant)}</span> ` : ''
    return `<div class="test-card__history-row" data-id="${r.id}">
      <span class="test-card__history-date">${fmtDate(r.timestamp)}</span>
      <span class="test-card__history-score">${r.score}</span>
      ${delta}
      <span class="test-card__history-note">${variantTag}${r.note ? escapeHtml(r.note) : ''}</span>
      <button type="button" class="test-card__history-delete" aria-label="Delete this score">&times;</button>
    </div>`
  }).join('')
}

// One card per real-world test. A single-metric test behaves like before;
// a multi-metric one (its `children`) shows a due chip if ANY of its metrics
// is due - the per-metric breakdown lives in the popup, not the browse list.
function testCardHtml(name, children, byTestId) {
  if (children.length === 1) {
    const test = children[0]
    const records = byTestId.get(test.id)
    const due = isDueForRetest(records)
    return `<button type="button" class="test-card${due ? ' test-card--due' : ''}" data-test-id="${test.id}" title="${escapeHtml(test.name)}">
      <span class="test-card__name">${escapeHtml(test.name)}</span>
      ${badgeHtml(test, records)}
    </button>`
  }
  // Distinct sitting dates, not a raw sum of per-metric records - "5 traits
  // logged from the same sitting" should read as 1 session, not 5 scores.
  const sessions = new Set(children.flatMap(c => (byTestId.get(c.id) || []).map(r => r.timestamp))).size
  const due = children.some(c => isDueForRetest(byTestId.get(c.id)))
  const badge = [
    sessions ? `<span class="test-card__badge">${sessions} session${sessions === 1 ? '' : 's'} logged</span>` : '',
    due ? `<span class="test-card__badge test-card__badge--due">&#9200; Retest ready</span>` : '',
  ].filter(Boolean).join(' ')
  return `<button type="button" class="test-card${due ? ' test-card--due' : ''}" data-test-id="${children[0].id}" title="${escapeHtml(name)}">
    <span class="test-card__name">${escapeHtml(name)}</span>
    ${badge}
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
  listEl.innerHTML = ordered.map(cat => {
    const groups = groupByParent(byCategory.get(cat))
    return `<div class="panel-heading transfer-category">${escapeHtml(cat)}</div>
      ${[...groups.entries()].map(([name, children]) => testCardHtml(name, children, byTestId)).join('')}`
  }).join('')
}

// One row per real-world test, not per-metric - IPIP/CERQ/CORE come from one
// sitting, so 5-9 near-simultaneous due metrics should read as "retake this
// test", not clutter the banner with near-duplicate rows. When only some of
// a multi-metric test's siblings have drifted out of sync, they're named so
// nothing is silently skipped.
function renderDue(tests, scores) {
  const byTestId = scoresByTestId(scores)
  const groups = groupByParent(tests)
  const due = [...groups.entries()]
    .map(([name, children]) => {
      const dueChildren = children.filter(c => isDueForRetest(byTestId.get(c.id)))
      if (!dueChildren.length) return null
      const days = Math.max(...dueChildren.map(c => {
        const latest = Math.max(...byTestId.get(c.id).map(r => r.timestamp))
        return Math.round((Date.now() - latest) / 86400000)
      }))
      return { name, days, firstDueId: dueChildren[0].id, partial: dueChildren.length < children.length, dueChildren }
    })
    .filter(Boolean)
    .sort((a, b) => b.days - a.days)

  dueSection.hidden = due.length === 0
  dueEl.innerHTML = due.map(({ name, days, firstDueId, partial, dueChildren }) => {
    const partialNote = partial ? ` <span class="transfer-due__partial">(${dueChildren.map(c => escapeHtml(metricName(c))).join(', ')})</span>` : ''
    return `<button type="button" class="transfer-due__row" data-test-id="${firstDueId}">
      <span class="transfer-due__name">${escapeHtml(name)}${partialNote}</span>
      <span class="transfer-due__age">last taken ${days} days ago</span>
    </button>`
  }).join('')
}

// Baseline -> latest overall delta + reliability line, shown under the
// merged history once a metric has 2+ records.
function overallSummaryHtml(test, records) {
  const delta = computeDelta(records)
  const sign = delta.deltaRaw > 0 ? '+' : ''
  const cls = deltaClass(delta.deltaRaw, test.direction)
  const pct = delta.deltaPct !== null ? ` (${sign}${delta.deltaPct.toFixed(1)}%)` : ''
  const warning = !delta.reliable
    ? `<span class="transfer-result__warning" title="Only ${delta.daysElapsed} days baseline-to-latest overall - too soon to separate real change from practice effects (recommended: 120+).">&#9888; Too soon (${delta.daysElapsed}d)</span>`
    : `<span class="transfer-result__ok" title="${delta.daysElapsed} days baseline-to-latest overall">&#10003; ${delta.daysElapsed}d reliable</span>`
  const variantWarning = delta.baseline.variant && delta.latest.variant && delta.baseline.variant !== delta.latest.variant
    ? ` <span class="transfer-result__warning" title="Baseline was ${escapeHtml(delta.baseline.variant)}, latest was ${escapeHtml(delta.latest.variant)} - different forms of the same test aren't guaranteed to be on the same scale.">&#9888; Different variant (${escapeHtml(delta.baseline.variant)} &rarr; ${escapeHtml(delta.latest.variant)})</span>`
    : ''
  return `<div class="transfer-result__summary${cls ? ' transfer-result__summary--' + cls : ''}">Overall: <strong>${sign}${delta.deltaRaw}${pct}</strong> ${warning}${variantWarning}${neutralNote(test)}</div>`
}

const formatDuration = (totalMinutes) => {
  const h = Math.floor(totalMinutes / 60)
  const m = Math.round(totalMinutes % 60)
  return h === 0 ? `${m}m` : `${h}h ${m}m`
}

// Training time across all logged history, bucketed by calendar month - same
// time accounting as js/menu/page.js's goal tracker (RRT timeElapsed ms from
// RRTHistory, N-Back elapsed seconds, CCT durationMs), just kept per-record
// instead of summed to one total so it can be plotted over time. Fetched once
// and cached: it doesn't depend on which chart lines are currently selected.
async function fetchTrainingSeries() {
  let rrtRecords = []
  try { rrtRecords = await getRRTProgressFrom(0) } catch (e) { /* best-effort */ }
  const rrt = bucketByMonth(rrtRecords.map(r => ({ timestamp: r.timestamp, minutes: (r.timeElapsed || 0) / 60000 })))

  let qbGames = []
  try { qbGames = (await getAllQuadBoxGames()).filter(g => g.status === 'completed') } catch (e) { /* best-effort */ }
  const qbElapsedSec = g => 'start' in g ? (g.timestamp - g.start) / 1000 : (g.trialTime * g.completedTrials / 1000 || 0)
  const qb = bucketByMonth(qbGames.map(g => ({ timestamp: g.timestamp, minutes: qbElapsedSec(g) / 60 })))

  let cctSessions = []
  try { cctSessions = (await getAllCctSessions()).filter(s => s.status === 'Completed') } catch (e) { /* best-effort */ }
  const cct = bucketByMonth(cctSessions.map(s => ({ timestamp: s.timestamp, minutes: (s.durationMs || 0) / 60000 })))

  return { RRT: rrt, 'N-Back': qb, CCT: cct }
}

let trainingSeriesCache = null
async function ensureTrainingSeries() {
  if (!trainingSeriesCache) trainingSeriesCache = await fetchTrainingSeries()
  return trainingSeriesCache
}

// Line colors are handed out on selection, first free palette slot wins, and
// released on deselection - so lines plotted at the same time never share a
// color (catalog-indexed assignment collided: 32 metrics over 8 slots).
const lineColors = new Map()
function colorFor(id) {
  if (!lineColors.has(id)) {
    const used = new Set(lineColors.values())
    lineColors.set(id, PALETTE.find(c => !used.has(c)) ?? PALETTE[lineColors.size % PALETTE.length])
  }
  return lineColors.get(id)
}

// User-driven chart selection: which metric lines and which training-time
// lines are currently plotted. Session-only, not persisted.
let chartSelection = { metrics: new Set(), training: new Set() }
let chart

// One "Add to graph" dropdown (everything selectable, grouped) plus one row
// of removable colored chips (everything plotted - the chips are the chart's
// legend). Already-plotted entries are omitted from the dropdown; metrics
// with no logged scores are listed but disabled.
function renderLinePicker(tests, scores) {
  const byTestId = scoresByTestId(scores)
  const groups = groupByParent(tests)

  const optionFor = (t, label) => {
    if (chartSelection.metrics.has(t.id)) return ''
    const hasData = (byTestId.get(t.id) || []).length > 0
    return `<option value="m:${escapeHtml(t.id)}"${hasData ? '' : ' disabled'}>${escapeHtml(label)}${hasData ? '' : ' (no scores yet)'}</option>`
  }

  const trainingOptions = TRAINING_KEYS
    .filter(k => !chartSelection.training.has(k))
    .map(k => `<option value="t:${k}">${k}</option>`).join('')

  // Grouped by catalog category, in catalog order: each category gets one
  // optgroup with its single-metric tests, and every multi-metric test in
  // that category follows immediately as its own optgroup (e.g. CORE right
  // after General aptitude, not orphaned at the end of the list where it
  // reads as belonging to whatever category came last).
  const singlesByCategory = new Map()
  const multisByCategory = new Map()
  for (const [name, children] of groups) {
    const cat = children[0].category
    if (children.length > 1) {
      if (!multisByCategory.has(cat)) multisByCategory.set(cat, [])
      multisByCategory.get(cat).push([name, children])
    } else {
      if (!singlesByCategory.has(cat)) singlesByCategory.set(cat, [])
      singlesByCategory.get(cat).push(children[0])
    }
  }
  const allCategories = CATEGORY_ORDER.concat(
    [...new Set([...singlesByCategory.keys(), ...multisByCategory.keys()])].filter(c => !CATEGORY_ORDER.includes(c)))
  const testGroups = allCategories.map(cat => {
    const singleOpts = (singlesByCategory.get(cat) || []).map(t => optionFor(t, t.name)).join('')
    const multi = (multisByCategory.get(cat) || []).map(([name, children]) => {
      const opts = children.map(c => optionFor(c, metricName(c))).join('')
      return opts ? `<optgroup label="${escapeHtml(name)}">${opts}</optgroup>` : ''
    }).join('')
    return (singleOpts ? `<optgroup label="${escapeHtml(cat)}">${singleOpts}</optgroup>` : '') + multi
  }).join('')

  chartAddSelect.innerHTML = `<option value="" selected disabled>Add a line&hellip;</option>
    ${trainingOptions ? `<optgroup label="Training time">${trainingOptions}</optgroup>` : ''}
    ${testGroups}`
  chartAddSelect.value = ''

  const metricChips = [...chartSelection.metrics].map(id => {
    const test = tests.find(t => t.id === id)
    return `<button type="button" class="transfer-chart-line" data-metric-id="${escapeHtml(id)}" style="background:${colorFor(id)}" title="Remove from graph">${escapeHtml(test ? test.name : id)} <span class="transfer-chart-line__x">&times;</span></button>`
  })
  const trainingChips = [...chartSelection.training].map(k =>
    `<button type="button" class="transfer-chart-line" data-training="${k}" style="background:${TRAINING_COLORS[k]}" title="Remove from graph">${k} training <span class="transfer-chart-line__x">&times;</span></button>`
  )
  chartLinesEl.innerHTML = metricChips.concat(trainingChips).join('')
}

async function renderChart() {
  const style = getComputedStyle(document.body)
  const fg = style.getPropertyValue('--text-color')
  const hasSelection = chartSelection.metrics.size > 0 || chartSelection.training.size > 0
  chartEmptyEl.hidden = hasSelection
  if (!hasSelection) {
    if (chart) { chart.destroy(); chart = null }
    return
  }

  const byTestId = scoresByTestId(allScores)
  const scoreDatasets = [...chartSelection.metrics].map(id => {
    const test = allTests.find(t => t.id === id)
    const records = byTestId.get(id) || []
    const color = colorFor(id)
    return {
      type: 'line',
      label: test.name,
      data: [...records].sort((a, b) => a.timestamp - b.timestamp).map(r => ({ x: r.timestamp, y: r.score })),
      borderColor: color,
      backgroundColor: color,
      tension: 0.2,
      pointRadius: 4,
      yAxisID: 'y',
    }
  })

  const training = await ensureTrainingSeries()
  const trainingDatasets = [...chartSelection.training].map(key => ({
    type: 'line',
    label: `${key} (training time)`,
    data: training[key],
    borderColor: TRAINING_COLORS[key],
    backgroundColor: TRAINING_COLORS[key],
    tension: 0.2,
    pointRadius: 3,
    borderDash: [4, 3],
    yAxisID: 'y1',
  }))

  if (chart) chart.destroy()
  chart = new Chart(chartCanvas, {
    data: { datasets: [...scoreDatasets, ...trainingDatasets] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { type: 'time', time: { minUnit: 'day' }, ticks: { color: fg }, grid: { color: '#4444' } }, // minUnit: a single logged score otherwise collapses the axis to millisecond ticks
        y: { display: scoreDatasets.length > 0, position: 'left', title: { display: true, text: 'score', color: fg }, ticks: { color: fg }, grid: { color: '#4444' } },
        y1: { display: trainingDatasets.length > 0, position: 'right', title: { display: true, text: 'training time', color: fg }, ticks: { color: fg, callback: formatDuration }, grid: { drawOnChartArea: false } },
      },
      plugins: {
        legend: { display: false }, // the picker chips above the chart are the legend - each active chip is colored to match its line
        tooltip: { callbacks: { label: (ctx) => ctx.dataset.yAxisID === 'y1' ? `${ctx.dataset.label}: ${formatDuration(ctx.parsed.y)}` : `${ctx.dataset.label}: ${ctx.parsed.y}` } },
      },
    },
  })
}

let allTests = []
let allScores = []
let openTestId = null
let openParentName = null

function openPopup(testId) {
  const test = allTests.find(t => t.id === testId)
  if (!test) return
  openParentName = parentName(test)
  openTestId = testId
  popupForm.reset()
  fillPopup()
  popup.classList.add('visible')
  popupBackdrop.classList.add('visible')
}

function closePopup() {
  popup.classList.remove('visible')
  popupBackdrop.classList.remove('visible')
  openTestId = null
  openParentName = null
}

function fillPopup() {
  const test = allTests.find(t => t.id === openTestId)
  if (!test) return
  const children = groupByParent(allTests).get(openParentName) || [test]
  const records = (scoresByTestId(allScores).get(openTestId) || []).slice().sort((a, b) => b.timestamp - a.timestamp)
  const meta = [test.access, test.time].filter(Boolean).join(' · ') // literal middot - this string goes through escapeHtml, entities would show as text

  popupTitle.textContent = openParentName
  popupMetrics.innerHTML = children.length > 1
    ? children.map(c => `<button type="button" class="graph-select${c.id === openTestId ? ' selected' : ''}" data-metric-id="${c.id}">${escapeHtml(metricName(c))}</button>`).join('')
    : ''
  popupMeta.innerHTML = `${escapeHtml(meta)} &middot; <a href="${escapeHtml(test.url)}" target="_blank" rel="noopener">test site &#8599;</a>`
  popupSummary.textContent = test.summary
  popupVariantField.hidden = test.variants.length === 0
  if (test.variants.length) {
    const selected = popupVariant.value
    popupVariant.innerHTML = test.variants.map(v => `<option${v === selected ? ' selected' : ''}>${escapeHtml(v)}</option>`).join('')
  }
  popupForm.dataset.testId = openTestId
  // No empty-state text when nothing is logged - the log form right there says
  // it all, and the popup stays narrow until there are results to show.
  popupHistory.innerHTML = records.length ? historyRowsHtml(test, records) : ''
  popupDelta.innerHTML = records.length > 1 ? overallSummaryHtml(test, records) : ''
  popup.classList.toggle('test-popup--wide', records.length > 0)
}

async function refresh(tests) {
  allScores = await getAllScores()
  renderTestList(tests, allScores)
  renderDue(tests, allScores)
  renderLinePicker(tests, allScores)
  if (openTestId) fillPopup() // keep the open popup's history/badge in sync
  if (chartSelection.metrics.size > 0 || chartSelection.training.size > 0) await renderChart()
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

popupMetrics.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-metric-id]')
  if (!btn) return
  e.stopPropagation() // fillPopup() below replaces this button's own DOM (re-renders the
  // picker) before the click finishes bubbling - without this, document's outside-click
  // handler sees a detached e.target, treats it as "outside", and closes the popup
  openTestId = btn.dataset.metricId
  fillPopup()
})

popupForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  const testId = popupForm.dataset.testId
  const test = allTests.find(t => t.id === testId)
  const date = popupDate.value
  const score = Number(popupScore.value)
  const note = popupNote.value.trim()
  const variant = test.variants.length ? popupVariant.value : undefined
  if (!date || Number.isNaN(score)) return
  await addScore({ testId, testName: test.name, category: test.category, timestamp: new Date(date).getTime(), score, note, variant })
  // Only clear score/note, not date: a multi-metric test's traits are logged
  // one at a time from the same real-world sitting, so keeping the date set
  // means logging the next metric doesn't require retyping it.
  popupScore.value = ''
  popupNote.value = ''
  await refresh(allTests)
})

popupHistory.addEventListener('click', async (e) => {
  if (!e.target.classList.contains('test-card__history-delete')) return
  const row = e.target.closest('.test-card__history-row')
  await deleteScore(Number(row.dataset.id))
  await refresh(allTests)
})

chartAddSelect.addEventListener('change', () => {
  const v = chartAddSelect.value
  if (!v) return
  if (v.startsWith('m:')) chartSelection.metrics.add(v.slice(2))
  else if (v.startsWith('t:')) chartSelection.training.add(v.slice(2))
  renderLinePicker(allTests, allScores)
  renderChart()
})

chartLinesEl.addEventListener('click', (e) => {
  const chip = e.target.closest('.transfer-chart-line')
  if (!chip) return
  if (chip.dataset.metricId) {
    chartSelection.metrics.delete(chip.dataset.metricId)
    lineColors.delete(chip.dataset.metricId) // free the palette slot for the next selection
  } else if (chip.dataset.training) {
    chartSelection.training.delete(chip.dataset.training)
  }
  renderLinePicker(allTests, allScores)
  renderChart()
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
