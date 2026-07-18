/*!
 * Derived from CCT - https://github.com/tim22dev22/CCT
 * MIT License - see js/cct/LICENSE
 * Ported from script.js's loadAudioClip/playStimulusAudio/playBeep
 * (lines ~3100-3420 at the `main` branch HEAD pulled 2026-07-18):
 * preload-once-per-voice-pack + cloneNode-per-stimulus playback (so an
 * overlapping digit at a fast interval doesn't cut the previous clip
 * off), plus a synthesized error beep via Web Audio. Restructured into
 * a class with Cerevana's asset-layout convention (module-relative
 * js/cct/audio/<voice>/, mirrors js/quadbox/audio.js) in place of
 * upstream's global cache object + DOM settings reads.
 */
import { getSettings } from './settings.js'

const AUDIO_BASE = new URL('./audio/', import.meta.url)

const MAX_BEEP_GAIN = 0.52

class CctAudioPlayer {
  constructor() {
    this.cache = new Map() // voice -> { 1: Audio, ..., 9: Audio }
    this.beepContext = null
  }

  preloadVoice(voice) {
    if (this.cache.has(voice)) return
    const clips = {}
    for (let digit = 1; digit <= 9; digit++) {
      const audio = new Audio(new URL(`${voice}/${digit}.mp3`, AUDIO_BASE).href)
      audio.preload = 'auto'
      clips[digit] = audio
    }
    this.cache.set(voice, clips)
  }

  // fire-and-forget: the stimulus clock paces the game, not clip completion -
  // clone so a fast interval can overlap the previous clip instead of cutting it
  playDigit(digit) {
    const { voice, playbackSpeed } = getSettings()
    this.preloadVoice(voice)
    const template = this.cache.get(voice)[digit]
    if (!template) return
    const clip = template.cloneNode(true)
    clip.playbackRate = playbackSpeed
    clip.play().catch(() => {})
  }

  playBeep() {
    const { beepEnabled, beepVolume } = getSettings()
    if (!beepEnabled) return
    this.beepContext ??= new (window.AudioContext || window.webkitAudioContext)()
    const ctx = this.beepContext
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
