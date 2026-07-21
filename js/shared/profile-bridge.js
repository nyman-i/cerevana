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
  const profileShare = document.getElementById('profile-share')
  const profileCopied = document.getElementById('profile-copied')

  const shortId = () => Math.random().toString(36).slice(2, 11)
  const sanitizeName = (value) =>
    (value && value.length < 40) ? value.replace(/<[^>]*>/g, '') : ''

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
      this.loadUrl()
      // every settings change lands in the active profile
      subscribe(() => {
        if (this.applying) return
        this.current().data[blobField] = getSettings()
        this.persist()
      })
    },

    // share URL: always the public origin, even when running locally - a
    // recipient opens the link on cerevana.com, not the sharer's localhost.
    // The settings blob rides in a param named after the exercise's blob
    // field ('quadbox' / 'cct'); apply() normalizes it through the settings
    // module's migrate-and-merge load on import.
    // ponytail: whole blob in the URL (~10KB for N-Back) - diff against
    // defaults before encoding if a chat client ever truncates these
    generateUrl() {
      const id = encodeURIComponent(shortId())
      const name = encodeURIComponent(this.current().name)
      const blob = encodeURIComponent(JSON.stringify(this.current().data[blobField] ?? getSettings()))
      return `https://cerevana.com${window.location.pathname}?id=${id}&name=${name}&${blobField}=${blob}`
    },

    loadUrl() {
      const urlObj = new URL(window.location.href)
      if (!urlObj.searchParams.get(blobField)) return
      try {
        window.history.replaceState({}, '', window.location.origin + window.location.pathname)
      } catch { /* file:// - nothing to strip */ }
      this.importFromUrl(urlObj)
    },

    importFromUrl(urlObj) {
      const id = sanitizeName(urlObj.searchParams.get('id') || '')
      const encodedBlob = urlObj.searchParams.get(blobField)
      if (!id || !encodedBlob) return false
      if (this.profiles.some(p => p.id === id)) return false
      let blob
      try { blob = JSON.parse(decodeURIComponent(encodedBlob)) } catch { return false }
      if (Object.prototype.toString.call(blob) !== '[object Object]') return false
      let name = sanitizeName(decodeURIComponent(urlObj.searchParams.get('name') || '')) || 'Imported'
      while (this.profiles.some(p => p.name === name)) name += ' (imported)'
      this.profiles.push({ name, id, data: { [blobField]: blob } })
      this.select(this.profiles.length - 1)
      return true
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
      // removing an earlier row shifts the selected one down a slot -
      // follow it, or select() applies the *next* profile's settings
      if (index < this.selected) this.selected--
      if (this.selected >= this.profiles.length) this.selected = 0
      this.select(this.selected)
    },

    rename(newName) {
      this.current().name = newName
      this.persist()
      this.renderDropdown()
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
  if (profileShare) {
    profileShare.addEventListener('click', () => {
      navigator.clipboard.writeText(PROFILES.generateUrl())
      profileCopied.classList.add('toast')
      setTimeout(() => profileCopied.classList.remove('toast'), 1500)
    })
  }

  PROFILES.startup()
  return PROFILES
}
