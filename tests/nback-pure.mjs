// Pure-function checks for js/quadbox/classic.js (classic mode generation for
// the merged Cerevana N-Back) - run with: node tests/nback-pure.mjs
import {
  COMBO, CLASSIC_MODES, CLASSIC_TITLES, variableN, divisorOk, genArith,
  arithAnswer, gen, genCombo, genMulti, jaeggiSequence, generateClassicGame,
  isClassicGame,
} from '../js/quadbox/classic.js'
import { dayStart4AM } from '../js/quadbox/settings.js'

let fail = 0
const assert = (c, l) => { console.log((c ? 'PASS' : 'FAIL') + ' - ' + l); if (!c) fail++ }

// --- Jaeggi sequence: exactly 6 position + 6 audio matches, 2 simultaneous ---
for (const [n, trials] of [[2, 24], [3, 29], [4, 36]]) {
  let ok = true, detail = ''
  for (let run = 0; run < 200; run++) {
    const s = jaeggiSequence(n, trials)
    let pos = 0, aud = 0, both = 0, range = true
    for (let t = 0; t < trials; t++) range = range && s.position[t] >= 1 && s.position[t] <= 8 && s.audio[t] >= 1 && s.audio[t] <= 8
    for (let t = n; t < trials; t++) {
      const p = s.position[t] === s.position[t - n], a = s.audio[t] === s.audio[t - n]
      if (p) pos++; if (a) aud++; if (p && a) both++
    }
    if (pos !== 6 || aud !== 6 || both !== 2 || !range) { ok = false; detail = JSON.stringify({ run, pos, aud, both, range }); break }
  }
  assert(ok, `Jaeggi sequence n=${n}/${trials}: exactly 6 pos, 6 audio, 2 both over 200 runs ${detail}`)
}

// --- variable N: range + skew toward n ---
{
  const counts = Array(5).fill(0)
  for (let i = 0; i < 20000; i++) counts[variableN(4)]++
  assert(counts[0] === 0 && counts.slice(1).every(c => c > 0), 'variableN(4): all values 1-4')
  assert(counts[4] > counts[3] && counts[3] > counts[2] && counts[2] > counts[1], 'variableN(4): skews toward n')
}

// --- gen: back + chance params ---
{
  const hist = [1, 2, 3, 4, 5, 6, 7, 8]
  let alwaysMatch = true, neverMatch = true
  for (let i = 0; i < 2000; i++) {
    if (gen(hist, 3, 8, 2, 1, 0) !== hist[6]) alwaysMatch = false
    if (gen(hist, 3, 8, 2, 0, 1) === hist[6]) neverMatch = false
  }
  assert(alwaysMatch, 'gen pMatch=1: always copies hist[t-back]')
  assert(neverMatch, 'gen pLure=1: lure never equals the true target')
  let m = 0, tot = 0
  for (let run = 0; run < 500; run++) {
    const h = []
    for (let t = 0; t < 22; t++) { const v = gen(h, 2, t); h.push(v); if (t >= 2) { tot++; if (v === h[t - 2]) m++ } }
  }
  const rate = m / tot
  assert(rate > 0.20 && rate < 0.27, 'gen defaults: match rate ~23.4% (got ' + (rate * 100).toFixed(1) + '%)')
}

// --- genMulti: distinctness invariant, forced matches, baseline ---
{
  const distinct = a => new Set(a).size === a.length
  const inRange = a => a.every(v => v >= 1 && v <= 8)
  for (const k of [2, 3, 4]) {
    let ok = true
    for (let run = 0; run < 200 && ok; run++) {
      const seqs = Array.from({ length: k }, () => [])
      for (let t = 0; t < 24; t++) {
        const cells = genMulti(seqs, 2, t, 2)
        if (!distinct(cells) || !inRange(cells)) { ok = false; break }
        cells.forEach((c, i) => seqs[i].push(c))
      }
    }
    assert(ok, `genMulti k=${k}: every trial distinct and 1-8 over 200 sessions`)
  }
  let allMatch = true
  for (let run = 0; run < 300; run++) {
    const seqs = Array.from({ length: 3 }, () => [])
    for (let t = 0; t < 24; t++) {
      const cells = genMulti(seqs, 2, t, 2, 1, 0)
      if (t >= 2 && !cells.every((c, i) => c === seqs[i][t - 2])) allMatch = false
      if (!distinct(cells)) allMatch = false
      cells.forEach((c, i) => seqs[i].push(c))
    }
  }
  assert(allMatch, 'genMulti pMatch=1: every stream matches its own 2-back, still distinct')
  let m = 0, tot = 0
  for (let run = 0; run < 300; run++) {
    const seqs = Array.from({ length: 2 }, () => [])
    for (let t = 0; t < 24; t++) {
      const cells = genMulti(seqs, 2, t, 2, 0, 0)
      if (t >= 2) { tot += 2; cells.forEach((c, i) => { if (c === seqs[i][t - 2]) m++ }) }
      cells.forEach((c, i) => seqs[i].push(c))
    }
  }
  const rate = m / tot
  assert(rate > 0.09 && rate < 0.16, 'genMulti chances=0: baseline ~1/8 (' + (rate * 100).toFixed(1) + '%)')
}

