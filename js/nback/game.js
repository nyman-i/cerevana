// Dual N-Back — mechanics per nback-spec.md (Brain Workshop parity)

const NBACK_LETTERS = ['c', 'h', 'k', 'l', 'q', 'r', 's', 't'];
// stimulus values 1-8; hues chosen to stay legible on both themes
// (deviates from BW's exact RGB table, which uses white/grey — identity is arbitrary)
const NBACK_COLORS = ['#26f', '#0cc', '#2c2', '#dc2', '#e82', '#d22', '#c3c', '#84e'];
// multi-stim stream identity colors, BW convention: 1 blue, 2 green, 3 yellow, 4 red
const NBACK_STREAM_COLORS = ['#26f', '#2c2', '#dc2', '#d22'];
const NBACK_POS_MODS = ['position', 'position2', 'position3', 'position4'];
// hud: compact label for the HUD's narrow display line (long names overflow the game zone)
const NBACK_MODES = {
    dual:     { bw: 2,  label: 'Dual',     hud: 'Dual',     modalities: ['position', 'audio'], levelKey: 'nbackLevelDual',     failsKey: 'nbackFailsDual' },
    position: { bw: 10, label: 'Position', hud: 'Position', modalities: ['position'],          levelKey: 'nbackLevelPosition', failsKey: 'nbackFailsPosition' },
    sound:    { bw: 11, label: 'Sound',    hud: 'Sound',    modalities: ['audio'],             levelKey: 'nbackLevelSound',    failsKey: 'nbackFailsSound' },
    'position-color': { bw: 20, label: 'Position + Color', hud: 'PC',     modalities: ['position', 'color'],          levelKey: 'nbackLevelPC',  failsKey: 'nbackFailsPC' },
    'color-sound':    { bw: 22, label: 'Color + Sound',    hud: 'CA',     modalities: ['color', 'audio'],             levelKey: 'nbackLevelCA',  failsKey: 'nbackFailsCA' },
    triple:           { bw: 3,  label: 'Triple',           hud: 'Triple', modalities: ['position', 'color', 'audio'], levelKey: 'nbackLevelPCA', failsKey: 'nbackFailsPCA' },
    'dual-combo':      { bw: 4,  label: 'Dual Combination', hud: 'DC', modalities: ['visvis', 'visaudio', 'audiovis', 'audio'],                      levelKey: 'nbackLevelDC',  failsKey: 'nbackFailsDC',  bonusMs: 500 },
    'tri-combo':       { bw: 5,  label: 'Tri Combination',  hud: 'TC', modalities: ['position', 'visvis', 'visaudio', 'audiovis', 'audio'],          levelKey: 'nbackLevelTC',  failsKey: 'nbackFailsTC',  bonusMs: 500 },
    'quad-combo':      { bw: 6,  label: 'Quad Combination', hud: 'QC', modalities: ['position', 'visvis', 'visaudio', 'color', 'audiovis', 'audio'], levelKey: 'nbackLevelQC',  failsKey: 'nbackFailsQC',  bonusMs: 500 },
    'tri-combo-color': { bw: 12, label: 'Tri Combination (Color)', hud: 'TCC', modalities: ['visvis', 'visaudio', 'color', 'audiovis', 'audio'],     levelKey: 'nbackLevelTCC', failsKey: 'nbackFailsTCC' },
    // arithmetic modes: 40 BW ticks (+1s) and start at n=1 (BW BACK_7..9)
    arithmetic:          { bw: 7, label: 'Arithmetic',        hud: 'Arith', modalities: ['arithmetic'],                      levelKey: 'nbackLevelA',  failsKey: 'nbackFailsA',  bonusMs: 1000, defaultN: 1 },
    'dual-arithmetic':   { bw: 8, label: 'Dual Arithmetic',   hud: 'DA',    modalities: ['position', 'arithmetic'],          levelKey: 'nbackLevelDA', failsKey: 'nbackFailsDA', bonusMs: 1000, defaultN: 1 },
    'triple-arithmetic': { bw: 9, label: 'Triple Arithmetic', hud: 'TA',    modalities: ['position', 'arithmetic', 'color'], levelKey: 'nbackLevelTA', failsKey: 'nbackFailsTA', bonusMs: 1000, defaultN: 1 },
};

