/*!
 * Plain-Audio replacement for src/lib/audioPlayer.js (howler) -
 * same public surface (preload/play/cacheAudioSource/clearCache), same
 * asset layout (opus with mp3 fallback). Original: Quad Box, MIT -
 * https://github.com/soamsy/quad-box, see js/quadbox/LICENSE.
 */
import { getAudioPool } from './engine/constants.js'
import { getSettings } from './settings.js'

// Assets live next to this module. Module-relative so any page can host the game.
const AUDIO_BASE = new URL('./audio/', import.meta.url)

// Fire-and-forget TTS: the trial clock paces the game, not speech
// completion - also avoids stranding the trial loop where no voices exist.
const speak = (text) => {
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  u.rate = 1.1
  speechSynthesis.speak(u)
  return Promise.resolve()
}

// 'LettersM1/a' → 'a', 'Nato/alfa' → 'alfa'
const spokenName = (url) => String(url).split('/').pop()

// iOS Safari drops the first utterance unless speechSynthesis is first
// used inside a user gesture - an empty utterance is silent everywhere
let speechWarmed = false
const warmSpeechOnce = () => {
  if (speechWarmed || typeof speechSynthesis === 'undefined') return
  speechWarmed = true
  speechSynthesis.speak(new SpeechSynthesisUtterance(''))
}

const canOpus = typeof Audio !== 'undefined' &&
  new Audio().canPlayType('audio/ogg; codecs=opus') !== ''

class AudioPlayer {
  constructor() {
    this.audioCache = new Map()
  }

  createAudio(url) {
    const ext = canOpus ? '.opus' : '.mp3'
    const audio = new Audio(new URL(url + ext, AUDIO_BASE).href)
    audio.preload = 'auto'
    return audio
  }

  preload(url) {
    if (this.audioCache.has(url)) return
    this.audioCache.set(url, this.createAudio(url))
  }

  async play(url) {
    // 'speak:' urls (arithmetic operations) always use the browser voice;
    // otherwise the voice setting picks recorded packs vs speechSynthesis
    if (String(url).startsWith('speak:')) return speak(String(url).slice(6))
    if (getSettings().voice === 'browser') return speak(spokenName(url))
    let audio = this.audioCache.get(url)
    if (!audio) {
      audio = this.createAudio(url)
      this.audioCache.set(url, audio)
    }
    return new Promise((resolve, reject) => {
      const done = () => {
        audio.removeEventListener('ended', done)
        audio.removeEventListener('error', fail)
        resolve()
      }
      const fail = () => {
        audio.removeEventListener('ended', done)
        audio.removeEventListener('error', fail)
        reject(new Error('Failed to play sound'))
      }
      audio.addEventListener('ended', done)
      audio.addEventListener('error', fail)
      audio.currentTime = 0
      audio.play().catch(fail)
    })
  }

  // Called from startGame, i.e. inside the START click/keypress - the one
  // moment iOS Safari lets audio be unlocked for later trial-clock playback.
  cacheAudioSource(audioSource) {
    warmSpeechOnce()
    if (getSettings().voice === 'browser') return
    getAudioPool(audioSource).forEach(url => this.preload(url))
    this.unlockAll()
  }

  // iOS: an Audio element must start once inside a user gesture before
  // programmatic (timer-driven) play() is allowed - run each cached clip
  // muted now, and it stays unlocked for the rest of the page's life
  unlockAll() {
    for (const audio of this.audioCache.values()) {
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

  clearCache() {
    this.audioCache.clear()
  }
}

export const audioPlayer = new AudioPlayer()
