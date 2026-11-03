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
async function migrateModelAliases(e = MODEL_ALIAS_MIGRATIONS, r) {
  if (getAPIProvider() !== "firstParty") return true;
  let model = getSettingsForSourceForUpkeep("userSettings")?.model;
  if (!model) return true;
  let s = strip1mSuffix(model);
  if (!Object.hasOwn(e, s)) return true;
  let S = e[s];
  if (S === undefined) return true;
  let y = s !== model;
  let { error } = await updateSettingsForSource(
    "userSettings",
    {
      model: y ? `${S}[1m]` : S,
    },
    undefined,
    r,
  );
  if (error) {
    logForDebugging(`Failed to apply model alias migration: ${error}`, {
      level: "error",
    });
    return false;
  }
  logEvent("tengu_alias_migration", {
    from_model: telemetrySafeModelName(s),
    to_model: telemetrySafeModelName(S),
    has_1m: y,
  });
  return true;
}
export { migrateModelAliases };
