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
    },
  })
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
