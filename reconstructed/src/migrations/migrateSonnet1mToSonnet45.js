/**
 * migrations/migrateSonnet1mToSonnet45.ts
 *
 * 迁移：sonnet[1m] 固定到 Sonnet 4.5 1M
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/migrations/migrateSonnet1mToSonnet45.ts
 * pieces: chunk-cjydagjy.js (1)
 * attribution: fingerprint 1
 */
import { getGlobalConfig, saveGlobalConfig } from "../utils/config.js";
import { getSettingsForSourceForUpkeep, updateSettingsForSource } from "../utils/settings/settings.js";
import { logForDebugging } from "../utils/debug.js";
import { logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { getMainLoopModelOverride, setMainLoopModelOverride } from "../bootstrap/state.js";

/**
 * 迁移：sonnet[1m] → sonnet-4-5-20250929[1m]（只做一次，sonnet1m45MigrationComplete）。
 */
//@ chunk-cjydagjy.js:11037-11557 fingerprint = migrateSonnet1mToSonnet45 (0.651)
async function migrateSonnet1mToSonnet45(e) {
  if (getGlobalConfig().sonnet1m45MigrationComplete) return !0;
  let n = !1;
  if (getSettingsForSourceForUpkeep("userSettings")?.model === "sonnet[1m]") {
    let { error: error } = await updateSettingsForSource(
      "userSettings",
      { model: "sonnet-4-5-20250929[1m]" },
      void 0,
      e,
    );
    if (error)
      return (
        logForDebugging(`Failed to migrate sonnet[1m] model setting: ${error}`, { level: "error" }),
        logFeatureBad("migration_sonnet1m_to_sonnet45", "migration_sonnet1m_write_failed"),
        !1
      );
    n = !0;
  }
  if (getMainLoopModelOverride() === "sonnet[1m]")
    (setMainLoopModelOverride("sonnet-4-5-20250929[1m]"), (n = !0));
  if ((saveGlobalConfig((current) => ({ ...current, sonnet1m45MigrationComplete: !0 }), e), n))
    logFeatureOk("migration_sonnet1m_to_sonnet45");
  return !0;
}

export { migrateSonnet1mToSonnet45 };
