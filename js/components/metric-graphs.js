// CvMetricGraphs - shared base for the per-exercise metric-graph components
// (<nback-graphs> in js/quadbox/graphs.js, <cct-graphs> in js/cct/graphs.js):
// a tab strip with one dedicated, lazily rendered Chart.js line chart per
// metric, plus the common minutes-per-day bar chart on the 'time' view.
// This file owns everything visual so the two exercises (and stats.html)
// stay consistent; subclasses only declare their tabs, metrics and how a
// record maps to a point. Not a custom element itself - each subclass
// registers its own tag. RRT's <rrt-graphs> deliberately stays standalone:
// it renders all four of its charts at once from day-bucketed data, a
// different shape than the per-record metric charts here.
//
// Points are one per day per variant, not one per session (RRT's shape):
// a dozen short games in an evening read as one day's result instead of a
// dozen dots. Metrics say how their day collapses via `agg`.
//
// Subclass contract:
//   views()          -> [{ view, label }] - first entry is the default tab;
//                       a 'time' view gets the minutes-per-day bar chart
//   metrics()        -> { view: { y, has, axis, fmt, empty?, agg? } }
//                       agg: 'mean' (default) | 'min' | 'max' - how a day's
//                       sessions collapse to one point ('min' for fastest-X,
//                       'max' for best-X, mean for everything else)
//   includes(r)      -> record filter (completed-status check)
//   groupKey(r)      -> dataset label (structural-variant grouping)
//   minutes(r)       -> that record's play time in minutes, summed per day
//                       for the tooltip
//   emptyDefault     -> getter, default empty-state text

