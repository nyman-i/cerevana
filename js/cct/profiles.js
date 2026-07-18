/*!
 * Cerevana CCT — profiles bridge (original Cerevana code, CC BY-NC 3.0).
 * Direct port of js/quadbox/profiles.js's pattern: extends the existing
 * profile store with a per-profile `cct` blob (the whole settings object).
 * Selecting a profile writes its blob into the live `cct-settings` key and
 * reloads the in-memory store; every settings change is persisted back into
 * the active profile. No legacy-level seeding — CCT has no predecessor data.
 * Store identifiers are NEVER renamed once shipped.
 */
import { getSettings, reloadSettings, subscribe } from './settings.js'

const PROFILES_KEY = 'sllgms-v3-cct-profiles'
const SELECTED_KEY = 'sllgms-v3-cct-selected-profile'
const LIVE_KEY = 'cct-settings'

const readJson = (key) => {
  try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
}
const writeJson = (key, value) => localStorage.setItem(key, JSON.stringify(value))

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
      this.current().data.cct = getSettings()
      this.persist()
    })
  },

  current() {
    return this.profiles[this.selected]
  },

  apply() {
    const profile = this.current()
    profile.data = profile.data || {}
    if (!profile.data.cct) profile.data.cct = structuredClone(getSettings())
    this.applying = true
    writeJson(LIVE_KEY, profile.data.cct)
    reloadSettings()
    this.applying = false
    // keep the applied object as the profile's live reference copy
    profile.data.cct = getSettings()
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
