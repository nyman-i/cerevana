/*!
 * Derived from Quad Box — https://github.com/soamsy/quad-box (MIT, see
 * js/quadbox/LICENSE). Port of src/stores/feedbackStore.js and
 * tallyFeedbackStore.js: same states ('blank'|'disabled'|'success'|
 * 'failure'|'late-failure') and revert timings; svelte writables replaced
 * by a callback.
 */

// Per-stimulus feedback for the match keys (DefaultGame)
export const createFeedback = (onChange) => {
  let defaults = {
    position: 'blank', color: 'blank', shape: 'blank', image: 'blank', audio: 'blank',
  }
  let state = { ...defaults }
  let timeouts = []
  let hideFeedback = false

  const emit = () => onChange({ ...state })

  return {
    // feedbackStore.updateDefaultFeedback: disabled per enable flags
    configure(gameSettings, feedbackMode) {
      hideFeedback = feedbackMode === 'hide'
      defaults = {
        position: 'blank',
        color: gameSettings.enableColor ? 'blank' : 'disabled',
        shape: gameSettings.enableShape ? 'blank' : 'disabled',
        image: gameSettings.enableImage ? 'blank' : 'disabled',
        audio: gameSettings.enableAudio ? 'blank' : 'disabled',
      }
      this.reset()
    },
    reset() {
      state = { ...defaults }
      timeouts.forEach(t => clearTimeout(t))
      timeouts = []
      emit()
    },
    apply(updates) {
      if (hideFeedback) return
      state = { ...state, ...updates }
      emit()
      if (Object.values(updates).includes('late-failure')) {
        timeouts.push(setTimeout(() => {
          for (const key in state) {
            if (state[key] === 'late-failure') state[key] = defaults[key]
          }
          emit()
        }, 500))
      }
    },
    get: () => ({ ...state }),
  }
}

// Per-count feedback for the tally number keys (0-9); every apply reverts
// after 2 seconds (tallyFeedbackStore)
export const createTallyFeedback = (onChange) => {
  const defaults = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i, 'blank']))
  let state = { ...defaults }
  let timeouts = []
  let hideFeedback = false

  const emit = () => onChange({ ...state })

  return {
    configure(_gameSettings, feedbackMode) {
      hideFeedback = feedbackMode === 'hide'
      this.reset()
    },
    reset() {
      state = { ...defaults }
      timeouts.forEach(t => clearTimeout(t))
      timeouts = []
      emit()
    },
    apply(updates) {
      if (hideFeedback) return
      state = { ...state, ...updates }
      emit()
      timeouts.push(setTimeout(() => {
        state = { ...defaults }
        emit()
      }, 2000))
    },
    get: () => ({ ...state }),
  }
}
