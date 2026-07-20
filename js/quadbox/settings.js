/*!
 * Derived from Quad Box - https://github.com/soamsy/quad-box
 * Copyright (c) 2025 The Quad Box Project Contributors
 * MIT License - see js/quadbox/LICENSE
 * Ported from src/stores/settingsStore.js at upstream commit 83a9718
 * (deepMerge/load/save), then extended for Cerevana's merged N-Back:
 * classic mode defaults, voice/dailyReset, reloadSettings. All additions
 * are additive keys - the storage key and existing JSON shape are
 * unchanged (NEVER rename: quad-box-settings).
 */
import { migrateSettings } from './engine/migrations/migrations.js'

const STORAGE_KEY = 'quad-box-settings'

// per-mode fields shared by the classic (Brain Workshop-derived) mode family;
// their matchChance/interference are per-trial probabilities (BW semantics),
// unlike the engine's guaranteed-distribution matchChance
const classicShared = {
  nBack: 2,
  numTrials: 24,
  trialTime: 3300,
  matchChance: 12.5,
  interference: 12.5,
  grid: 'static2D',
  rules: 'none',
  enableAudio: true, // every classicShared mode always includes 'audio' in its mods
  audioSource: 'letters2',
  crab: false,
  selfPaced: false,
}

const arithmeticShared = {
  ...classicShared,
  nBack: 1,
  numTrials: 21,
  trialTime: 3800,
  arithOps: { add: true, sub: true, mul: true, div: true },
  arithMaxNumber: 12,
  arithNegatives: false,
}

