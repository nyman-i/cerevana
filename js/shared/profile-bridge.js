/*!
 * Cerevana - shared profile bridge (original Cerevana code, CC BY-NC 3.0).
 * Extracted from the identical PROFILES objects in js/quadbox/profiles.js and
 * js/cct/profiles.js. Builds a profile store that keeps a per-profile copy of
 * an exercise's whole settings blob: selecting a profile writes its blob into
 * the live localStorage key (identifier unchanged - only content swaps) and
 * reloads the in-memory store; every settings change is persisted back into
 * the active profile. Also wires the shared profile-picker DOM and runs
 * startup. Store identifiers are NEVER renamed once shipped.
 */

const readJson = (key) => {
  try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
}
const writeJson = (key, value) => localStorage.setItem(key, JSON.stringify(value))

// config: profilesKey/selectedKey/liveKey (localStorage identifiers),
// blobField (profile.data field holding the settings copy),
// store ({ getSettings, reloadSettings, subscribe } from the exercise's
// settings module), and optional seedBlob(profileData) for first-time blobs
// (defaults to a clone of the live settings).
export const createProfileBridge = ({ profilesKey, selectedKey, liveKey, blobField, store, seedBlob }) => {
  const { getSettings, reloadSettings, subscribe } = store
  const seed = seedBlob || (() => structuredClone(getSettings()))

  const profileInput = document.getElementById('profile-input')
  const profileArrow = document.getElementById('profile-arrow')
  const profileList = document.getElementById('profile-list')
  const profileDropdown = document.querySelector('.profile-dropdown')
  const profilePlus = document.getElementById('profile-plus')

  const PROFILES = {
    profiles: [],
    selected: 0,
    applying: false,

    startup() {
      this.profiles = readJson(profilesKey) || [{ name: 'Default', data: {} }]
      const sel = readJson(selectedKey)
      this.selected = (Number.isInteger(sel) && sel >= 0 && sel < this.profiles.length) ? sel : 0
      this.apply()
      this.persist()
      // every settings change lands in the active profile
      subscribe(() => {
        if (this.applying) return
        this.current().data[blobField] = getSettings()
        this.persist()
      })
    },

    current() {
      return this.profiles[this.selected]
    },

    apply() {
      const profile = this.current()
      profile.data = profile.data || {}
      if (!profile.data[blobField]) profile.data[blobField] = seed(profile.data)
      this.applying = true
      writeJson(liveKey, profile.data[blobField])
      reloadSettings()
      this.applying = false
      // keep the applied object as the profile's live reference copy
      profile.data[blobField] = getSettings()
      this.renderDropdown()
    },

    persist() {
      writeJson(profilesKey, this.profiles)
      writeJson(selectedKey, this.selected)
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
  return PROFILES
}
