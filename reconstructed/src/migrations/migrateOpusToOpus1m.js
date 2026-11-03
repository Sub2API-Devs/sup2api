/**
 * migrations/migrateOpusToOpus1m.ts
 *
 * 迁移：符合条件的用户把 opus 设置改为 opus[1m]
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/migrations/migrateOpusToOpus1m.ts
 * pieces: chunk-cjydagjy.js (1)
 * attribution: fingerprint 1
 */
import { opus1mMergeTagsDefaultOpus } from "../utils/model/modelDisplay.js";
import { getSettingsForSourceForUpkeep, updateSettingsForSource } from "../utils/settings/settings.js";
import { logForDebugging } from "../utils/debug.js";
import { logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { logEvent } from "../services/analytics/index.js";

/**
 * 迁移：userSettings.model 为 opus 且允许 1M 时改成 opus[1m]。
 */
//@ chunk-cjydagjy.js:10386-10767 fingerprint = migrateOpusToOpus1m (0.659)
async function migrateOpusToOpus1m(e) {
  if (!opus1mMergeTagsDefaultOpus()) return !0;
  if (getSettingsForSourceForUpkeep("userSettings")?.model !== "opus") return !0;
  let { error: error } = await updateSettingsForSource("userSettings", { model: "opus[1m]" }, void 0, e);
  if (error)
    return (
      logForDebugging(`Failed to migrate opus model setting: ${error}`, { level: "error" }),
      logFeatureBad("migration_opus_to_opus1m", "migration_opus_to_opus1m_write_failed"),
      !1
    );
  return (logEvent("tengu_opus_to_opus1m_migration", {}), logFeatureOk("migration_opus_to_opus1m"), !0);
}

export { migrateOpusToOpus1m };
