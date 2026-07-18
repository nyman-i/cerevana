// App-wide data export/import: RRT questions + progress rows + legacy
// n-back sessions + N-Back games + CCT sessions + test-battery scores, plus
// (overwrite-mode only) every profile, live settings store and appearance
// pref; the quadbox*/cct* names reflect the storage identifiers, which never
// change. Pages define onHistoryImported() to refresh their UI after an import.

let importMode;

// Quad Box's IndexedDB (upstream-defined identifiers - NEVER rename).
// The upgrade handler must mirror js/quadbox/engine/gamedb.js exactly:
// opening the db here must never leave it without the store/indexes.
function openQuadBoxDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("QuadBoxNBack", 1);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains("games")) {
                const store = db.createObjectStore("games", { keyPath: "id", autoIncrement: true });
                store.createIndex("status", "status");
                store.createIndex("timestamp", "timestamp");
                store.createIndex("status_timestamp", ["status", "timestamp"]);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function getAllQuadBoxGames() {
    return openQuadBoxDB().then(db => new Promise((resolve, reject) => {
        const rq = db.transaction("games").objectStore("games").getAll();
        rq.onsuccess = () => { db.close(); resolve(rq.result); };
        rq.onerror = () => { db.close(); reject(rq.error); };
    }));
}

function importQuadBoxGames(rows, clearFirst) {
    return openQuadBoxDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction("games", "readwrite");
        const store = tx.objectStore("games");
        if (clearFirst) store.clear();
        for (const row of rows) {
            const { id, ...game } = row; // ids are per-device (autoIncrement)
            store.add(game);
        }
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
    }));
}

// CCT's IndexedDB (own database, own identifiers - NEVER rename).
// The upgrade handler must mirror js/cct/engine/gamedb.js exactly:
// opening the db here must never leave it without the store/index.
function openCctDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("CCTHistory", 1);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains("sessions")) {
                const store = db.createObjectStore("sessions", { keyPath: "id", autoIncrement: true });
                store.createIndex("timestampIndex", "timestamp");
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function getAllCctSessions() {
    return openCctDB().then(db => new Promise((resolve, reject) => {
        const rq = db.transaction("sessions").objectStore("sessions").getAll();
        rq.onsuccess = () => { db.close(); resolve(rq.result); };
        rq.onerror = () => { db.close(); reject(rq.error); };
    }));
}

function importCctRows(rows, clearFirst) {
    return openCctDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction("sessions", "readwrite");
        const store = tx.objectStore("sessions");
        if (clearFirst) store.clear();
        for (const row of rows) {
            const { id, ...session } = row; // ids are per-device (autoIncrement)
            store.add(session);
        }
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
    }));
}

// Test Tracker's IndexedDB (own database, own identifiers — NEVER rename).
// The upgrade handler must mirror js/testtracker/engine/gamedb.js exactly:
// opening the db here must never leave it without the store/index.
function openTestTrackerDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("TestTrackerHistory", 1);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains("scores")) {
                const store = db.createObjectStore("scores", { keyPath: "id", autoIncrement: true });
                store.createIndex("timestampIndex", "timestamp");
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function getAllTestScores() {
    return openTestTrackerDB().then(db => new Promise((resolve, reject) => {
        const rq = db.transaction("scores").objectStore("scores").getAll();
        rq.onsuccess = () => { db.close(); resolve(rq.result); };
        rq.onerror = () => { db.close(); reject(rq.error); };
    }));
}

function importTestScoreRows(rows, clearFirst) {
    return openTestTrackerDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction("scores", "readwrite");
        const store = tx.objectStore("scores");
        if (clearFirst) store.clear();
        for (const row of rows) {
            const { id, ...score } = row; // ids are per-device (autoIncrement)
            store.add(score);
        }
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
    }));
}

function resetEverything() {
    const confirmed = confirm("Reset the ENTIRE app? This permanently deletes ALL data for every exercise: RRT, N-Back and CCT profiles, settings, scores, game history, progress graphs, logged test-battery scores, and the background image. Tip: Export Data first - the button is right next to this one.")
        && confirm("Last chance: this cannot be undone. Really erase all RRT, N-Back and CCT data?");
    if (!confirmed) return;
    // prefix sweep covers oldSettingsKey ("sllgms-v3") and every sllgms-v3-* key, present and future
    Object.keys(localStorage)
        .filter(key => key.startsWith('sllgms-v3'))
        .forEach(key => localStorage.removeItem(key));
    localStorage.removeItem('quad-box-settings');
    localStorage.removeItem('cct-settings');
    Promise.all([deleteDatabase("SyllDB"), deleteDatabase("QuadBoxNBack"), deleteDatabase("CCTHistory"), deleteDatabase("TestTrackerHistory")])
        .then(() => window.location.reload());
}

