// Cerevana web components - the per-exercise profile picker
// (heading + dropdown + add button; ids are the contract the page's
// profile JS binds to). The `share` attribute adds the share-URL button
// and copied-toast (recipients import by simply opening the URL).
//
// <profile-picker [heading="Profile"] [share]></profile-picker>
class ProfilePicker extends HTMLElement {
	connectedCallback() {
		const share = this.hasAttribute('share') ? `
				<button type="button" class="profile-share" id="profile-share" title="Share" aria-label="Share profile"><span class="icon"><i class="ci-Share_iOS_Export"></i></span></button>
				<div class="profile-copied" id="profile-copied" role="status">URL copied to clipboard</div>` : '';
		this.innerHTML = `
			<div class="mb-05 panel-heading">${this.getAttribute('heading') ?? 'Profile'}</div>
			<div class="mb-2 profile-container">
				<div class="profile-dropdown">
					<input type="text" class="profile-input" id="profile-input" placeholder="">
					<span class="profile-arrow" id="profile-arrow">▼</span>
					<div class="profile-list" id="profile-list">
					</div>
				</div>
				<button type="button" class="profile-plus" id="profile-plus" aria-label="Add profile">+</button>${share}
			</div>`;
	}
}
customElements.define('profile-picker', ProfilePicker);
