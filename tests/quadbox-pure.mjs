// Quad Box engine tests - port of js/quadbox/src's vitest suite
// (tests/nbackGame.test.js) to plain node, targeting the promoted engine.
// Run: node --experimental-test-module-mocks --test tests/quadbox-pure.mjs
import { test, mock } from 'node:test'
import assert from 'node:assert/strict'

// vitest's vi.mock of utils.js: pick -> first pool item, shuffle -> identity
mock.module(new URL('../js/quadbox/engine/utils.js', import.meta.url).href, {
  namedExports: {
    pick: (pool) => (pool && pool.length > 0 ? pool[0] : 'default'),
    shuffle: (array) => array,
    // real implementation (voronoi.js imports it via the mocked module)
    seededRandom: (seed) => {
      const m = 2 ** 31 - 1
      let state = seed % m
      for (let i = 0; i < 10; i++) state = (48271 * state + 1) % m
      return () => { state = (48271 * state + 1) % m; return state / m }
    },
    // real implementations (gamedb.js imports these via the mocked module)
    getTruncatedDate: (timestamp) => {
      const date = new Date(timestamp)
      if (date.getHours() < 4) date.setDate(date.getDate() - 1)
      date.setHours(0, 0, 0, 0)
      return date
    },
    getGameDay: (timestamp) => {
      const date = new Date(timestamp)
      if (date.getHours() < 4) date.setDate(date.getDate() - 1)
      date.setHours(0, 0, 0, 0)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    },
  },
})

const { NBackGame } = await import('../js/quadbox/engine/nbackGame.js')

const mockGameSettings = {
  nBack: 2,
  numTrials: 12,
  trialTime: 3000,
  matchChance: 50,
  interference: 20,
  positionWidth: 2,
  enablePositionWidthSequence: false,
  positionWidthSequence: [1, 2],
}

const mockStimulusPool = ['a', 'b', 'c']
const mockTallyStimuli = {
  pools: [['x', 'y', 'z'], ['x', 'y', 'z']],
  tags: ['position0', 'position1'],
  sequence: [2, 1],
}

test('generateGame: correct structure for regular stimuli', () => {
  const game = new NBackGame(mockGameSettings, () => 0.99)
  game.addStimulus('position', mockStimulusPool)
  game.addStimulus('audio', mockStimulusPool)
  game.addStimulus('shape', mockStimulusPool)

  const result = game.generateGame()

  assert.deepEqual(result, {
    trials: [
      { matches: [], position: 'a', audio: 'a', shape: 'a' },
      { matches: [], position: 'a', audio: 'a', shape: 'a' },
      { matches: ['position', 'audio', 'shape'], position: 'a', audio: 'a', shape: 'a' },
      { matches: ['position', 'audio', 'shape'], position: 'a', audio: 'a', shape: 'a' },
      { matches: ['position', 'audio', 'shape'], position: 'a', audio: 'a', shape: 'a' },
      { matches: [], position: 'b', audio: 'b', shape: 'b' },
      { matches: [], position: 'b', audio: 'b', shape: 'b' },
      { matches: [], position: 'a', audio: 'a', shape: 'a' },
      { matches: [], position: 'a', audio: 'a', shape: 'a' },
      { matches: [], position: 'b', audio: 'b', shape: 'b' },
      { matches: [], position: 'b', audio: 'b', shape: 'b' },
      { matches: [], position: 'a', audio: 'a', shape: 'a' },
    ],
    meta: {
      nBack: 2,
      numTrials: 12,
      trialTime: 3000,
      matchChance: 50,
      interference: 20,
      title: 'tri',
      rules: undefined,
      tags: ['position', 'audio', 'shape'],
      configSnapshot: mockGameSettings,
    },
  })
})

test('generateGame: correct structure for tally stimuli', () => {
  const game = new NBackGame(mockGameSettings, () => 0.99)
  game.addTallyStimuli('positions', mockTallyStimuli.pools, mockTallyStimuli.tags, mockTallyStimuli.sequence)

  const result = game.generateGame()
  assert.deepEqual(result, {
    trials: [
      { matches: [], position0: 'x', position1: 'y' },
      { matches: [], position0: 'x' },
      { matches: ['position0', 'position1'], position0: 'x', position1: 'y' },
      { matches: ['position0'], position0: 'x' },
      { matches: ['position0', 'position1'], position0: 'x', position1: 'y' },
      { matches: [], position0: 'y' },
      { matches: [], position0: 'z', position1: 'default' },
      { matches: [], position0: 'x' },
      { matches: [], position0: 'x', position1: 'y' },
      { matches: [], position0: 'y' },
      { matches: [], position0: 'z', position1: 'default' },
      { matches: [], position0: 'x' },
    ],
    meta: {
      nBack: 2,
      numTrials: 12,
      trialTime: 3000,
      matchChance: 50,
      interference: 20,
      title: 'tally custom',
      rules: undefined,
      tags: ['position0', 'position1'],
      mode: 'tally',
      positionWidth: 2,
      enablePositionWidthSequence: false,
      positionWidthSequence: [1, 2],
      configSnapshot: mockGameSettings,
    },
  })
})

test('generateGame: configSnapshot carries the full gameSettings used, not just the destructured subset', () => {
  const settingsWithGrid = { ...mockGameSettings, grid: 'static2D', crab: true }
  const game = new NBackGame(settingsWithGrid, () => 0.99)
  game.addStimulus('position', mockStimulusPool)

  const result = game.generateGame()

  assert.deepEqual(result.meta.configSnapshot, settingsWithGrid)
  // it's a clone, not the live settings object, so later mutation of the
  // source doesn't retroactively rewrite history
  settingsWithGrid.grid = 'rotate3D'
  assert.equal(result.meta.configSnapshot.grid, 'static2D')
})

