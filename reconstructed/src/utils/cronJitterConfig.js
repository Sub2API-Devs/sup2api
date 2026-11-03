/**
 * utils/cronJitterConfig.ts
 *
 * 定时任务抖动配置（GrowthBook tengu_kairos_cron_config）的 schema 与读取
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/cronJitterConfig.ts
 * pieces: chunk-castqjps.js (2)
 * attribution: fingerprint 1, facade-exports 1
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, E } from "../../vendor/zod/v4/classic/schemas.js";
import { DEFAULT_CRON_JITTER_CONFIG } from "./cronTasks.js";
import { getFeatureValue_CACHED_WITH_REFRESH } from "../services/analytics/growthbook.js";

//@ chunk-castqjps.js:335-755 fingerprint = cronJitterConfigSchema (0.86)
/**
 * 抖动配置 schema：recurringFrac、recurringCapMs、oneShotMaxMs、oneShotFloorMs、oneShotMinuteMod、recurringMaxAgeMs、cacheLeadMs；refresh 间隔 60s。
 */
var CONFIG_REFRESH_MS = 60000;
var MAX_JITTER_MS = 1800000;
var MAX_RECURRING_AGE_MS = 2592000000;
var cronJitterConfigSchema = DoctorLazy(() =>
  u({
    recurringFrac: E().min(0).max(1),
    recurringCapMs: E().int().min(0).max(MAX_JITTER_MS),
    oneShotMaxMs: E().int().min(0).max(MAX_JITTER_MS),
    oneShotFloorMs: E().int().min(0).max(MAX_JITTER_MS),
    oneShotMinuteMod: E().int().min(1).max(60),
    recurringMaxAgeMs: E()
      .int()
      .min(0)
      .max(MAX_RECURRING_AGE_MS)
      .default(DEFAULT_CRON_JITTER_CONFIG.recurringMaxAgeMs),
    cacheLeadMs: E().int().min(0).max(60000).default(DEFAULT_CRON_JITTER_CONFIG.cacheLeadMs),
  }).refine((n) => n.oneShotFloorMs <= n.oneShotMaxMs),
);
//@ chunk-castqjps.js:755-857 facade-exports = getCronJitterConfig (1)
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
