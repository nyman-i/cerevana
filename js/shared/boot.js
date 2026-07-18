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
} catch (e) {}
