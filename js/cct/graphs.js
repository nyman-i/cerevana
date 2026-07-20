// <cct-graphs> - CCT's chart views, shared between the game page's graph
// popup (cct.html) and the stats overview page (stats.html). One dedicated
// graph per metric (RRT's pattern): Accuracy, Response Time and Time Spent.
// Pure view: callers fetch the records and call update({ records, byDay }).
// The chart machinery lives in the shared CvMetricGraphs base
// (js/components/metric-graphs.js); this file only declares CCT's tabs,
// metrics and record mapping. The mode labels + variant grouping are
// canonical here (js/cct/page.js reads window.cvCctDisplay).

window.cvCctDisplay = {
	modeLabels: { addition: 'Addition', subtraction: 'Subtraction', multiplication: 'Multiplication', difference: 'Difference' },
	// structural settings that materially change the session, not just its
	// difficulty tuning - splitting the progress graph on these makes a switch
	// show up as a new line instead of a silent accuracy dip in the old one.
	// Voice/interval bounds aren't structural in this sense (they don't change
	// what the task fundamentally demands) - those stay out of the graphs.
	variant(s) {
		const parts = [];
		if (s.playbackSpeed && s.playbackSpeed !== 1) parts.push(`${s.playbackSpeed}x`);
		if (s.presentationMode && s.presentationMode !== 'audiovisual') parts.push(`${s.presentationMode}-only`);
		if (s.endCondition === 'correct') parts.push('target-correct');
		const base = this.modeLabels[s.arithmeticMode] ?? s.arithmeticMode;
		return parts.length ? `${base} · ${parts.join(', ')}` : base;
	},
};

class CctGraphs extends CvMetricGraphs {
	get emptyDefault() { return 'No completed sessions yet.'; }

	views() {
		return [
			{ view: 'accuracy', label: 'Accuracy' },
			{ view: 'response', label: 'Response Time' },
			{ view: 'time', label: 'Time Spent' },
		];
	}

	metrics() {
		return {
			accuracy: {
				y: s => s.accuracy,
				has: () => true,
				axis: { min: 0, max: 100, title: { display: true, text: 'accuracy %' } },
				fmt: v => `${v.toFixed(0)}%`,
			},
			response: {
				y: s => s.averageResponseTimeMs,
				has: s => s.averageResponseTimeMs != null,
				axis: { title: { display: true, text: 'avg response time (ms)' } },
				fmt: v => `${Math.round(v)} ms`,
			},
		};
	}

	includes(s) { return s.status === 'Completed' && s.totalQuestionsAsked > 0; }
	groupKey(s) { return window.cvCctDisplay.variant(s); }
	pointMeta(s) { return { minutes: Math.round((s.durationMs ?? 0) / 60000) }; }
	tooltipSession(r) { return r.minutes > 0 ? ` (${r.minutes} min)` : ''; }
}
customElements.define('cct-graphs', CctGraphs);