// BW's ARITHMETIC_ACCEPTABLE_DECIMALS (tenths, odd twentieths, eighths) — every
// value is m/40, so divisor legality reduces to exact integer math (no float eq).
const NBACK_ARITH_DECIMALS = new Set([4, 5, 6, 8, 10, 12, 14, 15, 16, 18, 20, 22, 24, 25, 26, 28, 30, 32, 34, 35, 36, 38]);

// combination modalities read across two streams: [currentStream, referenceStream]
const NBACK_COMBO = {
    visvis:   ['vis', 'vis'],
    visaudio: ['vis', 'audio'],
    audiovis: ['audio', 'vis'],
};
// position value 1-8 → grid cell index (center cell 4 skipped)
const NBACK_CELLS = [0, 1, 2, 3, 5, 6, 7, 8];

const NB = {
    running: false,
    paused: false,
    manual: false,
    jaeggi: false,
    jaeggiSeq: null,
    multi: 1,
    posMods: ['position'],
    levelKey: null,
    failsKey: null,
    crab: false,
    varList: null,
    selfPaced: false,
    advancing: false,
    pMatch: 0.125,
    pLure: 0.125,
    arith: false,
    ops: [],
    answer: { digits: '', negative: false },
    streams: [],
    mode: null,
    n: 0,
    trials: 0,
    trial: -1,
    seq: {},
    scored: {},
    pressed: {},
    letters: [],
    timeouts: [],
};

const nbackArea = document.getElementById('nback-area');
const nbackGridCells = document.querySelectorAll('#nback-grid .nback__cell');
const nbackModeLabel = document.getElementById('nback-mode-label');
const nbackLevelLabel = document.getElementById('nback-level');
const nbackTrialLabel = document.getElementById('nback-trial');
const nbackResult = document.getElementById('nback-result');
const nbackAnswerEl = document.getElementById('nback-answer');
const nbackStartButton = document.getElementById('nback-start');
const nbackMatchButtons = {
    position: document.getElementById('nback-pos-btn'),
    position2: document.getElementById('nback-pos2-btn'),
    position3: document.getElementById('nback-pos3-btn'),
    position4: document.getElementById('nback-pos4-btn'),
    color: document.getElementById('nback-color-btn'),
    visvis: document.getElementById('nback-visvis-btn'),
    visaudio: document.getElementById('nback-visaudio-btn'),
    audiovis: document.getElementById('nback-audiovis-btn'),
    audio: document.getElementById('nback-audio-btn'),
};

function nbackShuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function nbackRand8() {
    return 1 + Math.floor(Math.random() * 8);
}

// variable n-back: per-trial N from Beta(n/2, 1), skewed toward n (spec §4)
function nbackVariableN(n) {
    return Math.floor(Math.pow(Math.random(), 2 / n) * n + 1);
}

// division legality (spec §4): x divides a, or |a|/|x| has a fractional part in
// BW's acceptable-decimals list. All list values are m/40 → exact via integers.
function nbackDivisorOk(a, x) {
    if (x === 0) return false;
    if (a % x === 0) return true;
    const a40 = Math.abs(a) * 40, ax = Math.abs(x);
    return a40 % ax === 0 && NBACK_ARITH_DECIMALS.has((a40 / ax) % 40);
}

// one arithmetic trial (spec §4): op uniform from the enabled set; number uniform
// in [0, max] ([-max, max] with negatives). Divide draws only legal divisors of the
// n-back number (plain n, matching BW — not the crab/variable effective back);
// before trial n, divide numbers are just nonzero.
function nbackGenArith(numbers, n, t, ops, maxNumber, negatives) {
    const op = ops[Math.floor(Math.random() * ops.length)];
    const min = negatives ? -maxNumber : 0;
    const range = () => min + Math.floor(Math.random() * (maxNumber - min + 1));
    let number;
    if (op === 'divide') {
        if (t >= n) {
            const legal = [];
            for (let x = min; x <= maxNumber; x++) {
                if (nbackDivisorOk(numbers[t - n], x)) legal.push(x);
            }
            number = legal[Math.floor(Math.random() * legal.length)];
        } else {
            do { number = range(); } while (number === 0);
        }
    } else {
        number = range();
    }
    return { number, op };
}

function nbackArithAnswer(a, op, b) {
    if (op === 'add') return a + b;
    if (op === 'subtract') return a - b;
    if (op === 'multiply') return a * b;
    return a / b;
}

// typed answer per BW's ArithmeticAnswerLabel: digits append, '.' once, '-' toggles,
// no backspace, reset each trial; empty or '.' parses as 0
function nbackParseAnswer() {
    const d = NB.answer.digits;
    const v = (d === '' || d === '.') ? 0 : parseFloat(d);
    return NB.answer.negative ? -v : v;
}

