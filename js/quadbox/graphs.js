// <nback-graphs> - N-Back's chart views, shared between the game page's
// graph popup (nback.html) and the stats overview page (stats.html).
// One dedicated graph per metric (RRT's pattern): Progress (n-back level),
// Accuracy, Avg/Fastest Reaction and Time Spent. Pure view: callers fetch the
// records and call update({ records, byDay }). The chart machinery lives in
// the shared CvMetricGraphs base (js/components/metric-graphs.js); this file
// only declares N-Back's tabs, metrics and record mapping.
// displayTitle/displayVariant are canonical here (js/quadbox/game.js
// re-exports them for its ES-module importers).

window.cvNbackDisplay = {
	title(info) {
		if (!info?.title) return '';
		if (info.title.startsWith('tally ')) return 'tally';
		if (info.title.startsWith('vtally ')) return 'vtally';
		return info.title;
	},
	// structural settings that materially change the game, not just its
	// difficulty tuning - splitting the progress graph on these (not on
	// nBack/matchChance/interference/trialTime, which the level itself and
	// auto-progression already move continuously) makes a mode switch show up
	// as a new line instead of a silent dip in the old one. Falls back to
	// reading fields straight off `info` for legacy records saved before
	// `configSnapshot` existed.
	variant(info) {
		const snap = info?.configSnapshot ?? info ?? {};
		const parts = [];
		if (snap.grid) parts.push(snap.grid === 'rotate3D' ? '3D' : '2D');
		// 'tally'/'vtally' are the permanent rules value baked into those modes'
		// defaults, so they'd just repeat the mode name already shown by title
		if (snap.rules && !['none', 'tally', 'vtally'].includes(snap.rules)) parts.push(snap.rules);
		if (snap.crab) parts.push('crab');
		if (snap.selfPaced) parts.push('self-paced');
		return parts.length ? `${this.title(info)} · ${parts.join(', ')}` : this.title(info);
	},
};

class NbackGraphs extends CvMetricGraphs {
	get emptyDefault() { return 'No completed sessions yet.'; }

	views() {
		return [
			{ view: 'progress', label: 'Progress' },
			{ view: 'accuracy', label: 'Accuracy' },
			{ view: 'reaction', label: 'Avg Reaction' },
			{ view: 'fastest', label: 'Fastest Reaction' },
			{ view: 'time', label: 'Time Spent' },
		];
	}

	metrics() {
		const noReaction = "No reaction-time data yet - it's recorded for every game from now on.";
		return {
			progress: {
				y: g => g.ncalc,
				has: g => typeof g.ncalc === 'number',
				axis: { title: { display: true, text: 'n-back level (ncalc)' } },
				fmt: v => `level ${v.toFixed(2)}`,
			},
			accuracy: {
				y: g => g.total.percent * 100,
				has: g => g.total?.possible > 0,
				axis: { min: 0, max: 100, title: { display: true, text: 'accuracy %' } },
				fmt: v => `${v.toFixed(0)}%`,
			},
			reaction: {
				y: g => g.avgReactionMs,
				has: g => typeof g.avgReactionMs === 'number',
				axis: { title: { display: true, text: 'avg reaction on correct presses (ms)' } },
				fmt: v => `${Math.round(v)} ms`,
				empty: noReaction,
			},
			fastest: {
				y: g => g.fastestReactionMs,
				has: g => typeof g.fastestReactionMs === 'number',
				axis: { title: { display: true, text: 'fastest reaction on correct presses (ms)' } },
				fmt: v => `${Math.round(v)} ms`,
				empty: noReaction,
			},
		};
	}

	includes(g) { return g.status === 'completed'; }
	groupKey(g) { return window.cvNbackDisplay.variant(g); }
	pointMeta(g) { return { nBack: g.nBack, minutes: Math.round((g.elapsedSeconds ?? 0) / 60) }; }
	tooltipSession(r) { return ` ${r.nBack}-back${r.minutes > 0 ? ` (${r.minutes} min)` : ''}`; }
}
customElements.define('nback-graphs', NbackGraphs);
