// Pre-paint: apply the saved accent hue before first paint. Every page loads its
// other scripts at end-of-body, so without this the default sage would flash on
// each load. Runs in <head>, before <body> exists - only documentElement and the
// theme-color meta are reachable here. Keep dependency-free (no constants.js yet).
try {
    var s = JSON.parse(localStorage.getItem('sllgms-v3-app-state'));
    if (s && s.accentHue != null) {
        document.documentElement.style.setProperty('--accent-hue', s.accentHue);
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', 'hsl(' + s.accentHue + ' 28% 60%)');
    }
    // keep in sync with js/shared/appearance.js's FONT_STACKS (duplicated,
    // not imported - this script must stay dependency-free). const, not var:
    // block-scoped to this try{}, so it can't collide with appearance.js's
    // own top-level `const FONT_STACKS` (a `var` here would leak globally).
    const FONT_STACKS = {
        oxanium: '"Oxanium", sans-serif',
        jetbrains: '"JetBrains Mono", monospace',
        zendots: '"Zen Dots", sans-serif',
    };
    if (s && FONT_STACKS[s.mainFont]) {
        document.documentElement.classList.add('font-override');
        document.documentElement.style.setProperty('--main-font', FONT_STACKS[s.mainFont]);
    }
} catch (e) {}
