// Pure-function checks for js/nback/game.js — run with: node tests/nback-pure.mjs
// Loads the game engine in Node with a minimal DOM stub (no browser needed).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'js/nback/game.js'), 'utf8');
const stubEl = new Proxy({}, { get: (t, p) => p === 'classList' ? { add() {}, remove() {} } : (p === 'forEach' ? () => {} : stubEl) });
global.document = { getElementById: () => stubEl, querySelectorAll: () => [] };
global.savedata = {};
(0, eval)(src.replace(/const (nbackArea|nbackGridCells|nbackModeLabel|nbackLevelLabel|nbackTrialLabel|nbackResult|nbackAnswerEl|nbackStartButton|nbackMatchButtons) =/g, 'var $1 ='));

let fail = 0;
const assert = (c, l) => { console.log((c ? 'PASS' : 'FAIL') + ' - ' + l); if (!c) fail++; };

// --- Jaeggi sequence: exactly 6 position + 6 audio matches, 2 simultaneous ---
for (const [n, trials] of [[2, 24], [3, 29], [4, 36]]) {
  let ok = true, detail = '';
  for (let run = 0; run < 200; run++) {
    const s = nbackJaeggiSequence(n, trials);
    let pos = 0, aud = 0, both = 0, range = true;
    for (let t = 0; t < trials; t++) range = range && s.position[t] >= 1 && s.position[t] <= 8 && s.audio[t] >= 1 && s.audio[t] <= 8;
    for (let t = n; t < trials; t++) {
      const p = s.position[t] === s.position[t - n], a = s.audio[t] === s.audio[t - n];
      if (p) pos++; if (a) aud++; if (p && a) both++;
    }
    if (pos !== 6 || aud !== 6 || both !== 2 || !range) { ok = false; detail = JSON.stringify({ run, pos, aud, both, range }); break; }
  }
  assert(ok, `Jaeggi sequence n=${n}/${trials}: exactly 6 pos, 6 audio, 2 both over 200 runs ${detail}`);
}

// --- Jaeggi scoring: TN counts, min-modality rule ---
assert(nbackScoreJaeggi({ m: Array(10).fill({ match: false, pressed: false }) }).score === 100, 'Jaeggi scoring: all TN → 100');
const b = nbackScoreJaeggi({
  pos: [{ match: true, pressed: true }, { match: false, pressed: false }],
  aud: [{ match: true, pressed: false }, { match: false, pressed: false }],
});
assert(b.score === 50 && b.percents.pos === 100 && b.percents.aud === 50, 'Jaeggi scoring: min-modality (100,50) → 50');
const idle = { position: [], audio: [] };
for (let i = 0; i < 22; i++) { const m = i < 6; idle.position.push({ match: m, pressed: false }); idle.audio.push({ match: m, pressed: false }); }
assert(nbackScoreJaeggi(idle).score === 72, 'Jaeggi scoring: idle session 16 TN / 22 = 72');

// --- default scoring: TNs ignored ---
assert(nbackScore({ m: [{ match: true, pressed: true }, { match: false, pressed: true }, { match: true, pressed: false }] }).score === 33,
  'default scoring: TP=1 FP=1 FN=1 → 33');

// --- variable N: range + skew toward n ---
{
  const counts = Array(5).fill(0);
  for (let i = 0; i < 20000; i++) counts[nbackVariableN(4)]++;
  assert(counts[0] === 0 && counts.slice(1).every(c => c > 0), 'nbackVariableN(4): all values 1-4');
  assert(counts[4] > counts[3] && counts[3] > counts[2] && counts[2] > counts[1], 'nbackVariableN(4): skews toward n');
}

// --- nbackGen: back + chance params ---
{
  const hist = [1, 2, 3, 4, 5, 6, 7, 8];
  let alwaysMatch = true, neverMatch = true;
  for (let i = 0; i < 2000; i++) {
    if (nbackGen(hist, 3, 8, 2, 1, 0) !== hist[6]) alwaysMatch = false;
    if (nbackGen(hist, 3, 8, 2, 0, 1) === hist[6]) neverMatch = false;
  }
  assert(alwaysMatch, 'nbackGen pMatch=1: always copies hist[t-back]');
  assert(neverMatch, 'nbackGen pLure=1: lure never equals the true target');
  let m = 0, tot = 0;
  for (let run = 0; run < 500; run++) {
    const h = [];
    for (let t = 0; t < 22; t++) { const v = nbackGen(h, 2, t); h.push(v); if (t >= 2) { tot++; if (v === h[t - 2]) m++; } }
  }
  const rate = m / tot;
  assert(rate > 0.20 && rate < 0.27, 'nbackGen defaults: match rate ~23.4% (got ' + (rate * 100).toFixed(1) + '%)');
}

