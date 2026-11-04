/**
 * migrations/migrateModelAliases.ts
 *
 * 2.1.316 新增：迁移：按别名表改写 userSettings.model（仅第一方）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cjydagjy.js (2)
 * attribution: placement 2
 */
import { getAPIProvider } from "../utils/model/providers.js";
import { getSettingsForSourceForUpkeep, updateSettingsForSource } from "../utils/settings/settings.js";
import { strip1mSuffix } from "../utils/model/modelIds.js";
import { logForDebugging } from "../utils/debug.js";
import { logEvent } from "../services/analytics/index.js";
import { telemetrySafeModelName } from "../utils/model/telemetryModelName.js";

//@ chunk-cjydagjy.js:7110-7120 placement
var MODEL_ALIAS_MIGRATIONS = {};
//@ chunk-cjydagjy.js:7120-7542 placement
/**
 * 迁移：按别名表改写 userSettings.model（仅第一方）。
 */
async function migrateModelAliases(aliasMap = MODEL_ALIAS_MIGRATIONS, context) {
  if (getAPIProvider() !== "firstParty") return true;
  let model = getSettingsForSourceForUpkeep("userSettings")?.model;
  if (!model) return true;
  let baseModel = strip1mSuffix(model);
  if (!Object.hasOwn(aliasMap, baseModel)) return true;
  let mappedModel = aliasMap[baseModel];
  if (mappedModel === undefined) return true;
  let has1m = baseModel !== model;
  let { error } = await updateSettingsForSource(
    "userSettings",
    {
      model: has1m ? `${mappedModel}[1m]` : mappedModel,
    },
    undefined,
    context,
  );
  if (error) {
    logForDebugging(`Failed to apply model alias migration: ${error}`, {
      level: "error",
    });
    return false;
  }
  logEvent("tengu_alias_migration", {
    from_model: telemetrySafeModelName(baseModel),
    to_model: telemetrySafeModelName(mappedModel),
    has_1m: has1m,
  });
  return true;
}
export { migrateModelAliases };
