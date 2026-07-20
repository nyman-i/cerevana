/*!
 * Cerevana CCT - profiles bridge (original Cerevana code, CC BY-NC 3.0).
 * Extends the existing profile store with a per-profile `cct` blob (the
 * whole settings object) via the shared bridge in
 * js/shared/profile-bridge.js. No legacy-level seeding - CCT has no
 * predecessor data. Store identifiers are NEVER renamed once shipped.
 */
import { getSettings, reloadSettings, subscribe } from './settings.js'
import { createProfileBridge } from '../shared/profile-bridge.js'

export const PROFILES = createProfileBridge({
  profilesKey: 'sllgms-v3-cct-profiles',
  selectedKey: 'sllgms-v3-cct-selected-profile',
  liveKey: 'cct-settings',
  blobField: 'cct',
  store: { getSettings, reloadSettings, subscribe },
})
