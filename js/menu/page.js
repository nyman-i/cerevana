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

function menuPlayerName(profilesKey, selectedKey) {
    const profiles = getLocalStorageObj(profilesKey) || [];
    const selected = getLocalStorageObj(selectedKey) || 0;
    return (profiles[selected] || {}).name || 'Default';
}

async function renderMenuStats() {
    // RRT: player from its ProfileStore storage, questions from appState
    document.getElementById('menu-rrt-player').textContent =
        'Profile: ' + menuPlayerName('sllgms-v3-profiles', 'sllgms-v3-selected-profile');
    const questions = appState.questions || [];
    const right = questions.filter(q => q.correctness === 'right').length;
    const accuracy = questions.length ? Math.round(100 * right / questions.length) : 0;
    document.getElementById('menu-rrt-stats').innerHTML = questions.length
        ? `Answered ${questions.length} &middot; Accuracy ${accuracy}% &middot; Score ${appState.score}`
        : 'No questions answered yet';
    document.getElementById('menu-rrt-recent').textContent = questions.length
        ? 'Recent: ' + questions.slice(-8).map(q => q.correctness === 'right' ? '✓' : '✗').join(' ')
        : '';

    // N-Back: player + levels from its own profile store, sessions from NBackHistory
    document.getElementById('menu-nback-player').textContent =
        'Profile: ' + menuPlayerName('sllgms-v3-nback-profiles', 'sllgms-v3-nback-selected-profile');
    const nbackProfiles = getLocalStorageObj('sllgms-v3-nback-profiles') || [];
    const nbackSelected = getLocalStorageObj('sllgms-v3-nback-selected-profile') || 0;
    const nb = (nbackProfiles[nbackSelected] || {}).data
        || { nbackLevelDual: 2, nbackLevelPosition: 2, nbackLevelSound: 2 };
    let sessions = [];
    try { sessions = await getAllNBackSessions(); } catch (e) {}
    sessions.sort((a, b) => a.timestamp - b.timestamp);
    // active mode + its level, HUD-style; multi-square dual has its own level key (like game.js)
    const [modeLabel, levelKey] = NBACK_MODE_INFO[nb.nbackMode] || NBACK_MODE_INFO.dual;
    const multi = (NBACK_MODE_INFO[nb.nbackMode] ? nb.nbackMode : 'dual') === 'dual'
        ? Math.min(4, Math.max(1, +nb.nbackMultiStim || 1)) : 1;
    const level = nb[multi > 1 ? 'nbackLevelDual' + multi : levelKey] ?? 2;
    const last10 = sessions.slice(-10);
    const avg = Math.round(last10.reduce((s, r) => s + r.score, 0) / (last10.length || 1));
    document.getElementById('menu-nback-stats').innerHTML =
        `${multi > 1 ? multi + '× ' : ''}${modeLabel} &middot; N = ${level}`
        + (sessions.length ? ` &middot; ${sessions.length} sessions &middot; avg ${avg}%` : ' &middot; no sessions yet');
    document.getElementById('menu-nback-recent').textContent = sessions.length
        ? 'Recent: ' + sessions.slice(-5).map(s => (s.multi > 1 ? s.multi + 'x' : '') + (NBACK_SHORT[s.modeName] || '?') + s.n + 'B ' + s.score + '%').join('  ')
        : 'No sessions played yet';
}

const onHistoryImported = renderMenuStats; // refresh stat cards after a history import

appStateStartup();
document.body.classList.toggle('light-mode', appState.darkMode === false);
applySavedBackground();
renderMenuStats();
