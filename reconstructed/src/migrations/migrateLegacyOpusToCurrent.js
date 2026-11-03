/**
 * migrations/migrateLegacyOpusToCurrent.ts
 *
 * 迁移：旧版 Opus 模型名改为当前 opus 别名
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/migrations/migrateLegacyOpusToCurrent.ts
 * pieces: chunk-cjydagjy.js (1)
 * attribution: fingerprint 1
 */
import { getAPIProvider } from "../utils/model/providers.js";
import { isLegacyModelRemapEnabled } from "../utils/model/model.js";
import { getSettingsForSourceForUpkeep, updateSettingsForSource } from "../utils/settings/settings.js";
import { logForDebugging } from "../utils/debug.js";
import { logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { saveGlobalConfig } from "../utils/config.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";

/**
 * 迁移（仅 firstParty）：userSettings.model 为 Opus 4/4.1 的全名时改成当前 opus 别名。
 */
//@ chunk-cjydagjy.js:9439-10044 fingerprint = migrateLegacyOpusToCurrent (0.818)
async function migrateLegacyOpusToCurrent(e) {
  if (getAPIProvider() !== "firstParty") return !0;
  if (!isLegacyModelRemapEnabled()) return !0;
  let model = getSettingsForSourceForUpkeep("userSettings")?.model;
  if (
    model !== "claude-opus-4-20250514" &&
    model !== "claude-opus-4-1-20250805" &&
    model !== "claude-opus-4-0" &&
    model !== "claude-opus-4-1"
  )
    return !0;
  let { error: error } = await updateSettingsForSource("userSettings", { model: "opus" }, void 0, e);
  if (error)
    return (
      logForDebugging(`Failed to migrate legacy Opus model setting: ${error}`, { level: "error" }),
      logFeatureBad("migration_legacy_opus_to_current", "migration_legacy_opus_write_failed"),
      !1
    );
  return (
    saveGlobalConfig((current) => ({ ...current, legacyOpusMigrationTimestamp: Date.now() }), e),
    logEvent("tengu_legacy_opus_migration", { from_model: fromEnum(model) }),
    logFeatureOk("migration_legacy_opus_to_current"),
    !0
  );
}

export { migrateLegacyOpusToCurrent };
