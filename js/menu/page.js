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

async function renderMenuStats() {
    // RRT: questions from appState
    const questions = appState.questions || [];
    const right = questions.filter(q => q.correctness === 'right').length;
    const accuracy = questions.length ? Math.round(100 * right / questions.length) : 0;
    const rrtStats = document.getElementById('menu-rrt-stats');
    rrtStats.innerHTML = questions.length
        ? `Answered ${questions.length} &middot; Accuracy ${accuracy}% &middot; Score ${appState.score}`
        : 'No questions answered yet';
    rrtStats.classList.toggle('panel-empty', !questions.length); // empty state reads muted, not louder than data
    document.getElementById('menu-rrt-recent').textContent = questions.length
        ? 'Recent: ' + questions.slice(-8).map(q => q.correctness === 'right' ? '✓' : '✗').join(' ')
        : '';

    // ----- N-Back (merged): localStorage quad-box-settings + IndexedDB QuadBoxNBack -----
    let qb = {};
    try { qb = JSON.parse(localStorage.getItem('quad-box-settings')) || {}; } catch (e) {}
    const qbMode = qb.mode || 'quad';
    const qbLevel = qb.gameSettings?.[qbMode]?.nBack ?? 2;
    let qbGames = [];
    try { qbGames = (await getAllQuadBoxGames()).filter(g => g.status === 'completed'); } catch (e) {}
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
        + (qbGames.length ? ` &middot; ${qbGames.length} games &middot; avg ${qbAvg}%` : ' &middot; no games yet');
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
    let cctSessions = [];
    try { cctSessions = (await getAllCctSessions()).filter(s => s.status === 'Completed'); } catch (e) {}
    cctSessions.sort((a, b) => a.timestamp - b.timestamp);
    const cctLast10 = cctSessions.slice(-10);
    const cctAvg = Math.round(cctLast10.reduce((s, r) => s + r.accuracy, 0) / (cctLast10.length || 1));
    document.getElementById('menu-cct-stats').innerHTML =
        `${CCT_MODE_LABEL[cctMode] || cctMode}`
        + (cctSessions.length ? ` &middot; ${cctSessions.length} sessions &middot; avg ${cctAvg}%` : ' &middot; no sessions yet');
    document.getElementById('menu-cct-recent').textContent = cctSessions.length
        ? 'Recent: ' + cctSessions.slice(-5).map(s => Math.round(s.accuracy) + '%').join('  ')
        : '';
}

const onHistoryImported = renderMenuStats; // refresh stat cards after a history import

appStateStartup();
document.body.classList.toggle('light-mode', appState.darkMode === false);
applySavedBackground();
populateAppearanceSettings();
renderMenuStats();
