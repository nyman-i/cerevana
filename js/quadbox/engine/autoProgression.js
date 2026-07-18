/*!
 * Derived from Quad Box — https://github.com/soamsy/quad-box
 * Copyright (c) 2025 The Quad Box Project Contributors
 * MIT License — see js/quadbox/LICENSE
 * Promoted from src/lib/autoProgression.js at upstream commit 83a9718.
 * Adapted: svelte store access replaced by plain arguments/hooks;
 * progression logic itself is unchanged.
 */
import { getLast48HoursGames, addGame } from './gamedb.js'

const takeUntil = (array, condition) => {
  const i = array.findIndex(condition)
  return array.slice(0, i === -1 ? array.length : i)
}

// settings: { enableAutoProgression, successCriteria, failureCriteria,
//             successComboRequired, failureComboRequired }
// hooks:    { setNBack(n), onAdvance(), onFallback() }
// Returns 'advance' | 'fallback' | null.
export const runAutoProgression = async (gameInfo, settings, hooks) => {
  if (!settings.enableAutoProgression) {
    return null
  }
  const successCriteria = settings.successCriteria
  const failureCriteria = settings.failureCriteria
  const successComboRequired = settings.successComboRequired
  const failureComboRequired = settings.failureComboRequired

  const recentGames = await getLast48HoursGames(Math.max(successComboRequired, failureComboRequired))
  const sameGames = recentGames.filter(game => ['completed', 'tombstone'].includes(game.status) && game.title === gameInfo.title && game.nBack === gameInfo.nBack)
  const applicableGames = takeUntil(sameGames, game => game.status === 'tombstone')
  const successGames = applicableGames.slice(0, successComboRequired)
  const failureGames = applicableGames.slice(0, failureComboRequired)

  if (successGames.length >= successComboRequired && successGames.every(game => (game.total.percent * 100) >= successCriteria)) {
    hooks.setNBack(Math.min(gameInfo.nBack + 1, 12))
    await addGame({ ...gameInfo, status: 'tombstone' })
    hooks.onAdvance?.()
    return 'advance'
  } else if (failureGames.length >= failureComboRequired && failureGames.every(game => (game.total.percent * 100) < failureCriteria)) {
    hooks.setNBack(Math.max(gameInfo.nBack - 1, 1))
    await addGame({ ...gameInfo, status: 'tombstone' })
    hooks.onFallback?.()
    return 'fallback'
  }
  return null
}
