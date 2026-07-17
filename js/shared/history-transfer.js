// App-wide history export/import (RRT questions + progress rows + n-back
// sessions + Quad Box games). Pages define onHistoryImported() to refresh
// their UI after an import.

let importMode;

// Quad Box's IndexedDB (upstream-defined identifiers — NEVER rename).
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

function resetEverything() {
    const confirmed = confirm("Reset the ENTIRE app? This permanently deletes ALL data for every exercise: RRT, N-Back and Quad Box profiles, settings, scores, session history, progress graphs, and the background image. Tip: Export History first — the button is right next to this one.")
        && confirm("Last chance: this cannot be undone. Really erase all RRT, N-Back and Quad Box data?");
    if (!confirmed) return;
    // prefix sweep covers oldSettingsKey ("sllgms-v3") and every sllgms-v3-* key, present and future
    Object.keys(localStorage)
        .filter(key => key.startsWith('sllgms-v3'))
        .forEach(key => localStorage.removeItem(key));
    localStorage.removeItem('quad-box-settings');
    Promise.all([deleteDatabase("SyllDB"), deleteDatabase("QuadBoxNBack")])
        .then(() => window.location.reload());
}

function exportHistory() {
    Promise.all([getAllRRTProgress(), getAllNBackSessions(), getAllQuadBoxGames()]).then(([rrtHistory, nbackHistory, quadboxGames]) => {
        const data = { exportVersion: 3, exportedAt: Date.now(),
                       score: appState.score, questions: appState.questions, rrtHistory, nbackHistory, quadboxGames };
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

    const nbackImport = Array.isArray(data?.nbackHistory) ? data.nbackHistory : []; // absent in v1 exports
    const quadboxImport = Array.isArray(data?.quadboxGames) ? data.quadboxGames : []; // absent in v1/v2 exports
    const valid = data && [1, 2, 3].includes(data.exportVersion)
        && Array.isArray(data.questions) && data.questions.every(q => typeof q?.answeredAt === 'number')
        && Array.isArray(data.rrtHistory) && data.rrtHistory.every(r => typeof r?.timestamp === 'number')
        && nbackImport.every(r => typeof r?.timestamp === 'number')
        && quadboxImport.every(r => typeof r?.timestamp === 'number');
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

    const existingNBack = overwrite ? [] : await getAllNBackSessions();
    const seenNBack = new Set(existingNBack.map(r => r.timestamp));
    const nbackRows = nbackImport.filter(r => !seenNBack.has(r.timestamp));

    // tombstones share the source game's timestamp, so dedup on timestamp+status
    const existingQuadBox = overwrite ? [] : await getAllQuadBoxGames();
    const seenQuadBox = new Set(existingQuadBox.map(r => `${r.timestamp}|${r.status}`));
    const quadboxRows = quadboxImport.filter(r => !seenQuadBox.has(`${r.timestamp}|${r.status}`));

    try {
        await importRRTRows(rows, overwrite); // atomic IDB write first; localStorage only after it commits
        // only clear a store the file actually carries: overwriting from a v1 file
        // (no nbackHistory) must not wipe local N-Back sessions
        await importNBackRows(nbackRows, overwrite && Array.isArray(data.nbackHistory));
        await importQuadBoxGames(quadboxRows, overwrite && Array.isArray(data.quadboxGames));
    } catch (e) {
        alert('Import failed: ' + e);
        return;
    }
    appState.questions = questions;
    appState.score = questions.reduce((s, q) => s + (q.correctness === 'right' ? 1 : -1), 0);
    save();
    if (typeof onHistoryImported === 'function') onHistoryImported();
    alert(`Import complete: ${questions.length - base.length} new questions, ${rows.length} new graph entries, ${nbackRows.length} new n-back sessions, ${quadboxRows.length} new Quad Box games.`);
}