function exportHistory() {
    Promise.all([getAllRRTProgress(), getAllQuadBoxGames(), getAllCctSessions(), getAllTestScores()]).then(([rrtHistory, quadboxGames, cctHistory, testScores]) => {
        const data = { exportVersion: 7, exportedAt: Date.now(),
                       score: appState.score, questions: appState.questions, rrtHistory, quadboxGames, cctHistory, testScores,
                       appState: structuredClone(appState),
                       rrtProfiles: getLocalStorageObj(profilesKey), rrtSelectedProfile: getLocalStorageObj(selectedProfileKey),
                       nbackProfiles: getLocalStorageObj('sllgms-v3-nback-profiles'), nbackSelectedProfile: getLocalStorageObj('sllgms-v3-nback-selected-profile'),
                       cctProfiles: getLocalStorageObj('sllgms-v3-cct-profiles'), cctSelectedProfile: getLocalStorageObj('sllgms-v3-cct-selected-profile'),
                       nbackSettings: getLocalStorageObj('quad-box-settings'), cctSettings: getLocalStorageObj('cct-settings') };
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
        a.download = `cerevana-history-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
    });
}

function pickImportFile(mode) {
    importMode = mode;
    const input = document.getElementById('history-import');
    input.value = ''; // re-selecting the same file re-fires change
    input.click();
}

async function handleHistoryImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    let data;
    try { data = JSON.parse(await file.text()); } catch { alert('Not a valid JSON file.'); return; }

    const quadboxImport = Array.isArray(data?.quadboxGames) ? data.quadboxGames : [];
    const cctImport = Array.isArray(data?.cctHistory) ? data.cctHistory : [];
    const testScoresImport = Array.isArray(data?.testScores) ? data.testScores : [];
    // v1-v5 import support removed 2026-07; v6 still imports (its legacy
    // nbackHistory field is ignored)
    const valid = data && [6, 7].includes(data.exportVersion)
        && Array.isArray(data.questions) && data.questions.every(q => typeof q?.answeredAt === 'number')
        && Array.isArray(data.rrtHistory) && data.rrtHistory.every(r => typeof r?.timestamp === 'number')
        && quadboxImport.every(r => typeof r?.timestamp === 'number')
        && cctImport.every(r => typeof r?.timestamp === 'number')
        && testScoresImport.every(r => typeof r?.timestamp === 'number');
    if (!valid) { alert('Not a Cerevana history export.'); return; }

    const overwrite = importMode === 'overwrite';
    if (overwrite && !confirm('Replace ALL local history with the file contents? This cannot be undone.')) return;

    const base = overwrite ? [] : appState.questions;
    const seen = new Set(base.map(q => q.answeredAt));
    const questions = base.concat(data.questions.filter(q => !seen.has(q.answeredAt)));
    questions.sort((a, b) => a.answeredAt - b.answeredAt);

    const existing = overwrite ? [] : await getAllRRTProgress();
    const seenRRT = new Set(existing.map(r => `${r.key}|${r.timestamp}`));
    const rows = data.rrtHistory.filter(r => !seenRRT.has(`${r.key}|${r.timestamp}`));

    // tombstones share the source game's timestamp, so dedup on timestamp+status
    const existingQuadBox = overwrite ? [] : await getAllQuadBoxGames();
    const seenQuadBox = new Set(existingQuadBox.map(r => `${r.timestamp}|${r.status}`));
    const quadboxRows = quadboxImport.filter(r => !seenQuadBox.has(`${r.timestamp}|${r.status}`));

    const existingCct = overwrite ? [] : await getAllCctSessions();
    const seenCct = new Set(existingCct.map(r => r.timestamp));
    const cctRows = cctImport.filter(r => !seenCct.has(r.timestamp));

    const existingTestScores = overwrite ? [] : await getAllTestScores();
    const seenTestScores = new Set(existingTestScores.map(r => r.timestamp));
    const testScoreRows = testScoresImport.filter(r => !seenTestScores.has(r.timestamp));

    try {
        await importRRTRows(rows, overwrite); // atomic IDB write first; localStorage only after it commits
        await importQuadBoxGames(quadboxRows, overwrite && Array.isArray(data.quadboxGames));
        await importCctRows(cctRows, overwrite && Array.isArray(data.cctHistory));
        await importTestScoreRows(testScoreRows, overwrite && Array.isArray(data.testScores));
    } catch (e) {
        alert('Import failed: ' + e);
        return;
    }
    // profiles/settings/appearance aren't mergeable (no meaningful way to combine two
    // profile lists or two appearance prefs), so overwrite-mode is the only mode that
    // touches them — merge-mode stays purely additive, per its tooltip's promise
    if (overwrite) {
        if (Array.isArray(data.rrtProfiles)) setLocalStorageObj(profilesKey, data.rrtProfiles);
        if (Number.isInteger(data.rrtSelectedProfile)) setLocalStorageObj(selectedProfileKey, data.rrtSelectedProfile);
        if (Array.isArray(data.nbackProfiles)) setLocalStorageObj('sllgms-v3-nback-profiles', data.nbackProfiles);
        if (Number.isInteger(data.nbackSelectedProfile)) setLocalStorageObj('sllgms-v3-nback-selected-profile', data.nbackSelectedProfile);
        if (Array.isArray(data.cctProfiles)) setLocalStorageObj('sllgms-v3-cct-profiles', data.cctProfiles);
        if (Number.isInteger(data.cctSelectedProfile)) setLocalStorageObj('sllgms-v3-cct-selected-profile', data.cctSelectedProfile);
        if (data.nbackSettings && typeof data.nbackSettings === 'object') setLocalStorageObj('quad-box-settings', data.nbackSettings);
        if (data.cctSettings && typeof data.cctSettings === 'object') setLocalStorageObj('cct-settings', data.cctSettings);
        if (data.appState && typeof data.appState === 'object') Object.assign(appState, data.appState);
    }
    appState.questions = questions;
    appState.score = questions.reduce((s, q) => s + (q.correctness === 'right' ? 1 : -1), 0);
    save();
    if (typeof onHistoryImported === 'function') onHistoryImported();
    alert(`Import complete: ${questions.length - base.length} new questions, ${rows.length} new graph entries, ${quadboxRows.length} new N-Back games, ${cctRows.length} new CCT sessions, ${testScoreRows.length} new test-battery scores.` + (overwrite ? ' Reloading to apply restored profiles and settings…' : ''));
    if (overwrite) window.location.reload();
}
