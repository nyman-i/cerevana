/*!
 * Cerevana N-Back - classic mode generation.
 * Original Cerevana code (CC BY-NC 3.0): a port of our own Brain Workshop
 * protocol reimplementation (formerly js/nback/game.js - no Brain
 * Workshop code).
 * Produces engine-shaped { trials, meta } consumed by QuadBoxGame, so the
 * flow/scoring/recording path is identical to engine-generated games.
 */
import { COLOR_POOL, POSITION_POOL, POSITION_POOL_2D, getAudioPool } from './engine/constants.js'
import { shuffle } from './engine/utils.js'

// combination modalities read across two streams: [currentStream, referenceStream]
export const COMBO = {
  visvis: ['vis', 'vis'],
  visaudio: ['vis', 'audio'],
  audiovis: ['audio', 'vis'],
}

// The classic mode registry: generation config for modes the engine can't
// express. `title` is the identity stored in game records (progression
// matches and the chart groups on it). CLASSIC_TITLES additionally names
// the engine-generated presets so they don't all collapse to 'custom'.
export const CLASSIC_MODES = {
  dualCombo: { label: 'Dual Combination', title: 'dual-combo', mods: ['visvis', 'visaudio', 'audiovis', 'audio'] },
  triCombo: { label: 'Tri Combination', title: 'tri-combo', mods: ['position', 'visvis', 'visaudio', 'audiovis', 'audio'] },
  quadCombo: { label: 'Quad Combination', title: 'quad-combo', mods: ['position', 'visvis', 'visaudio', 'color', 'audiovis', 'audio'] },
  triComboColor: { label: 'Tri Combination (Color)', title: 'tri-combo-color', mods: ['visvis', 'visaudio', 'color', 'audiovis', 'audio'] },
  arithmetic: { label: 'Arithmetic', title: 'arithmetic', mods: ['arithmetic'] },
  dualArithmetic: { label: 'Dual Arithmetic', title: 'dual-arithmetic', mods: ['position', 'arithmetic'] },
  tripleArithmetic: { label: 'Triple Arithmetic', title: 'triple-arithmetic', mods: ['position', 'arithmetic', 'color'] },
  jaeggi: { label: 'Jaeggi Dual', title: 'jaeggi', mods: ['position', 'audio'], jaeggi: true },
  multiSquare: { label: 'Multi-Square', title: 'multi', mods: null }, // mods derived from `squares`
}

export const CLASSIC_TITLES = {
  position: 'position',
  sound: 'sound',
  positionColor: 'position-color',
  colorSound: 'color-sound',
  triple: 'triple',
  dualClassic: 'dual-classic',
  quadClassic: 'quad-classic',
}

// BW's ARITHMETIC_ACCEPTABLE_DECIMALS (tenths, odd twentieths, eighths) - every
// value is m/40, so divisor legality reduces to exact integer math (no float eq).
const ARITH_DECIMALS = new Set([4, 5, 6, 8, 10, 12, 14, 15, 16, 18, 20, 22, 24, 25, 26, 28, 30, 32, 34, 35, 36, 38])

const rand8 = () => 1 + Math.floor(Math.random() * 8)

// variable n-back: per-trial N from Beta(n/2, 1), skewed toward n
export const variableN = (n) => Math.floor(Math.pow(Math.random(), 2 / n) * n + 1)

// division legality: x divides a, or |a|/|x| has a fractional part in BW's
// acceptable-decimals list. All list values are m/40 → exact via integers.
export const divisorOk = (a, x) => {
  if (x === 0) return false
  if (a % x === 0) return true
  const a40 = Math.abs(a) * 40, ax = Math.abs(x)
  return a40 % ax === 0 && ARITH_DECIMALS.has((a40 / ax) % 40)
}

