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

// keep in sync with js/shared/boot.js's copy (duplicated, not shared - boot.js
// must stay dependency-free and runs before this file loads)
const FONT_STACKS = {
    oxanium: '"Oxanium", sans-serif',
    jetbrains: '"JetBrains Mono", monospace',
    zendots: '"Zen Dots", sans-serif',
};

// js/shared/boot.js applies the saved value pre-paint on every page. The
// font-override class is what makes a custom pick take over every UI text
// role (see css/styles.css); at "default" it's absent and each role keeps
// its own font.
function applyMainFont() {
    const stack = FONT_STACKS[appState.mainFont];
    document.documentElement.classList.toggle('font-override', !!stack);
    if (stack) {
        document.documentElement.style.setProperty('--main-font', stack);
    } else {
        document.documentElement.style.removeProperty('--main-font');
    }
}

function handleMainFontChange(event) {
    appState.mainFont = event.target.value;
    save();
    applyMainFont();
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
    document.getElementById('p-font').value = appState.mainFont || 'default';
}
