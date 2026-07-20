/*!
 * Derived from CCT - https://github.com/tim22dev22/CCT
 * MIT License - see js/cct/LICENSE
 * Ported from script.js's loadAudioClip/playStimulusAudio/playBeep
 * (lines ~3100-3420 at the `main` branch HEAD pulled 2026-07-18):
 * preload-once-per-voice-pack playback plus a synthesized error beep via
 * Web Audio. Restructured into a class with Cerevana's asset-layout
 * convention (module-relative js/cct/audio/<voice>/, mirrors
 * js/quadbox/audio.js) in place of upstream's global cache object + DOM
 * settings reads. Cerevana change: upstream cloned a fresh element per
 * stimulus (so a fast interval overlaps instead of cutting the previous
 * clip) - iOS Safari blocks playback of elements never started inside a
 * user gesture, and a fresh clone never was, silencing every digit.
 * A 2-deep round-robin pool per digit keeps the overlap behavior with
 * elements that unlock() can bless once at session start.
 */
import { getSettings } from './settings.js'

const AUDIO_BASE = new URL('./audio/', import.meta.url)

const MAX_BEEP_GAIN = 0.52
const POOL_SIZE = 2 // a digit only ever overlaps itself once at max speed

class CctAudioPlayer {
  constructor() {
    this.cache = new Map() // voice -> { 1: [Audio, Audio], ..., 9: [...] }
    this.beepContext = null
    this.poolIndex = 0
  }

  preloadVoice(voice) {
    if (this.cache.has(voice)) return
    const clips = {}
    for (let digit = 1; digit <= 9; digit++) {
      clips[digit] = Array.from({ length: POOL_SIZE }, () => {
        const audio = new Audio(new URL(`${voice}/${digit}.mp3`, AUDIO_BASE).href)
        audio.preload = 'auto'
        return audio
      })
    }
    this.cache.set(voice, clips)
  }

  // Called from startSession, i.e. inside the START tap - the one moment
  // iOS Safari lets audio be unlocked for later timer-driven playback.
  // Also spins up the beep's AudioContext, which iOS starts suspended
  // unless created during a gesture.
  unlock(voice) {
    this.preloadVoice(voice)
    for (const pool of Object.values(this.cache.get(voice))) {
      for (const audio of pool) {
        if (audio.cvUnlocked) continue
        audio.cvUnlocked = true
        audio.muted = true
        audio.play().then(() => {
          audio.pause()
          audio.currentTime = 0
          audio.muted = false
        }).catch(() => {
          audio.muted = false
          audio.cvUnlocked = false // no gesture credit - retry next start
        })
      }
    }
    if (getSettings().beepEnabled) {
      this.beepContext ??= new (window.AudioContext || window.webkitAudioContext)()
      if (this.beepContext.state === 'suspended') this.beepContext.resume().catch(() => {})
    }
  }

  // fire-and-forget: the stimulus clock paces the game, not clip completion -
  // round-robin the pool so a fast interval overlaps the previous clip
  // instead of cutting it off
  playDigit(digit) {
    const { voice, playbackSpeed, presentationMode } = getSettings()
    if (presentationMode === 'visual') return
    this.preloadVoice(voice)
    const pool = this.cache.get(voice)[digit]
    if (!pool) return
    const clip = pool[this.poolIndex++ % pool.length]
    clip.playbackRate = playbackSpeed
    clip.currentTime = 0
    clip.play().catch(() => {})
  }

  playBeep() {
    const { beepEnabled, beepVolume } = getSettings()
    if (!beepEnabled) return
    this.beepContext ??= new (window.AudioContext || window.webkitAudioContext)()
    const ctx = this.beepContext
    // iOS suspends contexts created outside a gesture; resume is async but
    // usually settles before the oscillator's 150ms window matters
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.frequency.value = 220
    gain.gain.value = (beepVolume / 100) ** 2 * MAX_BEEP_GAIN
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.15)
  }
}

export const cctAudio = new CctAudioPlayer()
