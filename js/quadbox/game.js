/*!
 * Derived from Quad Box — https://github.com/soamsy/quad-box (MIT, see
 * js/quadbox/LICENSE). Port of the game-flow logic in
 * src/lib/DefaultGame.svelte and TallyGame.svelte: identical timings,
 * guards, scoring and auto-progression calls; svelte reactivity replaced
 * by explicit ui callbacks (page.js renders).
 */
import { generateGame, generateTallyGame } from './engine/nback.js'
import { runAutoProgression } from './engine/autoProgression.js'
import { audioPlayer } from './audio.js'
import { analytics } from './analytics.js'
import { getSettings, getGameSettings, setGameField, subscribe } from './settings.js'

const isTallyMode = (mode) => mode === 'tally' || mode === 'vtally'

// gameRunningStore.getMaxWidth / getNumberKeys
export const getMaxWidth = (info) => {
  if (info?.enablePositionWidthSequence && Array.isArray(info?.positionWidthSequence)) {
    return Math.max(...info.positionWidthSequence)
  }
  return info?.positionWidth ?? 1
}

export const getNumberKeys = (info) => {
  const keys = []
  for (let i = 0; i <= (info?.tags?.length ?? 0); i++) keys.push(i)
  return keys
}

// gameRunningStore's `title` derived store
export const displayTitle = (info) => {
  if (!info?.title) return ''
  if (info.title.startsWith('tally ')) return 'tally'
  if (info.title.startsWith('vtally ')) return 'vtally'
  return info.title
}

export class QuadBoxGame {
  // ui: { renderTrial(trial, opts), cacheNext(trial), rebuild(),
  //       onState(), applyFeedback(u), resetFeedback(),
  //       applyTallyFeedback(u), resetTallyFeedback() }
  constructor(ui) {
    this.ui = ui
    this.isPlaying = false
    this.gameDisplayInfo = {}
    this.gameId = 0
    this.resetRuntimeData()
    this.regenerate()
    subscribe(() => { if (!this.isPlaying) this.regenerate() })
    document.addEventListener('keydown', (e) => this.handleKey(e))
  }

  resetRuntimeData() {
    this.isPlaying = false
    this.gameDisplayInfo = {}
    this.trials = []
    this.currentTrial = {}
    this.nextTrial = {}
    this.trialsIndex = 0
    this.scoresheet = []
    this.presentation = { highlight: false, flash: false }
    this.timeoutCancelFns = []
    this.gameMeta = {}
    this.gameId++
  }

  get tally() {
    return isTallyMode(getSettings().mode)
  }

  regenerate() {
    const settings = getSettings()
    const gameSettings = getGameSettings()
    this.game = this.tally
      ? generateTallyGame(gameSettings, settings, this.gameId)
      : generateGame(gameSettings, settings, this.gameId)
    if (!this.isPlaying) {
      this.gameMeta = { ...this.game.meta }
      this.gameDisplayInfo = this.gameMeta
    }
    this.ui.onState()
  }

  trialDisplay() {
    if (getSettings().feedback !== 'show') return ''
    return (this.game?.trials.length ?? 0) - this.trialsIndex
  }

