// Cerevana web components — offcanvas corner-panel shell.
// Renders the checkbox + sidebar + close-label skeleton that
// js/shared/sidebar-events.js auto-wires by id convention
// (input#offcanvas-NAME + div#sidebar-NAME). The panel's content is
// written as children of the tag; since a custom element's children
// aren't parsed yet when connectedCallback fires, a MutationObserver
// relocates them into the offcanvas body as the parser streams them in
// (complete before first paint and before any body-end script runs
// element lookups — ids resolve wherever the node currently sits).
//
// side="left": body gets the rtl-scrollbar direction wrapper + top
// spacer (the settings/info shape). side="right": close label first,
// no wrapper (the history shape). body-class adds e.g. "hql-frame".
//
// <corner-panel name="settings" side="left"> ...content... </corner-panel>
class CornerPanel extends HTMLElement {
	connectedCallback() {
		const name = this.getAttribute('name');
		const side = this.getAttribute('side') ?? 'left';
		const bodyClass = this.getAttribute('body-class');
		const input = document.createElement('input');
		input.id = `offcanvas-${name}`;
		input.type = 'checkbox';
		input.hidden = true;
		const panel = document.createElement('div');
		panel.id = `sidebar-${name}`;
		panel.className = `offcanvas offcanvas--${side}`;
		const closeHtml = `<div class="offcanvas-side"><label class="offcanvas-close" for="offcanvas-${name}" tabindex="0">✕</label></div>`;
		const bodyHtml = `<div class="offcanvas-body ffmono${bodyClass ? ' ' + bodyClass : ''}"></div>`;
		if (side === 'right') {
			panel.innerHTML = closeHtml + bodyHtml;
			this._target = panel.lastElementChild;
		} else {
			panel.innerHTML = bodyHtml + closeHtml;
			panel.firstElementChild.innerHTML = '<div style="direction: ltr;"><div class="mb-1"></div></div>';
			this._target = panel.firstElementChild.firstElementChild;
		}
		this.append(input, panel);
		const move = () => {
			for (const n of [...this.childNodes]) {
				if (n === input || n === panel) continue;
				this._target.appendChild(n);
			}
		};
		new MutationObserver(move).observe(this, { childList: true });
		move();
	}
}
customElements.define('corner-panel', CornerPanel);