// --- genCombo: cross-modal generation ---
{
  const MODS = ['visvis', 'visaudio', 'audiovis', 'audio']
  const runSession = (pMatch, pLure) => {
    const streams = { vis: [], audio: [] }
    const stats = { visvis: 0, visaudio: 0, audiovis: 0, audio: 0, scored: 0, range: true }
    for (let t = 0; t < 24; t++) {
      const cur = genCombo(streams, MODS, 2, t, 2, pMatch, pLure)
      if (cur.vis < 1 || cur.vis > 8 || cur.audio < 1 || cur.audio > 8) stats.range = false
      streams.vis.push(cur.vis); streams.audio.push(cur.audio)
      if (t >= 2) {
        stats.scored++
        if (streams.vis[t] === streams.vis[t - 2]) stats.visvis++
        if (streams.vis[t] === streams.audio[t - 2]) stats.visaudio++
        if (streams.audio[t] === streams.vis[t - 2]) stats.audiovis++
        if (streams.audio[t] === streams.audio[t - 2]) stats.audio++
      }
    }
    return stats
  }
  let ok = true, elevated = 0, scored = 0
  for (let run = 0; run < 300; run++) {
    const s = runSession(1, 0)
    if (!s.range || s.visaudio !== s.scored || s.audio !== s.scored) ok = false
    elevated += s.visvis + s.audiovis; scored += 2 * s.scored
  }
  assert(ok, 'genCombo pMatch=1: visaudio + audio (last stream writers) match 100%')
  assert(elevated / scored > 0.2, 'genCombo pMatch=1: visvis/audiovis elevated (' + (100 * elevated / scored).toFixed(1) + '%)')
  let m = 0, tot = 0
  for (let run = 0; run < 300; run++) {
    const s = runSession(0, 0)
    m += s.visvis + s.visaudio + s.audiovis + s.audio; tot += 4 * s.scored
  }
  const rate = m / tot
  assert(rate > 0.09 && rate < 0.16, 'genCombo chances=0: baseline ~1/8 per relation (' + (100 * rate).toFixed(1) + '%)')
}

// --- arithmetic: divisor legality (BW acceptable-decimals rule, exact) ---
assert(divisorOk(6, 4), 'divisorOk(6,4): 1.5 legal')
assert(divisorOk(7, 8), 'divisorOk(7,8): 0.875 legal')
assert(divisorOk(3, 20), 'divisorOk(3,20): 0.15 legal')
assert(!divisorOk(1, 3), 'divisorOk(1,3): 0.333... illegal')
assert(!divisorOk(1, 7), 'divisorOk(1,7): 0.142... illegal')
assert(!divisorOk(5, 0), 'divisorOk(x,0): zero divisor illegal')
assert([-12, -3, 1, 5, 12].every(x => divisorOk(0, x)), 'divisorOk(0,x): everything divides 0')
assert(divisorOk(-6, 4) && divisorOk(6, -4), 'divisorOk: sign-independent (±1.5)')
assert(!divisorOk(1, 20), 'divisorOk(1,20): 0.05 not in BW list')

// --- arithmetic: answers + float-exactness of typed comparison ---
assert(arithAnswer(8, 'add', 4) === 12 && arithAnswer(5, 'subtract', 7) === -2
  && arithAnswer(3, 'multiply', 4) === 12, 'arithAnswer: integer op fixtures')
assert(arithAnswer(9, 'divide', 12) === 0.75, 'arithAnswer: 9/12 = 0.75')
assert(parseFloat('0.3') === arithAnswer(3, 'divide', 10)
  && parseFloat('1.5') === arithAnswer(6, 'divide', 4)
  && parseFloat('0.875') === arithAnswer(7, 'divide', 8),
  'typed decimal parses to the exact quotient double (IEEE correctly-rounded)')

