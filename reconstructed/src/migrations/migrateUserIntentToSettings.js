/**
 * migrations/migrateUserIntentToSettings.ts
 *
 * 2.1.316 新增：迁移：把全局配置里的用户意图类设置搬到 userSettings。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cjydagjy.js (1)
 * attribution: placement 1
 */
import { getGlobalConfig, DEFAULT_GLOBAL_CONFIG } from "../utils/config.js";
import { getSettingsForSourceForUpkeep, updateSettingsForSource } from "../utils/settings/settings.js";
import { USER_INTENT_SETTING_KEYS } from "../utils/settings/userIntentSettings.js";
import { validateConfigValue } from "../utils/config/globalConfigValidation.js";
import { logEvent } from "../services/analytics/index.js";
import { logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { logError } from "../utils/log.js";

//@ chunk-cjydagjy.js:12267-12860 placement
/**
 * 迁移：把全局配置里的用户意图类设置搬到 userSettings。
 */
async function migrateUserIntentToSettings(e) {
  let globalConfig = getGlobalConfig();
  let settingsForSourceForUpkeep = getSettingsForSourceForUpkeep("userSettings");
  let s = {};
  for (let S of USER_INTENT_SETTING_KEYS) {
    let y = globalConfig[S];
    if (y === undefined) continue;
    if (y === DEFAULT_GLOBAL_CONFIG[S]) continue;
    if (settingsForSourceForUpkeep?.[S] !== undefined) continue;
    let P = validateConfigValue(S, y);
    if (P === undefined) continue;
    s[S] = P;
  }
  if (Object.keys(s).length === 0) return true;
  try {
    let { error } = await updateSettingsForSource("userSettings", s, undefined, e);
    if (error) throw error;
    logEvent("tengu_migrate_user_intent_to_settings", {
      migrated_count: Object.keys(s).length,
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
