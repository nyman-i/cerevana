/*!
 * Derived from Quad Box — https://github.com/soamsy/quad-box
 * Copyright (c) 2025 The Quad Box Project Contributors
 * MIT License — see js/quadbox/LICENSE
 * Promoted from src/migrations/migrations.js at upstream commit 83a9718. Changes: import specifiers given .js extensions (buildless ESM).
 */
import { migrateToV2 } from "./v2.js"
import { migrateToV3 } from "./v3.js"

export const migrateSettings = (settings) => {
  settings = migrateToV2(settings)
  settings = migrateToV3(settings)
  return settings
}