/*!
 * Derived from Quad Box - https://github.com/soamsy/quad-box (MIT, see
 * js/quadbox/LICENSE). Port of src/stores/analyticsStore.js: scoring and
 * persistence logic verbatim; the svelte writable is replaced by a plain
 * listener list.
 */
import { addGame, getLastRecentGame, getPlayTimeSince4AM } from './engine/gamedb.js'
import { formatSeconds } from './engine/utils.js'

const listeners = new Set()
let current = {}

const loadAnalytics = async () => {
  const lastGame = await getLastRecentGame()
  const playTime = await getPlayTimeSince4AM()
  return {
    lastGame,
    playTime: playTime > 0 ? formatSeconds(playTime) : null,
  }
}

const refresh = async () => {
  current = await loadAnalytics()
  listeners.forEach(fn => fn(current))
}

refresh()

export const analytics = {
  get: () => current,
  refresh,
  subscribe: (fn) => {
    listeners.add(fn)
    fn(current)
    return () => listeners.delete(fn)
  },

  scoreTrials: async (gameInfo, scoresheet, status) => {
    const scores = {}
    for (const tag of gameInfo.tags) {
      scores[tag] = { hits: 0, misses: 0 }
    }

    for (const answers of scoresheet) {
      for (const tag of gameInfo.tags) {
        if (tag in answers) {
          if (answers[tag]) {
            scores[tag].hits++
          } else {
            scores[tag].misses++
          }
        }
      }
    }

    await addGame({
      ...gameInfo,
      scores,
      completedTrials: scoresheet.length,
      status,
    })
    await refresh()
  },

  scoreTallyTrials: async (gameInfo, scoresheet, status) => {
    const scores = { tally: { hits: 0, misses: 0 } }

    scores.tally.hits = scoresheet.filter(answers => answers.success && answers.count > 0).length
    scores.tally.possible = scoresheet.filter(answers => answers.count > 0 || ('success' in answers && answers.success === false)).length

    await addGame({
      ...gameInfo,
      scores,
      completedTrials: scoresheet.length,
      status,
    })
    await refresh()
  },
}
