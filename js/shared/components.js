// Cerevana web components — shared building blocks for the settings panels.
// Plain custom elements in light DOM (no shadow root, no build step): they
// render the exact markup/classes the pages previously hand-copied, so all
// styling keeps coming from css/styles.css and the pages' existing JS finds
// the inputs by id as before. Load this before the page's own scripts so the
// elements upgrade while the HTML parses.

const tooltipHtml = (text, side) => `
	<div class="tooltip-container" tabindex="0">
		?
		<div class="tooltip-text${side === 'right' ? ' right' : ''}">
			${text.split('|').join('<br>')}<br>
		</div>
	</div>`;

// <num-row input-id="qb-trialtime" label="Trial time" min="1000" max="5000"
//          step="100" width="7ch" suffix="ms"
//          tooltip="Line one|line two" tooltip-side="right"></num-row>
class NumRow extends HTMLElement {
	connectedCallback() {
		const attr = (name, fallback = '') => this.getAttribute(name) ?? fallback;
		const tooltip = this.getAttribute('tooltip');
		this.innerHTML = `
			<div class="mb-2">
				<div class="inline-input__outer">
					${attr('label')}
					${tooltip ? tooltipHtml(tooltip, attr('tooltip-side')) : ''}
					<span class="inline-input__inner">
						<input id="${attr('input-id')}" type="number" min="${attr('min', '1')}" max="${attr('max', '99')}" step="${attr('step', '1')}" style="width: ${attr('width', '5ch')}">${attr('suffix')}
					</span>
				</div>
			</div>`;
	}
}
customElements.define('num-row', NumRow);

// The shared Progress Targets section (heading + daily/weekly minute inputs).
// <goal-targets daily-id="qb-dailygoal" weekly-id="qb-weeklygoal"
//               tooltip="..." tooltip-side="right"></goal-targets>
class GoalTargets extends HTMLElement {
	connectedCallback() {
		const tooltip = this.getAttribute('tooltip');
		const side = this.getAttribute('tooltip-side') ?? '';
		this.innerHTML = `
			<div class="mb-05 panel-heading">Progress Targets</div>
			<num-row input-id="${this.getAttribute('daily-id')}" label="Daily target" min="1" max="360" step="1" width="5ch" suffix="min"${tooltip ? ` tooltip="${tooltip}" tooltip-side="${side}"` : ''}></num-row>
			<num-row input-id="${this.getAttribute('weekly-id')}" label="Weekly target" min="1" max="2500" step="1" width="6ch" suffix="min"></num-row>`;
	}
}
customElements.define('goal-targets', GoalTargets);