// --- nbackGenMulti: distinctness invariant, forced matches, baseline ---
{
  const distinct = a => new Set(a).size === a.length;
  const inRange = a => a.every(v => v >= 1 && v <= 8);
  for (const k of [2, 3, 4]) {
    let ok = true;
    for (let run = 0; run < 200 && ok; run++) {
      const seqs = Array.from({ length: k }, () => []);
      for (let t = 0; t < 24; t++) {
        const cells = nbackGenMulti(seqs, 2, t, 2);
        if (!distinct(cells) || !inRange(cells)) { ok = false; break; }
        cells.forEach((c, i) => seqs[i].push(c));
      }
    }
    assert(ok, `nbackGenMulti k=${k}: every trial distinct and 1-8 over 200 sessions`);
  }
  let allMatch = true;
  for (let run = 0; run < 300; run++) {
    const seqs = Array.from({ length: 3 }, () => []);
    for (let t = 0; t < 24; t++) {
      const cells = nbackGenMulti(seqs, 2, t, 2, 1, 0);
      if (t >= 2 && !cells.every((c, i) => c === seqs[i][t - 2])) allMatch = false;
      if (!distinct(cells)) allMatch = false;
      cells.forEach((c, i) => seqs[i].push(c));
    }
  }
  assert(allMatch, 'nbackGenMulti pMatch=1: every stream matches its own 2-back, still distinct');
  let m = 0, tot = 0;
  for (let run = 0; run < 300; run++) {
    const seqs = Array.from({ length: 2 }, () => []);
    for (let t = 0; t < 24; t++) {
      const cells = nbackGenMulti(seqs, 2, t, 2, 0, 0);
      if (t >= 2) { tot += 2; cells.forEach((c, i) => { if (c === seqs[i][t - 2]) m++; }); }
      cells.forEach((c, i) => seqs[i].push(c));
    }
  }
  const rate = m / tot;
  assert(rate > 0.09 && rate < 0.16, 'nbackGenMulti chances=0: baseline ~1/8 (' + (rate * 100).toFixed(1) + '%)');
}

// --- nbackGenCombo: cross-modal generation ---
{
  const MODS = ['visvis', 'visaudio', 'audiovis', 'audio'];
  const runSession = (pMatch, pLure) => {
    const streams = { vis: [], audio: [] };
    const stats = { visvis: 0, visaudio: 0, audiovis: 0, audio: 0, scored: 0, range: true };
    for (let t = 0; t < 24; t++) {
      const cur = nbackGenCombo(streams, MODS, 2, t, 2, pMatch, pLure);
      if (cur.vis < 1 || cur.vis > 8 || cur.audio < 1 || cur.audio > 8) stats.range = false;
      streams.vis.push(cur.vis); streams.audio.push(cur.audio);
      if (t >= 2) {
        stats.scored++;
        if (streams.vis[t] === streams.vis[t - 2]) stats.visvis++;
        if (streams.vis[t] === streams.audio[t - 2]) stats.visaudio++;
        if (streams.audio[t] === streams.vis[t - 2]) stats.audiovis++;
        if (streams.audio[t] === streams.audio[t - 2]) stats.audio++;
      }
    }
    return stats;
  };
  let ok = true, elevated = 0, scored = 0;
  for (let run = 0; run < 300; run++) {
    const s = runSession(1, 0);
    if (!s.range || s.visaudio !== s.scored || s.audio !== s.scored) ok = false;
    elevated += s.visvis + s.audiovis; scored += 2 * s.scored;
  }
  assert(ok, 'nbackGenCombo pMatch=1: visaudio + audio (last stream writers) match 100%');
  assert(elevated / scored > 0.2, 'nbackGenCombo pMatch=1: visvis/audiovis elevated (' + (100 * elevated / scored).toFixed(1) + '%)');
  let m = 0, tot = 0;
  for (let run = 0; run < 300; run++) {
    const s = runSession(0, 0);
    m += s.visvis + s.visaudio + s.audiovis + s.audio; tot += 4 * s.scored;
  }
  const rate = m / tot;
  assert(rate > 0.09 && rate < 0.16, 'nbackGenCombo chances=0: baseline ~1/8 per relation (' + (100 * rate).toFixed(1) + '%)');
}

