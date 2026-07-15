// N-back page bootstrap: settings wiring, keyboard, graph.
// populateSettings()/init() are called by NBACK_PROFILES (js/nback/profiles.js)
// whenever the active n-back player changes.

const NBACK_SETTING_INPUTS = {
    'p-70': 'nbackMode',
    'p-71': 'nbackTrialTime',
    'p-72': 'nbackFeedback',
    'p-73': 'nbackJaeggi',
    'p-74': 'nbackManual',
    'p-75': 'nbackManualN',
    'p-76': 'nbackVariable',
    'p-77': 'nbackCrab',
    'p-78': 'nbackSelfPaced',
    'p-79': 'nbackThresholdAdvance',
    'p-80': 'nbackThresholdFallback',
    'p-81': 'nbackFallbackSessions',
    'p-82': 'nbackChanceMatch',
    'p-83': 'nbackChanceInterference',
    'p-84': 'nbackMultiStim',
};

function populateSettings() {
    for (const id in NBACK_SETTING_INPUTS) {
        const input = document.getElementById(id);
        const value = savedata[NBACK_SETTING_INPUTS[id]];
        if (input.type === 'checkbox') input.checked = !!value;
        else input.value = value;
    }
}

function init() {
    if (NB.running) nbackCancel();
    nbackRenderView();
}

function registerEventHandlers() {
    for (const id in NBACK_SETTING_INPUTS) {
        const input = document.getElementById(id);
        const key = NBACK_SETTING_INPUTS[id];
        input.addEventListener(input.type === 'number' ? 'input' : 'change', () => {
            if (input.type === 'checkbox') savedata[key] = input.checked;
            else if (input.type === 'number') {
                const num = +input.value;
                if (!input.value || (input.min && num < +input.min) || (input.max && num > +input.max)) return;
                savedata[key] = num;
            }
            else savedata[key] = input.value;
            save();
            nbackRenderView();
        });
    }

    document.addEventListener('keydown', event => {
        const tagName = event.target.tagName.toLowerCase();
        if (tagName === 'button' || tagName === 'input' || tagName === 'select' || tagName === 'textarea' || event.target.isContentEditable) {
            return;
        }
        nbackHandleKey(event);
    });

    document.getElementById('offcanvas-progress').addEventListener('change', event => {
        if (event.target.checked) renderNBackChart();
    });

    document.getElementById('offcanvas-history').addEventListener('change', event => {
        if (event.target.checked) renderNBackHistory();
    });
}

async function renderNBackHistory() {
    const list = document.getElementById('nback-history-list');
    const sessions = (await getAllNBackSessions()).sort((a, b) => b.timestamp - a.timestamp);
    list.textContent = sessions.length ? '' : 'No sessions yet.';
    for (const s of sessions) {
        const row = document.createElement('div');
        row.className = 'mb-05';
        const flags = [s.manual && 'manual', s.jaeggi && 'jaeggi'].filter(Boolean).join(', ');
        row.textContent = `${new Date(s.timestamp).toLocaleString()}  ${s.modeName} ${s.n}-back  ${s.score}%${flags ? ` (${flags})` : ''}`;
        list.appendChild(row);
    }
}

function load() {
    appStateStartup();
    NBACK_PROFILES.startup();
    document.body.classList.toggle('light-mode', appState.darkMode === false);
    applySavedBackground();
}

registerEventHandlers();
load();
init();