function nbackArithInput(ch) {
    if (ch === '-') NB.answer.negative = !NB.answer.negative;
    else if (ch === '.') { if (!NB.answer.digits.includes('.')) NB.answer.digits += '.'; }
    else NB.answer.digits += ch;
    nbackAnswerEl.textContent = 'Answer: ' + (NB.answer.negative ? '-' : '') + (NB.answer.digits || '0');
}

// last 04:00 day boundary (same rollover math as getTodayRRTProgress in shared/db.js)
function nbackDayStart(now) {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 4, 0, 0);
    if (now.getHours() < 4) start.setDate(start.getDate() - 1);
    return start.getTime();
}

// effective back for trial t: crab reverses each block of n; variable uses the
// pregenerated per-trial list; otherwise plain n
function nbEffBack(t) {
    if (NB.crab) return 1 + 2 * (t % NB.n);
    if (NB.varList && t >= NB.n) return NB.varList[t - NB.n];
    return NB.n;
}

// the one match test: combination modalities compare across streams, all others
// compare a stream against itself
function nbMatch(mod, t) {
    const back = nbEffBack(t);
    const map = NBACK_COMBO[mod];
    const cur = map ? NB.seq[map[0]] : NB.seq[mod];
    const ref = map ? NB.seq[map[1]] : NB.seq[mod];
    return cur[t] === ref[t - back];
}

// stimulus streams underlying a modality list (combos collapse onto vis/audio;
// arithmetic isn't a 1-8 stream — its number/op arrays live outside this list)
function nbackStreams(mods) {
    const streams = [];
    for (const m of mods) {
        if (m === 'arithmetic') continue;
        const s = NBACK_COMBO[m] ? NBACK_COMBO[m][0] : m;
        if (!streams.includes(s)) streams.push(s);
    }
    return streams;
}

// combination-mode generation (spec §4): streams start uniform; then per modality
// IN MODE ORDER, forced match/lure writes the modality's current stream from its
// reference stream's history — later modalities overwrite earlier ones (BW's loop).
function nbackGenCombo(streams, mods, n, t, back = n, pMatch = 0.125, pLure = 0.125) {
    const cur = {};
    for (const s in streams) cur[s] = nbackRand8();
    if (t >= n) {
        for (const mod of mods) {
            const map = NBACK_COMBO[mod] || [mod, mod];
            const refHist = streams[map[1]];
            const target = refHist[t - back];
            if (Math.random() < pMatch) {
                cur[map[0]] = target;
            } else if (Math.random() < pLure && n > 1) {
                const offsets = nbackShuffle(n < 3 ? [1, n] : [-1, 1, n]);
                let v = null;
                for (const o of offsets) {
                    const j = t - back - o;
                    if (j >= 0 && refHist[j] !== target) v = refHist[j];
                }
                if (v !== null) cur[map[0]] = v;
            }
        }
    }
    return cur;
}

// pausable setTimeout: entries carry their deadline so pause can compute remaining time
function nbSchedule(fn, ms) {
    const entry = { fn, fireAt: performance.now() + ms };
    entry.id = setTimeout(() => {
        NB.timeouts = NB.timeouts.filter(e => e !== entry);
        fn();
    }, ms);
    NB.timeouts.push(entry);
}

function nbackTogglePause() {
    if (!NB.running) return;
    if (!NB.paused) {
        NB.paused = true;
        NB.timeouts.forEach(e => {
            clearTimeout(e.id);
            e.remaining = Math.max(0, e.fireAt - performance.now());
        });
        speechSynthesis.cancel();
        nbackTrialLabel.textContent = 'PAUSED';
    } else {
        NB.paused = false;
        const entries = NB.timeouts;
        NB.timeouts = [];
        entries.forEach(e => nbSchedule(e.fn, e.remaining));
        nbackTrialLabel.textContent = (NB.trial + 1) + ' / ' + NB.trials;
    }
}

