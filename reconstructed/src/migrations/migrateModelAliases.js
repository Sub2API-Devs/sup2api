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
import { Lt } from "../utils/model/modelIds.js";
import { logForDebugging } from "../utils/debug.js";
import { logEvent } from "../services/analytics/index.js";
import { telemetrySafeModelName } from "../utils/model/telemetryModelName.js";

//@ chunk-cjydagjy.js:7110-7120 placement
var MODEL_ALIAS_MIGRATIONS = {};
/**
 * 迁移：按别名表改写 userSettings.model（仅第一方）。
 */
//@ chunk-cjydagjy.js:7120-7542 placement
async function migrateModelAliases(e = MODEL_ALIAS_MIGRATIONS, r) {
  if (getAPIProvider() !== "firstParty") return !0;
  let n = getSettingsForSourceForUpkeep("userSettings")?.model;
  if (!n) return !0;
  let s = Lt(n);
  if (!Object.hasOwn(e, s)) return !0;
  let S = e[s];
  if (S === void 0) return !0;
  let y = s !== n,
    { error: error } = await updateSettingsForSource(
      "userSettings",
      { model: y ? `${S}[1m]` : S },
      void 0,
      r,
    );
  if (error)
    return (logForDebugging(`Failed to apply model alias migration: ${error}`, { level: "error" }), !1);
  return (
    logEvent("tengu_alias_migration", {
      from_model: telemetrySafeModelName(s),
      to_model: telemetrySafeModelName(S),
      has_1m: y,
    }),
    !0
  );
}

export { migrateModelAliases };
