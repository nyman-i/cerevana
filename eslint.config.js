// Lint-only config, not shipped: Cerevana is a buildless static site (see
// CLAUDE.md), this file is consumed by CI/local linting alone.
//
// Two tiers, because the codebase has two genuinely different JS shapes:
//  - "module" files (js/quadbox/**, js/cct/**) are self-contained ES modules
//    with explicit import/export - no-undef and no-unused-vars are fully
//    trustworthy there.
//  - "classic" files (js/rrt/**, js/shared/**, js/menu/page.js,
//    js/studies/page.js) are plain <script>-tag files sharing one global
//    `window` scope per page, and are also called from inline
//    onclick="..." HTML attributes ESLint can't see. no-undef would flag
//    every cross-file reference and no-unused-vars would flag every
//    onclick handler as dead code, so both are relaxed there; everything
//    else in eslint:recommended (fallthrough, unreachable code, ==, etc.)
//    still applies.
import js from '@eslint/js';
import fs from 'node:fs';
import path from 'node:path';

const BROWSER_GLOBALS = {
    window: 'readonly', document: 'readonly', navigator: 'readonly', location: 'readonly',
    history: 'readonly', localStorage: 'readonly', sessionStorage: 'readonly', indexedDB: 'readonly',
    IDBKeyRange: 'readonly', fetch: 'readonly', URL: 'readonly', URLSearchParams: 'readonly',
    Audio: 'readonly', AudioContext: 'readonly', webkitAudioContext: 'readonly', Image: 'readonly',
    alert: 'readonly', confirm: 'readonly', prompt: 'readonly', console: 'readonly',
    setTimeout: 'readonly', clearTimeout: 'readonly', setInterval: 'readonly', clearInterval: 'readonly',
    requestAnimationFrame: 'readonly', cancelAnimationFrame: 'readonly', queueMicrotask: 'readonly',
    crypto: 'readonly', Blob: 'readonly', FileReader: 'readonly', performance: 'readonly',
    CustomEvent: 'readonly', Event: 'readonly', EventTarget: 'readonly',
    MutationObserver: 'readonly', ResizeObserver: 'readonly', IntersectionObserver: 'readonly',
    structuredClone: 'readonly', getComputedStyle: 'readonly', matchMedia: 'readonly',
    Worker: 'readonly', Node: 'readonly', Element: 'readonly', HTMLElement: 'readonly',
    DOMParser: 'readonly', XMLHttpRequest: 'readonly', WebSocket: 'readonly',
    globalThis: 'readonly', self: 'readonly',
    speechSynthesis: 'readonly', SpeechSynthesisUtterance: 'readonly',
    // vendored in js/lib/, exposed as a classic-script global on pages that load it
    Chart: 'readonly',
};

const NODE_GLOBALS = {
    process: 'readonly', console: 'readonly', Buffer: 'readonly',
    __dirname: 'readonly', __filename: 'readonly', module: 'readonly', require: 'readonly',
    URL: 'readonly', URLSearchParams: 'readonly', TextEncoder: 'readonly', TextDecoder: 'readonly',
    // Node 22+ globals used by tests/smoke.mjs's zero-dependency CDP driver
    WebSocket: 'readonly', fetch: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly',
};

// Every top-level function/const/let/var/class name across all classic
// script files - that's the shared cross-file global scope a browser
// actually gives these files when loaded together on one page.
function collectClassicGlobals(files) {
    const declRe = /^(?:export\s+)?(?:async\s+)?function\s*\*?\s+(\w+)|^(?:export\s+)?(?:const|let|var)\s+(\w+)|^(?:export\s+)?class\s+(\w+)/gm;
    const globals = {};
    for (const file of files) {
        const src = fs.readFileSync(file, 'utf8');
        for (const m of src.matchAll(declRe)) {
            const name = m[1] || m[2] || m[3];
            if (name) globals[name] = 'writable';
        }
    }
    return globals;
}

function listJsFiles(dir) {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...listJsFiles(full));
        else if (entry.name.endsWith('.js')) out.push(full);
    }
    return out;
}

const MODULE_DIRS = ['js/quadbox', 'js/cct', 'js/testtracker'];
const CLASSIC_FILES = [
    ...listJsFiles('js/rrt'),
    ...listJsFiles('js/shared'),
    ...listJsFiles('js/components'),
    'js/menu/page.js',
    'js/studies/page.js',
    // profile-bridge.js is js/shared's one ES module (see CLAUDE.md) - it
    // belongs to the module tier below, not the classic script tier
].filter((f) => fs.existsSync(f) && !f.endsWith('profile-bridge.js'));

const classicGlobals = collectClassicGlobals(CLASSIC_FILES);
// js/quadbox/** and js/cct/** are ES modules, but they run on pages that also
// load js/shared/**'s classic scripts first (appState, getAllNBackSessions,
// etc. land on `window` before the module tag runs) - module files legitimately
// reference those without importing them.
const sharedClassicGlobals = collectClassicGlobals(listJsFiles('js/shared').filter((f) => fs.existsSync(f)));

export default [
    js.configs.recommended,
    {
        // js/lib/ is vendored (Chart.js, d3 stimulus libs); fonts/ ships a
        // third-party font's own demo page. Neither is Cerevana code. The
        // other lint tools' own root-level configs are CJS/Node, not app code.
        ignores: [
            'js/lib/**', 'fonts/**', 'node_modules/**',
            '.stylelintrc.js', '.htmlvalidate.js',
        ],
    },
    // Module-based app code: strict, full recommended + no-undef/no-unused-vars
    {
        files: [...MODULE_DIRS.map((d) => `${d}/**/*.js`), 'js/shared/profile-bridge.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: { ...BROWSER_GLOBALS, ...sharedClassicGlobals },
        },
        rules: {
            eqeqeq: ['error', 'smart'],
            'no-var': 'error',
            'no-eval': 'error',
            'no-implied-eval': 'error',
            'no-new-func': 'error',
            'no-throw-literal': 'error',
            'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_' }],
        },
    },
    // Pure-logic test suites: Node ESM
    {
        files: ['tests/**/*.mjs'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: NODE_GLOBALS,
        },
        rules: {
            eqeqeq: ['error', 'smart'],
        },
    },
    // Classic <script>-tag files: shared cross-file global scope, some
    // exports only ever called from inline HTML onclick handlers. no-redeclare
    // and curly are deliberately not enabled here: every top-level name is
    // registered as a shared global (see collectClassicGlobals) so its own
    // declaration would always "redeclare" it, and brace-less single-line ifs
    // are this codebase's existing house style, not a bug class.
    {
        files: CLASSIC_FILES,
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'script',
            globals: { ...BROWSER_GLOBALS, ...classicGlobals },
        },
        rules: {
            'no-undef': 'off',
            'no-unused-vars': 'off',
            'no-redeclare': 'off',
            eqeqeq: ['error', 'smart'],
            'no-eval': 'error',
            'no-implied-eval': 'error',
            'no-new-func': 'error',
            'no-throw-literal': 'error',
            'no-fallthrough': 'error',
            'no-unreachable': 'error',
            'no-cond-assign': 'error',
            'no-constant-condition': 'error',
            'no-dupe-keys': 'error',
            'no-self-compare': 'error',
            'no-self-assign': 'error',
            'no-sparse-arrays': 'error',
            'no-unsafe-negation': 'error',
            'use-isnan': 'error',
            'valid-typeof': 'error',
            'no-with': 'error',
            'no-empty': ['error', { allowEmptyCatch: true }],
        },
    },
];
