/**
 * utils/cronJitterConfig.ts
 *
 * 定时任务抖动配置（GrowthBook tengu_kairos_cron_config）的 schema 与读取
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/cronJitterConfig.ts
 * pieces: chunk-823fv89k.js (2)
 * attribution: fingerprint 1, facade-exports 1
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { objectSchema, numberSchema } from "../../vendor/zod/v4/classic/schemas.js";
import { DEFAULT_CRON_JITTER_CONFIG } from "./cronTasks.js";
import { getFeatureValue_CACHED_WITH_REFRESH } from "../services/analytics/growthbook.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-823fv89k.js:335-755 fingerprint (2.1.88 match: cronJitterConfigSchema, 0.86)
/**
 * 抖动配置 schema：recurringFrac、recurringCapMs、oneShotMaxMs、oneShotFloorMs、oneShotMinuteMod、recurringMaxAgeMs、cacheLeadMs；refresh 间隔 60s。
 */
var CONFIG_REFRESH_MS; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_JITTER_MS;
var MAX_RECURRING_AGE_MS;
var cronJitterConfigSchema;
deferInit("chunk-823fv89k.js:335", () => {
  CONFIG_REFRESH_MS = 60000;
  MAX_JITTER_MS = 1800000;
  MAX_RECURRING_AGE_MS = 2592000000;
  cronJitterConfigSchema = DoctorLazy(() =>
    objectSchema({
      recurringFrac: numberSchema().min(0).max(1),
      recurringCapMs: numberSchema().int().min(0).max(MAX_JITTER_MS),
      oneShotMaxMs: numberSchema().int().min(0).max(MAX_JITTER_MS),
      oneShotFloorMs: numberSchema().int().min(0).max(MAX_JITTER_MS),
      oneShotMinuteMod: numberSchema().int().min(1).max(60),
      recurringMaxAgeMs: numberSchema()
        .int()
        .min(0)
        .max(MAX_RECURRING_AGE_MS)
        .default(DEFAULT_CRON_JITTER_CONFIG.recurringMaxAgeMs),
      cacheLeadMs: numberSchema().int().min(0).max(60000).default(DEFAULT_CRON_JITTER_CONFIG.cacheLeadMs),
    }).refine((config) => config.oneShotFloorMs <= config.oneShotMaxMs),
  );
});
//@ chunk-823fv89k.js:755-857 facade-exports (2.1.88 match: getCronJitterConfig, 1)
/**
 * 读 tengu_kairos_cron_config，校验失败用默认值。
 */
function getCronJitterConfig() {
  let raw = getFeatureValue_CACHED_WITH_REFRESH(
    "tengu_kairos_cron_config",
    DEFAULT_CRON_JITTER_CONFIG,
    CONFIG_REFRESH_MS,
  );
  let parsed = cronJitterConfigSchema().safeParse(raw);
  return parsed.success ? parsed.data : DEFAULT_CRON_JITTER_CONFIG;
}
export { getCronJitterConfig };
