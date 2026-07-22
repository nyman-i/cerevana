/*!
 * Derived from Quad Box - https://github.com/soamsy/quad-box (MIT, see
 * js/quadbox/LICENSE). Port of the game-flow logic in
 * src/lib/DefaultGame.svelte and TallyGame.svelte: identical timings,
 * guards, scoring and auto-progression calls; svelte reactivity replaced
 * by explicit ui callbacks (page.js renders).
 */
import { generateGame, generateTallyGame } from './engine/nback.js'
import { generateClassicGame, isClassicGame, CLASSIC_TITLES } from './classic.js'
import { runAutoProgression } from './engine/autoProgression.js'
import { audioPlayer } from './audio.js'
import { analytics } from './analytics.js'
import { getSettings, getGameSettings, setGameField, subscribe, applyDailyResetIfDue } from './settings.js'

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

// gameRunningStore's `title` derived store + the variant grouping used by
// the progress graph. Canonical implementations live in js/quadbox/graphs.js
// (a classic <head> script shared with stats.html, so it always runs before
// this module) - re-exported here for the module importers.
export const displayTitle = (info) => window.cvNbackDisplay.title(info)
export const displayVariant = (info) => window.cvNbackDisplay.variant(info)

export class QuadBoxGame {
  // ui: { renderTrial(trial, opts), cacheNext(trial), rebuild(),
  //       onState(), applyFeedback(u), resetFeedback(),
  //       applyTallyFeedback(u), resetTallyFeedback(),
  //       setAnswer(text, verdict?), setCrankIndex(i), onProgression(kind) }
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
    this.answer = { digits: '', negative: false }
    this.advanceResolve = null
    this.gameId++
  }

  // ---- arithmetic (classic modes): typed answer, right/wrong per trial ----
  get arithMode() {
    return !!this.gameDisplayInfo.arithmetic
  }

  // digits append, '.' once, '-' toggles, no backspace, reset each trial;
  // empty or '.' parses as 0
  parseAnswer() {
    const d = this.answer.digits
    const v = (d === '' || d === '.') ? 0 : parseFloat(d)
    return this.answer.negative ? -v : v
  }

  answerDisplay() {
    return (this.answer.negative ? '-' : '') + (this.answer.digits || '0')
  }

  arithInput(ch) {
    if (!this.isPlaying || !this.arithMode) return
    if (ch === '-') this.answer.negative = !this.answer.negative
    else if (ch === '.') { if (!this.answer.digits.includes('.')) this.answer.digits += '.' }
    else this.answer.digits += ch
    this.ui.setAnswer?.(this.answerDisplay())
  }

  scoreArithmetic() {
    if (!this.arithMode || this.trialsIndex < this.gameDisplayInfo.nBack) return
    const correct = this.parseAnswer() === this.currentTrial.answer
    this.scoresheet[this.trialsIndex].arithmetic = correct
    this.ui.setAnswer?.(this.answerDisplay(), correct ? 'right' : 'wrong')
  }

  // self-paced: the pending trialWait resolves on Enter / the NEXT button
  advance() {
    if (!this.gameDisplayInfo.selfPaced || !this.advanceResolve) return
    const resolve = this.advanceResolve
    this.advanceResolve = null
    resolve()
  }

  // while a game is running this must reflect the mode it was STARTED with,
  // not whatever the settings panel currently shows - switching the mode
  // dropdown mid-game (or PgUp/PgDn) used to desync checkForMatch/handleKey/
  // renderKeys from the trials actually in flight, stranding keypresses or
  // running two independent trial-advance loops concurrently
  get tally() {
    return this.isPlaying ? this.isTallyGame : isTallyMode(getSettings().mode)
  }

  regenerate() {
    const settings = getSettings()
    const gameSettings = getGameSettings()
    const mode = settings.mode
    // three generator families: tally (engine), classic (BW-derived modes +
    // crab variants), engine default. Preset modes riding the engine pass an
    // explicit title so records don't collapse to 'custom'.
    this.game = this.tally
      ? generateTallyGame(gameSettings, settings, this.gameId)
      : isClassicGame(mode, gameSettings)
        ? generateClassicGame(mode, gameSettings)
        : generateGame(CLASSIC_TITLES[mode]
          ? { ...gameSettings, title: CLASSIC_TITLES[mode] }
          : gameSettings, settings, this.gameId)
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
    // first game after the 04:00 boundary: every mode back to its default N
    // (notify → regenerate picks up the reset level before we snapshot it)
    applyDailyResetIfDue()
    const gameSettings = getGameSettings()
    this.isPlaying = true
    this.isTallyGame = isTallyMode(getSettings().mode)
    this.startedMode = getSettings().mode
    this.gameMeta = { ...this.game.meta, start: Date.now() }
    this.gameDisplayInfo = this.gameMeta
    audioPlayer.cacheAudioSource(gameSettings.audioSource)
    this.trials = structuredClone(this.game.trials)
    this.scoresheet = new Array(this.trials.length).fill().map(() => ({}))
    this.reactionTimes = [] // ms from trial shown to each correct match press

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
        // Unexpected failure (e.g. audio): stop cleanly so the button can't
        // strand on STOP, keeping partial progress, then let it surface via
        // the shared unhandledrejection handler.
        await this.endGame('cancelled')
        throw e
      }
    }
  }

  async endGame(status) {
    if (!this.isPlaying) return
    const gameInfoRecord = { ...this.gameMeta, timestamp: Date.now() }
    // additive field: correct-press reaction times, for the Avg/Fastest
    // Reaction graphs (addScoreMetadata derives both at read time). Tally
    // modes have no per-trial presses, so the array simply stays empty there.
    if (this.reactionTimes?.length) gameInfoRecord.reactionTimes = this.reactionTimes
    // cleanup/regenerate must run even if persistence below throws (a
    // storage failure must not strand isPlaying=true with the STOP button
    // stuck and every future keypress re-attempting the same failing write)
    try {
      if (this.tally) {
        if (status === 'completed') {
          try { await this.delay(100) } catch { /* ignore */ }
        }
        if (this.trialsIndex > gameInfoRecord.nBack) {
          await analytics.scoreTallyTrials(gameInfoRecord, status === 'completed' ? this.scoresheet : this.scoresheet.slice(0, this.trialsIndex), status)
          if (status === 'completed') {
            await runAutoProgression(gameInfoRecord, getSettings(), {
              setNBack: (n) => setGameField('nBack', n, this.startedMode),
              onAdvance: () => this.ui.onProgression?.('advance'),
              onFallback: () => this.ui.onProgression?.('fallback'),
              variantKey: displayVariant,
            })
          }
        } else {
          console.debug('Game not recorded', this.trialsIndex, gameInfoRecord)
        }
      } else {
        if (this.trialsIndex > gameInfoRecord.nBack) {
          await analytics.scoreTrials(gameInfoRecord, status === 'completed' ? this.scoresheet : this.scoresheet.slice(0, this.trialsIndex), status)
          if (status === 'completed') {
            let s = getSettings()
            if (this.gameMeta.jaeggi) {
              // original-study thresholds, single session: ≥90 advance, <75 drop
              s = { ...s, successCriteria: 90, successComboRequired: 1, failureCriteria: 75, failureComboRequired: 1 }
            }
            await runAutoProgression(gameInfoRecord, s, {
              setNBack: (n) => setGameField('nBack', n, this.startedMode),
              onAdvance: () => this.ui.onProgression?.('advance'),
              onFallback: () => this.ui.onProgression?.('fallback'),
              variantKey: displayVariant,
            })
          }
        } else {
          console.debug('Game not recorded', this.trialsIndex, gameInfoRecord)
        }
      }
    } finally {
      // capture before resetRuntimeData flips isPlaying, so a mode switch
      // mid-game can't make this reset the wrong feedback UI (see the
      // `tally` getter above - it falls back to live settings once idle)
      const wasTally = this.tally
      this.timeoutCancelFns.forEach(fn => fn())
      this.resetRuntimeData()
      wasTally ? this.ui.resetTallyFeedback() : this.ui.resetFeedback()
      this.regenerate()
    }
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
    if (this.arithMode) {
      // typed answer resets every trial; scored at trial end
      this.answer = { digits: '', negative: false }
      this.ui.setAnswer?.('0')
    }
    this.trialShownAt = Date.now()
    this.presentation.highlight = true
    this.ui.renderTrial(this.currentTrial, { highlight: true })
    this.ui.onState()
    // a failed sound (missing file, blocked autoplay, no audio device) must
    // not end the session - same "trial clock paces the game" rule audio.js
    // already applies to speech
    const audioWait = this.currentTrial.audio ? this.makeCancellable(audioPlayer.play(this.currentTrial.audio).catch(() => {})) : Promise.resolve()
    const presentationWait = this.delay(Math.min(2000, this.gameDisplayInfo.trialTime - 350)).then(() => {
      this.presentation.highlight = false
      this.ui.renderTrial(this.currentTrial, { highlight: false })
    })
    // self-paced: the trial lasts until the player advances (Enter / NEXT)
    const trialWait = this.gameDisplayInfo.selfPaced
      ? this.makeCancellable(new Promise(resolve => { this.advanceResolve = resolve }))
      : this.delay(this.gameDisplayInfo.trialTime)
    await Promise.all([audioWait, presentationWait, trialWait])
    this.advanceResolve = null
    this.detectMissedStimuli()
    await this.playTrial(i + 1)
  }

  detectMissedStimuli() {
    if (!('tags' in this.gameDisplayInfo)) return
    this.scoreArithmetic()
    const jaeggi = !!this.gameDisplayInfo.jaeggi
    const sheet = this.scoresheet[this.trialsIndex]
    const updates = {}
    for (const tag of this.gameDisplayInfo.tags) {
      if (tag === 'arithmetic') continue
      if (this.currentTrial.matches.includes(tag) && !(tag in sheet)) {
        sheet[tag] = false
        updates[tag] = 'late-failure'
      } else {
        updates[tag] = 'blank'
        // Jaeggi protocol: a correct rejection (no match, no press) counts
        // as a hit, so its percent is (TP+TN)/total like the original study
        if (jaeggi && this.trialsIndex >= this.gameDisplayInfo.nBack && !(tag in sheet)) {
          sheet[tag] = true
        }
      }
    }
    // Jaeggi hides trial feedback (protocol)
    if (!jaeggi) this.ui.applyFeedback(updates)
  }

  checkForMatch(type) {
    if (this.tally) return
    if (!this.isPlaying || this.trialsIndex < this.gameDisplayInfo.nBack) return

    if (type in this.currentTrial && !(type in this.scoresheet[this.trialsIndex])) {
      const isSuccess = this.currentTrial.matches.includes(type)
      this.scoresheet[this.trialsIndex][type] = isSuccess
      if (isSuccess) this.reactionTimes.push(Date.now() - this.trialShownAt)
      // Jaeggi hides right/wrong (protocol), but still acknowledges the
      // press so the button doesn't look unresponsive
      this.ui.applyFeedback({ [type]: this.gameDisplayInfo.jaeggi ? 'pressed' : (isSuccess ? 'success' : 'failure') })
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
    if (this.isPlaying && this.arithMode) {
      const code = event.code
      if (/^(Digit|Numpad)[0-9]$/.test(code)) return this.arithInput(code.slice(-1))
      if (code === 'Minus' || code === 'NumpadSubtract') return this.arithInput('-')
      if (code === 'Period' || code === 'NumpadDecimal' || code === 'Comma') return this.arithInput('.')
    }
    switch (event.code) {
      case 'Space':
        this.startGame()
        break
      case 'Enter':
        if (this.isPlaying) this.advance()
        else this.startGame()
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
