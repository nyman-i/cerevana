// Settings-version migration chain for js/cct/settings.js (STORAGE_KEY
// 'cct-settings'). Empty v1 baseline — no versions to migrate from yet.
// Mirrors js/quadbox/engine/migrations/migrations.js: add one guarded
// migrateToVN(settings) per future version bump and chain it here,
// without touching settings.js itself.
export const migrateSettings = (settings) => settings
