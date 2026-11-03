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

/**
 * 迁移：全局配置 autoUpdates=false（且非原生安装保护）→ userSettings.env.DISABLE_AUTOUPDATER=1，并清除旧字段。
 */
//@ chunk-cjydagjy.js:7542-8258 fingerprint = migrateAutoUpdatesToSettings (0.82)
async function migrateAutoUpdatesToSettings(e) {
  let globalConfig = getGlobalConfig();
  if (globalConfig.autoUpdates !== !1 || globalConfig.autoUpdatesProtectedForNative === !0) return !0;
  try {
    let userSettings = getSettingsForSourceForUpkeep("userSettings") || {},
      { error: error } = await updateSettingsForSource(
        "userSettings",
        { env: { DISABLE_AUTOUPDATER: "1" } },
        void 0,
        e,
      );
    if (error) throw error;
    return (
      logEvent("tengu_migrate_autoupdates_to_settings", {
        was_user_preference: !0,
        already_had_env_var: !!userSettings.env?.DISABLE_AUTOUPDATER,
      }),
      env.set("DISABLE_AUTOUPDATER", !0),
      await saveGlobalConfig((current) => {
        let {
          autoUpdates: autoUpdates,
          autoUpdatesProtectedForNative: autoUpdatesProtectedForNative,
          ...E
        } = current;
        return E;
      }, e),
      logFeatureOk("migration_auto_updates_to_settings"),
      !0
    );
  } catch (error) {
    return (
      logForDebugging(`Failed to migrate auto-updates: ${error}`, { level: "error" }),
      logEvent("tengu_migrate_autoupdates_error", { has_error: !0 }),
      logFeatureBad("migration_auto_updates_to_settings", "migration_auto_updates_write_failed"),
      !1
    );
  }
}

export { migrateAutoUpdatesToSettings };
