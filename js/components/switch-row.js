// Cerevana web components — settings-panel switch row
// (.mb-1 > .ctrl__inner > div(checkbox+label.switch) + text label).
// The inner div wrapping input+label.switch is load-bearing: CSS needs
// `input:checked + .switch` adjacency, and quadbox's syncPanel toggles
// `$(input).parentElement.hidden` for the stimulus enable rows.
// Deviating switches (embedded dropdowns/spinners, inline styles,
// paired rows) stay as plain markup.
//
// <switch-row input-id="qb-crab" label="Crab" [checked] [row-id="qb-row-crab"]
//             [tooltip="Line|line"] [tooltip-side="right"]></switch-row>
class SwitchRow extends HTMLElement {
	connectedCallback() {
		const a = (n, f = '') => this.getAttribute(n) ?? f;
		const id = a('input-id');
		const tooltip = this.getAttribute('tooltip');
		const rowId = this.getAttribute('row-id');
		this.innerHTML = `
			<div class="mb-1"${rowId ? ` id="${rowId}"` : ''}>
				<div class="ctrl__inner">
					<div>
						<input hidden id="${id}" type="checkbox"${this.hasAttribute('checked') ? ' checked' : ''}>
						<label class="switch" for="${id}"></label>
					</div>
					<label for="${id}">${a('label')}</label>
					${tooltip ? cvTooltipHtml(tooltip, a('tooltip-side')) : ''}
				</div>
			</div>`;
	}
}
customElements.define('switch-row', SwitchRow);