// --- arithmetic: divisor legality (BW acceptable-decimals rule, exact) ---
assert(nbackDivisorOk(6, 4), 'nbackDivisorOk(6,4): 1.5 legal');
assert(nbackDivisorOk(7, 8), 'nbackDivisorOk(7,8): 0.875 legal');
assert(nbackDivisorOk(3, 20), 'nbackDivisorOk(3,20): 0.15 legal');
assert(!nbackDivisorOk(1, 3), 'nbackDivisorOk(1,3): 0.333... illegal');
assert(!nbackDivisorOk(1, 7), 'nbackDivisorOk(1,7): 0.142... illegal');
assert(!nbackDivisorOk(5, 0), 'nbackDivisorOk(x,0): zero divisor illegal');
assert([-12, -3, 1, 5, 12].every(x => nbackDivisorOk(0, x)), 'nbackDivisorOk(0,x): everything divides 0');
assert(nbackDivisorOk(-6, 4) && nbackDivisorOk(6, -4), 'nbackDivisorOk: sign-independent (±1.5)');
assert(!nbackDivisorOk(1, 20), 'nbackDivisorOk(1,20): 0.05 not in BW list');

// --- arithmetic: answers + float-exactness of typed comparison ---
assert(nbackArithAnswer(8, 'add', 4) === 12 && nbackArithAnswer(5, 'subtract', 7) === -2
  && nbackArithAnswer(3, 'multiply', 4) === 12, 'nbackArithAnswer: integer op fixtures');
assert(nbackArithAnswer(9, 'divide', 12) === 0.75, 'nbackArithAnswer: 9/12 = 0.75');
assert(parseFloat('0.3') === nbackArithAnswer(3, 'divide', 10)
  && parseFloat('1.5') === nbackArithAnswer(6, 'divide', 4)
  && parseFloat('0.875') === nbackArithAnswer(7, 'divide', 8),
  'typed decimal parses to the exact quotient double (IEEE correctly-rounded)');

// --- arithmetic: generation ranges + divide legality over 10k trials ---
{
  const OPS = ['add', 'subtract', 'multiply', 'divide'];
  let ok = true, sawNeg = false, detail = '';
  for (let run = 0; run < 400 && ok; run++) {
    const negatives = run % 2 === 1;
    const numbers = [];
    for (let t = 0; t < 24; t++) {
      const { number, op } = nbackGenArith(numbers, 2, t, OPS, 12, negatives);
      if (!Number.isInteger(number) || number > 12 || number < (negatives ? -12 : 0)) { ok = false; detail = `range ${number}`; }
      if (number < 0) sawNeg = true;
      if (op === 'divide') {
        if (t >= 2 && !nbackDivisorOk(numbers[t - 2], number)) { ok = false; detail = `illegal divisor ${numbers[t - 2]}/${number}`; }
        if (t < 2 && number === 0) { ok = false; detail = 'zero divisor before n'; }
      }
      numbers.push(number);
    }
  }
  assert(ok, 'nbackGenArith: 10k trials in range, every divide divisor legal ' + detail);
  assert(sawNeg, 'nbackGenArith: negatives toggle produces negative numbers');
  let onlyDiv = true;
  for (let i = 0; i < 200; i++) if (nbackGenArith([5], 1, 1, ['divide'], 12, false).op !== 'divide') onlyDiv = false;
  assert(onlyDiv, 'nbackGenArith: op drawn from the enabled set only');
}

// --- arithmetic scoring maps onto nbackScore as right/(right+wrong) ---
assert(nbackScore({ arithmetic: [{ match: true, pressed: true }, { match: true, pressed: true }, { match: true, pressed: false }] }).score === 66,
  'arithmetic scoring: 2 right 1 wrong → 66');

// --- day rollover boundary (04:00, getTodayRRTProgress pattern) ---
assert(nbackDayStart(new Date(2026, 0, 5, 3, 59)) === nbackDayStart(new Date(2026, 0, 4, 12, 0)),
  'nbackDayStart: 03:59 still belongs to the previous day');
assert(nbackDayStart(new Date(2026, 0, 5, 4, 0)) === new Date(2026, 0, 5, 4, 0).getTime()
  && nbackDayStart(new Date(2026, 0, 5, 4, 0)) !== nbackDayStart(new Date(2026, 0, 5, 3, 59)),
  'nbackDayStart: 04:00 starts the new day');

console.log(fail ? fail + ' FAILURES' : 'ALL PASS');
process.exit(fail ? 1 : 0);
