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
(0, eval)(src.replace(/const (nbackArea|nbackGridCells|nbackModeLabel|nbackLevelLabel|nbackTrialLabel|nbackResult|nbackStartButton|nbackMatchButtons) =/g, 'var $1 ='));

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

console.log(fail ? fail + ' FAILURES' : 'ALL PASS');
process.exit(fail ? 1 : 0);
