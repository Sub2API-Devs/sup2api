/**
 * migrations/migrateOpusToOpus1m.ts
 *
 * 迁移：符合条件的用户把 opus 设置改为 opus[1m]
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/migrations/migrateOpusToOpus1m.ts
 * pieces: chunk-h61dq9nz.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { opus1mMergeTagsDefaultOpus } from "../utils/model/modelDisplay.js";
import { getSettingsForSourceForUpkeep, updateSettingsForSource } from "../utils/settings/settings.js";
import { logForDebugging } from "../utils/debug.js";
import { logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { logEvent } from "../services/analytics/index.js";

//@ chunk-h61dq9nz.js:10563-10944 fingerprint (2.1.88 match: migrateOpusToOpus1m, 0.659)
/**
 * 迁移：userSettings.model 为 opus 且允许 1M 时改成 opus[1m]。
 */
async function migrateOpusToOpus1m(context) {
  if (!opus1mMergeTagsDefaultOpus()) return true;
  if (getSettingsForSourceForUpkeep("userSettings")?.model !== "opus") return true;
  let { error } = await updateSettingsForSource(
    "userSettings",
    {
      model: "opus[1m]",
    },
    undefined,
    context,
  );
  if (error) {
    logForDebugging(`Failed to migrate opus model setting: ${error}`, {
      level: "error",
    });
    logFeatureBad("migration_opus_to_opus1m", "migration_opus_to_opus1m_write_failed");
    return false;
  }
  logEvent("tengu_opus_to_opus1m_migration", {});
  logFeatureOk("migration_opus_to_opus1m");
  return true;
}
export { migrateOpusToOpus1m };
