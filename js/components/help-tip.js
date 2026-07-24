// Cerevana web components - tooltip bubble.
// Light DOM, no shadow root, no build step: renders the exact
// .tooltip-container/.tooltip-text markup styles.css already styles.
// All component tags have `display: contents` (styles.css) so the
// rendered markup participates in layout as if written in place.
// Load order: this file first - the other components use cvTooltipHtml.

// "|" in text becomes a line break (tooltips are nowrap, hand-broken).
// wrap=true adds the .wrap class (white-space:normal, max-width) so long
// copy stays clear of a narrow sidebar's edges instead of running off-screen.
function cvTooltipHtml(text, side, wrap) {
	const cls = (side === 'right' ? ' right' : '') + (wrap ? ' wrap' : '');
	return `<div class="tooltip-container" tabindex="0">
		?
		<div class="tooltip-text${cls}">
			${text.split('|').join('<br>')}<br>
		</div>
	</div>`;
}

// <help-tip text="Line one|line two" side="right" [wrap]></help-tip>
class HelpTip extends HTMLElement {
	connectedCallback() {
		this.innerHTML = cvTooltipHtml(this.getAttribute('text') ?? '', this.getAttribute('side'), this.hasAttribute('wrap'));
	}
}
customElements.define('help-tip', HelpTip);
