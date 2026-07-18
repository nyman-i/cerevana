// Pure-function checks for RRT's dependency-free generators
// (js/rrt/generators/*) - run with: node tests/rrt-pure.mjs
//
// js/rrt/ is classic global-scope <script>-tag code (no import/export -
// every page loads ~20 of these files together and they share one window
// scope), unlike js/quadbox/ and js/cct/'s real ES modules, so they can't be
// `import`ed the way nback-pure.mjs/cct-pure.mjs do. Instead, load the files
// with no savedata/DOM dependency into a vm sandbox - same shared-scope
// execution the browser gives them, no app source touched. Files that read
// `savedata.*` (a global populated from localStorage, declared in
// js/shared/constants.js) are out of scope here; covering those needs a
// savedata stub, left as a follow-up.
import fs from 'node:fs'
import vm from 'node:vm'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(fileURLToPath(import.meta.url))
const genPath = (name) => path.join(dir, '../js/rrt/generators', name)

const sandbox = {}
vm.createContext(sandbox)
for (const file of [
  'utils.js', 'premise-reorder.js', 'color-comparator.js',
  'visual-noise.js', 'wide-premises.js', 'incorrect-directions.js',
]) {
  vm.runInContext(fs.readFileSync(genPath(file), 'utf8'), sandbox, { filename: file })
}
const {
  pickRandomItems, shuffle, coinFlip, arraysEqual,
  removeDuplicateArrays, interleaveArrays,
  frontHeavyIntervalMerge, pairwise, repeatArrayUntil, normalizeString, oneOutOf,
  premiseKey, seededRandom, createWidePremises,
} = sandbox
// `class` declarations (unlike `function`/`var`) don't attach to the vm
// context object as own properties, same as they don't attach to `window` in
// a real classic script - evaluate the bare names to pull their lexical
// bindings out instead.
const ColorComparator = vm.runInContext('ColorComparator', sandbox)
const VisualNoise = vm.runInContext('VisualNoise', sandbox)
const IncorrectDirections = vm.runInContext('IncorrectDirections', sandbox)

let fail = 0
const assert = (c, l) => { console.log((c ? 'PASS' : 'FAIL') + ' - ' + l); if (!c) fail++ }

// --- pickRandomItems ---
{
  const arr = [1, 2, 3, 4, 5]
  const { picked, remaining } = pickRandomItems(arr, 2)
  assert(picked.length === 2, 'pickRandomItems: picks exactly n')
  assert(remaining.length === 3, 'pickRandomItems: remaining is array.length - n')
  assert(picked.every(p => arr.includes(p)) && remaining.every(r => arr.includes(r)), 'pickRandomItems: every item comes from the source array')
  assert(picked.every(p => !remaining.includes(p)), 'pickRandomItems: picked and remaining are disjoint')
  const zero = pickRandomItems(arr, 0)
  assert(zero.picked.length === 0 && zero.remaining.length === 5, 'pickRandomItems: n=0 picks nothing')
  const all = pickRandomItems(arr, 5)
  assert(all.picked.length === 5 && all.remaining.length === 0, 'pickRandomItems: n=array.length picks everything')
}

// --- shuffle: same multiset, order actually varies over many trials ---
{
  const src = [1, 2, 3, 4, 5, 6, 7, 8]
  const shuffled = shuffle(src.slice())
  assert(shuffled.slice().sort().join(',') === src.slice().sort().join(','), 'shuffle: preserves the multiset of elements')
  let anyDifferent = false
  for (let i = 0; i < 50; i++) {
    if (shuffle(src.slice()).join(',') !== src.join(',')) { anyDifferent = true; break }
  }
  assert(anyDifferent, 'shuffle: actually reorders over repeated calls')
}

// --- coinFlip: roughly 50/50 over many trials ---
{
  let trues = 0
  const trials = 10000
  for (let i = 0; i < trials; i++) if (coinFlip()) trues++
  assert(trues > trials * 0.4 && trues < trials * 0.6, `coinFlip: ~50% true rate over ${trials} trials (got ${trues})`)
}