test('createTitle: correct titles for regular games', () => {
  const game = new NBackGame(mockGameSettings)

  assert.equal(game.createDefaultTitle(['audio']), 'dual')
  assert.equal(game.createDefaultTitle(['audio', 'shape', 'color']), 'quad')
  assert.equal(game.createDefaultTitle(['audio', 'shape']), 'tri')
  assert.equal(game.createDefaultTitle(['shape', 'color']), 'custom')
})

test('createTitle: correct titles for tally games', () => {
  const game = new NBackGame(mockGameSettings)
  game.addTallyStimuli('positions', mockTallyStimuli.pools, mockTallyStimuli.tags, mockTallyStimuli.sequence)

  assert.equal(game.createTitle(['audio']), 'tally dual')
  assert.equal(game.createTitle(['audio', 'shape', 'color']), 'tally quad')
})

// Cerevana engine changes (merged N-Back)

test('createTitle: explicit gameSettings.title wins over derived titles', () => {
  const game = new NBackGame({ ...mockGameSettings, title: 'position-color' })
  assert.equal(game.createTitle(['position', 'color']), 'position-color')
  const derived = new NBackGame(mockGameSettings)
  assert.equal(derived.createTitle(['position', 'color']), 'custom')
})

test('generateGame: enablePosition false omits the position stimulus', async () => {
  const { generateGame } = await import('../js/quadbox/engine/nback.js')
  const base = { ...mockGameSettings, enableAudio: true, enableShape: false, enableColor: false, enableImage: false, audioSource: 'letters2' }
  const withPos = generateGame(base, {})
  assert.ok(withPos.meta.tags.includes('position'), 'position present by default')
  const soundOnly = generateGame({ ...base, enablePosition: false, title: 'sound' }, {})
  assert.deepEqual(soundOnly.meta.tags, ['audio'])
  assert.equal(soundOnly.meta.title, 'sound')
  assert.ok(soundOnly.trials.every(t => !('position' in t)), 'no trial carries a position')
})

test('addScoreMetadata: ncalc is always set for non-tally games, even below the old 40% floor', async () => {
  // ncalc used to only be computed when accuracy >= 40%, so a below-threshold
  // game had no ncalc at all - the progress graph's `g.ncalc` filter then
  // silently dropped the game entirely (not just clamped its level), which
  // hit arithmetic-family modes hardest since a typed exact answer is much
  // harder to get right first try than a position/color match.
  const { addScoreMetadata } = await import('../js/quadbox/engine/gamedb.js')

  const lowScore = { nBack: 1, tags: ['arithmetic'], scores: { arithmetic: { hits: 1, misses: 9 } }, timestamp: 1000, start: 0, trialTime: 2500, completedTrials: 10 }
  addScoreMetadata(lowScore)
  assert.equal(typeof lowScore.ncalc, 'number', 'ncalc must be set even at 10% accuracy')
  assert.equal(lowScore.ncalc, 1 + (0.1 - 0.5) * 2.7)

  const zeroScore = { nBack: 2, tags: ['position'], scores: { position: { hits: 0, misses: 5 } }, timestamp: 1000, start: 0, trialTime: 2500, completedTrials: 5 }
  addScoreMetadata(zeroScore)
  assert.equal(typeof zeroScore.ncalc, 'number', 'ncalc must be set even at 0% accuracy (not skipped as falsy)')

  const tally = { nBack: 2, mode: 'tally', scores: { tally: { hits: 3, possible: 10 } }, timestamp: 1000, start: 0, trialTime: 2500, completedTrials: 10 }
  addScoreMetadata(tally)
  assert.equal(tally.ncalc, undefined, 'tally games still opt out of ncalc entirely')
})

test('addScoreMetadata: avgReactionMs averaged from recorded reactionTimes, absent otherwise', async () => {
  const { addScoreMetadata } = await import('../js/quadbox/engine/gamedb.js')

  const withTimes = { nBack: 2, tags: ['position'], scores: { position: { hits: 3, misses: 1 } }, timestamp: 1000, start: 0, trialTime: 2500, completedTrials: 4, reactionTimes: [400, 500, 600] }
  addScoreMetadata(withTimes)
  assert.equal(withTimes.avgReactionMs, 500)

  // legacy record (saved before reaction times were recorded)
  const legacy = { nBack: 2, tags: ['position'], scores: { position: { hits: 3, misses: 1 } }, timestamp: 1000, start: 0, trialTime: 2500, completedTrials: 4 }
  addScoreMetadata(legacy)
  assert.equal(legacy.avgReactionMs, undefined)

  // no correct presses -> empty array never stored, but guard against it anyway
  const empty = { nBack: 2, tags: ['position'], scores: { position: { hits: 0, misses: 4 } }, timestamp: 1000, start: 0, trialTime: 2500, completedTrials: 4, reactionTimes: [] }
  addScoreMetadata(empty)
  assert.equal(empty.avgReactionMs, undefined)
})

test('generateMatches: generates some true matches', () => {
  const gameSettings = { ...mockGameSettings, nBack: 3, numTrials: 20 }
  const game = new NBackGame(gameSettings, () => 1)
  const matches = game.generateMatches()
  assert.deepEqual(matches, [
    false, false, false,
    true, true, true, true,
    false, false, false, false, false, false, false, false, false, false, false, false, false,
  ])
  assert.equal(matches.length, 20)
})
