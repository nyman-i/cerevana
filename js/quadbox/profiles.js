/*!
 * Cerevana N-Back - profiles bridge (original Cerevana code, CC BY-NC 3.0).
 * Extends the existing N-Back profile store with a per-profile `quadbox`
 * blob (the merged game's whole settings object) via the shared bridge in
 * js/shared/profile-bridge.js. Store identifiers are shared with the legacy
 * page and NEVER renamed.
 */
import { getSettings, reloadSettings, subscribe } from './settings.js'
import { createProfileBridge } from '../shared/profile-bridge.js'

// legacy Brain Workshop per-mode levels → merged mode nBack (one-time seed
// when a profile's quadbox blob is first created)
const LEGACY_LEVEL_KEYS = {
  dual: 'nbackLevelDual',
  position: 'nbackLevelPosition',
  sound: 'nbackLevelSound',
  positionColor: 'nbackLevelPC',
  colorSound: 'nbackLevelCA',
  triple: 'nbackLevelPCA',
  dualCombo: 'nbackLevelDC',
  triCombo: 'nbackLevelTC',
  quadCombo: 'nbackLevelQC',
  triComboColor: 'nbackLevelTCC',
  arithmetic: 'nbackLevelA',
  dualArithmetic: 'nbackLevelDA',
  tripleArithmetic: 'nbackLevelTA',
  jaeggi: 'nbackLevelDual',
  multiSquare: 'nbackLevelDual2',
}

const seedQuadboxBlob = (profileData) => {
  // start from the live settings (continuity for the pre-profiles setup),
  // then carry this profile's legacy levels into the matching modes
  const blob = structuredClone(getSettings())
  for (const [mode, legacyKey] of Object.entries(LEGACY_LEVEL_KEYS)) {
    const level = profileData?.[legacyKey]
    if (Number.isInteger(level) && blob.gameSettings[mode]) {
      blob.gameSettings[mode].nBack = Math.min(12, Math.max(1, level))
    }
  }
  return blob
}

export const PROFILES = createProfileBridge({
  profilesKey: 'sllgms-v3-nback-profiles',
  selectedKey: 'sllgms-v3-nback-selected-profile',
  liveKey: 'quad-box-settings',
  blobField: 'quadbox',
  store: { getSettings, reloadSettings, subscribe },
  seedBlob: seedQuadboxBlob,
})
