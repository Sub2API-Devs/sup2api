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

/**
 * 迁移：自动模式默认提供时，重置旧的 skipAutoPermissionPrompt（只做一次）。
 */
//@ chunk-cjydagjy.js:12860-13529 fingerprint = resetAutoModeOptInForDefaultOffer (0.841)
async function resetAutoModeOptInForDefaultOffer(e) {
  if (getGlobalConfig().hasResetAutoModeOptInForDefaultOffer) return !0;
  if (getAutoModeEnabledState() !== "enabled") return !0;
  try {
    let user = getSettingsForSourceForUpkeep("userSettings");
    if (user?.skipAutoPermissionPrompt && user?.permissions?.defaultMode !== "auto") {
      let { error: error } = await updateSettingsForSource(
        "userSettings",
        { skipAutoPermissionPrompt: void 0 },
        void 0,
        e,
      );
      if (error) throw error;
      (logEvent("tengu_migrate_reset_auto_opt_in_for_default_offer", {}),
        logFeatureOk("migration_reset_auto_mode_opt_in"));
    }
    saveGlobalConfig((s) => {
      if (s.hasResetAutoModeOptInForDefaultOffer) return s;
      return { ...s, hasResetAutoModeOptInForDefaultOffer: !0 };
    }, e);
  } catch (error) {
    return (
      logError(Error(`Failed to reset auto mode opt-in: ${error}`)),
      logFeatureBad("migration_reset_auto_mode_opt_in", "migration_reset_auto_mode_write_failed"),
      !1
    );
  }
  return !0;
}

export { resetAutoModeOptInForDefaultOffer };