const defaultSettings = {
  version: "v3",
  mode: 'quad',
  theme: 'dark',
  gameSettings: {
    quad: {
      nBack: 2,
      numTrials: 35,
      trialTime: 2500,
      matchChance: 25,
      interference: 20,
      enableAudio: true,
      enableShape: true,
      enableColor: true,
      enableImage: false,
      grid: 'rotate3D',
      rules: 'none',
      audioSource: 'letters2',
      colorSource: 'basic',
      shapeSource: 'basic',
      imageSource: 'voronoi',
    },
    dual: {
      nBack: 2,
      numTrials: 35,
      trialTime: 2500,
      matchChance: 30,
      interference: 20,
      enableAudio: true,
      enableShape: false,
      enableColor: false,
      enableImage: false,
      grid: 'rotate3D',
      rules: 'none',
      audioSource: 'letters2',
      colorSource: 'basic',
      shapeSource: 'basic',
      imageSource: 'voronoi',
    },
    dualClassic: {
      nBack: 2,
      numTrials: 35,
      trialTime: 2500,
      matchChance: 30,
      interference: 20,
      enableAudio: true,
      enableShape: false,
      enableColor: false,
      enableImage: false,
      grid: 'static2D',
      rules: 'none',
      audioSource: 'letters2',
      colorSource: 'basic',
      shapeSource: 'basic',
      imageSource: 'voronoi',
    },
    quadClassic: {
      nBack: 2,
      numTrials: 35,
      trialTime: 2500,
      matchChance: 25,
      interference: 20,
      enableAudio: true,
      enableShape: true,
      enableColor: true,
      enableImage: false,
      grid: 'static2D',
      rules: 'none',
      audioSource: 'letters2',
      colorSource: 'basic',
      shapeSource: 'basic',
      imageSource: 'voronoi',
    },
    custom: {
      nBack: 2,
      numTrials: 40,
      trialTime: 2500,
      matchChance: 25,
      interference: 20,
      enableAudio: true,
      enableShape: false,
      enableColor: true,
      enableImage: false,
      grid: 'rotate3D',
      rules: 'none',
      audioSource: 'letters2',
      colorSource: 'basic',
      shapeSource: 'basic',
      imageSource: 'voronoi',
    },
    customB: {
      nBack: 2,
      numTrials: 40,
      trialTime: 2500,
      matchChance: 25,
      interference: 20,
      enableAudio: true,
      enableShape: false,
      enableColor: false,
      enableImage: true,
      grid: 'rotate3D',
      rules: 'none',
      audioSource: 'letters2',
      colorSource: 'voronoi',
      shapeSource: 'basic',
      imageSource: 'generative',
    },
    // classic presets: engine-generated, custom-shaped enable flags
    // (enablePosition: false = no position stream; engine treats absent as true)
    position: {
      nBack: 2,
      numTrials: 24,
      trialTime: 2800,
      matchChance: 25,
      interference: 20,
      enableAudio: false,
      enableShape: false,
      enableColor: false,
      enableImage: false,
      grid: 'static2D',
      rules: 'none',
      audioSource: 'letters2',
      colorSource: 'basic',
      shapeSource: 'basic',
      imageSource: 'voronoi',
      crab: false,
      selfPaced: false,
    },
    sound: {
      nBack: 2,
      numTrials: 24,
      trialTime: 2800,
      matchChance: 25,
      interference: 20,
      enablePosition: false,
      enableAudio: true,
      enableShape: false,
      enableColor: false,
      enableImage: false,
      grid: 'static2D',
      rules: 'none',
      audioSource: 'letters2',
      colorSource: 'basic',
      shapeSource: 'basic',
      imageSource: 'voronoi',
      crab: false,
      selfPaced: false,
    },
    positionColor: {
      nBack: 2,
      numTrials: 24,
      trialTime: 2800,
      matchChance: 25,
      interference: 20,
      enableAudio: false,
      enableShape: false,
      enableColor: true,
      enableImage: false,
      grid: 'static2D',
      rules: 'none',
      audioSource: 'letters2',
      colorSource: 'basic',
      shapeSource: 'basic',
      imageSource: 'voronoi',
      crab: false,
      selfPaced: false,
    },
    colorSound: {
      nBack: 2,
      numTrials: 24,
      trialTime: 2800,
      matchChance: 25,
      interference: 20,
      enablePosition: false,
      enableAudio: true,
      enableShape: false,
      enableColor: true,
      enableImage: false,
      grid: 'static2D',
      rules: 'none',
      audioSource: 'letters2',
      colorSource: 'basic',
      shapeSource: 'basic',
      imageSource: 'voronoi',
      crab: false,
      selfPaced: false,
    },
    triple: {
      nBack: 2,
      numTrials: 24,
      trialTime: 2800,
      matchChance: 25,
      interference: 20,
      enableAudio: true,
      enableShape: false,
      enableColor: true,
      enableImage: false,
      grid: 'static2D',
      rules: 'none',
      audioSource: 'letters2',
      colorSource: 'basic',
      shapeSource: 'basic',
      imageSource: 'voronoi',
      crab: false,
      selfPaced: false,
    },
    // classic modes: generated by js/quadbox/classic.js
    dualCombo: { ...classicShared },
    triCombo: { ...classicShared },
    quadCombo: { ...classicShared },
    triComboColor: { ...classicShared },
    jaeggi: { ...classicShared, trialTime: 3000 }, // crab/selfPaced ignored by the jaeggi protocol
    multiSquare: { ...classicShared, squares: 2 },
    arithmetic: { ...arithmeticShared },
    dualArithmetic: { ...arithmeticShared },
    tripleArithmetic: { ...arithmeticShared },
    tally: {
      nBack: 2,
      numTrials: 60,
      matchChance: 25,
      interference: 20,
      positionWidth: 2,
      enablePositionWidthSequence: false,
      positionWidthSequence: [2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      enableAudio: false,
      enableShape: false,
      enableColor: false,
      enableImage: false,
      grid: 'rotate3D',
      rules: 'tally',
      audioSource: 'letters2',
      colorSource: 'basic',
      shapeSource: 'basic',
      imageSource: 'voronoi',
    },
    vtally: {
      nBack: 2,
      numTrials: 60,
      matchChance: 25,
      interference: 20,
      positionWidth: 2,
      enablePositionWidthSequence: false,
      positionWidthSequence: [2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      enableShape: false,
      enableColor: false,
      enableImage: true,
      grid: 'rotate3D',
      rules: 'vtally',
      audioSource: 'letters2',
      colorSource: 'basic',
      shapeSource: 'basic',
      imageSource: 'generative',
    },
  },
  feedback: 'show',
  rotationSpeed: 35,
  enableAutoProgression: true,
  successCriteria: 80,
  successComboRequired: 1,
  failureCriteria: 50,
  failureComboRequired: 3,
  voice: 'recorded', // 'recorded' = Cerevana audio packs, 'browser' = speechSynthesis
  dailyReset: false,
  lastResetDay: 0,
  latticeMatchesTheme: false, // cube lattice: fixed original grey vs accent-tinted
  dailyProgressGoal: null, // minutes of play time, null = no goal
  weeklyProgressGoal: null,
  // duplicate keys across entries are fine: pressing a key fires every bound
  // action and inactive tags are no-ops
  hotkeys: {
    'position': 'A',
    'color': 'F',
    'shape': 'J',
    'audio': 'L',
    'visvis': 'S',
    'visaudio': 'D',
    'audiovis': 'J',
    'position0': 'A',
    'position1': 'S',
    'position2': 'D',
    'position3': 'F',
  },
  enabledModes: ['quad', 'dual', 'custom', 'quadClassic', 'dualClassic'],
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
    console.error('Failed to load settings from localStorage:', e)
    return getDefaultSettings()
  }
}

const saveSettings = (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch (e) {
    console.error('Failed to save settings to localStorage:', e)
  }
}

// ---- plain-JS store ----
let settings = loadSettings()
const listeners = new Set()
const notify = () => listeners.forEach(fn => fn(settings))

export const getSettings = () => settings
export const getGameSettings = () => settings.gameSettings[settings.mode]

export const subscribe = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export const updateSetting = (key, value) => {
  settings = { ...settings, [key]: value }
  saveSettings(settings)
  notify()
}

export const setGameField = (field, value) => {
  settings.gameSettings[settings.mode][field] = value
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

// last 04:00 day boundary (same rollover as the rest of the app)
export const dayStart4AM = (now) => {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 4, 0, 0)
  if (now.getHours() < 4) start.setDate(start.getDate() - 1)
  return start.getTime()
}

// daily level reset: first game after the 04:00 boundary restarts every
// mode at its default N. Called at game start (not page load) so a tab left
// open overnight still resets.
export const applyDailyResetIfDue = () => {
  if (!settings.dailyReset) return false
  const today = dayStart4AM(new Date())
  if (settings.lastResetDay === today) return false
  for (const mode of Object.keys(settings.gameSettings)) {
    const def = defaultSettings.gameSettings[mode]
    if (def) settings.gameSettings[mode].nBack = def.nBack
  }
  settings = { ...settings, lastResetDay: today }
  saveSettings(settings)
  notify()
  return true
}
