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

/**
 * 迁移：Pro 用户未显式选模型时记录切到 Opus 默认（只做一次，opusProMigrationComplete）。
 */
//@ chunk-cjydagjy.js:13529-14073 fingerprint = resetProToOpusDefault (0.873)
function resetProToOpusDefault(e) {
  if (getGlobalConfig().opusProMigrationComplete) return;
  if (getAPIProvider() !== "firstParty" || !isProSubscriber()) {
    (saveGlobalConfig((current) => ({ ...current, opusProMigrationComplete: !0 }), e),
      logEvent("tengu_reset_pro_to_opus_default", { skipped: !0 }));
    return;
  }
  if (getSettings_DEPRECATED()?.model === void 0) {
    let opusProMigrationTimestamp = Date.now();
    (saveGlobalConfig(
      (current) => ({
        ...current,
        opusProMigrationComplete: !0,
        opusProMigrationTimestamp: opusProMigrationTimestamp,
      }),
      e,
    ),
      logEvent("tengu_reset_pro_to_opus_default", { skipped: !1, had_custom_model: !1 }));
  } else
    (saveGlobalConfig((current) => ({ ...current, opusProMigrationComplete: !0 }), e),
      logEvent("tengu_reset_pro_to_opus_default", { skipped: !1, had_custom_model: !0 }));
  logFeatureOk("migration_reset_pro_to_opus_default");
}

export { resetProToOpusDefault };
