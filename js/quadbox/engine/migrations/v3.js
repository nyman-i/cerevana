/*!
 * Derived from Quad Box - https://github.com/soamsy/quad-box
 * Copyright (c) 2025 The Quad Box Project Contributors
 * MIT License - see js/quadbox/LICENSE
 * Promoted from src/migrations/v3.js at upstream commit 83a9718. Changes: none.
 */
export const migrateToV3 = (settings) => {
  if (settings?.version !== 'v2') {
    return settings
  }

  settings.version = 'v3'

  if (!settings.enabledModes) {
    settings.enabledModes = ['quad', 'dual', 'custom', 'customB']
    if (settings.enableTallyBeta) {
      settings.enabledModes.push('tally')
    }
    if (settings.enableVisualTallyBeta) {
      settings.enabledModes.push('vtally')
    }
  }

  delete settings.enableTallyBeta
  delete settings.enableVisualTallyBeta

  return settings
}