// 4 AM day rollover, so a late-night session counts toward the day it started
// in. Deliberately the same shape as getTruncatedDate (js/quadbox/engine/utils.js)
// and dayKey (js/cct/engine/gamedb.js) - roll the *local* hour back rather than
// subtracting 4h of absolute time, or a DST-shift day would bucket a session
// differently here than in the minutes-per-day bar chart those two feed.
// Duplicated rather than imported: both of those are ES modules and this file
// is a classic script.
const cvDayKey = (timestamp) => {
	const d = new Date(timestamp);
	if (d.getHours() < 4) d.setDate(d.getDate() - 1);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ponytail: mean is unweighted - a 3-trial warmup counts as much as a 60-trial
// run. Weight by trial count if that skews days in practice.
const cvCollapse = {
	mean: ys => ys.reduce((a, b) => a + b, 0) / ys.length,
	min: ys => Math.min(...ys),
	max: ys => Math.max(...ys),
};

// sessions/minutes count only the day's records that HAVE this metric, so a
// reaction-time tab can legitimately read fewer sessions than the accuracy tab
const cvDaySummary = ({ sessions, minutes }) => {
	const mins = Math.round(minutes);
	return ` · ${sessions} session${sessions === 1 ? '' : 's'}${mins > 0 ? `, ${mins} min` : ''}`;
};

class CvMetricGraphs extends HTMLElement {
	connectedCallback() {
		const views = this.views();
		this.innerHTML = `
			<div class="graph-controls">
				${views.map((v, i) => `<button type="button" class="graph-select${i === 0 ? ' selected' : ''}" data-view="${v.view}">${v.label}</button>`).join('\n\t\t\t\t')}
			</div>
			<div class="panel-empty" hidden>${this.emptyDefault}</div>
			${views.map((v, i) => `<div class="graph-popup-content${i === 0 ? ' visible' : ''}" data-view="${v.view}"><canvas></canvas></div>`).join('\n\t\t\t')}`;
		this.records = [];
		this.byDay = {};
		this.chart = null;
		this.view = views[0].view;
		this.querySelectorAll('.graph-select').forEach(btn =>
			btn.addEventListener('click', () => this.switchTab(btn.dataset.view)));
	}

	switchTab(view) {
		this.view = view;
		this.querySelectorAll('.graph-select').forEach(b => b.classList.toggle('selected', b.dataset.view === view));
		this.querySelectorAll('.graph-popup-content').forEach(v => v.classList.toggle('visible', v.dataset.view === view));
		this.render();
	}

	update({ records, byDay }) {
		this.records = records ?? [];
		this.byDay = byDay ?? {};
		this.render();
	}

	// Canvas can't read CSS vars, but JS can - pull the themed accent + text
	// colour from the computed tokens so the chart follows the user's hue.
	tokens() {
		const token = name => getComputedStyle(document.body).getPropertyValue(name).trim();
		const accent = token('--accent-color');
		return { accent, fg: token('--text-color'), palette: [accent, '#a6712c', '#8a5264', '#4c8434', '#4a6a7a', '#6f9440', '#7a4a9c', '#9c7a4a'] };
	}

	// Beyond the curated palette (variant suffixes can multiply series past
	// one-per-mode), generate further colors by the golden angle - keeps hues
	// well spread indefinitely instead of repeating.
	paletteColor(i, curated) {
		if (i < curated.length) return curated[i];
		const hue = (i * 137.508) % 360;
		return `hsl(${hue} 45% 55%)`;
	}

	canvas(view) { return this.querySelector(`[data-view="${view}"] canvas`); }

	setEmpty(hasData, message) {
		const el = this.querySelector('.panel-empty');
		el.hidden = hasData;
		el.textContent = message ?? this.emptyDefault;
		// no data -> just the message, not a bare axes grid next to it
		this.querySelector(`.graph-popup-content[data-view="${this.view}"]`)
			?.classList.toggle('visible', hasData);
	}

	render() {
		this.chart?.destroy();
		if (this.view === 'time') this.renderTime();
		else this.renderMetric(this.metrics()[this.view]);
	}

	renderMetric({ y, has, axis, fmt, empty, agg }) {
		const rows = this.records
			.filter(r => this.includes(r) && has(r))
			.sort((a, b) => a.timestamp - b.timestamp);
		// variant -> day -> the day's sessions; rows are timestamp-sorted, so
		// insertion order already puts each dataset's days in ascending order
		const groups = {};
		for (const r of rows) {
			const key = this.groupKey(r);
			const day = cvDayKey(r.timestamp);
			groups[key] = groups[key] ?? {};
			const bucket = groups[key][day] = groups[key][day] ?? { x: day, ys: [], sessions: 0, minutes: 0 };
			bucket.ys.push(y(r));
			bucket.sessions += 1;
			bucket.minutes += this.minutes(r);
		}
		const collapse = cvCollapse[agg ?? 'mean'];
		const { fg, palette } = this.tokens();
		const datasets = Object.entries(groups).map(([label, days], i) => ({
			label,
			data: Object.values(days).map(d => ({ ...d, y: collapse(d.ys) })),
			borderColor: this.paletteColor(i, palette),
			backgroundColor: this.paletteColor(i, palette), tension: 0.2, pointRadius: 3,
		}));
		this.setEmpty(datasets.some(d => d.data.length > 0), empty);
		this.chart = new Chart(this.canvas(this.view), {
			type: 'line',
			data: { datasets },
			options: {
				responsive: true,
				maintainAspectRatio: false,
				scales: {
					// minUnit: a short date range otherwise drops to hourly ticks ("9PM 11PM 1AM...");
					// capped horizontal labels: autoskip alone crams in ~40 rotated dates on a month of data
					x: { type: 'time', time: { minUnit: 'day' }, ticks: { color: fg, maxTicksLimit: 8, maxRotation: 0 }, grid: { color: '#4444' } },
					y: { ...axis, title: { ...axis.title, color: fg }, ticks: { ...axis.ticks, color: fg }, grid: { color: '#4444' } },
				},
				plugins: {
					legend: { labels: { color: fg } },
					tooltip: {
						callbacks: {
							label: (item) => `${item.dataset.label}${cvDaySummary(item.raw)}: ${fmt(item.raw.y)}`,
						},
					},
				},
			},
		});
	}

	renderTime() {
		const data = Object.entries(this.byDay).sort(([a], [b]) => a.localeCompare(b))
			.map(([day, minutes]) => ({ x: day, y: minutes }));
		this.setEmpty(data.length > 0);
		const { accent, fg } = this.tokens();
		const totalMinutes = data.reduce((s, d) => s + d.y, 0);
		// same output shape as js/quadbox/engine/utils.js formatSeconds (kept
		// there for the game HUD; this file is a classic script and can't import it)
		const secs = totalMinutes * 60;
		const mm = Math.floor((secs % 3600) / 60);
		const ss = String(Math.floor(secs % 60)).padStart(2, '0');
		const total = secs >= 3600
			? `${Math.floor(secs / 3600)}h ${String(mm).padStart(2, '0')}m ${ss}s`
			: `${mm}m ${ss}s`;
		this.chart = new Chart(this.canvas('time'), {
			type: 'bar',
			data: { datasets: [{ label: 'Minutes played', data, backgroundColor: accent }] },
			options: {
				responsive: true,
				maintainAspectRatio: false,
				scales: {
					x: { type: 'time', time: { unit: 'day' }, ticks: { color: fg, maxTicksLimit: 8, maxRotation: 0 }, grid: { color: '#4444' } },
					y: { title: { display: true, text: 'minutes', color: fg }, ticks: { color: fg }, grid: { color: '#4444' } },
				},
				plugins: {
					legend: { labels: { color: fg } },
					title: { display: true, text: `Total: ${total}`, color: fg },
				},
			},
		});
	}
}
