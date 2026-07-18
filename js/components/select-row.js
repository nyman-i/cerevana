// Cerevana web components - settings-panel select row
// (.mb-2 > .ctrl__inner > span label + select.select-item).
// Options come from the `options` attribute ("value=Label|value=Label")
// so the element renders complete at parse time (children of a custom
// element aren't parsed yet when connectedCallback fires). Selects with
// optgroups/placeholder logic (the N-Back mode pickers) stay as markup.
//
// <select-row select-id="qb-grid" label="Grid" [row-id="qb-row-grid"]
//             options="rotate3D=3D (rotating cube)|static2D=2D (static)"
//             [tooltip="Line|line"] [tooltip-side="right"]></select-row>
class SelectRow extends HTMLElement {
	connectedCallback() {
		const a = (n, f = '') => this.getAttribute(n) ?? f;
		const tooltip = this.getAttribute('tooltip');
		const rowId = this.getAttribute('row-id');
		const options = a('options').split('|').map(pair => {
			const eq = pair.indexOf('=');
			return `<option value="${pair.slice(0, eq)}">${pair.slice(eq + 1)}</option>`;
		}).join('');
		this.innerHTML = `
			<div class="mb-2"${rowId ? ` id="${rowId}"` : ''}>
				<div class="ctrl__inner">
					${this.hasAttribute('label') ? `<span>${a('label')}</span>` : ''}
					<select id="${a('select-id')}" class="select-item">${options}</select>
					${tooltip ? cvTooltipHtml(tooltip, a('tooltip-side')) : ''}
				</div>
			</div>`;
	}
}
customElements.define('select-row', SelectRow);