// One stimulus value. hist = values of previous trials, t = 0-based trial index,
// back = effective back for this trial (crab/variable), defaults to n.
// Uniform 1-8, then pMatch forced match, else pLure lure from offsets
// {-1,+1,+n} ({+1,+n} if n<3) that isn't an accidental real match.
function nbackGen(hist, n, t, back = n, pMatch = 0.125, pLure = 0.125) {
    let v = 1 + Math.floor(Math.random() * 8);
    if (t >= n) {
        const target = hist[t - back];
        if (Math.random() < pMatch) return target;
        if (Math.random() < pLure && n > 1) {
            const offsets = nbackShuffle(n < 3 ? [1, n] : [-1, 1, n]);
            for (const i of offsets) {
                const j = t - back - i;
                if (j >= 0 && hist[j] !== target) v = hist[j];
            }
        }
    }
    return v;
}

// Jaeggi session sequence (spec §4): brute-force exactly 6 position matches and
// 6 audio matches, of which exactly 2 simultaneous (4 visual-only, 4 audio-only, 2 both).
function nbackJaeggiSequence(n, trials) {
    const seq = { position: [], audio: [] };
    for (let i = 0; i < n; i++) {
        seq.position[i] = nbackRand8();
        seq.audio[i] = nbackRand8();
    }
    while (true) {
        let pos = 0;
        for (let t = n; t < trials; t++) {
            seq.position[t] = nbackRand8();
            if (seq.position[t] === seq.position[t - n]) pos++;
        }
        if (pos !== 6) continue;
        while (true) {
            let aud = 0;
            for (let t = n; t < trials; t++) {
                seq.audio[t] = nbackRand8();
                if (seq.audio[t] === seq.audio[t - n]) aud++;
            }
            if (aud === 6) break;
        }
        let both = 0;
        for (let t = n; t < trials; t++) {
            if (seq.position[t] === seq.position[t - n] && seq.audio[t] === seq.audio[t - n]) both++;
        }
        if (both === 2) return seq;
    }
}

// Jaeggi scoring (spec §6): TNs count as correct, per modality (TP+TN)/total,
// session score = minimum modality percent.
function nbackScoreJaeggi(scored) {
    const percents = {};
    let min = 100;
    for (const mod in scored) {
        let right = 0;
        for (const s of scored[mod]) {
            if (s.match === s.pressed) right++;
        }
        percents[mod] = scored[mod].length ? Math.floor(100 * right / scored[mod].length) : 100;
        if (percents[mod] < min) min = percents[mod];
    }
    return { score: min, percents };
}

// scored = { modality: [{match, pressed}, ...] } → { score, percents }
// TP = match & pressed; wrong = match XOR pressed; TNs ignored (BW default scoring).
function nbackScore(scored) {
    const percents = {};
    let tpAll = 0, allAll = 0;
    for (const mod in scored) {
        let tp = 0, wrong = 0;
        for (const s of scored[mod]) {
            if (s.match && s.pressed) tp++;
            else if (s.match !== s.pressed) wrong++;
        }
        percents[mod] = tp + wrong ? Math.floor(100 * tp / (tp + wrong)) : 100;
        tpAll += tp;
        allAll += tp + wrong;
    }
    return { score: allAll ? Math.floor(100 * tpAll / allAll) : 100, percents };
}

function nbackSpeak(letter) {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(letter);
    u.lang = 'en-US';
    u.rate = 1.1;
    speechSynthesis.speak(u);
}

function nbackModeConfig() {
    return NBACK_MODES[savedata.nbackMode] || NBACK_MODES.dual;
}

// multi-stim only applies to the Dual base and never in Jaeggi
function nbackMultiCount() {
    const jaeggi = !!savedata.nbackJaeggi && savedata.nbackMode === 'dual';
    return (savedata.nbackMode === 'dual' && !jaeggi) ? Math.min(4, Math.max(1, +savedata.nbackMultiStim || 1)) : 1;
}

function nbackActiveModalities(cfg, multi) {
    if (multi > 1) return NBACK_POS_MODS.slice(0, multi).concat(['audio']);
    return cfg.modalities;
}

