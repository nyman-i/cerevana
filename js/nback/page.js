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
    'p-85': 'nbackResetLevel',
    'p-86': 'nbackArithMaxNumber',
    'p-87': 'nbackArithNegatives',
    'p-88': 'nbackArithAdd',
    'p-89': 'nbackArithSub',
    'p-90': 'nbackArithMul',
    'p-91': 'nbackArithDiv',
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

    document.getElementById('offcanvas-history').addEventListener('change', event => {
        if (event.target.checked) renderNBackHistory();
    });
}

function resetNBack() {
    const confirmed = confirm("Reset N-Back? This permanently deletes your N-Back profiles, settings, levels and session history. RRT data and the background image are kept. Tip: Export History from the main menu first to keep a backup.")
        && confirm("Last chance: this cannot be undone. Really reset N-Back?");
    if (confirmed) {
        localStorage.removeItem(nbackProfilesKey);
        localStorage.removeItem(nbackSelectedKey);
        document.getElementById("reset-nback").innerText = 'Resetting...';
        importNBackRows([], true).then(() => {
            window.location.reload();
        });
    }
}

// one session → an RRT-style .hqli history card (classes from js/rrt/index.js createHQLI)
function createNBackHQLI(s, num) {
    const advance = s.jaeggi ? 90 : 80;
    const fallback = s.jaeggi ? 75 : 50;
    const classModifier = s.manual ? '' : s.score >= advance ? 'hqli--right' : s.score < fallback ? 'hqli--wrong' : '';
    const modeLabel = (s.multi > 1 ? s.multi + 'x ' : '') + (NBACK_MODES[s.modeName]?.label || s.modeName);
    const modalityRows = Object.entries(s.percents || {})
        .map(([mod, pct]) => `<div class="hqli-premise">${mod}: ${pct}%</div>`)
        .join('\n');
    const flags = [s.jaeggi && 'jaeggi', s.manual && 'manual', s.crab && 'crab',
        s.variable && 'variable', (s.mode & 1024) && 'self-paced'].filter(Boolean).join(' · ');

    const parent = document.createElement('DIV');
    parent.innerHTML =
`<div class="hqli ${classModifier}">
    <div class="inner">
        <div class="index"></div>
        <div class="hqli-premises">
            <div class="hqli-preamble">${modeLabel} · N = ${s.n}</div>
            ${modalityRows}
        </div>
        <div class="hqli-postamble">Score</div>
        <div class="hqli-conclusion">${s.score}%</div>
        <div class="hqli-footer">
            <div>${new Date(s.timestamp).toLocaleString()}${flags ? ' · ' + flags : ''}</div>
        </div>
    </div>
</div>`;
    parent.querySelector('.index').textContent = num;
    return parent.firstElementChild;
}

async function renderNBackHistory() {
    const sessions = (await getAllNBackSessions()).sort((a, b) => b.timestamp - a.timestamp);

    const avg = sessions.length ? Math.round(sessions.reduce((a, s) => a + s.score, 0) / sessions.length) : 0;
    const advanced = sessions.filter(s => !s.manual && s.score >= (s.jaeggi ? 90 : 80)).length;
    document.getElementById('nback-total-display').textContent = sessions.length;
    document.getElementById('nback-average-display').textContent = avg + '%';
    document.getElementById('nback-best-display').textContent = sessions.length ? 'N = ' + Math.max(...sessions.map(s => s.n)) : '—';
    document.getElementById('nback-advanced-display').textContent = sessions.length ? Math.round(100 * advanced / sessions.length) + '%' : '—';

    const list = document.getElementById('nback-history-list');
    list.innerHTML = sessions.length ? '' : '<div class="panel-empty">No sessions yet &mdash; finished sessions appear here.</div>';
    sessions.forEach((s, i) => list.appendChild(createNBackHQLI(s, sessions.length - i)));
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
