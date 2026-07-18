// Cerevana web components — settings-panel input row
// (.mb-2 > .inline-input__outer > label + .inline-input__inner > input).
// Covers number AND single-char text inputs (type="text"). Deviating
// rows (rrt's multi-input triplets, rows with embedded extras) stay as
// plain markup — don't force them in here.
//
// <num-row input-id="qb-trialtime" label="Trial time" min="1000"
//          max="5000" step="100" width="7ch" suffix="ms"
//          [type="text" maxlength="1"] [row-id="qb-row-trialtime"]
//          [row-hidden] [outer-class="big-input"]
//          [tooltip="Line|line"] [tooltip-side="right"]
//          [tooltip-wrap="ctrl"]></num-row>
//
// tooltip placement: bare sibling after the label text (rrt style) by
// default; tooltip-wrap="ctrl" wraps label+tip in span.ctrl__inner
// (the cct adaptive-interval / qb-matchchance style).
class NumRow extends HTMLElement {
	connectedCallback() {
		const a = (n, f = '') => this.getAttribute(n) ?? f;
		const tooltip = this.getAttribute('tooltip');
		const tip = tooltip ? cvTooltipHtml(tooltip, a('tooltip-side')) : '';
		const label = a('tooltip-wrap') === 'ctrl'
			? `<span class="ctrl__inner">${a('label')}${tip}</span>`
			: `${a('label')}
					${tip}`;
		const passthrough = ['min', 'max', 'step', 'maxlength']
			.filter(n => this.hasAttribute(n))
			.map(n => ` ${n}="${a(n)}"`)
			.join('');
		const rowId = this.getAttribute('row-id');
		this.innerHTML = `
			<div class="mb-2"${rowId ? ` id="${rowId}"` : ''}${this.hasAttribute('row-hidden') ? ' hidden' : ''}>
				<div class="inline-input__outer${a('outer-class') ? ' ' + a('outer-class') : ''}">
					${label}
					<span class="inline-input__inner">
						<input id="${a('input-id')}" type="${a('type', 'number')}"${passthrough} style="width: ${a('width', '5ch')}">${a('suffix')}
					</span>
				</div>
			</div>`;
	}
}
customElements.define('num-row', NumRow);
