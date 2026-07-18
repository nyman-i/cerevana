// Pure-function checks for js/cct/engine/mechanics.js (CCT mechanics,
// ported from tim22dev22/CCT script.js, MIT - see js/cct/PROVENANCE.md)
// run with: node tests/cct-pure.mjs
import {
  getExpectedAnswer, randomDigit, isCorrectAnswer,
  createIntervalState, recordAnswer,
} from '../js/cct/engine/mechanics.js'

let fail = 0
const assert = (c, l) => { console.log((c ? 'PASS' : 'FAIL') + ' - ' + l); if (!c) fail++ }

// --- getExpectedAnswer: all 4 arithmetic modes ---
assert(getExpectedAnswer(3, 5) === 8, 'getExpectedAnswer: default mode is addition')
assert(getExpectedAnswer(3, 5, 'addition') === 8, 'getExpectedAnswer: addition')
assert(getExpectedAnswer(3, 5, 'multiplication') === 15, 'getExpectedAnswer: multiplication')
assert(getExpectedAnswer(3, 5, 'subtraction') === -2, 'getExpectedAnswer: subtraction is a-b, not abs')
assert(getExpectedAnswer(5, 3, 'subtraction') === 2, 'getExpectedAnswer: subtraction order matters')
assert(getExpectedAnswer(3, 5, 'difference') === 2, 'getExpectedAnswer: difference is abs(a-b)')
assert(getExpectedAnswer(5, 3, 'difference') === 2, 'getExpectedAnswer: difference is symmetric')
assert(getExpectedAnswer(3, 5, 'unknown-mode') === 8, 'getExpectedAnswer: unknown mode falls back to addition')

// --- randomDigit: range invariant, 1-9 inclusive, never 0 ---
{
  let ok = true
  const seen = new Set()
  for (let i = 0; i < 5000; i++) {
    const d = randomDigit()
    if (!Number.isInteger(d) || d < 1 || d > 9) ok = false
    seen.add(d)
  }
  assert(ok, 'randomDigit: every draw is an integer in [1,9]')
  assert(seen.size === 9, 'randomDigit: all 9 digits reachable over 5000 draws')
}

// --- isCorrectAnswer: exact-string validation, no numeric coercion ---
assert(isCorrectAnswer(8, '8') === true, 'isCorrectAnswer: exact string match')
assert(isCorrectAnswer(8, ' 8 ') === true, 'isCorrectAnswer: trims whitespace')
assert(isCorrectAnswer(8, '08') === false, 'isCorrectAnswer: no numeric coercion, "08" != "8"')
assert(isCorrectAnswer(8, '') === false, 'isCorrectAnswer: empty submission is wrong')
assert(isCorrectAnswer(null, '8') === false, 'isCorrectAnswer: null expected (warm-up question) is always wrong')

// --- adaptive interval state machine: threshold/clamp/reset ---
const baseConfig = {
  startingInterval: 1500, minimumInterval: 700, maximumInterval: 3000,
  intervalIncrement: 100, correctThreshold: 4, incorrectThreshold: 4,
}

{
  const state = createIntervalState(baseConfig)
  assert(state.interval === 1500, 'createIntervalState: starts at startingInterval')
  assert(state.correctStreak === 0 && state.wrongStreak === 0, 'createIntervalState: streaks start at 0')
}

// N consecutive correct (N = correctThreshold) drops interval by one increment, resets streak
{
  let state = createIntervalState(baseConfig)
  for (let i = 0; i < 4; i++) state = recordAnswer(state, true)
  assert(state.interval === 1400, 'recordAnswer: 4 correct in a row drops interval by one increment')
  assert(state.correctStreak === 0, 'recordAnswer: correct streak resets once threshold fires')
}

// M consecutive wrong (M = incorrectThreshold) raises interval PAST startingInterval,
// toward the separate maximumInterval ceiling - the Cerevana change from upstream
{
  let state = createIntervalState(baseConfig)
  for (let i = 0; i < 4; i++) state = recordAnswer(state, false)
  assert(state.interval === 1600, 'recordAnswer: wrong streak from a cold start rises above startingInterval')
  assert(state.wrongStreak === 0, 'recordAnswer: wrong streak resets once threshold fires')
}

// interval never rises above maximumInterval no matter how many wrong streaks fire
{
  let state = createIntervalState(baseConfig)
  for (let round = 0; round < 20; round++) for (let i = 0; i < 4; i++) state = recordAnswer(state, false)
  assert(state.interval === 3000, 'recordAnswer: interval ceilings at maximumInterval, never higher')
}

// interval never drops below minimumInterval no matter how many correct streaks fire
{
  let state = createIntervalState(baseConfig)
  for (let round = 0; round < 20; round++) for (let i = 0; i < 4; i++) state = recordAnswer(state, true)
  assert(state.interval === 700, 'recordAnswer: interval floors at minimumInterval, never lower')
}

// a streak below threshold leaves the interval untouched
{
  let state = createIntervalState(baseConfig)
  for (let i = 0; i < 3; i++) state = recordAnswer(state, true)
  assert(state.interval === 1500 && state.correctStreak === 3, 'recordAnswer: below-threshold streak leaves interval unchanged')
}

// createIntervalState clamps a misconfigured starting point (maximumInterval set below startingInterval)
{
  const state = createIntervalState({ ...baseConfig, maximumInterval: 1000 })
  assert(state.interval === 1000, 'createIntervalState: clamps startingInterval down if it exceeds maximumInterval')
}

// a wrong answer zeroes an in-progress correct streak (and vice versa)
{
  let state = createIntervalState(baseConfig)
  state = recordAnswer(state, true)
  state = recordAnswer(state, true)
  state = recordAnswer(state, false)
  assert(state.correctStreak === 0 && state.wrongStreak === 1, 'recordAnswer: a wrong answer zeroes the correct streak')
}

console.log(fail ? fail + ' FAILURES' : 'ALL PASS')
process.exit(fail ? 1 : 0)
