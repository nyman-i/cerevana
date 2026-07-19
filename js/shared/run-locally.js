// Cerevana - "Run Locally" popup (index.html).
// Builds the curl|bash one-liner that downloads and runs create-shortcut.sh
// in one step, for whichever browser is picked in the #p-run-browser select.

function buildRunLocallyCommand() {
    const browser = document.getElementById('p-run-browser').value;
    return `curl -fsSL https://cerevana.com/create-shortcut.sh | bash -s -- --browser=${browser}`;
}

function updateRunLocallyCommand() {
    document.getElementById('run-locally-command').value = buildRunLocallyCommand();
}

function copyRunLocallyCommand(event) {
    navigator.clipboard.writeText(buildRunLocallyCommand());
    const button = event.target;
    const original = button.textContent;
    button.textContent = 'Copied!';
    setTimeout(() => { button.textContent = original; }, 1500);
}

function showRunLocallyPopup() {
    updateRunLocallyCommand();
    document.getElementById('run-locally-popup').classList.add('visible');
}

function hideRunLocallyPopup() {
    document.getElementById('run-locally-popup').classList.remove('visible');
}

document.getElementById('p-run-browser').addEventListener('change', updateRunLocallyCommand);
document.getElementById('run-locally-close-popup').addEventListener('click', hideRunLocallyPopup);

// same outside-click/Escape dismissal as the graph popup (js/shared/sidebar-events.js),
// kept local since sidebar-events.js isn't loaded on this page
document.addEventListener('click', event => {
    const popup = document.getElementById('run-locally-popup');
    const opener = document.getElementById('run-locally-open');
    if (popup.classList.contains('visible') && !popup.contains(event.target) && !opener.contains(event.target)) {
        hideRunLocallyPopup();
    }
});
document.addEventListener('keydown', event => {
    if (event.key === 'Escape') hideRunLocallyPopup();
});