// k distinct cells per trial (spec §4 multi): sample without replacement, per-stream
// forced match/lure (lure ×2/3) with conflict swap, then optional whole-set rotation.
function nbackGenMulti(seqs, n, t, back = n, pMatch = 0.125, pLure = 0.125) {
    const k = seqs.length;
    const cells = nbackShuffle([1, 2, 3, 4, 5, 6, 7, 8]).slice(0, k);
    if (t >= n) {
        const lureP = pLure * 2 / 3; // BW scales r2 ×1.5 in multi
        for (let i = 0; i < k; i++) {
            const hist = seqs[i];
            const target = hist[t - back];
            let forced = null;
            if (Math.random() < pMatch) {
                forced = target;
            } else if (Math.random() < lureP && n > 1) {
                const offsets = nbackShuffle(n < 3 ? [1, n] : [-1, 1, n]);
                for (const o of offsets) {
                    const j = t - back - o;
                    if (j >= 0 && hist[j] !== target) forced = hist[j];
                }
            }
            if (forced !== null) {
                const other = cells.indexOf(forced);
                if (other !== -1 && other !== i) cells[other] = cells[i]; // swap with the occupant
                cells[i] = forced;
            }
        }
        if (Math.random() < pLure / 3) {
            // rotation interference: all streams take the back-trial's cells, shifted
            const offset = 1 + Math.floor(Math.random() * (k - 1));
            for (let i = 0; i < k; i++) cells[i] = seqs[(i + offset) % k][t - back];
        }
    }
    return cells;
}

function nbackRenderView() {
    const cfg = nbackModeConfig();
    const manual = !!savedata.nbackManual;
    const jaeggi = !!savedata.nbackJaeggi && savedata.nbackMode === 'dual';
    const multi = nbackMultiCount();
    const levelKey = multi > 1 ? 'nbackLevelDual' + multi : cfg.levelKey;
    nbackModeLabel.textContent = (multi > 1 ? multi + '× ' : '') + cfg.hud
        + (jaeggi ? ' Jaeggi' : '') + (manual ? ' Manual' : '')
        + (!jaeggi && savedata.nbackCrab ? ' Crab' : '')
        + (!jaeggi && !savedata.nbackCrab && savedata.nbackVariable ? ' Var' : '')
        + (!jaeggi && savedata.nbackSelfPaced ? ' SP' : '');
    nbackLevelLabel.textContent = 'N = ' + (manual ? savedata.nbackManualN : savedata[levelKey]);
    const mods = nbackActiveModalities(cfg, multi);
    for (const mod in nbackMatchButtons) {
        nbackMatchButtons[mod].hidden = !mods.includes(mod);
    }
    nbackMatchButtons.position.textContent = multi > 1 ? 'Blue (A)' : 'Position (A)';
    nbackAnswerEl.hidden = !mods.includes('arithmetic');
}

function nbackClearFeedback() {
    for (const mod in nbackMatchButtons) {
        nbackMatchButtons[mod].classList.remove('nback__match--right', 'nback__match--wrong', 'nback__match--missed');
    }
    nbackAnswerEl.classList.remove('nback__answer--right', 'nback__answer--wrong');
}

function nbackResetUi() {
    nbackClearFeedback();
    nbackGridCells.forEach((c, i) => {
        c.classList.remove('nback__cell--on');
        c.style.backgroundColor = '';
        c.textContent = i === 4 ? '+' : '';
    });
    nbackTrialLabel.textContent = '';
    nbackStartButton.textContent = 'START';
    nbackAnswerEl.textContent = 'Answer: 0';
    nbackRenderView();
}

function nbackCancel() {
    NB.timeouts.forEach(e => clearTimeout(e.id));
    NB.timeouts = [];
    NB.running = false;
    NB.paused = false;
    speechSynthesis.cancel();
    nbackResetUi();
}

