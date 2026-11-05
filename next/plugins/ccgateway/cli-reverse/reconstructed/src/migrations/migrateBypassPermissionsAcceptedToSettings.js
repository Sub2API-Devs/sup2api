/**
 * migrations/migrateBypassPermissionsAcceptedToSettings.ts
 *
 * 迁移：bypassPermissionsModeAccepted 从全局配置挪到用户设置 skipDangerousModePermissionPrompt
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/migrations/migrateBypassPermissionsAcceptedToSettings.ts
 * pieces: chunk-h61dq9nz.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getGlobalConfig, saveGlobalConfig } from "../utils/config.js";
import { hasSkipDangerousModePermissionPrompt, updateSettingsForSource } from "../utils/settings/settings.js";
import { logEvent } from "../services/analytics/index.js";
import { logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../utils/debug.js";

//@ chunk-h61dq9nz.js:8435-9029 fingerprint (2.1.88 match: migrateBypassPermissionsAcceptedToSettings, 0.816)
/**
 * 迁移：全局配置 bypassPermissionsModeAccepted → userSettings.skipDangerousModePermissionPrompt=true。
 */
async function migrateBypassPermissionsAcceptedToSettings(context) {
  if (!getGlobalConfig().bypassPermissionsModeAccepted) return true;
  try {
    if (!hasSkipDangerousModePermissionPrompt()) {
      let { error } = await updateSettingsForSource(
        "userSettings",
        {
          skipDangerousModePermissionPrompt: true,
        },
        undefined,
        context,
      );
      if (error) throw error;
    }
    logEvent("tengu_migrate_bypass_permissions_accepted", {});
    await saveGlobalConfig((current) => {
      if (!("bypassPermissionsModeAccepted" in current)) return current;
      let { bypassPermissionsModeAccepted, ...updatedConfig } = current;
      return updatedConfig;
    }, context);
    logFeatureOk("migration_bypass_permissions_to_settings");
    return true;
  } catch (error) {
    logForDebugging(`Failed to migrate bypass permissions accepted: ${error}`, {
      level: "error",
    });
    logFeatureBad("migration_bypass_permissions_to_settings", "migration_bypass_permissions_write_failed");
    return false;
  }
}
export { migrateBypassPermissionsAcceptedToSettings };
