// Original Cerevana code. Session lifecycle for CCT, driving the ported
// mechanics reducer (js/cct/engine/mechanics.js) on a live setTimeout
// clock. Adapted from tim22dev22/CCT script.js's runStimulus/startGame/
// stopGame flow (global mutable state + DOM reads) into an explicit
// session object with a callbacks interface, so js/cct/page.js owns all
// DOM/rendering concerns.
import { getSettings } from './settings.js'
import {
  randomDigit, getExpectedAnswer, isCorrectAnswer,
  createIntervalState, recordAnswer,
} from './engine/mechanics.js'
import { cctAudio } from './audio.js'

let session = null

export const isRunning = () => session !== null

export function startSession(callbacks) {
  const settings = getSettings()
  const now = Date.now()
  session = {
    startedAt: now,
    arithmeticMode: settings.arithmeticMode,
    endCondition: settings.endCondition,
    endsAt: settings.endCondition === 'timer' ? now + settings.duration * 60000 : null,
    targetCorrect: settings.targetCorrect,
    voice: settings.voice,
    playbackSpeed: settings.playbackSpeed,
    intervalState: createIntervalState({
      startingInterval: settings.startingInterval,
      minimumInterval: settings.minimumInterval,
      maximumInterval: settings.maximumInterval,
      intervalIncrement: settings.intervalIncrement,
      correctThreshold: settings.correctThreshold,
      incorrectThreshold: settings.incorrectThreshold,
    }),
    numbers: [],
    correctAnswers: 0,
    totalQuestions: 0,
    responseTimes: [],
    expectedAnswer: null,
    questionStartedAt: 0,
    resolved: true,
    timeoutId: null,
    callbacks,
  }
  tick()
  return session
}

function tick() {
  if (!session) return
  if (!session.resolved) finalizeAnswer(null)
  // check right after resolving the previous question, before starting a new
  // one - otherwise a timer running out mid-tick flashes one last digit the
  // user is never given time to answer
  if (checkEnd()) return

  const digit = randomDigit()
  session.numbers.push(digit)
  cctAudio.playDigit(digit)

  if (session.numbers.length >= 2) {
    const [prev, cur] = session.numbers.slice(-2)
    session.expectedAnswer = getExpectedAnswer(prev, cur, session.arithmeticMode)
    session.resolved = false
    session.questionStartedAt = Date.now()
  } else {
    session.expectedAnswer = null
    session.resolved = true
  }

  session.callbacks.onTick?.({ digit, interval: session.intervalState.interval })

  // ponytail: an interval change takes effect on the *next* scheduling
  // decision, not by canceling+rescheduling the timer already in flight
  // (upstream's changeInterval does the latter for tighter responsiveness).
  // Upgrade if playtesting shows the one-tick lag feels sluggish.
  session.timeoutId = setTimeout(tick, session.intervalState.interval)
}

function shouldEnd() {
  return session.endCondition === 'timer'
    ? Date.now() >= session.endsAt
    : session.correctAnswers >= session.targetCorrect
}

// shared by tick() (timeout path) and submitAnswer() (live-correct path) so
// a 'correct' end condition stops the instant the target is reached instead
// of overshooting by one extra question on the next scheduled tick
function checkEnd() {
  if (session && shouldEnd()) { stopSession('completed'); return true }
  return false
}

// live keystroke check - only reacts once the typed value exactly matches;
// a partial/wrong-so-far value just keeps waiting (timeout is what marks it
// wrong, mirroring upstream's isCorrectAnswerInput usage)
export function submitAnswer(value) {
  if (!session || session.resolved) return false
  if (!isCorrectAnswer(session.expectedAnswer, value)) return false
  finalizeAnswer(value)
  checkEnd()
  return true
}

function finalizeAnswer(value) {
  const isCorrect = value !== null && isCorrectAnswer(session.expectedAnswer, value)
  const responseTime = isCorrect ? Date.now() - session.questionStartedAt : session.intervalState.interval
  session.resolved = true
  session.totalQuestions++
  if (isCorrect) {
    session.correctAnswers++
    session.responseTimes.push(responseTime)
  } else {
    cctAudio.playBeep()
  }
  session.intervalState = recordAnswer(session.intervalState, isCorrect)
  session.callbacks.onAnswer?.({
    isCorrect,
    interval: session.intervalState.interval,
    correctAnswers: session.correctAnswers,
    totalQuestions: session.totalQuestions,
  })
}

export function stopSession(outcome = 'exited') {
  if (!session) return null
  clearTimeout(session.timeoutId)
  const endedAt = Date.now()
  const record = {
    startedAt: session.startedAt,
    endedAt,
    status: outcome === 'completed' ? 'Completed' : 'Manually exited',
    arithmeticMode: session.arithmeticMode,
    endCondition: session.endCondition,
    durationMs: endedAt - session.startedAt,
    correctAnswers: session.correctAnswers,
    totalQuestionsAsked: session.totalQuestions,
    accuracy: session.totalQuestions ? (session.correctAnswers / session.totalQuestions) * 100 : 0,
    averageResponseTimeMs: session.responseTimes.length
      ? session.responseTimes.reduce((a, b) => a + b, 0) / session.responseTimes.length
      : 0,
    correctThreshold: session.intervalState.correctThreshold,
    incorrectThreshold: session.intervalState.incorrectThreshold,
    startingInterval: session.intervalState.startingInterval,
    minimumInterval: session.intervalState.minimumInterval,
    maximumInterval: session.intervalState.maximumInterval,
    intervalIncrement: session.intervalState.intervalIncrement,
    voice: session.voice,
    playbackSpeed: session.playbackSpeed,
  }
  const callbacks = session.callbacks
  session = null
  callbacks.onEnd?.(record)
  return record
}
