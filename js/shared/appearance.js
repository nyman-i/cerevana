// App-wide Appearance controls on the main menu (dark mode, SFX, background image).
// All state lives in the global appState; every page reads it at load
// (light-mode body class, js/shared/sounds.js, applySavedBackground).

function handleDarkModeChange(event) {
    appState.darkMode = event.target.checked;
    save();
    document.body.classList.toggle('light-mode', !appState.darkMode);
}

function handleSfxChange(event) {
    appState.sfx = event.target.value;
    save();
}

// The accent is ONE hue; styles.css locks S/L, so this sets a single integer.
// js/shared/boot.js applies the saved value pre-paint on every page.
function applyAccentHue() {
    const hue = appState.accentHue ?? 165;
    document.documentElement.style.setProperty('--accent-hue', hue);
    document.querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', `hsl(${hue} 28% 60%)`);
}

function handleAccentChange(event) {
    appState.accentHue = +event.target.value;
    save();
    applyAccentHue();
}

function resetAccentHue() {
    delete appState.accentHue; // delete-to-default, like clearBackgroundImage()
    save();
    document.getElementById('p-accent').value = 165;
    applyAccentHue();
}

function pickBackgroundImage() {
    const input = document.getElementById('image-upload');
    input.value = ''; // re-selecting the same file re-fires change
    input.click();
}

function handleImageChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        appState.backgroundImage = imageKey;
        save();
        storeImage(imageKey, e.target.result).then(applySavedBackground);
    };
    reader.readAsDataURL(file);
}

function clearBackgroundImage() {
    document.getElementById('image-upload').value = '';
    delete appState.backgroundImage;
    save();
    deleteImage(imageKey).then(() => {
        document.querySelector('.background-image').style.backgroundImage = '';
    });
}

function populateAppearanceSettings() {
    document.getElementById('p-dark-mode').checked = appState.darkMode !== false;
    document.getElementById('p-sfx').value = appState.sfx || 'none';
    document.getElementById('p-accent').value = appState.accentHue ?? 165;
}