// --- arraysEqual ---
{
  assert(arraysEqual([1, 2, 3], [1, 2, 3]), 'arraysEqual: identical arrays are equal')
  assert(!arraysEqual([1, 2, 3], [1, 2]), 'arraysEqual: different lengths are unequal')
  assert(!arraysEqual([1, 2, 3], [1, 2, 4]), 'arraysEqual: different content is unequal')
  assert(arraysEqual([], []), 'arraysEqual: two empty arrays are equal')
}

// --- removeDuplicateArrays ---
{
  const dupes = [[1, 2], [3, 4], [1, 2], [5, 6], [3, 4]]
  const unique = removeDuplicateArrays(dupes)
  assert(unique.length === 3, 'removeDuplicateArrays: drops exact duplicate sub-arrays')
}

// --- interleaveArrays ---
{
  assert(interleaveArrays([1, 3], [2, 4]).join(',') === '1,2,3,4', 'interleaveArrays: equal-length arrays alternate')
  assert(interleaveArrays([1, 3, 5], [2]).join(',') === '1,2,3,5', 'interleaveArrays: leftover tail from the longer array is appended in order')
}

// --- frontHeavyIntervalMerge ---
{
  const merged = frontHeavyIntervalMerge(['a', 'b', 'c', 'd'], ['X', 'Y'])
  assert(merged.length === 6, 'frontHeavyIntervalMerge: output length is left.length + right.length')
  assert(merged.filter(x => x === 'X' || x === 'Y').length === 2, 'frontHeavyIntervalMerge: every right-side item survives')
  assert(merged.filter(x => 'abcd'.includes(x)).length === 4, 'frontHeavyIntervalMerge: every left-side item survives')
}

// --- pairwise ---
{
  const pairs = []
  pairwise([1, 2, 3, 4], (a, b) => pairs.push([a, b]))
  assert(pairs.length === 3, 'pairwise: calls back array.length - 1 times')
  assert(pairs.every(([a, b]) => b === a + 1), 'pairwise: each callback gets adjacent elements')
}

// --- repeatArrayUntil ---
{
  assert(repeatArrayUntil([1, 2, 3], 7).join(',') === '1,2,3,1,2,3,1', 'repeatArrayUntil: repeats and truncates to exactly n')
  assert(repeatArrayUntil([1, 2, 3], 2).join(',') === '1,2', 'repeatArrayUntil: truncates when n < array.length')
}

// --- normalizeString ---
{
  assert(normalizeString('Hello World!') === 'hello-world', 'normalizeString: lowercases, strips punctuation, spaces to hyphens')
  assert(normalizeString('  --Multiple   Spaces--  ') === 'multiple-spaces', 'normalizeString: collapses repeated separators and trims edges')
}

// --- oneOutOf ---
{
  let hits = 0
  const trials = 20000
  for (let i = 0; i < trials; i++) if (oneOutOf(5)) hits++
  const rate = hits / trials
  assert(rate > 0.15 && rate < 0.25, `oneOutOf(5): ~20% hit rate over ${trials} trials (got ${(rate * 100).toFixed(1)}%)`)
}

// --- premiseKey ---
{
  assert(premiseKey('A', 'B') === premiseKey('B', 'A'), 'premiseKey: order-independent (undirected edge)')
  assert(premiseKey('A', 'B') !== premiseKey('A', 'C'), 'premiseKey: distinct pairs get distinct keys')
}

// --- ColorComparator ---
{
  const red = 'hsl(0, 100%, 50%)'
  const green = 'hsl(120, 100%, 50%)'
  assert(ColorComparator.compareHslColors(red, red) < 0.01, 'ColorComparator: a color compared to itself has ~zero distance')
  assert(ColorComparator.areSimilarHslColors(red, red), 'ColorComparator: identical colors are similar')
  assert(!ColorComparator.areSimilarHslColors(red, green), 'ColorComparator: red vs green are not similar')
  const d1 = ColorComparator.compareHslColors(red, green)
  const d2 = ColorComparator.compareHslColors(green, red)
  assert(Math.abs(d1 - d2) < 0.001, 'ColorComparator: distance is symmetric')
}

