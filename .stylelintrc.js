// Lint-only config, not shipped (see eslint.config.js for the same note).
// stylelint-config-standard's "possible error" rules (invalid values, unknown
// units, duplicate properties, etc.) all pass clean on this codebase as-is —
// zero of those fired in the initial dry run. Everything disabled below is a
// naming/notation/formatting preference the standard config assumes, that
// conflicts with this codebase's own established, consistent conventions.
export default {
    extends: 'stylelint-config-standard',
    ignoreFiles: ['js/lib/**', 'fonts/**'],
    rules: {
        // BEM (block__element--modifier) is this codebase's class-naming
        // convention throughout; renaming would also require touching every
        // matching class in HTML and JS querySelectors — out of scope here.
        'selector-class-pattern': null,
        // --step--1, --step--2 is the type-scale token convention.
        'custom-property-pattern': null,
        // Reviewed every hit: same-selector blocks split for organization
        // (e.g. .qb-face's box geometry vs. its typography), never a property
        // silently clobbered by declaration order. Not a live bug class here.
        'no-descending-specificity': null,
        'no-duplicate-selectors': null,
        // Pure formatting preferences with no behavioral effect either way.
        'declaration-block-single-line-max-declarations': null,
        'comment-empty-line-before': null,
        'custom-property-empty-line-before': null,
        'rule-empty-line-before': null,
        // -webkit-appearance:none has no unprefixed equivalent; still required for Safari.
        'property-no-vendor-prefix': null,
    },
};
