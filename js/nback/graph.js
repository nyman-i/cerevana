// N-back graph popup: same .graph-popup shell as RRT's (js/rrt/graph.js),
// tabs = Score and Level (per session) + Time Spent (per day)

// Chart colours read the live theme tokens so both modes stay legible.
const nbackToken = name => getComputedStyle(document.body).getPropertyValue(name).trim();

// Per-mode series: muted hues evenly spaced from the sage accent hue, with L*
// cycling 42/58/50 so neighbouring hues never share a lightness. Every series
// clears 3:1 on BOTH themes; the legend labels each one, so colour is never
// the only channel (13 categories cannot all separate under deuteranopia).
const NBACK_MODE_COLORS = {
    dual: '#00756f',
    position: '#009db9',
    sound: '#0083ba',
    'position-color': '#0566ac',
    'color-sound': '#8f81ce',
    triple: '#a35f9f',
    'dual-combo': '#a24169',
    'tri-combo': '#d36d6e',
    'quad-combo': '#af633d',
    'tri-combo-color': '#815d16',
    arithmetic: '#8d903f',
    'dual-arithmetic': '#50833f',
    'triple-arithmetic': '#00734c',
};

let nbackChart = null;
let nbackTimeChart = null;

// same day boundary as RRT's ProgressGraph.findDay (04:00 rollover)
function nbackFindDay(timestamp) {
    const date = new Date(timestamp - 4 * 60 * 60 * 1000);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

async function renderNBackTimeChart(sessions) {
    if (!sessions || sessions.length === 0) return;

    const byDay = {};
    for (const s of sessions) {
        const day = nbackFindDay(s.timestamp);
        byDay[day] = (byDay[day] || 0) + (s.trials * (s.ticks || 30) * 0.1) / 60; // minutes
    }
    const data = Object.keys(byDay).sort().map(day => ({ x: day, y: byDay[day] }));
    const total = data.reduce((a, e) => a + e.y, 0);
    const subtitle = `Total = ${Math.floor(total / 60)}h ${(total % 60).toFixed(0)}m`;

    const existing = Chart.getChart('nback-graph-canvas-time');
    if (existing) existing.destroy();
    const ctx = document.getElementById('nback-graph-canvas-time').getContext('2d');
    nbackTimeChart = new Chart(ctx, {
        type: 'bar',
        data: { datasets: [{ label: 'Time Spent (Minutes)', data, backgroundColor: NBACK_MODE_COLORS.dual }] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 },
            scales: {
                x: { type: 'time', time: { unit: 'day', tooltipFormat: 'yyyy-MM-dd' }, title: { display: true, text: 'Day' } },
                y: { title: { display: true, text: 'Time Spent' }, ticks: { callback: v => v.toFixed(1) } },
            },
            plugins: {
                tooltip: { callbacks: { label: item => `${item.dataset.label}: ${item.raw.y.toFixed(2)}` } },
                subtitle: { display: true, text: subtitle, align: 'end', color: nbackToken('--text-color') },
            },
        },
    });
}

async function renderNBackChart(sessions) {
    if (!sessions || sessions.length === 0) {
        return;
    }
    sessions.sort((a, b) => a.timestamp - b.timestamp);

    const modeColors = NBACK_MODE_COLORS;
    const datasets = [];
    for (const modeName in modeColors) {
        const rows = sessions.filter(s => s.modeName === modeName);
        if (rows.length === 0) continue;
        datasets.push({
            label: modeName + ' N',
            data: rows.map(s => ({ x: s.timestamp, y: s.n })),
            borderColor: modeColors[modeName],
            backgroundColor: modeColors[modeName],
            stepped: true,
            fill: false,
            yAxisID: 'y',
        });
        datasets.push({
            label: modeName + ' %',
            data: rows.map(s => ({ x: s.timestamp, y: s.score })),
            // '77' (not '7'): these colours are full #rrggbb, so the alpha
            // suffix must be two digits to stay valid CSS hex
            borderColor: modeColors[modeName] + '77',
            backgroundColor: modeColors[modeName] + '77',
            borderDash: [4, 4],
            pointRadius: 2,
            fill: false,
            yAxisID: 'y1',
        });
    }

    // destroy synchronously right before create: double toggle events can
    // interleave across the await above and race an async destroy
    const existing = Chart.getChart('nback-graph-canvas');
    if (existing) existing.destroy();
    const ctx = document.getElementById('nback-graph-canvas').getContext('2d');
    nbackChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 },
            scales: {
                x: {
                    type: 'time',
                    time: { unit: 'day', tooltipFormat: 'yyyy-MM-dd HH:mm' },
                    title: { display: true, text: 'Day' },
                },
                y: {
                    title: { display: true, text: 'N level' },
                    min: 0,
                    ticks: { stepSize: 1 },
                },
                y1: {
                    position: 'right',
                    title: { display: true, text: 'Score %' },
                    min: 0,
                    max: 100,
                    grid: { drawOnChartArea: false },
                },
            },
        },
    });
}

// --- popup shell wiring, mirroring js/rrt/graph.js ---

const graphPopup = document.getElementById('graph-popup');
const graphClose = document.getElementById('graph-close-popup');
const graphButton = document.getElementById('graph-label');

const graphProgress = document.getElementById('graph-popup-progress');
const graphTime = document.getElementById('graph-popup-time');
const graphs = [graphProgress, graphTime];

const graphProgressSelect = document.getElementById('graph-select-progress');
const graphTimeSelect = document.getElementById('graph-select-time');
const graphSelects = [graphProgressSelect, graphTimeSelect];

graphProgressSelect.addEventListener('click', () => {
    graphs.forEach(graph => graph.classList.remove('visible'));
    graphSelects.forEach(select => select.classList.remove('selected'));
    graphProgress.classList.add('visible');
    graphProgressSelect.classList.add('selected');
});

graphTimeSelect.addEventListener('click', () => {
    graphs.forEach(graph => graph.classList.remove('visible'));
    graphSelects.forEach(select => select.classList.remove('selected'));
    graphTime.classList.add('visible');
    graphTimeSelect.classList.add('selected');
});

graphButton.addEventListener('click', async () => {
    graphPopup.classList.add('visible');
    const sessions = await getAllNBackSessions();
    document.getElementById('graph-empty').hidden = sessions.length > 0;
    renderNBackChart(sessions);
    renderNBackTimeChart(sessions);
});

graphClose.addEventListener('click', () => {
    graphPopup.classList.remove('visible');
});

document.addEventListener('click', (event) => {
    if (graphPopup.classList.contains('visible') && !graphPopup.contains(event.target) && !graphButton.contains(event.target)) {
        graphPopup.classList.remove('visible');
    }
});
