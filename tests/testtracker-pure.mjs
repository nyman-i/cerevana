// Pure-function checks for js/testtracker/engine/delta.js
// run with: node tests/testtracker-pure.mjs
import { computeDelta, computeTimeline, isDueForRetest, bucketByMonth, deltaClass, RELIABLE_INTERVAL_MS } from '../js/testtracker/engine/delta.js'

let fail = 0
const assert = (c, l) => { console.log((c ? 'PASS' : 'FAIL') + ' - ' + l); if (!c) fail++ }

const DAY = 86400000

assert(computeDelta([]) === null, 'computeDelta: empty records -> null (nothing to compare)')
assert(computeDelta([{ timestamp: 0, score: 100 }]) === null, 'computeDelta: single record -> null (no retest yet)')

{
  const d = computeDelta([
    { timestamp: 0, score: 100 },
    { timestamp: 150 * DAY, score: 115 },
  ])
  assert(d.baseline.score === 100 && d.latest.score === 115, 'computeDelta: baseline/latest picked correctly')
  assert(d.deltaRaw === 15, 'computeDelta: raw delta is latest - baseline')
  assert(Math.abs(d.deltaPct - 15) < 1e-9, 'computeDelta: pct delta relative to baseline')
  assert(d.daysElapsed === 150, 'computeDelta: days elapsed rounds to whole days')
  assert(d.reliable === true, 'computeDelta: 150 days clears the reliability threshold')
}

{
  // unsorted input, and more than 2 records: baseline/latest must be the
  // earliest/latest by timestamp, not array order
  const d = computeDelta([
    { timestamp: 100 * DAY, score: 90 },
    { timestamp: 0, score: 80 },
    { timestamp: 200 * DAY, score: 95 },
  ])
  assert(d.baseline.timestamp === 0 && d.latest.timestamp === 200 * DAY, 'computeDelta: sorts by timestamp regardless of input order')
  assert(d.deltaRaw === 15, 'computeDelta: uses earliest/latest, not first/last array element')
}

{
  const d = computeDelta([
    { timestamp: 0, score: 100 },
    { timestamp: 90 * DAY, score: 110 },
  ])
  assert(d.reliable === false, 'computeDelta: under the ~120-day threshold is flagged unreliable')
}

{
  // exactly at the boundary
  const d = computeDelta([
    { timestamp: 0, score: 100 },
    { timestamp: RELIABLE_INTERVAL_MS, score: 100 },
  ])
  assert(d.reliable === true, 'computeDelta: exactly RELIABLE_INTERVAL_MS counts as reliable')
}

{
  const d = computeDelta([
    { timestamp: 0, score: 0 },
    { timestamp: 150 * DAY, score: 10 },
  ])
  assert(d.deltaPct === null, 'computeDelta: zero baseline score has no meaningful percent delta')
}

// --- computeTimeline ---
assert(JSON.stringify(computeTimeline([])) === '[]', 'computeTimeline: no records -> empty array')

{
  const t = computeTimeline([{ timestamp: 0, score: 100 }])
  assert(t.length === 1 && t[0].deltaFromPrev === null && t[0].daysFromPrev === null && t[0].reliableStep === null,
    'computeTimeline: a single attempt has no "previous" to compare against')
}

{
  // unsorted input, 3 attempts: every attempt must appear (not just first/last),
  // oldest-first, each step measured against the one right before it
  const t = computeTimeline([
    { timestamp: 200 * DAY, score: 118 },
    { timestamp: 0, score: 100 },
    { timestamp: 150 * DAY, score: 105 },
  ])
  assert(t.length === 3, 'computeTimeline: keeps every attempt, not just baseline/latest')
  assert(t[0].score === 100 && t[1].score === 105 && t[2].score === 118, 'computeTimeline: sorted oldest to newest')
  assert(t[1].deltaFromPrev === 5 && t[1].daysFromPrev === 150, 'computeTimeline: step 2 measured from step 1, not from baseline')
  assert(t[2].deltaFromPrev === 13 && t[2].daysFromPrev === 50, 'computeTimeline: step 3 measured from step 2 (50 days later), not from baseline (200 days)')
  assert(t[1].reliableStep === true, 'computeTimeline: a 150-day gap between consecutive attempts is reliable')
  assert(t[2].reliableStep === false, 'computeTimeline: a 50-day gap between consecutive attempts is flagged unreliable, even though the overall span is long')
}

