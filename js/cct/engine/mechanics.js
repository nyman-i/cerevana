/*!
 * Derived from CCT — https://github.com/tim22dev22/CCT
 * Copyright (c) 2026 tim22dev22 ("Thanks to EEE for supplying the
 * original source code" — credited upstream in CCT's own footer)
 * MIT License — see js/cct/LICENSE
 * Ported from script.js (upstream, single global-scope file) at the
 * `main` branch HEAD pulled 2026-07-18: getRandomNumber (line 3401),
 * getExpectedAnswer + THRESHOLD_PRESETS (lines 383-400), changeInterval
 * + adjustDifficulty (lines 3477-3520), isCorrectAnswerInput (line
 * 3587). Restructured from global `let` state + DOM reads into pure
 * functions over an explicit state object, so the reducer is testable
 * without a DOM (see tests/cct-pure.mjs) — the interval clamp/threshold
 * *logic* is unchanged from upstream, with one Cerevana change: upstream
 * clamps the ceiling to `startingInterval` itself (so a session that
 * starts with wrong answers has nowhere to go — it's already at the
 * ceiling); Cerevana adds a separate `maximumInterval` ceiling so the
 * interval can still visibly rise above the starting pace.
 */

export const THRESHOLD_PRESETS = {
  Balanced: { correct: 4, incorrect: 4 },
  Strict: { correct: 5, incorrect: 3 },
}

export const randomDigit = () => Math.floor(Math.random() * 9) + 1

export const getExpectedAnswer = (a, b, mode = 'addition') => {
  switch (mode) {
    case 'multiplication': return a * b
    case 'subtraction': return a - b
    case 'difference': return Math.abs(a - b)
    case 'addition':
    default: return a + b
  }
}

export const isCorrectAnswer = (expectedAnswer, submittedValue) => {
  const normalized = String(submittedValue ?? '').trim()
  return normalized !== '' && expectedAnswer !== null && normalized === String(expectedAnswer)
}

const clampInterval = (value, minimumInterval, maximumInterval) =>
  Math.max(minimumInterval, Math.min(maximumInterval, value))

// { startingInterval, minimumInterval, maximumInterval, intervalIncrement, correctThreshold, incorrectThreshold }
export const createIntervalState = (config) => ({
  ...config,
  // clamp in case maximumInterval was set below startingInterval
  interval: clampInterval(config.startingInterval, config.minimumInterval, config.maximumInterval),
  correctStreak: 0,
  wrongStreak: 0,
})

// One scored answer in, next state out. Mirrors upstream finalizeQuestionState's
// streak bookkeeping + adjustDifficulty() call, kept as two separate branches
// (not else-if) since upstream checks both thresholds every call.
export const recordAnswer = (state, isCorrect) => {
  let { interval, correctStreak, wrongStreak } = state
  const { minimumInterval, maximumInterval, intervalIncrement, correctThreshold, incorrectThreshold } = state

  if (isCorrect) {
    correctStreak += 1
    wrongStreak = 0
  } else {
    wrongStreak += 1
    correctStreak = 0
  }

  if (correctStreak >= correctThreshold) {
    interval = clampInterval(interval - intervalIncrement, minimumInterval, maximumInterval)
    correctStreak = 0
  }
  if (wrongStreak >= incorrectThreshold) {
    interval = clampInterval(interval + intervalIncrement, minimumInterval, maximumInterval)
    wrongStreak = 0
  }

  return { ...state, interval, correctStreak, wrongStreak }
}
