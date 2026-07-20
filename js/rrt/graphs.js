// <rrt-graphs> - RRT's four progress chart views (Time Spent / Avg Correct
// Times / Premise Speed / Total Answered), shared between the game page's
// graph popup (rrt.html) and the stats overview page (stats.html). Pure
// view: callers fetch the progress rows and call update(questions); the
// grouping and Chart.js config live here so both pages render identically.
// Colors: the shared token palette (stable across renders, themed) instead
// of the old random-per-render colors; ticks/legend follow --text-color.

class RrtGraphs extends HTMLElement {
	connectedCallback() {
		this.innerHTML = `
			<div class="graph-controls">
				<button type="button" class="graph-select selected" data-view="time">Time Spent</button>
				<button type="button" class="graph-select" data-view="score">Avg Correct Times</button>
				<button type="button" class="graph-select" data-view="premise">Premise Speed</button>
				<button type="button" class="graph-select" data-view="count">Total Answered</button>
			</div>
			<div class="panel-empty" hidden>No graph data yet &mdash; answer questions with the timer on and it appears here.</div>
			<div class="graph-popup-content visible" data-view="time"><canvas></canvas></div>
			<div class="graph-popup-content" data-view="score"><canvas></canvas></div>
			<div class="graph-popup-content" data-view="premise"><canvas></canvas></div>
			<div class="graph-popup-content" data-view="count"><canvas></canvas></div>`;
		this.charts = [];
		this.querySelectorAll('.graph-select').forEach(btn =>
			btn.addEventListener('click', () => {
				this.querySelectorAll('.graph-select').forEach(b => b.classList.toggle('selected', b === btn));
				this.querySelectorAll('.graph-popup-content').forEach(v => v.classList.toggle('visible', v.dataset.view === btn.dataset.view));
			}));
	}

	findDay(question) {
		// 4 AM day boundary, like the N-Back/CCT play-time buckets
		const date = new Date(question.timestamp - (4 * 60 * 60 * 1000));
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	calculateTypeData(data, groupByPremises) {
		const groupedByType = {};
		data.forEach((question) => {
			const day = this.findDay(question);
			const isRight = question.correctness === 'right';
			if (groupByPremises && !isRight) return;

			let type = question.type + (groupByPremises ? (' p' + question.premises) : '');
			if (question.modifiers && question.modifiers.length > 0) type += ` ${question.modifiers.join('-')}`;
			if (question.tags && question.tags.length > 0) type += ` ${question.tags.join('-')}`;

			groupedByType[type] = groupedByType[type] ?? {};
			groupedByType[type][day] = groupedByType[type][day] ?? { totalTime: 0, count: 0 };
			groupedByType[type][day].totalTime += question.timeElapsed;
			groupedByType[type][day].count += 1;
			groupedByType[type][day].numPremises = question.premises;
		});

		const result = {};
		for (const type in groupedByType) {
			result[type] = [];
			for (const day in groupedByType[type]) {
				const { count, numPremises, totalTime } = groupedByType[type][day];
				result[type].push({ day, count, averageTime: totalTime / count / 1000, numPremises });
			}
			result[type].sort((a, b) => new Date(a.day) - new Date(b.day));
		}
		return result;
	}

	calculateTimeSpentData(data) {
		const groupedByDay = {};
		data.forEach((question) => {
			const day = this.findDay(question);
			groupedByDay[day] = (groupedByDay[day] ?? 0) + question.timeElapsed / 1000 / 60;
		});
		return Object.entries(groupedByDay).map(([day, time]) => ({ day, time }))
			.sort((a, b) => new Date(a.day) - new Date(b.day));
	}

	update(questions) {
		this.charts.forEach(c => c.destroy());
		this.charts = [];
		// only timed questions are graphed (matches the popup's footnote)
		const data = (questions ?? []).filter(q => q.timeElapsed >= 1500);
		this.querySelector('.panel-empty').hidden = data.length > 0;
		if (data.length === 0) return;

		const token = name => getComputedStyle(document.body).getPropertyValue(name).trim();
		const accent = token('--accent-color');
		const fg = token('--text-color');
		// ponytail: fixed palette shared with the N-Back/CCT graphs, colors
		// repeat past this length - hash label->hue if that's hit in practice
		const palette = [accent, '#a6712c', '#8a5264', '#4c8434', '#4a6a7a', '#6f9440', '#7a4a9c', '#9c7a4a'];
		const color = i => palette[i % palette.length];

		const typeData = this.calculateTypeData(data, false);
		const premiseLevelData = this.calculateTypeData(data, true);

		const scoreDatasets = Object.keys(premiseLevelData).map((type, i) => ({
			label: type,
			data: premiseLevelData[type].map(e => ({ x: e.day, y: e.averageTime })),
			borderColor: color(i),
			backgroundColor: color(i),
			fill: false,
		}));
		const premiseDatasets = Object.keys(premiseLevelData).map((type, i) => ({
			label: type,
			data: premiseLevelData[type].map(e => ({ x: e.day, y: e.numPremises / e.averageTime })),
			borderColor: color(i),
			backgroundColor: color(i),
			fill: false,
		}));
		const countDatasets = Object.keys(typeData).map((type, i) => ({
			label: type,
			data: typeData[type].map(e => ({ x: e.day, y: e.count })),
			borderColor: color(i),
			backgroundColor: color(i),
		}));

		const timeData = this.calculateTimeSpentData(data);
		const totalTimeSpent = Math.round(timeData.reduce((s, e) => s + e.time, 0));
		const totalDisplay = `Total = ${Math.floor(totalTimeSpent / 60)}h ${totalTimeSpent % 60}m`;
		const timeDatasets = [{
			label: 'Time Spent (Minutes)',
			data: timeData.map(e => ({ x: e.day, y: e.time })),
			backgroundColor: accent,
		}];

		const canvas = view => this.querySelector(`[data-view="${view}"] canvas`).getContext('2d');
		this.charts = [
			this.createChart(canvas('time'), timeDatasets, 'bar', 'Time Spent', '', totalDisplay),
			this.createChart(canvas('score'), scoreDatasets, 'line', 'Average Correct Time (s)', 's'),
			this.createChart(canvas('premise'), premiseDatasets, 'line', 'Premise / second', ' premise/s'),
			this.createChart(canvas('count'), countDatasets, 'line', 'Count', ''),
		];
	}

	createChart(ctx, datasets, type, yAxisTitle, unit = '', subtitle) {
		const fg = getComputedStyle(document.body).getPropertyValue('--text-color').trim();
		return new Chart(ctx, {
			type,
			data: { datasets },
			options: {
				responsive: true,
				maintainAspectRatio: false,
				animation: { duration: 0 },
				scales: {
					x: {
						type: 'time',
						time: { unit: 'day', tooltipFormat: 'yyyy-MM-dd' },
						title: { display: true, text: 'Day', color: fg },
						ticks: { color: fg },
						grid: { color: '#4444' },
					},
					y: {
						title: { display: true, text: yAxisTitle, color: fg },
						ticks: { color: fg, callback: value => value.toFixed(1) },
						grid: { color: '#4444' },
					},
				},
				plugins: {
					legend: { labels: { color: fg } },
					tooltip: {
						callbacks: {
							label: item => `${item.dataset.label}: ${item.raw.y.toFixed(2)}${unit}`,
						},
					},
					subtitle: {
						display: !!subtitle,
						text: subtitle,
						align: 'end',
						color: fg,
					},
				},
			},
		});
	}
}
customElements.define('rrt-graphs', RrtGraphs);