// --- isDueForRetest ---
assert(isDueForRetest([]) === false, 'isDueForRetest: no records -> not due (nothing to retest)')
assert(isDueForRetest([{ timestamp: Date.now() }], Date.now()) === false, 'isDueForRetest: just taken -> not due')
assert(isDueForRetest([{ timestamp: 0 }], 119 * DAY) === false, 'isDueForRetest: just under the threshold -> not due yet')
assert(isDueForRetest([{ timestamp: 0 }], RELIABLE_INTERVAL_MS) === true, 'isDueForRetest: exactly at the threshold -> due')
assert(isDueForRetest([{ timestamp: 0 }], 200 * DAY) === true, 'isDueForRetest: well past the threshold -> due')
assert(isDueForRetest([{ timestamp: 0, score: 1 }, { timestamp: 190 * DAY, score: 2 }], 200 * DAY) === false,
  'isDueForRetest: uses the MOST RECENT attempt, not the oldest, when several exist')

// --- bucketByMonth ---
assert(JSON.stringify(bucketByMonth([])) === '[]', 'bucketByMonth: no entries -> empty array')

{
  // two entries in the same local calendar month must sum into one bucket
  const jan5 = new Date(2026, 0, 5).getTime()
  const jan20 = new Date(2026, 0, 20).getTime()
  const b = bucketByMonth([{ timestamp: jan5, minutes: 30 }, { timestamp: jan20, minutes: 45 }])
  assert(b.length === 1, 'bucketByMonth: same-month entries collapse into one bucket, got length ' + b.length)
  assert(b[0].y === 75, 'bucketByMonth: same-month minutes are summed, got ' + b[0].y)
  assert(b[0].x === new Date(2026, 0, 1).getTime(), 'bucketByMonth: bucket key is the 1st of that month')
}

{
  // entries near a month boundary must land in DIFFERENT buckets, and the
  // result must be chronologically sorted regardless of input order
  const jan31 = new Date(2026, 0, 31).getTime()
  const feb1 = new Date(2026, 1, 1).getTime()
  const dec15 = new Date(2025, 11, 15).getTime()
  const b = bucketByMonth([
    { timestamp: feb1, minutes: 10 },
    { timestamp: dec15, minutes: 20 },
    { timestamp: jan31, minutes: 5 },
  ])
  assert(b.length === 3, 'bucketByMonth: Dec/Jan/Feb are three separate buckets, got length ' + b.length)
  assert(b[0].x === new Date(2025, 11, 1).getTime() && b[1].x === new Date(2026, 0, 1).getTime() && b[2].x === new Date(2026, 1, 1).getTime(),
    'bucketByMonth: buckets sorted chronologically regardless of input order')
  assert(b[1].y === 5, 'bucketByMonth: Jan 31 stays in January, not spilling into February')
}

// --- deltaClass ---
assert(deltaClass(15, 'higher') === 'right', 'deltaClass: higher-is-better + positive delta -> right')
assert(deltaClass(-15, 'higher') === 'wrong', 'deltaClass: higher-is-better + negative delta -> wrong')
assert(deltaClass(-15, 'lower') === 'right', 'deltaClass: lower-is-better + negative delta -> right')
assert(deltaClass(15, 'lower') === 'wrong', 'deltaClass: lower-is-better + positive delta -> wrong')
assert(deltaClass(15, 'neutral') === '', 'deltaClass: neutral direction is never colored')
assert(deltaClass(-15, 'neutral') === '', 'deltaClass: neutral direction is never colored, either sign')
assert(deltaClass(0, 'higher') === '', 'deltaClass: zero delta is never colored, regardless of direction')
assert(deltaClass(0, 'lower') === '', 'deltaClass: zero delta is never colored (lower-is-better)')

console.log(fail ? fail + ' FAILURES' : 'ALL PASS')
process.exit(fail ? 1 : 0)
