// N-back progress chart (N level + score % per mode, per session)

let nbackChart = null;

async function renderNBackChart() {
    const sessions = await getAllNBackSessions();
    if (!sessions || sessions.length === 0) {
        return;
    }
    sessions.sort((a, b) => a.timestamp - b.timestamp);

    const modeColors = { dual: '#4cf', position: '#fc4', sound: '#f7a', 'position-color': '#8e6', 'color-sound': '#e94', triple: '#b8f',
        'dual-combo': '#6de', 'tri-combo': '#de6', 'quad-combo': '#e6d', 'tri-combo-color': '#9e9' };
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
            borderColor: modeColors[modeName] + '7',
            backgroundColor: modeColors[modeName] + '7',
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
