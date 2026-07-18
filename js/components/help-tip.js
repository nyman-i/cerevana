// Cerevana web components - tooltip bubble.
// Light DOM, no shadow root, no build step: renders the exact
// .tooltip-container/.tooltip-text markup styles.css already styles.
// All component tags have `display: contents` (styles.css) so the
// rendered markup participates in layout as if written in place.
// Load order: this file first - the other components use cvTooltipHtml.

// "|" in text becomes a line break (tooltips are nowrap, hand-broken)
function cvTooltipHtml(text, side) {
	return `<div class="tooltip-container" tabindex="0">
		?
		<div class="tooltip-text${side === 'right' ? ' right' : ''}">
			${text.split('|').join('<br>')}<br>
		</div>
	</div>`;
}

// <help-tip text="Line one|line two" side="right"></help-tip>
class HelpTip extends HTMLElement {
	connectedCallback() {
		this.innerHTML = cvTooltipHtml(this.getAttribute('text') ?? '', this.getAttribute('side'));
	}
}
customElements.define('help-tip', HelpTip);
