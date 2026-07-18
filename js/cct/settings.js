// Original Cerevana code. Settings store for CCT, structured after
// js/quadbox/settings.js's deepMerge/load/save/subscribe pattern (see
// that file for the pattern's own upstream provenance) — CCT has no
// per-mode nesting (one exercise, one settings shape), so this stays flat.
import { migrateSettings } from './engine/migrations/migrations.js'

const STORAGE_KEY = 'cct-settings'

const defaultSettings = {
  version: 'v1',
  // adaptive interval state machine (js/cct/engine/mechanics.js), all in ms
  startingInterval: 1500,
  minimumInterval: 700,
  maximumInterval: 3000,
  intervalIncrement: 100,
  correctThreshold: 4,
  incorrectThreshold: 4,
  // session shape
  duration: 15, // minutes, used when endCondition === 'timer'
  endCondition: 'timer', // 'timer' | 'correct'
  targetCorrect: 500,
  arithmeticMode: 'addition', // 'addition' | 'multiplication' | 'subtraction' | 'difference'
  // audio
  voice: 'nathan',
  playbackSpeed: 1,
  beepVolume: 50,
  beepEnabled: true,
  // if true, records how long each session spends at every interval level
  showIntervalTiming: false,
  dailyProgressGoal: null, // minutes of play time, null = no goal
  weeklyProgressGoal: null,
}

const getDefaultSettings = () => structuredClone(defaultSettings)

const isPlainObject = obj => Object.prototype.toString.call(obj) === '[object Object]'

const deepMerge = (target, source) => {
  if (Array.isArray(target) && Array.isArray(source)) {
    return source.map((item, i) =>
      i in target ? deepMerge(target[i], item) : item
    )
  }

  if (isPlainObject(target) && isPlainObject(source)) {
    const result = { ...target }
    for (const key of Object.keys(source)) {
      if (key === '__proto__' || key === 'constructor') continue
      result[key] =
        key in target ? deepMerge(target[key], source[key]) : source[key]
    }
    return result
  }

  return Array.isArray(source) ? source.slice() : source
}

const loadSettings = () => {
  if (typeof localStorage === 'undefined') return getDefaultSettings()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    let savedSettings = raw ? JSON.parse(raw) : {}
    savedSettings = migrateSettings(savedSettings)
    return deepMerge(getDefaultSettings(), savedSettings)
  } catch (e) {
    console.error('Failed to load CCT settings from localStorage:', e)
    return getDefaultSettings()
  }
}

const saveSettings = (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch (e) {
    console.error('Failed to save CCT settings to localStorage:', e)
  }
}

let settings = loadSettings()
const listeners = new Set()
const notify = () => listeners.forEach(fn => fn(settings))

export const getSettings = () => settings

export const subscribe = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export const updateSetting = (key, value) => {
  settings = { ...settings, [key]: value }
  saveSettings(settings)
  notify()
}

export const resetSettings = () => {
  settings = getDefaultSettings()
  saveSettings(settings)
  notify()
}

// re-read from localStorage after an external write (profile switch)
export const reloadSettings = () => {
  settings = loadSettings()
  notify()
}