// --- arithmetic: generation ranges + divide legality over 10k trials ---
{
  const OPS = ['add', 'subtract', 'multiply', 'divide']
  let ok = true, sawNeg = false, detail = ''
  for (let run = 0; run < 400 && ok; run++) {
    const negatives = run % 2 === 1
    const numbers = []
    for (let t = 0; t < 24; t++) {
      const { number, op } = genArith(numbers, 2, t, OPS, 12, negatives)
      if (!Number.isInteger(number) || number > 12 || number < (negatives ? -12 : 0)) { ok = false; detail = `range ${number}` }
      if (number < 0) sawNeg = true
      if (op === 'divide') {
        if (t >= 2 && !divisorOk(numbers[t - 2], number)) { ok = false; detail = `illegal divisor ${numbers[t - 2]}/${number}` }
        if (t < 2 && number === 0) { ok = false; detail = 'zero divisor before n' }
      }
      numbers.push(number)
    }
  }
  assert(ok, 'genArith: 10k trials in range, every divide divisor legal ' + detail)
  assert(sawNeg, 'genArith: negatives toggle produces negative numbers')
  let onlyDiv = true
  for (let i = 0; i < 200; i++) if (genArith([5], 1, 1, ['divide'], 12, false).op !== 'divide') onlyDiv = false
  assert(onlyDiv, 'genArith: op drawn from the enabled set only')
}

// --- day rollover boundary (04:00) ---
assert(dayStart4AM(new Date(2026, 0, 5, 3, 59)) === dayStart4AM(new Date(2026, 0, 4, 12, 0)),
  'dayStart4AM: 03:59 still belongs to the previous day')
assert(dayStart4AM(new Date(2026, 0, 5, 4, 0)) === new Date(2026, 0, 5, 4, 0).getTime()
  && dayStart4AM(new Date(2026, 0, 5, 4, 0)) !== dayStart4AM(new Date(2026, 0, 5, 3, 59)),
  'dayStart4AM: 04:00 starts the new day')

// ===== generateClassicGame: engine-shaped { trials, meta } conformance =====

const gsBase = {
  nBack: 2, numTrials: 24, trialTime: 3300, matchChance: 12.5, interference: 12.5,
  grid: 'static2D', rules: 'none', audioSource: 'letters2', crab: false, selfPaced: false,
}

// which tags carry a real symbol vs a relation/answer marker
const symbolTag = (tag) => !COMBO[tag] && tag !== 'arithmetic'

function checkShape(modeKey, gs, label) {
  const { trials, meta } = generateClassicGame(modeKey, gs)
  let ok = trials.length === meta.numTrials
  ok = ok && meta.nBack === gs.nBack && Array.isArray(meta.tags)
  const expectedTitle = CLASSIC_MODES[modeKey]?.title ?? CLASSIC_TITLES[modeKey] ?? modeKey
  ok = ok && meta.title === expectedTitle
  for (let t = 0; t < trials.length; t++) {
    const trial = trials[t]
    ok = ok && Array.isArray(trial.matches)
    // every match names a tag; arithmetic never appears in matches
    ok = ok && trial.matches.every(m => meta.tags.includes(m) && m !== 'arithmetic')
    ok = ok && (t >= gs.nBack || trial.matches.length === 0)
    // every tag is present as a trial property (checkForMatch's `type in trial` guard)
    for (const tag of meta.tags) {
      if (tag === 'arithmetic') { ok = ok && trial.arithmetic === true; continue }
      ok = ok && tag in trial && trial[tag] !== undefined && trial[tag] !== null
      if (symbolTag(tag)) ok = ok && typeof trial[tag] === 'string'
    }
  }
  assert(ok, label + ': trials/meta shape conforms')
  return { trials, meta }
}

// combos: relation tags + letter text + audio file
{
  const { trials, meta } = checkShape('quadCombo', { ...gsBase }, 'quadCombo')
  assert(meta.tags.join() === 'position,visvis,visaudio,color,audiovis,audio', 'quadCombo: tag order per registry')
  assert(trials.every(t => typeof t.text === 'string' && /^[A-Z]+$/.test(t.text)), 'quadCombo: every trial shows an uppercase letter')
  assert(trials.every(t => typeof t.audio === 'string' && t.audio.includes('/')), 'quadCombo: every trial has a pool audio file')
  checkShape('dualCombo', { ...gsBase }, 'dualCombo')
  checkShape('triComboColor', { ...gsBase }, 'triComboColor')
}

// arithmetic: text is the number, op spoken from trial n, answer precomputed
{
  const gs = { ...gsBase, nBack: 2, numTrials: 21, arithOps: { add: true, sub: true, mul: true, div: true }, arithMaxNumber: 12, arithNegatives: false }
  const { trials, meta } = checkShape('tripleArithmetic', gs, 'tripleArithmetic')
  assert(meta.arithmetic === true, 'arithmetic: meta.arithmetic flag set')
  let ok = true
  const numbers = trials.map(t => Number(t.text))
  for (let t = 0; t < trials.length; t++) {
    if (!Number.isInteger(numbers[t])) ok = false
    if (t >= gs.nBack) {
      const op = String(trials[t].audio).replace('speak:', '')
      if (!String(trials[t].audio).startsWith('speak:')) ok = false
      if (trials[t].answer !== arithAnswer(numbers[t - gs.nBack], op, numbers[t])) ok = false
    } else {
      if ('answer' in trials[t]) ok = false
    }
  }
  assert(ok, 'arithmetic: numbers integral, ops spoken via speak:, answers exact from trial n')
}