function nbackStartStop() {
    if (NB.running) return nbackCancel();

    // RESET_LEVEL (spec §7/§9): first session after the 04:00 boundary restarts
    // every mode at its default N (arithmetic modes at 1, per NBACK_DEFAULT_DATA)
    if (savedata.nbackResetLevel) {
        const today = nbackDayStart(new Date());
        if (savedata.nbackLastResetDay !== today) {
            for (const key in NBACK_DEFAULT_DATA) {
                if (key.startsWith('nbackLevel') || key.startsWith('nbackFails')) {
                    savedata[key] = NBACK_DEFAULT_DATA[key];
                }
            }
            savedata.nbackLastResetDay = today;
            save();
        }
    }

    const cfg = nbackModeConfig();
    NB.running = true;
    NB.paused = false;
    NB.manual = !!savedata.nbackManual;
    NB.jaeggi = !!savedata.nbackJaeggi && savedata.nbackMode === 'dual'; // BW: Jaeggi is Dual-only
    NB.multi = nbackMultiCount();
    NB.posMods = NBACK_POS_MODS.slice(0, NB.multi);
    NB.levelKey = NB.multi > 1 ? 'nbackLevelDual' + NB.multi : cfg.levelKey;
    NB.failsKey = NB.multi > 1 ? 'nbackFailsDual' + NB.multi : cfg.failsKey;
    NB.mode = savedata.nbackMode;
    NB.n = NB.manual ? savedata.nbackManualN : savedata[NB.levelKey];
    NB.trials = 20 + NB.n * NB.n;
    NB.trial = -1;
    NB.seq = {};
    NB.scored = {};
    NB.pressed = {};
    NB.mods = nbackActiveModalities(cfg, NB.multi);
    NB.combo = NB.mods.includes('visvis');
    NB.arith = NB.mods.includes('arithmetic');
    NB.bonusMs = cfg.bonusMs || 0;
    for (const mod of NB.mods) {
        NB.scored[mod] = [];
        NB.pressed[mod] = false;
    }
    NB.streams = nbackStreams(NB.mods);
    for (const stream of NB.streams) {
        NB.seq[stream] = [];
    }
    if (NB.arith) {
        NB.seq.number = [];
        NB.seq.op = [];
        NB.ops = [savedata.nbackArithAdd && 'add', savedata.nbackArithSub && 'subtract',
            savedata.nbackArithMul && 'multiply', savedata.nbackArithDiv && 'divide'].filter(Boolean);
        if (!NB.ops.length) NB.ops = ['add'];
        NB.answer = { digits: '', negative: false };
    }
    NB.letters = nbackShuffle(NBACK_LETTERS.slice());
    NB.jaeggiSeq = NB.jaeggi ? nbackJaeggiSequence(NB.n, NB.trials) : null;
    NB.crab = !!savedata.nbackCrab && !NB.jaeggi;
    NB.varList = (!!savedata.nbackVariable && !NB.crab && !NB.jaeggi)
        ? Array.from({ length: NB.trials - NB.n }, () => nbackVariableN(NB.n))
        : null;
    NB.selfPaced = !!savedata.nbackSelfPaced && !NB.jaeggi;
    NB.advancing = false;
    NB.pMatch = (savedata.nbackChanceMatch ?? 12.5) / 100;
    NB.pLure = (savedata.nbackChanceInterference ?? 12.5) / 100;

    nbackResult.hidden = true;
    nbackStartButton.blur(); // focused button would swallow A/L in handleKeyPress
    nbackStartButton.textContent = 'STOP';
    nbackRenderView();
    nbSchedule(nbackRunTrial, 1000); // 1s lead-in
}

// Record {match, pressed} for the trial that just ended (BW saves input at the
// next trial's first tick, so presses in the missed-feedback window count).
function nbackFinalizePrev() {
    const t = NB.trial;
    if (t < NB.n) return;
    for (const mod of NB.mods) {
        if (mod === 'arithmetic') {
            // every trial demands an answer: right/wrong only, no TN (BW §6) —
            // match:true makes nbackScore count exactly right/(right+wrong)
            const correct = nbackArithAnswer(NB.seq.number[t - nbEffBack(t)], NB.seq.op[t], NB.seq.number[t]);
            NB.scored[mod].push({ match: true, pressed: nbackParseAnswer() === correct });
            continue;
        }
        NB.scored[mod].push({
            match: nbMatch(mod, t),
            pressed: NB.pressed[mod],
        });
    }
}