// --- seededRandom / VisualNoise determinism ---
{
  const a = seededRandom(42), b = seededRandom(42)
  const seqA = Array.from({ length: 10 }, () => a())
  const seqB = Array.from({ length: 10 }, () => b())
  assert(seqA.join(',') === seqB.join(','), 'seededRandom: same seed produces the identical sequence')
  assert(seqA.every(v => v >= 0 && v < 1), 'seededRandom: every value is in [0, 1)')
  const c = seededRandom(43)
  const seqC = Array.from({ length: 10 }, () => c())
  assert(seqA.join(',') !== seqC.join(','), 'seededRandom: different seeds diverge')

  const svg1 = new VisualNoise().generateVisualNoise(1234, 5)
  const svg2 = new VisualNoise().generateVisualNoise(1234, 5)
  assert(svg1 === svg2, 'VisualNoise: same seed+splits produces byte-identical SVG')
  assert(svg1.startsWith('<svg') && svg1.endsWith('</svg>'), 'VisualNoise: produces well-formed SVG markup')
  const svg3 = new VisualNoise().generateVisualNoise(9999, 5)
  assert(svg1 !== svg3, 'VisualNoise: different seed produces different SVG')
}

// --- createWidePremises ---
{
  // path graph A-B-C-D: B and C each have 2 neighbors, so both edges at each
  // should be pairable; every input premise must survive exactly once.
  const path = [
    { start: 'A', end: 'B' }, { start: 'B', end: 'C' }, { start: 'C', end: 'D' },
  ]
  const wide = createWidePremises(path.map(p => ({ ...p })))
  assert(wide.every(g => g.length === 1 || g.length === 2), 'createWidePremises: every output group has 1 or 2 premises')
  const flatCount = wide.reduce((n, g) => n + g.length, 0)
  assert(flatCount === path.length, 'createWidePremises: every input premise appears exactly once in the output')

  // star graph: center 'X' connects to A/B/C/D - center has 4 neighbors, so
  // it should get paired (not left as three lonely singles).
  const star = ['A', 'B', 'C', 'D'].map(leaf => ({ start: 'X', end: leaf }))
  const wideStar = createWidePremises(star.map(p => ({ ...p })))
  assert(wideStar.some(g => g.length === 2), 'createWidePremises: a 4-neighbor star produces at least one paired group')

  // >20 premises takes the non-optimal fast path - just confirm it completes
  // and preserves every premise (no crash, no dropped/duplicated edges).
  const bigChain = Array.from({ length: 25 }, (_, i) => ({ start: `n${i}`, end: `n${i + 1}` }))
  const wideBig = createWidePremises(bigChain.map(p => ({ ...p })))
  assert(wideBig.reduce((n, g) => n + g.length, 0) === 25, 'createWidePremises: >20 premises (non-optimal path) still preserves every premise')
}

// --- IncorrectDirections ---
{
  const id = new IncorrectDirections()

  // findUnused is pure/deterministic: 2D, direction (1,0), one existing combo.
  const unused = id.findUnused([[1, 1]], [1, 0])
  assert(!unused.some(u => arraysEqual(u, [1, 0])), 'findUnused: never includes the correct coordinate itself')
  assert(!unused.some(u => arraysEqual(u, [0, 0])), 'findUnused: never includes the all-zero coordinate')
  assert(!unused.some(u => arraysEqual(u, [1, 1])), 'findUnused: excludes coordinates already in the combinations list')
  assert(unused.length === (3 ** 2) - 3, 'findUnused: 3^dimensions minus the 3 excluded coordinates')

  // usedCoords.length <= 2 always returns just [opposite]
  const correct = [1, 0, -1]
  const opposite = correct.map(d => -d)
  const few = id.createIncorrectConclusionCoords([[1, 0, 0]], correct, [1, 0, -1], null)
  assert(few.length === 1 && arraysEqual(few[0], opposite), 'createIncorrectConclusionCoords: <=2 used premises always returns just the opposite coordinate')

  // chooseIncorrectCoord must never hand back the correct coordinate itself
  let neverCorrect = true
  for (let i = 0; i < 500; i++) {
    const usedCoords = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 0], [1, 0, 1]]
    const picked = id.chooseIncorrectCoord(usedCoords, correct, [1, 0, -1], null)
    if (arraysEqual(picked, correct)) { neverCorrect = false; break }
  }
  assert(neverCorrect, 'chooseIncorrectCoord: never returns the correct coordinate itself, over 500 trials')
}

console.log(fail ? fail + ' FAILURES' : 'ALL PASS')
process.exit(fail ? 1 : 0)
