/**
 * migrations/migrateAutoUpdatesToSettings.ts
 *
 * 迁移：全局配置 autoUpdates=false 改为设置 env.DISABLE_AUTOUPDATER
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/migrations/migrateAutoUpdatesToSettings.ts
 * pieces: chunk-cjydagjy.js (1)
 * attribution: fingerprint 1
 */
import { getGlobalConfig, saveGlobalConfig } from "../utils/config.js";
import { getSettingsForSourceForUpkeep, updateSettingsForSource } from "../utils/settings/settings.js";
import { logEvent } from "../services/analytics/index.js";
import { env } from "../utils/env.js";
import { logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../utils/debug.js";

//@ chunk-cjydagjy.js:7542-8258 fingerprint = migrateAutoUpdatesToSettings (0.82)
/**
 * 迁移：全局配置 autoUpdates=false（且非原生安装保护）→ userSettings.env.DISABLE_AUTOUPDATER=1，并清除旧字段。
 */
async function migrateAutoUpdatesToSettings(e) {
  let globalConfig = getGlobalConfig();
  if (globalConfig.autoUpdates !== false || globalConfig.autoUpdatesProtectedForNative === true) return true;
  try {
    let userSettings = getSettingsForSourceForUpkeep("userSettings") || {};
    let { error } = await updateSettingsForSource(
      "userSettings",
      {
        env: {
          DISABLE_AUTOUPDATER: "1",
        },
      },
      undefined,
      e,
    );
    if (error) throw error;
    logEvent("tengu_migrate_autoupdates_to_settings", {
      was_user_preference: true,
      already_had_env_var: !!userSettings.env?.DISABLE_AUTOUPDATER,
    });
    env.set("DISABLE_AUTOUPDATER", true);
    await saveGlobalConfig((current) => {
      let { autoUpdates, autoUpdatesProtectedForNative, ...updatedConfig } = current;
      return updatedConfig;
    }, e);
    logFeatureOk("migration_auto_updates_to_settings");
    return true;
  } catch (error) {
    logForDebugging(`Failed to migrate auto-updates: ${error}`, {
      level: "error",
    });
    logEvent("tengu_migrate_autoupdates_error", {
      has_error: true,
    });
    logFeatureBad("migration_auto_updates_to_settings", "migration_auto_updates_write_failed");
    return false;
  }
}
export { migrateAutoUpdatesToSettings };