// one arithmetic trial: op uniform from the enabled set; number uniform in
// [0, max] ([-max, max] with negatives). Divide draws only legal divisors of
// the n-back number (plain n - not the crab/variable effective back);
// before trial n, divide numbers are just nonzero.
export const genArith = (numbers, n, t, ops, maxNumber, negatives) => {
  const op = ops[Math.floor(Math.random() * ops.length)]
  const min = negatives ? -maxNumber : 0
  const range = () => min + Math.floor(Math.random() * (maxNumber - min + 1))
  let number
  if (op === 'divide') {
    if (t >= n) {
      const legal = []
      for (let x = min; x <= maxNumber; x++) {
        if (divisorOk(numbers[t - n], x)) legal.push(x)
      }
      number = legal[Math.floor(Math.random() * legal.length)]
    } else {
      do { number = range() } while (number === 0)
    }
  } else {
    number = range()
  }
  return { number, op }
}

export const arithAnswer = (a, op, b) => {
  if (op === 'add') return a + b
  if (op === 'subtract') return a - b
  if (op === 'multiply') return a * b
  return a / b
}

// One stimulus value. hist = values of previous trials, t = 0-based trial
// index, back = effective back for this trial (crab/variable), defaults to n.
// Uniform 1-8, then pMatch forced match, else pLure lure from offsets
// {-1,+1,+n} ({+1,+n} if n<3) that isn't an accidental real match.
export const gen = (hist, n, t, back = n, pMatch = 0.125, pLure = 0.125) => {
  let v = rand8()
  if (t >= n) {
    const target = hist[t - back]
    if (Math.random() < pMatch) return target
    if (Math.random() < pLure && n > 1) {
      const offsets = shuffle(n < 3 ? [1, n] : [-1, 1, n])
      for (const i of offsets) {
        const j = t - back - i
        if (j >= 0 && hist[j] !== target) v = hist[j]
      }
    }
  }
  return v
}

// combination-mode generation: streams start uniform; then per modality IN
// MODE ORDER, forced match/lure writes the modality's current stream from its
// reference stream's history - later modalities overwrite earlier ones.
export const genCombo = (streams, mods, n, t, back = n, pMatch = 0.125, pLure = 0.125) => {
  const cur = {}
  for (const s in streams) cur[s] = rand8()
  if (t >= n) {
    for (const mod of mods) {
      const map = COMBO[mod] || [mod, mod]
      const refHist = streams[map[1]]
      const target = refHist[t - back]
      if (Math.random() < pMatch) {
        cur[map[0]] = target
      } else if (Math.random() < pLure && n > 1) {
        const offsets = shuffle(n < 3 ? [1, n] : [-1, 1, n])
        let v = null
        for (const o of offsets) {
          const j = t - back - o
          if (j >= 0 && refHist[j] !== target) v = refHist[j]
        }
        if (v !== null) cur[map[0]] = v
      }
    }
  }
  return cur
}

// k distinct cells per trial (multi-square): sample without replacement,
// per-stream forced match/lure (lure ×2/3) with conflict swap, then optional
// whole-set rotation interference.
export const genMulti = (seqs, n, t, back = n, pMatch = 0.125, pLure = 0.125) => {
  const k = seqs.length
  const cells = shuffle([1, 2, 3, 4, 5, 6, 7, 8]).slice(0, k)
  if (t >= n) {
    const lureP = pLure * 2 / 3
    for (let i = 0; i < k; i++) {
      const hist = seqs[i]
      const target = hist[t - back]
      let forced = null
      if (Math.random() < pMatch) {
        forced = target
      } else if (Math.random() < lureP && n > 1) {
        const offsets = shuffle(n < 3 ? [1, n] : [-1, 1, n])
        for (const o of offsets) {
          const j = t - back - o
          if (j >= 0 && hist[j] !== target) forced = hist[j]
        }
      }
      if (forced !== null) {
        const other = cells.indexOf(forced)
        if (other !== -1 && other !== i) cells[other] = cells[i] // swap with the occupant
        cells[i] = forced
      }
    }
    if (Math.random() < pLure / 3) {
      // rotation interference: all streams take the back-trial's cells, shifted
      const offset = 1 + Math.floor(Math.random() * (k - 1))
      for (let i = 0; i < k; i++) cells[i] = seqs[(i + offset) % k][t - back]
    }
  }
  return cells
}

