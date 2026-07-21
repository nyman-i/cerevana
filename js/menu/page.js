// Main menu: per-game stats overview. Each game manages its own player profiles;
// the menu just reads both stores from localStorage and shows who's active.

// N-Back (merged): mode label by settings key, short chip label by stored
// game title (js/quadbox/classic.js is the source of the title strings)
const NBACK_MODE_LABEL = {
    quad: 'Quad', dual: 'Dual', custom: 'Custom A', customB: 'Custom B',
    tally: 'Tally', vtally: 'Visual Tally',
    position: 'Position', sound: 'Sound', positionColor: 'Position + Color',
    colorSound: 'Color + Sound', triple: 'Triple', jaeggi: 'Jaeggi',
    multiSquare: 'Multi-Square', dualCombo: 'Dual Combination',
    triCombo: 'Tri Combination', quadCombo: 'Quad Combination',
    triComboColor: 'Tri Combination (Color)', arithmetic: 'Arithmetic',
    dualArithmetic: 'Dual Arithmetic', tripleArithmetic: 'Triple Arithmetic',
};
const NBACK_TITLE_SHORT = {
    quad: 'Q', dual: 'D', tri: 'T', custom: 'C', tally: 'TLY', vtally: 'VT',
    position: 'Po', sound: 'Au', 'position-color': 'PC', 'color-sound': 'CA',
    triple: 'PCA', jaeggi: 'JGI', multi: 'M', 'dual-combo': 'DC',
    'tri-combo': 'TC', 'quad-combo': 'QC', 'tri-combo-color': 'TCC',
    arithmetic: 'A', 'dual-arithmetic': 'DA', 'triple-arithmetic': 'TA',
};
const CCT_MODE_LABEL = {
    addition: 'Addition', subtraction: 'Subtraction',
    multiplication: 'Multiplication', difference: 'Difference',
};

// active RRT profile's settings blob (shared by the stats card and readGoals)
function rrtSavedata() {
    try {
        const profiles = JSON.parse(localStorage.getItem('sllgms-v3-profiles')) || [];
        const sel = +localStorage.getItem('sllgms-v3-selected-profile') || 0;
        return profiles[sel]?.savedata || {};
    } catch (e) { return {}; }
}

// every card reads "settings context · stats" - the no-data tail is muted so
// an empty state never shouts louder than real numbers
const emptyTail = (msg) => ` &middot; <span class="panel-empty">${msg}</span>`;

async function renderMenuStats() {
    // RRT: questions from appState
    const questions = appState.questions || [];
    const right = questions.filter(q => q.correctness === 'right').length;
    const accuracy = questions.length ? Math.round(100 * right / questions.length) : 0;
    const rrtStats = document.getElementById('menu-rrt-stats');
    rrtStats.innerHTML = `Premises ${rrtSavedata().premises ?? 2}`
        + (questions.length
            ? ` &middot; Answered ${questions.length} &middot; Accuracy ${accuracy}% &middot; Score ${appState.score}`
            : emptyTail('No questions answered yet'));
    document.getElementById('menu-rrt-recent').textContent = questions.length
        ? 'Recent: ' + questions.slice(-8).map(q => q.correctness === 'right' ? '✓' : '✗').join(' ')
        : '';

    // ----- N-Back (merged): localStorage quad-box-settings + IndexedDB QuadBoxNBack -----
    let qb = {};
    try { qb = JSON.parse(localStorage.getItem('quad-box-settings')) || {}; } catch (e) {}
    const qbMode = qb.mode || 'quad';
    const qbLevel = qb.gameSettings?.[qbMode]?.nBack ?? 2;
    let qbAll = [];
    try { qbAll = (await getAllQuadBoxGames()).filter(g => g.status !== 'tombstone'); } catch (e) {}
    const qbGames = qbAll.filter(g => g.status === 'completed');
    qbGames.sort((a, b) => a.timestamp - b.timestamp);
    const qbPct = (g) => {
        if (g.scores?.tally) return g.scores.tally.possible > 0 ? Math.round(100 * g.scores.tally.hits / g.scores.tally.possible) : 0;
        let hits = 0, possible = 0;
        for (const s of Object.values(g.scores || {})) { hits += s.hits || 0; possible += (s.hits || 0) + (s.misses || 0); }
        return possible > 0 ? Math.round(100 * hits / possible) : 0;
    };
    const qbLast10 = qbGames.slice(-10);
    const qbAvg = Math.round(qbLast10.reduce((s, g) => s + qbPct(g), 0) / (qbLast10.length || 1));
    document.getElementById('menu-nback-stats').innerHTML =
        `${NBACK_MODE_LABEL[qbMode] || qbMode} &middot; N = ${qbLevel}`
        + (qbGames.length ? ` &middot; ${qbGames.length} games &middot; avg ${qbAvg}%` : emptyTail('No games yet'));
    document.getElementById('menu-nback-recent').textContent = qbGames.length
        ? 'Recent: ' + qbGames.slice(-5).map(g => {
            const key = g.title?.startsWith('tally') ? 'tally' : (g.title?.startsWith('vtally') ? 'vtally' : g.title);
            return (NBACK_TITLE_SHORT[key] || '?') + g.nBack + 'B ' + qbPct(g) + '%';
        }).join('  ')
        : '';

    // ----- CCT: localStorage cct-settings + IndexedDB CCTHistory -----
    let cctSettings = {};
    try { cctSettings = JSON.parse(localStorage.getItem('cct-settings')) || {}; } catch (e) {}
    const cctMode = cctSettings.arithmeticMode || 'addition';
    let cctAll = [];
    try { cctAll = await getAllCctSessions(); } catch (e) {}
    const cctSessions = cctAll.filter(s => s.status === 'Completed');
    cctSessions.sort((a, b) => a.timestamp - b.timestamp);
    const cctLast10 = cctSessions.slice(-10);
    const cctAvg = Math.round(cctLast10.reduce((s, r) => s + r.accuracy, 0) / (cctLast10.length || 1));
    document.getElementById('menu-cct-stats').innerHTML =
        `${CCT_MODE_LABEL[cctMode] || cctMode}`
        + (cctSessions.length ? ` &middot; ${cctSessions.length} sessions &middot; avg ${cctAvg}%` : emptyTail('No sessions yet'));
    document.getElementById('menu-cct-recent').textContent = cctSessions.length
        ? 'Recent: ' + cctSessions.slice(-5).map(s => Math.round(s.accuracy) + '%').join('  ')
        : '';

    await renderGoalTracker(qbAll, cctAll);
}

