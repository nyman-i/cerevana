// Cerevana web components — the four corner tab labels
// (SETTINGS / HISTORY / INFO / GRAPH), byte-identical on every game
// page. Captions come from CSS ::before rules on the *-label spans;
// sidebar-events.js handles click/keyboard on label.open, and the
// graph label's popup toggle keys off #graph-label.
//
// <corner-tabs></corner-tabs>
class CornerTabs extends HTMLElement {
	connectedCallback() {
		this.innerHTML = `
			<label class="open metal-gear open--top-left" for="offcanvas-settings" tabindex="0"><span class="sidebar-button settings-label"></span></label>
			<label class="open metal-gear open--top-right" for="offcanvas-history" tabindex="0"><span class="sidebar-button history-label"></span></label>
			<label class="open metal-gear open--bottom-left" for="offcanvas-info" tabindex="0"><span class="sidebar-button info-label"></span></label>
			<label id="graph-label" class="open metal-gear open--bottom-right" tabindex="0"><span class="sidebar-button graph-label"></span></label>`;
	}
}
customElements.define('corner-tabs', CornerTabs);