// Jaeggi session sequence: brute-force exactly 6 position matches and 6 audio
// matches, of which exactly 2 simultaneous (4 visual-only, 4 audio-only, 2 both).
export const jaeggiSequence = (n, trials) => {
  const seq = { position: [], audio: [] }
  for (let i = 0; i < n; i++) {
    seq.position[i] = rand8()
    seq.audio[i] = rand8()
  }
  while (true) {
    let pos = 0
    for (let t = n; t < trials; t++) {
      seq.position[t] = rand8()
      if (seq.position[t] === seq.position[t - n]) pos++
    }
    if (pos !== 6) continue
    while (true) {
      let aud = 0
      for (let t = n; t < trials; t++) {
        seq.audio[t] = rand8()
        if (seq.audio[t] === seq.audio[t - n]) aud++
      }
      if (aud === 6) break
    }
    let both = 0
    for (let t = n; t < trials; t++) {
      if (seq.position[t] === seq.position[t - n] && seq.audio[t] === seq.audio[t - n]) both++
    }
    if (both === 2) return seq
  }
}

// stimulus streams underlying a modality list (combos collapse onto
// vis/audio; arithmetic's number/op arrays live outside this list)
const streamsOf = (mods) => {
  const streams = []
  for (const m of mods) {
    if (m === 'arithmetic') continue
    const s = COMBO[m] ? COMBO[m][0] : m
    if (!streams.includes(s)) streams.push(s)
  }
  return streams
}

// crab on an engine-shaped mode (dual, presets): modalities from enable flags
const modsFromFlags = (gs) => {
  const mods = []
  if (gs.enablePosition !== false) mods.push('position')
  if (gs.enableColor) mods.push('color')
  if (gs.enableAudio) mods.push('audio')
  return mods
}

const pickSyms = (pool, count) => shuffle([...new Set(pool)]).slice(0, count)

const letterOf = (file) => String(file).split('/').pop().toUpperCase()

// Whether this mode+settings combination generates here rather than via the
// engine: registry modes always; any engine-shaped mode when crab is on
// (the engine generator compares a fixed i-n, crab needs a moving back).
// Crab is only offered on position/color/audio stimuli (no shape/image pools here).
export const isClassicGame = (modeKey, gs) =>
  modeKey in CLASSIC_MODES || (!!gs.crab && !gs.enableShape && !gs.enableImage && !String(gs.rules).includes('tally'))

