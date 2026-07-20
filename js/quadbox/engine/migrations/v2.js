/*!
 * Derived from Quad Box - https://github.com/soamsy/quad-box
 * Copyright (c) 2025 The Quad Box Project Contributors
 * MIT License - see js/quadbox/LICENSE
 * Promoted from src/migrations/v2.js at upstream commit 83a9718. Changes:
 * guard a missing/malformed gameSettings (e.g. a hand-edited or truncated
 * import) instead of throwing and dropping the whole settings blob.
 */
export const migrateToV2 = (settings) => {
  if (settings?.version !== 'v1') {
    return settings
  }

  settings.version = 'v2'
  if (typeof settings.gameSettings !== 'object' || settings.gameSettings === null) {
    settings.gameSettings = {}
  }
  const globalAudioSource = settings.audioSource
  if (globalAudioSource) {
    for (const [_, subSettings] of Object.entries(settings.gameSettings)) {
      subSettings.audioSource = globalAudioSource
    }
    delete settings.audioSource
  }

  const globalPatternSource = settings['patternSource']
  if (globalPatternSource) {
    for (const [_, subSettings] of Object.entries(settings.gameSettings)) {
      subSettings.imageSource = globalPatternSource
    }
    delete settings.patternSource
  }

  for (const [_, subSettings] of Object.entries(settings.gameSettings)) {
    subSettings.enableImage = subSettings.enableShapeColor
    delete subSettings.enableShapeColor
  }

  return settings
}