/**
 * migrations/resetProToOpusDefault.ts
 *
 * 迁移：Pro 订阅一方用户的默认模型重置为 Opus（只记标记）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/migrations/resetProToOpusDefault.ts
 * pieces: chunk-cjydagjy.js (1)
 * attribution: fingerprint 1
 */
import { getGlobalConfig, saveGlobalConfig } from "../utils/config.js";
import { getAPIProvider } from "../utils/model/providers.js";
import { isProSubscriber } from "../utils/auth.js";
import { logEvent } from "../services/analytics/index.js";
import { getSettings_DEPRECATED } from "../utils/settings/settings.js";
import { logFeatureOk } from "../services/analytics/featureTelemetry.js";

//@ chunk-cjydagjy.js:13529-14073 fingerprint (2.1.88 match: resetProToOpusDefault, 0.873)
/**
 * 迁移：Pro 用户未显式选模型时记录切到 Opus 默认（只做一次，opusProMigrationComplete）。
 */
function resetProToOpusDefault(context) {
  if (getGlobalConfig().opusProMigrationComplete) return;
  if (getAPIProvider() !== "firstParty" || !isProSubscriber()) {
    saveGlobalConfig(
      (current) => ({
        ...current,
        opusProMigrationComplete: true,
      }),
      context,
    );
    logEvent("tengu_reset_pro_to_opus_default", {
      skipped: true,
    });
    return;
  }
  if (getSettings_DEPRECATED()?.model === undefined) {
    let opusProMigrationTimestamp = Date.now();
    saveGlobalConfig(
      (current) => ({
        ...current,
        opusProMigrationComplete: true,
        opusProMigrationTimestamp,
      }),
      context,
    );
    logEvent("tengu_reset_pro_to_opus_default", {
      skipped: false,
      had_custom_model: false,
    });
  } else {
    saveGlobalConfig(
      (current) => ({
        ...current,
        opusProMigrationComplete: true,
      }),
      context,
    );
    logEvent("tengu_reset_pro_to_opus_default", {
      skipped: false,
      had_custom_model: true,
    });
  }
  logFeatureOk("migration_reset_pro_to_opus_default");
}
export { resetProToOpusDefault };