// classic-family generation → engine-shaped { trials, meta }.
// matchChance/interference are per-trial probabilities here (BW semantics,
// default 12.5%), unlike the engine's guaranteed-distribution matchChance.
export const generateClassicGame = (modeKey, gs) => {
  const cfg = CLASSIC_MODES[modeKey]
  const n = gs.nBack
  const jaeggi = !!cfg?.jaeggi
  // jaeggi needs room to place 6+6 matches; too few trials would spin the
  // brute-force sequence search forever
  const numTrials = jaeggi ? Math.max(gs.numTrials, n + 12) : gs.numTrials
  const pMatch = (gs.matchChance ?? 12.5) / 100
  const pLure = (gs.interference ?? 12.5) / 100
  const crab = !!gs.crab && !jaeggi
  const squares = modeKey === 'multiSquare' ? Math.min(4, Math.max(2, +gs.squares || 2)) : 0
  const mods = squares
    ? [...Array(squares).keys()].map(i => 'position' + i).concat(['audio'])
    : (cfg?.mods ?? modsFromFlags(gs))
  const varList = (gs.rules === 'variable' && !crab && !jaeggi && numTrials > n)
    ? Array.from({ length: numTrials - n }, () => variableN(n))
    : null
  const effBack = (t) => {
    if (crab) return 1 + 2 * (t % n)
    if (varList && t >= n) return varList[t - n]
    return n
  }

  // session symbol sets: value streams are 1-8, mapped onto 8 sampled symbols
  const posSyms = pickSyms(gs.grid?.includes('2D') ? POSITION_POOL_2D : POSITION_POOL, 8)
  let audioPool = [...new Set(getAudioPool(gs.audioSource))]
  if (audioPool.length < 8) audioPool = [...new Set(getAudioPool('letters2'))] // streams are 8-valued
  const audioSyms = pickSyms(audioPool, 8)
  const colorSyms = pickSyms(COLOR_POOL, 8)

  const streams = streamsOf(mods)
  const isArith = mods.includes('arithmetic')
  const combo = mods.some(m => COMBO[m])
  const seq = {}
  for (const s of streams) seq[s] = []
  const numbers = [], opsSeq = []
  let ops = []
  if (isArith) {
    const o = gs.arithOps ?? {}
    ops = [o.add !== false && 'add', o.sub !== false && 'subtract',
      o.mul !== false && 'multiply', o.div !== false && 'divide'].filter(Boolean)
    if (!ops.length) ops = ['add']
  }
  const jaeggiSeq = jaeggi ? jaeggiSequence(n, numTrials) : null

  for (let t = 0; t < numTrials; t++) {
    const back = t >= n ? effBack(t) : n
    if (squares) {
      const posMods = mods.slice(0, squares)
      const cells = genMulti(posMods.map(m => seq[m]), n, t, back, pMatch, pLure)
      posMods.forEach((m, i) => seq[m].push(cells[i]))
      seq.audio.push(gen(seq.audio, n, t, back, pMatch, pLure))
    } else if (combo) {
      const cur = genCombo(seq, mods, n, t, back, pMatch, pLure)
      for (const s of streams) seq[s].push(cur[s])
    } else {
      for (const s of streams) {
        seq[s].push(jaeggi ? jaeggiSeq[s][t] : gen(seq[s], n, t, back, pMatch, pLure))
      }
      if (isArith) {
        const { number, op } = genArith(numbers, n, t, ops, gs.arithMaxNumber ?? 12, !!gs.arithNegatives)
        numbers.push(number)
        opsSeq.push(op)
      }
    }
  }

  const matchTest = (mod, t) => {
    const back = effBack(t)
    const map = COMBO[mod]
    const cur = map ? seq[map[0]] : seq[mod]
    const ref = map ? seq[map[1]] : seq[mod]
    return cur[t] === ref[t - back]
  }

  const trials = []
  for (let t = 0; t < numTrials; t++) {
    const trial = { matches: [] }
    if (varList && t >= n) trial.variableNBack = varList[t - n]
    if (squares) {
      mods.slice(0, squares).forEach((m) => { trial[m] = posSyms[seq[m][t] - 1] })
      trial.audio = audioSyms[seq.audio[t] - 1]
    } else {
      if (seq.position) trial.position = posSyms[seq.position[t] - 1]
      if (seq.color) trial.color = colorSyms[seq.color[t] - 1]
      if (seq.vis) trial.text = letterOf(audioSyms[seq.vis[t] - 1])
      if (seq.audio) trial.audio = audioSyms[seq.audio[t] - 1]
      for (const m of mods) {
        if (COMBO[m]) trial[m] = true
      }
      if (isArith) {
        trial.text = String(numbers[t])
        trial.arithmetic = true
        if (t >= n) {
          // the operation is spoken, and only once answers are expected;
          // arithmetic never joins `matches` (it's a typed answer, not a
          // match judgment - detectMissedStimuli must not touch it)
          trial.audio = 'speak:' + opsSeq[t]
          trial.answer = arithAnswer(numbers[t - effBack(t)], opsSeq[t], numbers[t])
        }
      }
    }
    if (t >= n) {
      for (const m of mods) {
        if (m !== 'arithmetic' && matchTest(m, t)) trial.matches.push(m)
      }
    }
    trials.push(trial)
  }

  const meta = {
    nBack: n,
    numTrials,
    trialTime: gs.trialTime,
    matchChance: gs.matchChance,
    interference: gs.interference,
    rules: gs.rules ?? 'none',
    title: cfg?.title ?? CLASSIC_TITLES[modeKey] ?? modeKey,
    tags: mods.slice(),
    configSnapshot: structuredClone(gs),
  }
  if (jaeggi) meta.jaeggi = true
  if (crab) meta.crab = true
  if (gs.selfPaced && !jaeggi) meta.selfPaced = true
  if (isArith) meta.arithmetic = true
  if (squares) meta.squares = squares

  return { trials, meta }
}
