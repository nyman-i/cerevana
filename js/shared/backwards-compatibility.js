// Fills any missing settings keys with defaults when a profile loads, so
// new settings added in updates reach existing profiles without migrations.
// (The v1/v2 settings upgraders and the comparison/temporal RRTHistory
// rewrite were removed 2026-07 with the rest of the legacy support.)
class SettingsMigration {
    update(settings) {
        for (const key of Object.keys(defaultSavedata)) {
            if (!Object.hasOwn(settings, key)) {
                settings[key] = defaultSavedata[key];
            }
        }
    }
}
