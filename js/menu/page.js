// Main menu: per-game stats overview. Each game manages its own player profiles;
// the menu just reads both stores from localStorage and shows who's active.

const NBACK_SHORT = { dual: 'D', position: 'Po', sound: 'Au', 'position-color': 'PC', 'color-sound': 'CA', triple: 'PCA',
    'dual-combo': 'DC', 'tri-combo': 'TC', 'quad-combo': 'QC', 'tri-combo-color': 'TCC',
    arithmetic: 'A', 'dual-arithmetic': 'DA', 'triple-arithmetic': 'TA' };

// mirrors NBACK_MODES labels/levelKeys in js/nback/game.js
const NBACK_MODE_INFO = {
    dual: ['Dual', 'nbackLevelDual'],
    position: ['Position', 'nbackLevelPosition'],
    sound: ['Sound', 'nbackLevelSound'],
    'position-color': ['Position + Color', 'nbackLevelPC'],
    'color-sound': ['Color + Sound', 'nbackLevelCA'],
    triple: ['Triple', 'nbackLevelPCA'],
    'dual-combo': ['Dual Combination', 'nbackLevelDC'],
    'tri-combo': ['Tri Combination', 'nbackLevelTC'],
    'quad-combo': ['Quad Combination', 'nbackLevelQC'],
    'tri-combo-color': ['Tri Combination (Color)', 'nbackLevelTCC'],
    arithmetic: ['Arithmetic', 'nbackLevelA'],
    'dual-arithmetic': ['Dual Arithmetic', 'nbackLevelDA'],
    'triple-arithmetic': ['Triple Arithmetic', 'nbackLevelTA'],
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

    // N-Back: levels from its own profile store, sessions from NBackHistory
    const nbackProfiles = getLocalStorageObj('sllgms-v3-nback-profiles') || [];
    const nbackSelected = getLocalStorageObj('sllgms-v3-nback-selected-profile') || 0;
    const nb = (nbackProfiles[nbackSelected] || {}).data
        || { nbackLevelDual: 2, nbackLevelPosition: 2, nbackLevelSound: 2 };
    let sessions = [];
    try { sessions = await getAllNBackSessions(); } catch (e) {}
    sessions.sort((a, b) => a.timestamp - b.timestamp);
    // active mode + its level, HUD-style; multi-square dual has its own level key (like game.js)
    const [modeLabel, levelKey] = NBACK_MODE_INFO[nb.nbackMode] || NBACK_MODE_INFO.dual;
    const multi = (NBACK_MODE_INFO[nb.nbackMode] ? nb.nbackMode : 'dual') === 'dual' && !nb.nbackJaeggi
        ? Math.min(4, Math.max(1, +nb.nbackMultiStim || 1)) : 1;
    const level = nb[multi > 1 ? 'nbackLevelDual' + multi : levelKey] ?? 2;
    const last10 = sessions.slice(-10);
    const avg = Math.round(last10.reduce((s, r) => s + r.score, 0) / (last10.length || 1));
    document.getElementById('menu-nback-stats').innerHTML =
        `${multi > 1 ? multi + '× ' : ''}${modeLabel} &middot; N = ${level}`
        + (sessions.length ? ` &middot; ${sessions.length} sessions &middot; avg ${avg}%` : ' &middot; no sessions yet');
    // the stats line above already says "no sessions yet" — don't repeat it here
    document.getElementById('menu-nback-recent').textContent = sessions.length
        ? 'Recent: ' + sessions.slice(-5).map(s => (s.multi > 1 ? s.multi + 'x' : '') + (NBACK_SHORT[s.modeName] || '?') + s.n + 'B ' + s.score + '%').join('  ')
        : '';

    // ----- Quad Box (localStorage quad-box-settings + IndexedDB QuadBoxNBack) -----
    const QB_MODE_LABEL = { quad: 'Quad', dual: 'Dual', custom: 'Custom A', customB: 'Custom B', tally: 'Tally', vtally: 'Visual Tally' };
    const QB_SHORT = { quad: 'Q', dual: 'D', tri: 'T', custom: 'C', tally: 'TLY', vtally: 'VT' };
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
    document.getElementById('menu-quadbox-stats').innerHTML =
        `${QB_MODE_LABEL[qbMode] || qbMode} &middot; N = ${qbLevel}`
        + (qbGames.length ? ` &middot; ${qbGames.length} games &middot; avg ${qbAvg}%` : ' &middot; no games yet');
    document.getElementById('menu-quadbox-recent').textContent = qbGames.length
        ? 'Recent: ' + qbGames.slice(-5).map(g => {
            const key = g.title?.startsWith('tally') ? 'tally' : (g.title?.startsWith('vtally') ? 'vtally' : g.title);
            return (QB_SHORT[key] || '?') + g.nBack + 'B ' + qbPct(g) + '%';
        }).join('  ')
        : '';
}

const onHistoryImported = renderMenuStats; // refresh stat cards after a history import

appStateStartup();
document.body.classList.toggle('light-mode', appState.darkMode === false);
applySavedBackground();
populateAppearanceSettings();
renderMenuStats();
