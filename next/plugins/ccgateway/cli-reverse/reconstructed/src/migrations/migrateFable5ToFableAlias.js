/**
 * migrations/migrateFable5ToFableAlias.ts
 *
 * 2.1.316 新增：迁移：把 userSettings.model 里的 claude-fable-5 改为 fable 别名（保留 [1m]）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h61dq9nz.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isFirstPartyApiBackend } from "../utils/model/providers.js";
import { getSettingsForSourceForUpkeep, updateSettingsForSource } from "../utils/settings/settings.js";
import { logForDebugging } from "../utils/debug.js";
import { logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { getGlobalConfig, saveGlobalConfig } from "../utils/config.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";

//@ chunk-h61dq9nz.js:9029-9616 placement
/**
 * 迁移：把 userSettings.model 里的 claude-fable-5 改为 fable 别名（保留 [1m]）。
 */
async function migrateFable5ToFableAlias(context) {
  if (!isFirstPartyApiBackend()) return true;
  let model = getSettingsForSourceForUpkeep("userSettings")?.model;
  if (model !== "claude-fable-5" && model !== "claude-fable-5[1m]") return true;
  let has1m = model.endsWith("[1m]");
  let { error } = await updateSettingsForSource(
    "userSettings",
    {
      model: has1m ? "fable[1m]" : "fable",
    },
    undefined,
    context,
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
      (current) => ({
        ...current,
        fable5ToFableAliasMigrationTimestamp: Date.now(),
      }),
      context,
    );
  logEvent("tengu_fable5_to_fable_alias_migration", {
    from_model: fromEnum(model),
    has_1m: has1m,
  });
  logFeatureOk("migration_fable5_to_fable_alias");
  return true;
}
export { migrateFable5ToFableAlias };
