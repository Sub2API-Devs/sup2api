/**
 * migrations/migrateSonnet45ToSonnet46.ts
 *
 * 迁移：Sonnet 4.5 模型设置改为 Sonnet 4.6
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/migrations/migrateSonnet45ToSonnet46.ts
 * pieces: chunk-cjydagjy.js (1)
 * attribution: fingerprint 1
 */
import { getAPIProvider } from "../utils/model/providers.js";
import { isProSubscriber, isMaxSubscriber, isTeamPremiumSubscriber } from "../utils/auth.js";
import { getSettingsForSourceForUpkeep, updateSettingsForSource } from "../utils/settings/settings.js";
import { logForDebugging } from "../utils/debug.js";
import { logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { getGlobalConfig, saveGlobalConfig } from "../utils/config.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";

/**
 * 迁移（仅 firstParty）：Sonnet 4.5 全名 → sonnet 别名（Sonnet 4.6 起）。
 */
//@ chunk-cjydagjy.js:11557-12267 fingerprint = migrateSonnet45ToSonnet46 (0.869)
async function migrateSonnet45ToSonnet46(e) {
  if (getAPIProvider() !== "firstParty") return !0;
  if (!isProSubscriber() && !isMaxSubscriber() && !isTeamPremiumSubscriber()) return !0;
  let model = getSettingsForSourceForUpkeep("userSettings")?.model;
  if (
    model !== "claude-sonnet-4-5-20250929" &&
    model !== "claude-sonnet-4-5-20250929[1m]" &&
    model !== "sonnet-4-5-20250929" &&
    model !== "sonnet-4-5-20250929[1m]"
  )
    return !0;
  let has1m = model.endsWith("[1m]"),
    { error: error } = await updateSettingsForSource(
      "userSettings",
      { model: has1m ? "sonnet[1m]" : "sonnet" },
      void 0,
      e,
    );
  if (error)
    return (
      logForDebugging(`Failed to migrate Sonnet 4.5 model setting: ${error}`, { level: "error" }),
      logFeatureBad("migration_sonnet45_to_sonnet46", "migration_sonnet45_write_failed"),
      !1
    );
  if (getGlobalConfig().numStartups > 1)
    saveGlobalConfig((current) => ({ ...current, sonnet45To46MigrationTimestamp: Date.now() }), e);
  return (
    logEvent("tengu_sonnet45_to_46_migration", { from_model: fromEnum(model), has_1m: has1m }),
    logFeatureOk("migration_sonnet45_to_sonnet46"),
    !0
  );
}

export { migrateSonnet45ToSonnet46 };
