/**
 * migrations/migrateFable5ToFableAlias.ts
 *
 * 2.1.316 新增：迁移：把 userSettings.model 里的 claude-fable-5 改为 fable 别名（保留 [1m]）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cjydagjy.js (1)
 * attribution: placement 1
 */
import { isFirstPartyApiBackend } from "../utils/model/providers.js";
import { getSettingsForSourceForUpkeep, updateSettingsForSource } from "../utils/settings/settings.js";
import { logForDebugging } from "../utils/debug.js";
import { logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { getGlobalConfig, saveGlobalConfig } from "../utils/config.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";

/**
 * 迁移：把 userSettings.model 里的 claude-fable-5 改为 fable 别名（保留 [1m]）。
 */
//@ chunk-cjydagjy.js:8852-9439 placement
async function migrateFable5ToFableAlias(e) {
  if (!isFirstPartyApiBackend()) return !0;
  let r = getSettingsForSourceForUpkeep("userSettings")?.model;
  if (r !== "claude-fable-5" && r !== "claude-fable-5[1m]") return !0;
  let endsWith = r.endsWith("[1m]"),
    { error: error } = await updateSettingsForSource(
      "userSettings",
      { model: endsWith ? "fable[1m]" : "fable" },
      void 0,
      e,
    );
  if (error)
    return (
      logForDebugging(`Failed to migrate Fable 5 model setting: ${error}`, { level: "error" }),
      logFeatureBad("migration_fable5_to_fable_alias", "migration_fable5_write_failed"),
      !1
    );
  if (getGlobalConfig().numStartups > 1)
    saveGlobalConfig((y) => ({ ...y, fable5ToFableAliasMigrationTimestamp: Date.now() }), e);
  return (
    logEvent("tengu_fable5_to_fable_alias_migration", { from_model: fromEnum(r), has_1m: endsWith }),
    logFeatureOk("migration_fable5_to_fable_alias"),
    !0
  );
}

export { migrateFable5ToFableAlias };