// ----- combined goal tracker: sums the goals of whichever games set one -----
// Goals are read raw from each game's store (this page can't import the ES
// modules); minutes come from the same records the cards already fetched.
function readGoals() {
    const fromStore = (key) => {
        try {
            const s = JSON.parse(localStorage.getItem(key)) || {};
            return { daily: s.dailyProgressGoal ?? null, weekly: s.weeklyProgressGoal ?? null };
        } catch (e) { return { daily: null, weekly: null }; }
    };
    const sd = rrtSavedata();
    // dGoal/wGoal: URL-imported profiles keep compressed keys until re-saved
    const rrt = { daily: sd.dailyProgressGoal ?? sd.dGoal ?? null, weekly: sd.weeklyProgressGoal ?? sd.wGoal ?? null };
    return { rrt, qb: fromStore('quad-box-settings'), cct: fromStore('cct-settings') };
}

async function renderGoalTracker(qbAll, cctAll) {
    const goals = readGoals();

    const earliest = Math.min(goalDayStart(), goalWeekStart());
    let rrtRecords = [];
    try { rrtRecords = await getRRTProgressFrom(earliest); } catch (e) {}
    // per-game minutes since a timestamp - units mirror each game's own math:
    // RRT timeElapsed ms, N-Back elapsed seconds (gamedb addScoreMetadata), CCT durationMs
    const qbElapsedSec = g => 'start' in g ? (g.timestamp - g.start) / 1000 : (g.trialTime * g.completedTrials / 1000 || 0);
    const mins = {
        rrt: start => rrtRecords.filter(q => q.timestamp >= start).reduce((s, q) => s + (q.timeElapsed || 0), 0) / 60000,
        qb: start => qbAll.filter(g => g.timestamp >= start).reduce((s, g) => s + qbElapsedSec(g), 0) / 60,
        cct: start => cctAll.filter(r => r.timestamp >= start).reduce((s, r) => s + (r.durationMs || 0), 0) / 60000,
    };

    const sumPeriod = (period, start) => {
        let goal = 0, minutes = 0;
        for (const game of ['rrt', 'qb', 'cct']) {
            if (!goals[game][period]) continue;
            goal += goals[game][period];
            minutes += mins[game](start);
        }
        return { goal, minutes };
    };
    const daily = sumPeriod('daily', goalDayStart());
    const weekly = sumPeriod('weekly', goalWeekStart());

    const fillRow = (id, minutes, goal) => {
        const row = document.getElementById(id);
        if (!goal) { row.hidden = true; return false; }
        row.hidden = false;
        const pct = Math.max(0, Math.min(100 * minutes / goal, 100));
        const fill = row.querySelector('.menu-goal__fill');
        fill.style.width = pct + '%';
        fill.classList.toggle('complete', pct >= 100);
        fill.classList.toggle('halfway', pct >= 50 && pct < 100);
        row.querySelector('.menu-goal__value').textContent = `${Math.floor(minutes)} / ${goal} min`;
        return true;
    };
    const anyRow = [
        fillRow('menu-goal-daily', daily.minutes, daily.goal),
        fillRow('menu-goal-weekly', weekly.minutes, weekly.goal),
    ].some(Boolean);
    document.getElementById('menu-goals').hidden = !anyRow;
}

const onHistoryImported = renderMenuStats; // refresh stat cards after a history import

appStateStartup();
document.body.classList.toggle('light-mode', appState.darkMode === false);
applySavedBackground();
populateAppearanceSettings();
renderMenuStats();