function nbackRunTrial() {
    if (NB.trial >= 0) nbackFinalizePrev();
    NB.trial++;
    if (NB.trial === NB.trials) return nbackEndSession();

    const t = NB.trial;
    const trialMs = savedata.nbackTrialTime * 1000 + 500 * (NB.multi - 1) + NB.bonusMs; // BW multi/combo bonus ticks
    const back = t >= NB.n ? nbEffBack(t) : NB.n;
    nbackClearFeedback();
    NB.advancing = false;
    for (const mod in NB.pressed) NB.pressed[mod] = false;
    if (NB.arith) {
        // typed answer resets every trial (BW reset_input); recorded at finalize
        NB.answer = { digits: '', negative: false };
        nbackAnswerEl.textContent = 'Answer: 0';
    }

    if (NB.multi > 1) {
        const cells = nbackGenMulti(NB.posMods.map(m => NB.seq[m]), NB.n, t, back, NB.pMatch, NB.pLure);
        NB.posMods.forEach((m, i) => NB.seq[m].push(cells[i]));
        NB.seq.audio.push(nbackGen(NB.seq.audio, NB.n, t, back, NB.pMatch, NB.pLure));
    } else if (NB.combo) {
        const cur = nbackGenCombo(NB.seq, NB.mods, NB.n, t, back, NB.pMatch, NB.pLure);
        for (const stream in NB.seq) NB.seq[stream].push(cur[stream]);
    } else {
        for (const mod of NB.streams) {
            NB.seq[mod].push(NB.jaeggi ? NB.jaeggiSeq[mod][t]
                : nbackGen(NB.seq[mod], NB.n, t, back, NB.pMatch, NB.pLure));
        }
        if (NB.arith) {
            const { number, op } = nbackGenArith(NB.seq.number, NB.n, t, NB.ops,
                savedata.nbackArithMaxNumber ?? 12, !!savedata.nbackArithNegatives);
            NB.seq.number.push(number);
            NB.seq.op.push(op);
        }
    }
    nbackTrialLabel.textContent = (t + 1) + ' / ' + NB.trials;
    if (NB.varList) {
        nbackLevelLabel.textContent = 'N = ' + (t >= NB.n ? nbEffBack(t) : '—');
    }

    if (NB.multi > 1) {
        const hideMs = 500 + 100 * (NB.multi - 1);
        NB.posMods.forEach((m, i) => {
            const cell = nbackGridCells[NBACK_CELLS[NB.seq[m][t] - 1]];
            cell.classList.add('nback__cell--on');
            cell.style.backgroundColor = NBACK_STREAM_COLORS[i];
            nbSchedule(() => {
                cell.classList.remove('nback__cell--on');
                cell.style.backgroundColor = '';
            }, hideMs);
        });
    } else if ('position' in NB.seq || 'color' in NB.seq || 'vis' in NB.seq || NB.arith) {
        // position-less modes show the stimulus in the center cell (BW position 0)
        const isCenter = !('position' in NB.seq);
        const cell = nbackGridCells[isCenter ? 4 : NBACK_CELLS[NB.seq.position[t] - 1]];
        cell.classList.add('nback__cell--on');
        if ('color' in NB.seq) cell.style.backgroundColor = NBACK_COLORS[NB.seq.color[t] - 1];
        if ('vis' in NB.seq) cell.textContent = NB.letters[NB.seq.vis[t] - 1].toUpperCase();
        if (NB.arith) cell.textContent = NB.seq.number[t];
        nbSchedule(() => {
            cell.classList.remove('nback__cell--on');
            cell.style.backgroundColor = '';
            if ('vis' in NB.seq || NB.arith) cell.textContent = isCenter ? '+' : '';
        }, 500);
    }
    if (NB.arith) {
        // the operation is spoken, and only once answers are expected (BW §4)
        if (t >= NB.n) nbackSpeak(NB.seq.op[t]);
    } else if ('audio' in NB.seq) {
        nbackSpeak(NB.letters[NB.seq.audio[t] - 1]);
    }

    if (!NB.selfPaced) {
        nbSchedule(nbackMissedCheck, trialMs - 200);
        nbSchedule(nbackRunTrial, trialMs);
    }
}

function nbackMissedCheck() {
    if (!savedata.nbackFeedback || NB.jaeggi) return; // Jaeggi protocol hides trial feedback
    const t = NB.trial;
    if (t < NB.n) return;
    for (const mod of NB.mods) {
        if (mod === 'arithmetic') {
            // no button — tint the answer line right/wrong (BW's answer label)
            const correct = nbackArithAnswer(NB.seq.number[t - nbEffBack(t)], NB.seq.op[t], NB.seq.number[t]);
            nbackAnswerEl.classList.add(nbackParseAnswer() === correct ? 'nback__answer--right' : 'nback__answer--wrong');
            continue;
        }
        if (!NB.pressed[mod] && nbMatch(mod, t)) {
            nbackMatchButtons[mod].classList.add('nback__match--missed');
        }
    }
}

function nbackPress(mod) {
    const t = NB.trial;
    if (!NB.running || NB.paused || t < 0 || !(mod in NB.pressed) || NB.pressed[mod]) return;
    nbackMatchButtons[mod].blur();
    NB.pressed[mod] = true;
    if (savedata.nbackFeedback && !NB.jaeggi && t >= NB.n) {
        nbackMatchButtons[mod].classList.add(nbMatch(mod, t) ? 'nback__match--right' : 'nback__match--wrong');
    }
}

