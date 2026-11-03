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

//@ chunk-cjydagjy.js:8852-9439 placement
/**
 * 迁移：把 userSettings.model 里的 claude-fable-5 改为 fable 别名（保留 [1m]）。
 */
async function migrateFable5ToFableAlias(e) {
  if (!isFirstPartyApiBackend()) return true;
  let model = getSettingsForSourceForUpkeep("userSettings")?.model;
  if (model !== "claude-fable-5" && model !== "claude-fable-5[1m]") return true;
  let n = model.endsWith("[1m]");
  let { error } = await updateSettingsForSource(
    "userSettings",
    {
      model: n ? "fable[1m]" : "fable",
    },
    undefined,
    e,
  );
  if (error) {
    logForDebugging(`Failed to migrate Fable 5 model setting: ${error}`, {
      level: "error",
    });
    logFeatureBad("migration_fable5_to_fable_alias", "migration_fable5_write_failed");
    return false;
  }
  if (getGlobalConfig().numStartups > 1)
    saveGlobalConfig(
      (y) => ({
        ...y,
        fable5ToFableAliasMigrationTimestamp: Date.now(),
      }),
      e,
    );
  logEvent("tengu_fable5_to_fable_alias_migration", {
    from_model: fromEnum(model),
    has_1m: n,
  });
  logFeatureOk("migration_fable5_to_fable_alias");
  return true;
}
export { migrateFable5ToFableAlias };
