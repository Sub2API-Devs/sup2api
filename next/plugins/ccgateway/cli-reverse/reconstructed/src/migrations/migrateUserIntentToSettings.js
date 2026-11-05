/**
 * migrations/migrateUserIntentToSettings.ts
 *
 * 2.1.316 新增：迁移：把全局配置里的用户意图类设置搬到 userSettings。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h61dq9nz.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getGlobalConfig, DEFAULT_GLOBAL_CONFIG } from "../utils/config.js";
import { getSettingsForSourceForUpkeep, updateSettingsForSource } from "../utils/settings/settings.js";
import { USER_INTENT_SETTING_KEYS } from "../utils/settings/userIntentSettings.js";
import { validateConfigValue } from "../utils/config/globalConfigValidation.js";
import { logEvent } from "../services/analytics/index.js";
import { logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { logError } from "../utils/log.js";

//@ chunk-h61dq9nz.js:12444-13037 placement
/**
 * 迁移：把全局配置里的用户意图类设置搬到 userSettings。
 */
async function migrateUserIntentToSettings(context) {
  let globalConfig = getGlobalConfig();
  let settingsForSourceForUpkeep = getSettingsForSourceForUpkeep("userSettings");
  let pendingSettings = {};
  for (let key of USER_INTENT_SETTING_KEYS) {
    let value = globalConfig[key];
    if (value === undefined) continue;
    if (value === DEFAULT_GLOBAL_CONFIG[key]) continue;
    if (settingsForSourceForUpkeep?.[key] !== undefined) continue;
    let validated = validateConfigValue(key, value);
    if (validated === undefined) continue;
    pendingSettings[key] = validated;
  }
  if (Object.keys(pendingSettings).length === 0) return true;
  try {
    let { error } = await updateSettingsForSource("userSettings", pendingSettings, undefined, context);
    if (error) throw error;
    logEvent("tengu_migrate_user_intent_to_settings", {
      migrated_count: Object.keys(pendingSettings).length,
    });
    logFeatureOk("migration_user_intent_to_settings");
    return true;
  } catch (error) {
    logError(Error(`Failed to migrate user-intent settings: ${error}`));
    logFeatureBad("migration_user_intent_to_settings", "migration_user_intent_write_failed");
    return false;
  }
}
export { migrateUserIntentToSettings };