function nbackHandleKey(event) {
    if (NB.running && NB.arith && !NB.paused && NB.trial >= 0) {
        const code = event.code;
        if (/^(Digit|Numpad)[0-9]$/.test(code)) return nbackArithInput(code.slice(-1));
        if (code === 'Minus' || code === 'NumpadSubtract') return nbackArithInput('-');
        if (code === 'Period' || code === 'NumpadDecimal' || code === 'Comma') return nbackArithInput('.');
    }
    switch (event.code) {
        case 'KeyA': nbackPress('position'); break;
        case 'KeyS': nbackPress('position2'); nbackPress('visvis'); break; // each is a no-op when inactive
        case 'KeyD': nbackPress('position3'); nbackPress('visaudio'); break;
        case 'KeyF': nbackPress('color'); nbackPress('position4'); break;
        case 'KeyJ': nbackPress('audiovis'); break;
        case 'KeyL': nbackPress('audio'); break;
        case 'KeyP': nbackTogglePause(); break;
        case 'Enter':
            if (NB.running && NB.selfPaced && !NB.paused && NB.trial >= 0 && !NB.advancing) {
                NB.advancing = true;
                nbackMissedCheck();
                nbSchedule(nbackRunTrial, 200);
            }
            break;
        case 'Escape': if (NB.running) nbackCancel(); break;
    }
}

function nbackEndSession() {
    const cfg = { bw: NBACK_MODES[NB.mode].bw, levelKey: NB.levelKey, failsKey: NB.failsKey };
    const { score, percents } = NB.jaeggi ? nbackScoreJaeggi(NB.scored) : nbackScore(NB.scored);
    NB.running = false;
    NB.paused = false;
    NB.timeouts = [];
    speechSynthesis.cancel();

    let message;
    if (NB.manual) {
        // manual sessions never touch the level
        message = 'Manual session — level unchanged.';
        playSound(score >= 80 ? 'success' : 'missed');
    } else if (NB.jaeggi) {
        // Jaeggi thresholds: ≥90 advance, <75 drop immediately (no 3-strikes)
        if (score >= 90) {
            savedata[cfg.levelKey] = NB.n + 1;
            savedata[cfg.failsKey] = 0;
            message = 'Advance to N = ' + (NB.n + 1) + '!';
            playSound('success');
        } else if (score < 75 && NB.n > 1) {
            savedata[cfg.levelKey] = NB.n - 1;
            savedata[cfg.failsKey] = 0;
            message = 'Fall back to N = ' + (NB.n - 1) + '.';
            playSound('failure');
        } else {
            message = 'Stay at N = ' + NB.n + '.';
            playSound('missed');
        }
    } else if (score >= (savedata.nbackThresholdAdvance ?? 80)) {
        // default progression, thresholds configurable (BW: advance 101 = never, fallback 0 = never)
        savedata[cfg.levelKey] = NB.n + 1;
        savedata[cfg.failsKey] = 0;
        message = 'Advance to N = ' + (NB.n + 1) + '!';
        playSound('success');
    } else if (score < (savedata.nbackThresholdFallback ?? 50) && NB.n > 1
            && ++savedata[cfg.failsKey] >= (savedata.nbackFallbackSessions ?? 3)) {
        savedata[cfg.levelKey] = NB.n - 1;
        savedata[cfg.failsKey] = 0;
        message = 'Fall back to N = ' + (NB.n - 1) + '.';
        playSound('failure');
    } else {
        message = 'Stay at N = ' + NB.n + '.';
        playSound('missed');
    }
    save();

    storeNBackSession({
        timestamp: Date.now(),
        // BW mode bitmask: +128 crab, +256/512/768 multi, +1024 self-paced
        mode: cfg.bw | (NB.crab ? 128 : 0) | (256 * (NB.multi - 1)) | (NB.selfPaced ? 1024 : 0),
        modeName: NB.mode,
        n: NB.n,
        score,
        percents,
        trials: NB.trials,
        // real BW ticks incl. combo/arithmetic/multi bonus, so the time chart is honest
        ticks: Math.round((savedata.nbackTrialTime * 1000 + NB.bonusMs + 500 * (NB.multi - 1)) / 100) + 2,
        manual: NB.manual ? 1 : 0,
        jaeggi: NB.jaeggi ? 1 : 0,
        crab: NB.crab ? 1 : 0,
        variable: NB.varList ? 1 : 0,
        multi: NB.multi,
    });

    const parts = ['Score: ' + score + '%'];
    for (const mod in percents) parts.push(mod + ': ' + percents[mod] + '%');
    nbackResult.innerHTML = parts.join(' &middot; ') + '<br>' + message;
    nbackResult.hidden = false;
    nbackResetUi();
}
