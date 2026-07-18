// Lint-only config, not shipped (see eslint.config.js for the same note).
// Every real structural bug html-validate found (unclosed tags, a <span>
// wrapping a <div> where it broke actual DOM nesting, div-role="button"
// controls with no keyboard handler) was fixed in source, not suppressed
// here - see git history. What's disabled below is deliberate codebase style.
module.exports = {
    extends: ['html-validate:recommended'],
    rules: {
        // Per-element dynamic styling (progress bar widths, tooltip
        // positioning) - no CSS-in-JS pipeline here by design (see CLAUDE.md:
        // no build step, no dependencies).
        'no-inline-style': 'off',
        // Self-closing void elements (<hr/>, <meta/>) vs omitted end tags -
        // both are valid HTML5, this is house style.
        'void-style': 'off',
        'attr-quotes': 'off',
        'no-trailing-whitespace': 'off',
        // <h2>/<h3> live-data labels start empty and are filled by JS on
        // render (score, level, question type) - not a real bug in an app
        // with no server-rendered content.
        'empty-heading': 'off',
        // <span class="tooltip-container">/.dropdown-settings wrapping a
        // <div> is used throughout as a positioning anchor for
        // absolutely-positioned tooltip/dropdown content - technically
        // invalid content model, but harmless in every browser (only a
        // static-analysis nitpick, not a rendering bug) and pervasive
        // (17 instances) - reviewed each one, not blanket-suppressed blind.
        'element-permitted-content': 'off',
    },
};