// jaeggi: protocol invariants survive the full game build
{
  const { trials, meta } = checkShape('jaeggi', { ...gsBase, numTrials: 24 }, 'jaeggi')
  assert(meta.jaeggi === true, 'jaeggi: meta.jaeggi flag set')
  let pos = 0, aud = 0, both = 0
  for (const t of trials) {
    const p = t.matches.includes('position'), a = t.matches.includes('audio')
    if (p) pos++; if (a) aud++; if (p && a) both++
  }
  assert(pos === 6 && aud === 6 && both === 2, `jaeggi: 6/6/2 matches in built trials (got ${pos}/${aud}/${both})`)
  const bumped = generateClassicGame('jaeggi', { ...gsBase, nBack: 4, numTrials: 6 })
  assert(bumped.meta.numTrials >= 16, 'jaeggi: too-few trials bumped so sequence search terminates')
}

// multiSquare: distinct positions per trial, squares in meta
{
  for (const squares of [2, 3, 4]) {
    const { trials, meta } = generateClassicGame('multiSquare', { ...gsBase, squares })
    const posTags = meta.tags.filter(t => t.startsWith('position'))
    let ok = posTags.length === squares && meta.squares === squares && meta.tags.includes('audio')
    for (const trial of trials) {
      const cells = posTags.map(tag => trial[tag])
      ok = ok && new Set(cells).size === squares
    }
    assert(ok, `multiSquare k=${squares}: ${squares} distinct positions every trial`)
  }
}

// crab: reroutes engine-shaped modes, flags meta, honors block-reversed matches
{
  const gs = { ...gsBase, enableAudio: true, enableColor: false, crab: true, matchChance: 25, interference: 20 }
  assert(isClassicGame('dual', gs), 'isClassicGame: crab reroutes an engine mode')
  assert(!isClassicGame('dual', { ...gs, crab: false }), 'isClassicGame: plain dual stays on the engine')
  assert(!isClassicGame('quad', { ...gs, enableShape: true }), 'isClassicGame: crab unsupported with shape stimuli')
  const { trials, meta } = generateClassicGame('dual', gs)
  assert(meta.crab === true && meta.tags.join() === 'position,audio', 'crab dual: meta flags + tags')
  // crab matches must reflect the block-reversed back, not plain n: verify
  // every reported match against the reconstructed effective back
  const n = gs.nBack
  let ok = true
  for (let t = n; t < trials.length; t++) {
    const back = 1 + 2 * (t % n)
    for (const tag of ['position', 'audio']) {
      const isMatch = trials[t][tag] === trials[t - back][tag]
      if (trials[t].matches.includes(tag) !== isMatch) ok = false
    }
  }
  assert(ok, 'crab dual: matches computed against the block-reversed back')
}

// variable rules: variableNBack annotated and matches follow it
{
  const { trials } = generateClassicGame('dualCombo', { ...gsBase, rules: 'variable' })
  let ok = true
  for (let t = 0; t < trials.length; t++) {
    if (t >= gsBase.nBack) {
      const v = trials[t].variableNBack
      if (!(v >= 1 && v <= gsBase.nBack)) ok = false
    } else if ('variableNBack' in trials[t]) ok = false
  }
  assert(ok, 'variable rules: per-trial variableNBack in 1..n from trial n')
}

// configSnapshot: full active gameSettings carried on the record, so the
// history graph can tell e.g. a 2D/3D grid switch apart from a level dip
{
  const gs = { ...gsBase, grid: 'rotate3D', crab: true }
  const { meta } = generateClassicGame('dual', gs)
  assert(JSON.stringify(meta.configSnapshot) === JSON.stringify(gs),
    'configSnapshot: carries the full gameSettings object used to generate the game')
  gs.grid = 'static2D'
  assert(meta.configSnapshot.grid === 'rotate3D',
    'configSnapshot: is a clone, unaffected by later mutation of the source settings')
}

// selfPaced flag propagates (and jaeggi ignores it)
assert(generateClassicGame('dualCombo', { ...gsBase, selfPaced: true }).meta.selfPaced === true,
  'selfPaced: meta flag set')
assert(!generateClassicGame('jaeggi', { ...gsBase, selfPaced: true }).meta.selfPaced,
  'selfPaced: jaeggi protocol ignores it')

console.log(fail ? fail + ' FAILURES' : 'ALL PASS')
process.exit(fail ? 1 : 0)
