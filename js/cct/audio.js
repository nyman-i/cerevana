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
        // a real play() is already in flight (digit #1 fires before unlock) -
        // that play was inside the gesture, so it's blessed; the muted
        // warm-up would pause it mid-clip
        if (!audio.paused) { audio.cvUnlocked = true; continue }
        audio.cvUnlocked = true
        audio.muted = true
        // iOS Safari: muted doesn't reliably suppress the very first frame
        // when ~18 clips all play() in the same synchronous burst - volume 0
        // is a second, independent silencing path that closes the gap
        audio.volume = 0
        audio.play().then(() => {
          if (!audio.muted) return // playDigit took over mid-warm-up
          audio.pause()
          audio.currentTime = 0
          audio.muted = false
          audio.volume = 1
        }).catch(() => {
          audio.muted = false
          audio.volume = 1
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
    // unmuting also signals a still-pending muted warm-up (slow load) in
    // unlock() to leave this clip alone instead of pausing it
    clip.muted = false
    clip.volume = 1
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
