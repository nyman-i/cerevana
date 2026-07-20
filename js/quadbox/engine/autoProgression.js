/*!
 * Derived from Quad Box - https://github.com/soamsy/quad-box
 * Copyright (c) 2025 The Quad Box Project Contributors
 * MIT License - see js/quadbox/LICENSE
 * Promoted from src/lib/autoProgression.js at upstream commit 83a9718.
 * Adapted: svelte store access replaced by plain arguments/hooks; streaks
 * additionally split on the caller's variantKey (grid/rules/crab/selfPaced
 * - the same grouping the progress graph uses), so games played under a
 * structurally different config don't count toward the same combo; the
 * decision extracted into pure decideProgression for testing.
 */
import { getLast48HoursGames, addGame } from './gamedb.js'

const takeUntil = (array, condition) => {
  const i = array.findIndex(condition)
  return array.slice(0, i === -1 ? array.length : i)
}

// Pure decision: 'advance' | 'fallback' | null from the recent-game list.
export const decideProgression = (recentGames, gameInfo, settings, variantKey = () => '') => {
  const { successCriteria, failureCriteria, successComboRequired, failureComboRequired } = settings
  const sameGames = recentGames.filter(game => ['completed', 'tombstone'].includes(game.status)
    && game.title === gameInfo.title && game.nBack === gameInfo.nBack
    && variantKey(game) === variantKey(gameInfo))
  const applicableGames = takeUntil(sameGames, game => game.status === 'tombstone')
  const successGames = applicableGames.slice(0, successComboRequired)
  const failureGames = applicableGames.slice(0, failureComboRequired)

  if (successGames.length >= successComboRequired && successGames.every(game => (game.total.percent * 100) >= successCriteria)) {
    return 'advance'
  } else if (failureGames.length >= failureComboRequired && failureGames.every(game => (game.total.percent * 100) < failureCriteria)) {
    return 'fallback'
  }
  return null
}

// settings: { enableAutoProgression, successCriteria, failureCriteria,
//             successComboRequired, failureComboRequired }
// hooks:    { setNBack(n), onAdvance(), onFallback(), variantKey(game) }
// Returns 'advance' | 'fallback' | null.
export const runAutoProgression = async (gameInfo, settings, hooks) => {
  if (!settings.enableAutoProgression) {
    return null
  }
  const recentGames = await getLast48HoursGames()
  const result = decideProgression(recentGames, gameInfo, settings, hooks.variantKey)
  if (result === 'advance') {
    hooks.setNBack(Math.min(gameInfo.nBack + 1, 12))
    await addGame({ ...gameInfo, status: 'tombstone' })
    hooks.onAdvance?.()
  } else if (result === 'fallback') {
    hooks.setNBack(Math.max(gameInfo.nBack - 1, 1))
    await addGame({ ...gameInfo, status: 'tombstone' })
    hooks.onFallback?.()
  }
  return result
}