  // ---- cancellable delays (verbatim) ----
  delay(ms) {
    let timeoutId
    let rejectFn
    const promise = new Promise((resolve, reject) => {
      rejectFn = reject
      timeoutId = setTimeout(resolve, ms)
    })
    this.timeoutCancelFns.push(() => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId)
        rejectFn(new Error('Game cancelled'))
        timeoutId = undefined
      }
    })
    return promise
  }

  makeCancellable(originalPromise) {
    let cancelFn
    const wrapped = new Promise((resolve, reject) => {
      cancelFn = () => reject(new Error('Game cancelled'))
      originalPromise.then(resolve, reject)
    })
    this.timeoutCancelFns.push(cancelFn)
    return wrapped
  }

  // ---- shared flow ----
  toggleGame() {
    if (this.isPlaying) {
      this.endGame('cancelled')
    } else {
      this.startGame()
    }
  }

  async startGame() {
    if (this.isPlaying) return
    const gameSettings = getGameSettings()
    this.isPlaying = true
    this.gameMeta = { ...this.game.meta, start: Date.now() }
    this.gameDisplayInfo = this.gameMeta
    audioPlayer.cacheAudioSource(gameSettings.audioSource)
    this.trials = structuredClone(this.game.trials)
    this.scoresheet = new Array(this.trials.length).fill().map(() => ({}))

    if (this.tally) {
      this.presentation.highlight = true
      this.ui.onState()
      this.selectTallyTrial(0)
      return
    }

    this.nextTrial = this.trials[0]
    this.selectTrial(0)
    this.ui.onState()
    try {
      await this.delay(700)
      await this.playTrial(0)
    } catch (e) {
      if (e.message === 'Game cancelled') {
        console.debug('Game cancelled', e)
      } else {
        throw e
      }
    }
  }

  async endGame(status) {
    if (!this.isPlaying) return

    if (this.tally) {
      if (status === 'completed') {
        try { await this.delay(100) } catch { /* ignore */ }
      }
      const gameInfoRecord = { ...this.gameMeta, timestamp: Date.now() }
      if (this.trialsIndex > gameInfoRecord.nBack) {
        await analytics.scoreTallyTrials(gameInfoRecord, status === 'completed' ? this.scoresheet : this.scoresheet.slice(0, this.trialsIndex), status)
      } else {
        console.debug('Game not recorded', this.trialsIndex, gameInfoRecord)
      }
      this.timeoutCancelFns.forEach(fn => fn())
      this.resetRuntimeData()
      this.ui.resetTallyFeedback()
    } else {
      const gameInfoRecord = { ...this.gameMeta, timestamp: Date.now() }
      if (this.trialsIndex > gameInfoRecord.nBack) {
        await analytics.scoreTrials(gameInfoRecord, status === 'completed' ? this.scoresheet : this.scoresheet.slice(0, this.trialsIndex), status)
        if (status === 'completed') {
          const s = getSettings()
          await runAutoProgression(gameInfoRecord, s, {
            setNBack: (n) => setGameField('nBack', n),
            onAdvance: () => this.ui.onProgression?.('advance'),
            onFallback: () => this.ui.onProgression?.('fallback'),
          })
        }
      } else {
        console.debug('Game not recorded', this.trialsIndex, gameInfoRecord)
      }
      this.timeoutCancelFns.forEach(fn => fn())
      this.resetRuntimeData()
      this.ui.resetFeedback()
    }
    this.regenerate()
  }

  // ---- DefaultGame flow ----
  selectTrial(i) {
    this.currentTrial = this.trials[i]
    if (i < this.trials.length - 1) {
      this.nextTrial = this.trials[i + 1]
    }
    this.trialsIndex = i
    this.ui.cacheNext(this.nextTrial)
  }

  async playTrial(i) {
    if (!this.isPlaying) return

    if (i >= this.trials.length) {
      await this.delay(700)
      await this.endGame('completed')
      return
    }

    this.selectTrial(i)
    this.presentation.highlight = true
    this.ui.renderTrial(this.currentTrial, { highlight: true })
    this.ui.onState()
    const audioWait = this.currentTrial.audio ? this.makeCancellable(audioPlayer.play(this.currentTrial.audio)) : Promise.resolve()
    const presentationWait = this.delay(Math.min(2000, this.gameDisplayInfo.trialTime - 350)).then(() => {
      this.presentation.highlight = false
      this.ui.renderTrial(this.currentTrial, { highlight: false })
    })
    const trialWait = this.delay(this.gameDisplayInfo.trialTime)
    await Promise.all([audioWait, presentationWait, trialWait])
    this.detectMissedStimuli()
    await this.playTrial(i + 1)
  }

  detectMissedStimuli() {
    if (!('tags' in this.gameDisplayInfo)) return
    const updates = {}
    for (const tag of this.gameDisplayInfo.tags) {
      if (this.currentTrial.matches.includes(tag) && !(tag in this.scoresheet[this.trialsIndex])) {
        this.scoresheet[this.trialsIndex][tag] = false
        updates[tag] = 'late-failure'
      } else {
        updates[tag] = 'blank'
      }
    }
    this.ui.applyFeedback(updates)
  }

  checkForMatch(type) {
    if (this.tally) return
    if (!this.isPlaying || this.trialsIndex < this.gameDisplayInfo.nBack) return

    if (type in this.currentTrial && !(type in this.scoresheet[this.trialsIndex])) {
      const isSuccess = this.currentTrial.matches.includes(type)
      this.scoresheet[this.trialsIndex][type] = isSuccess
      this.ui.applyFeedback({ [type]: isSuccess ? 'success' : 'failure' })
    }
  }

  // ---- TallyGame flow ----
  async flashCube() {
    this.presentation.flash = true
    this.ui.renderTrial(this.currentTrial, { flash: true })
    try { await this.delay(350) } catch { /* ignore */ }
    this.presentation.flash = false
    this.ui.renderTrial(this.currentTrial, { flash: false })
  }

  selectTallyTrial(i) {
    this.timeoutCancelFns.forEach(fn => fn())
    this.timeoutCancelFns = []
    if (i >= this.trials.length) {
      this.endGame('completed')
      return
    }
    this.currentTrial = this.trials[i]
    this.trialsIndex = i
    if (i < this.trials.length - 1) {
      this.nextTrial = this.trials[i + 1]
    }
    this.ui.setCrankIndex?.(i)
    this.flashCube()
    this.ui.cacheNext(this.nextTrial)
    this.ui.onState()
    if (this.currentTrial.audio) {
      audioPlayer.play(this.currentTrial.audio).catch(() => {})
    }
  }

  handleCount(count) {
    if (!this.isPlaying || this.scoresheet.length <= this.trialsIndex || this.scoresheet[this.trialsIndex].success !== undefined) {
      return
    }

    if (this.trialsIndex < this.gameDisplayInfo.nBack) {
      this.selectTallyTrial(this.trialsIndex + 1)
      return
    }

    this.ui.resetTallyFeedback()
    this.scoresheet[this.trialsIndex].success = count === this.currentTrial.matches.length
    this.scoresheet[this.trialsIndex].count = this.currentTrial.matches.length
    if (this.scoresheet[this.trialsIndex].success) {
      this.ui.applyTallyFeedback({ [count]: 'success' })
    } else {
      this.ui.applyTallyFeedback({ [count]: 'failure', [this.currentTrial.matches.length]: 'success' })
    }
    this.selectTallyTrial(this.trialsIndex + 1)
  }

  // ---- keyboard (both modes) ----
  handleKey(event) {
    if (event.target.closest?.('input, select, textarea')) return
    switch (event.code) {
      case 'Space':
        this.startGame()
        break
      case 'Escape':
        this.endGame('cancelled')
        break
    }

    if (this.tally) {
      for (const key of getNumberKeys(this.gameDisplayInfo)) {
        if (key.toString() === event.key) {
          this.handleCount(key)
        }
      }
    } else {
      const hotkeys = getSettings().hotkeys
      for (const [action, key] of Object.entries(hotkeys)) {
        if (key.toUpperCase() === event.key.toUpperCase()) {
          this.checkForMatch(action)
          if (action === 'shape') {
            this.checkForMatch('image')
          }
        }
      }
    }
  }
}
