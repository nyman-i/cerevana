// Original Cerevana code. Pure functions: given a test's logged score
// records, compute the baseline -> latest delta and whether enough time has
// passed for the result to be reliable (see .claude/Tester.md's 4-6 month
// interval guidance — under ~120 days a retest mostly reflects practice
// effects, not real ability change).
export const RELIABLE_INTERVAL_MS = 120 * 24 * 60 * 60 * 1000 // ~4 months, the low end of the recommended gap

// records: [{ timestamp, score, ... }], any order, at least one entry expected by callers
export function computeDelta(records) {
  if (!records || records.length < 2) return null
  const sorted = [...records].sort((a, b) => a.timestamp - b.timestamp)
  const baseline = sorted[0]
  const latest = sorted[sorted.length - 1]
  const deltaRaw = latest.score - baseline.score
  const deltaPct = baseline.score !== 0 ? (deltaRaw / Math.abs(baseline.score)) * 100 : null
  const daysElapsed = Math.round((latest.timestamp - baseline.timestamp) / 86400000)
  return {
    baseline, latest, deltaRaw, deltaPct, daysElapsed,
    reliable: (latest.timestamp - baseline.timestamp) >= RELIABLE_INTERVAL_MS,
  }
}

// Every logged attempt, oldest first, each annotated with its delta/days
// from the PREVIOUS attempt (null on the first — there's nothing before it).
// Unlike computeDelta this doesn't collapse to just baseline/latest: it's
// the full history for a test that's been retaken more than once.
export function computeTimeline(records) {
  if (!records || !records.length) return []
  const sorted = [...records].sort((a, b) => a.timestamp - b.timestamp)
  return sorted.map((r, i) => {
    if (i === 0) return { ...r, deltaFromPrev: null, daysFromPrev: null, reliableStep: null }
    const prev = sorted[i - 1]
    const daysFromPrev = Math.round((r.timestamp - prev.timestamp) / 86400000)
    return {
      ...r,
      deltaFromPrev: r.score - prev.score,
      daysFromPrev,
      reliableStep: (r.timestamp - prev.timestamp) >= RELIABLE_INTERVAL_MS,
    }
  })
}

// True once RELIABLE_INTERVAL_MS has passed since the most recent attempt —
// a test with at least one logged score that's old enough a retest is due.
export function isDueForRetest(records, now = Date.now()) {
  if (!records || !records.length) return false
  const latest = Math.max(...records.map(r => r.timestamp))
  return (now - latest) >= RELIABLE_INTERVAL_MS
}

// [{ timestamp, minutes }, ...] -> [{ x: monthStartMs, y: totalMinutes }, ...]
// sorted chronologically, one point per calendar month that has any minutes
// (months with nothing logged are simply absent, not zero-filled) — feeds
// the chart's per-exercise training-time bars, plotted on the same time axis
// as the score lines. Calendar month is by LOCAL date, matching how a user
// thinks about "this month" (same convention as js/cct/engine/gamedb.js's
// day-boundary helpers).
export function bucketByMonth(entries) {
  const buckets = new Map()
  for (const { timestamp, minutes } of entries) {
    const d = new Date(timestamp)
    const key = new Date(d.getFullYear(), d.getMonth(), 1).getTime()
    buckets.set(key, (buckets.get(key) || 0) + minutes)
  }
  return [...buckets.entries()].sort((a, b) => a[0] - b[0]).map(([x, y]) => ({ x, y }))
}
