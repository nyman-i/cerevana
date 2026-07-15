// App-wide history export/import (RRT questions + progress rows + n-back sessions).
// Pages define onHistoryImported() to refresh their UI after an import.

let importMode;

function exportHistory() {
    Promise.all([getAllRRTProgress(), getAllNBackSessions()]).then(([rrtHistory, nbackHistory]) => {
        const data = { exportVersion: 2, exportedAt: Date.now(),
                       score: appState.score, questions: appState.questions, rrtHistory, nbackHistory };
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
    const valid = data && (data.exportVersion === 1 || data.exportVersion === 2)
        && Array.isArray(data.questions) && data.questions.every(q => typeof q?.answeredAt === 'number')
        && Array.isArray(data.rrtHistory) && data.rrtHistory.every(r => typeof r?.timestamp === 'number')
        && nbackImport.every(r => typeof r?.timestamp === 'number');
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

    try {
        await importRRTRows(rows, overwrite); // atomic IDB write first; localStorage only after it commits
        await importNBackRows(nbackRows, overwrite);
    } catch (e) {
        alert('Import failed: ' + e);
        return;
    }
    appState.questions = questions;
    appState.score = questions.reduce((s, q) => s + (q.correctness === 'right' ? 1 : -1), 0);
    save();
    if (typeof onHistoryImported === 'function') onHistoryImported();
    alert(`Import complete: ${questions.length - base.length} new questions, ${rows.length} new graph entries, ${nbackRows.length} new n-back sessions.`);
}
