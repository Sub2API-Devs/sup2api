/**
 * migrations/migrateSonnet1mToSonnet45.ts
 *
 * 迁移：sonnet[1m] 固定到 Sonnet 4.5 1M
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/migrations/migrateSonnet1mToSonnet45.ts
 * pieces: chunk-h61dq9nz.js (1)
 * attribution: fingerprint 1
 */
import { getGlobalConfig, saveGlobalConfig } from "../utils/config.js";
import { getSettingsForSourceForUpkeep, updateSettingsForSource } from "../utils/settings/settings.js";
import { logForDebugging } from "../utils/debug.js";
import { logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { getMainLoopModelOverride, setMainLoopModelOverride } from "../bootstrap/state.js";

//@ chunk-h61dq9nz.js:11214-11734 fingerprint (2.1.88 match: migrateSonnet1mToSonnet45, 0.651)
/**
 * 迁移：sonnet[1m] → sonnet-4-5-20250929[1m]（只做一次，sonnet1m45MigrationComplete）。
 */
async function migrateSonnet1mToSonnet45(context) {
  if (getGlobalConfig().sonnet1m45MigrationComplete) return true;
  let changed = false;
  if (getSettingsForSourceForUpkeep("userSettings")?.model === "sonnet[1m]") {
    let { error } = await updateSettingsForSource(
      "userSettings",
      {
        model: "sonnet-4-5-20250929[1m]",
      },
      undefined,
      context,
    );
    if (error) {
      logForDebugging(`Failed to migrate sonnet[1m] model setting: ${error}`, {
        level: "error",
      });
      logFeatureBad("migration_sonnet1m_to_sonnet45", "migration_sonnet1m_write_failed");
      return false;
    }
    changed = true;
  }
  if (getMainLoopModelOverride() === "sonnet[1m]") {
    setMainLoopModelOverride("sonnet-4-5-20250929[1m]");
    changed = true;
  }
  saveGlobalConfig(
    (current) => ({
      ...current,
      sonnet1m45MigrationComplete: true,
    }),
    context,
  );
  if (changed) logFeatureOk("migration_sonnet1m_to_sonnet45");
  return true;
}
export { migrateSonnet1mToSonnet45 };
