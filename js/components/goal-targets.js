// Cerevana web components - the shared Progress Targets section
// (heading + daily/weekly minute inputs), used by all three exercises.
// Requires help-tip.js and num-row.js to be loaded first.
//
// <goal-targets daily-id="qb-dailygoal" weekly-id="qb-weeklygoal"
//               [tooltip="Line|line"] [tooltip-side="right"]></goal-targets>
class GoalTargets extends HTMLElement {
	connectedCallback() {
		const tooltip = this.getAttribute('tooltip');
		const tipAttrs = tooltip
			? ` tooltip="${tooltip}" tooltip-side="${this.getAttribute('tooltip-side') ?? ''}"`
			: '';
		this.innerHTML = `
			<div class="mb-05 panel-heading">Progress Targets</div>
			<num-row input-id="${this.getAttribute('daily-id')}" label="Daily target" min="1" max="360" step="1" width="5ch" suffix="min"${tipAttrs}></num-row>
			<num-row input-id="${this.getAttribute('weekly-id')}" label="Weekly target" min="1" max="2500" step="1" width="6ch" suffix="min"></num-row>`;
	}
}
customElements.define('goal-targets', GoalTargets);
