/**
 * migrations/resetAutoModeOptInForDefaultOffer.ts
 *
 * 迁移：默认提供 auto 模式时清除旧的 skipAutoPermissionPrompt
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/migrations/resetAutoModeOptInForDefaultOffer.ts
 * pieces: chunk-cjydagjy.js (1)
 * attribution: fingerprint 1
 */
import { getGlobalConfig, saveGlobalConfig } from "../utils/config.js";
import { getAutoModeEnabledState } from "../utils/permissions/permissionSetup.js";
import { getSettingsForSourceForUpkeep, updateSettingsForSource } from "../utils/settings/settings.js";
import { logEvent } from "../services/analytics/index.js";
import { logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { logError } from "../utils/log.js";

//@ chunk-cjydagjy.js:12860-13529 fingerprint (2.1.88 match: resetAutoModeOptInForDefaultOffer, 0.841)
/**
 * 迁移：自动模式默认提供时，重置旧的 skipAutoPermissionPrompt（只做一次）。
 */
async function resetAutoModeOptInForDefaultOffer(context) {
  if (getGlobalConfig().hasResetAutoModeOptInForDefaultOffer) return true;
  if (getAutoModeEnabledState() !== "enabled") return true;
  try {
    let user = getSettingsForSourceForUpkeep("userSettings");
    if (user?.skipAutoPermissionPrompt && user?.permissions?.defaultMode !== "auto") {
      let { error } = await updateSettingsForSource(
        "userSettings",
        {
          skipAutoPermissionPrompt: undefined,
        },
        undefined,
        context,
      );
      if (error) throw error;
      logEvent("tengu_migrate_reset_auto_opt_in_for_default_offer", {});
      logFeatureOk("migration_reset_auto_mode_opt_in");
    }
    saveGlobalConfig((current) => {
      if (current.hasResetAutoModeOptInForDefaultOffer) return current;
      return {
        ...current,
        hasResetAutoModeOptInForDefaultOffer: true,
      };
    }, context);
  } catch (error) {
    logError(Error(`Failed to reset auto mode opt-in: ${error}`));
    logFeatureBad("migration_reset_auto_mode_opt_in", "migration_reset_auto_mode_write_failed");
    return false;
  }
  return true;
}
export { resetAutoModeOptInForDefaultOffer };
