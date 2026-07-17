/*!
 * Plain-Audio replacement for src/lib/audioPlayer.js (howler) —
 * same public surface (preload/play/cacheAudioSource/clearCache), same
 * asset layout (opus with mp3 fallback). Original: Quad Box, MIT —
 * https://github.com/soamsy/quad-box, see js/quadbox/LICENSE.
 */
import { getAudioPool } from './engine/constants.js'

// Assets live next to this module (currently the committed dist copy;
// relocated at cutover). Module-relative so any page can host the game.
const AUDIO_BASE = new URL('./dist/audio/', import.meta.url)

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

  cacheAudioSource(audioSource) {
    getAudioPool(audioSource).forEach(url => this.preload(url))
  }

  clearCache() {
    this.audioCache.clear()
  }
}

export const audioPlayer = new AudioPlayer()
