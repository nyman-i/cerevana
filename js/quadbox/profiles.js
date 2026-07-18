/*!
 * Cerevana N-Back - profiles bridge (original Cerevana code, CC BY-NC 3.0).
 * Extends the existing N-Back profile store with a per-profile `quadbox`
 * blob (the merged game's whole settings object). Selecting a profile
 * writes its blob into the live `quad-box-settings` key (identifier
 * unchanged - only content swaps) and reloads the in-memory store; every
 * settings change is persisted back into the active profile.
 * Store identifiers are shared with the legacy page and NEVER renamed.
 */
import { getSettings, reloadSettings, subscribe } from './settings.js'

const PROFILES_KEY = 'sllgms-v3-nback-profiles'
const SELECTED_KEY = 'sllgms-v3-nback-selected-profile'
const LIVE_KEY = 'quad-box-settings'

const readJson = (key) => {
  try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
}
const writeJson = (key, value) => localStorage.setItem(key, JSON.stringify(value))

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

const profileInput = document.getElementById('profile-input')
const profileArrow = document.getElementById('profile-arrow')
const profileList = document.getElementById('profile-list')
const profileDropdown = document.querySelector('.profile-dropdown')
const profilePlus = document.getElementById('profile-plus')

export const PROFILES = {
  profiles: [],
  selected: 0,
  applying: false,

  startup() {
    this.profiles = readJson(PROFILES_KEY) || [{ name: 'Default', data: {} }]
    const sel = readJson(SELECTED_KEY)
    this.selected = (Number.isInteger(sel) && sel >= 0 && sel < this.profiles.length) ? sel : 0
    this.apply()
    this.persist()
    // every settings change lands in the active profile
    subscribe(() => {
      if (this.applying) return
      this.current().data.quadbox = getSettings()
      this.persist()
    })
  },

  current() {
    return this.profiles[this.selected]
  },

  apply() {
    const profile = this.current()
    profile.data = profile.data || {}
    if (!profile.data.quadbox) profile.data.quadbox = seedQuadboxBlob(profile.data)
    this.applying = true
    writeJson(LIVE_KEY, profile.data.quadbox)
    reloadSettings()
    this.applying = false
    // keep the applied object as the profile's live reference copy
    profile.data.quadbox = getSettings()
    this.renderDropdown()
  },

  persist() {
    writeJson(PROFILES_KEY, this.profiles)
    writeJson(SELECTED_KEY, this.selected)
  },

  select(index) {
    this.selected = index
    profileList.style.display = 'none'
    this.apply()
    this.persist()
  },

  add() {
    this.profiles.push({
      name: this.current().name + ' (copy)',
      data: structuredClone(this.current().data),
    })
    this.select(this.profiles.length - 1)
    profileInput.select()
  },

  remove(index) {
    this.profiles.splice(index, 1)
    if (this.selected >= this.profiles.length) this.selected = 0
    this.select(this.selected)
  },

  rename(newName) {
    this.current().name = newName
    this.persist()
  },

  renderDropdown() {
    profileInput.value = this.current().name
    profileList.innerHTML = ''
    this.profiles.forEach((profile, index) => {
      const selectButton = document.createElement('div')
      selectButton.classList.add('profile-select')
      selectButton.textContent = profile.name || '(no name)'
      if (this.selected === index) selectButton.classList.add('highlight')
      selectButton.addEventListener('click', (event) => {
        event.stopPropagation()
        this.select(index)
      })
      if (this.profiles.length > 1) {
        const deleteButton = document.createElement('div')
        deleteButton.className = 'profile-delete'
        deleteButton.textContent = 'X'
        deleteButton.addEventListener('click', (event) => {
          event.stopPropagation()
          if (confirm(`Delete ${profile.name}?`)) this.remove(index)
        })
        selectButton.appendChild(deleteButton)
      }
      profileList.appendChild(selectButton)
    })
  },
}

profileArrow.addEventListener('click', () => {
  profileList.style.display = profileList.style.display === 'block' ? 'none' : 'block'
})
document.addEventListener('click', (event) => {
  if (!profileDropdown.contains(event.target)) profileList.style.display = 'none'
})
profilePlus.addEventListener('click', () => PROFILES.add())
profileInput.addEventListener('input', (e) => PROFILES.rename(e.target.value))

PROFILES.startup()
