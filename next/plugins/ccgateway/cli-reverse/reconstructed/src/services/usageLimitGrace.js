/**
 * services/usageLimitGrace.ts
 *
 * 2.1.316 新增：额度宽限期：利用率缓存与检查点说明。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7pwjpdkw.js (10)
 * attribution: placement 10
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { create, create_3, create_2, create_15, create_6 } from "../../vendor/zod/lib/index.mjs";
import { getOauthAccountInfo } from "../utils/auth.js";
import { getGlobalConfig, saveGlobalConfig } from "../utils/config.js";
import { claudeAiLimits } from "./claudeAiLimits.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "./analytics/growthbook.js";
import { sanitizeAttributeValue } from "../utils/sanitization.js";
import { logFeatureSad } from "./analytics/featureTelemetry.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-7pwjpdkw.js:34696-35755 placement
/**
 * 用量快照缓存：有效期常量与校验 schema。
 */
var GRACE_WINDOW_MS; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var USAGE_CACHE_TTL_MS;
var usageUtilizationSchema;
deferInit("chunk-7pwjpdkw.js:34696", () => {
  GRACE_WINDOW_MS = 3600000;
  USAGE_CACHE_TTL_MS = 60000;
  usageUtilizationSchema = DoctorLazy(() => {
    let periodSchema = create({
      utilization: create_3().nullable(),
      resets_at: create_2().nullable(),
    }).passthrough();
    let utilization = create({
      five_hour: periodSchema.nullish(),
      seven_day: periodSchema.nullish(),
      seven_day_oauth_apps: periodSchema.nullish(),
      seven_day_opus: periodSchema.nullish(),
      seven_day_sonnet: periodSchema.nullish(),
      cinder_cove: periodSchema.nullish(),
      wattle_ember: periodSchema
        .extend({
          label: create_2().nullish(),
          limit_dollars: create_3().nullish(),
          used_dollars: create_3().nullish(),
          remaining_dollars: create_3().nullish(),
          periods: create_15(
            create({
              starts_at: create_2(),
              ends_at: create_2(),
            }).passthrough(),
          ).nullish(),
        })
        .nullish(),
      extra_usage: create({
        is_enabled: create_6(),
        monthly_limit: create_3().nullable(),
        used_credits: create_3().nullable(),
        utilization: create_3().nullable(),
        currency: create_2().nullish(),
        disabled_reason: create_2().nullish(),
      })
        .passthrough()
        .nullish(),
      limits: create_15(
        create({
          kind: create_2(),
          group: create_2(),
          percent: create_3(),
          resets_at: create_2().nullable(),
          severity: create_2(),
          is_active: create_6(),
          scope: create({
            model: create({
              display_name: create_2(),
            })
              .passthrough()
              .nullish(),
            surface: create({
              display_name: create_2(),
            })
              .passthrough()
              .nullish(),
          })
            .passthrough()
            .nullish(),
        }).passthrough(),
      ).nullish(),
    }).passthrough();
    return create({
      fetchedAtMs: create_3(),
      accountUuid: create_2().optional(),
      utilization,
    });
  });
});
//@ chunk-7pwjpdkw.js:35755-36056 placement
function cacheUsageUtilization(utilization, accountUuid, storageV5) {
  let accountUuid_2 = getOauthAccountInfo()?.accountUuid;
  if (accountUuid_2 !== accountUuid) return;
  let cachedUsageUtilization = getGlobalConfig().cachedUsageUtilization;
  let cacheAgeMs =
    cachedUsageUtilization && cachedUsageUtilization.accountUuid === accountUuid_2
      ? Date.now() - cachedUsageUtilization.fetchedAtMs
      : Number.POSITIVE_INFINITY;
  if (cacheAgeMs >= 0 && cacheAgeMs < USAGE_CACHE_TTL_MS) return;
  saveGlobalConfig(
    (config) => ({
      ...config,
      cachedUsageUtilization: {
        fetchedAtMs: Date.now(),
        ...(accountUuid_2 !== undefined && {
          accountUuid: accountUuid_2,
        }),
        utilization,
      },
    }),
    storageV5,
  );
}
//@ chunk-7pwjpdkw.js:36056-36409 placement
function cachedUsageUtilization(storageV5) {
  let cachedUsageUtilization = getGlobalConfig().cachedUsageUtilization;
  if (!cachedUsageUtilization) return null;
  let parsed = usageUtilizationSchema().safeParse(cachedUsageUtilization);
  if (!parsed.success) return null;
  if (parsed.data.accountUuid !== getOauthAccountInfo()?.accountUuid) {
    saveGlobalConfig(
      (config) => ({
        ...config,
        cachedUsageUtilization: undefined,
      }),
      storageV5,
    );
    return null;
  }
  let ageMs = Date.now() - parsed.data.fetchedAtMs;
  if (ageMs < 0 || ageMs > GRACE_WINDOW_MS) return null;
  return {
    utilization: parsed.data.utilization,
    fetchedAtMs: parsed.data.fetchedAtMs,
  };
}
//@ chunk-7pwjpdkw.js:36409-36594 placement
function freshCachedUtilization(storageV5) {
  let cached = cachedUsageUtilization(storageV5);
  if (!cached) return null;
  let ageMs = Date.now() - cached.fetchedAtMs;
  if (ageMs >= USAGE_CACHE_TTL_MS || claudeAiLimits.lastAppliedObservationAtMs > cached.fetchedAtMs)
    return null;
  return {
    utilization: cached.utilization,
    ageMs,
  };
}
//@ chunk-7pwjpdkw.js:36594-36754 placement
var USAGE_LIMIT_WRAP_UP_NOTE =
  "[Usage limit reached \u2014 grace window active. Wrap up: finish or " +
  "checkpoint; don't start subagents or long work.]";
var TENGU_LANTERN_WICK_MODE = "tengu_lantern_wick_mode";
//@ chunk-7pwjpdkw.js:36754-36868 placement
function parseWrapUpMode(featureValue_CACHED_MAY_BE_STALE) {
  let normalized =
    typeof featureValue_CACHED_MAY_BE_STALE === "string"
      ? featureValue_CACHED_MAY_BE_STALE.trim().toLowerCase()
      : featureValue_CACHED_MAY_BE_STALE;
  return normalized === "wrap-up" || normalized === "next-steps" ? normalized : "off";
}
//@ chunk-7pwjpdkw.js:36868-36942 placement
var WRAP_UP_TEXT_FLAG = "tengu_lantern_wick_text";
var BOT_PROTECTED_TENGU_HAZY_WATERFALL = "bot_protected_tengu_hazy_waterfall";
//@ chunk-7pwjpdkw.js:36942-36978 placement
/**
 * 是否启用 bot 保护模式下的收尾提示文本清洗开关。
 */
function isBotProtectedWrapUpTextOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(BOT_PROTECTED_TENGU_HAZY_WATERFALL, true) !== false;
}
//@ chunk-7pwjpdkw.js:36978-37303 placement
/**
 * 校验并清理服务端下发的收尾提示文本；不合法时上报并返回 null。
 */
function formatWrapUpText(rawText) {
  if (isBotProtectedWrapUpTextOn()) {
    let sanitized = sanitizeAttributeValue(rawText);
    if (sanitized === null) {
      if (typeof rawText === "string" && rawText.trim() !== "")
        logFeatureSad("usage_limit_served_text_rejected", "wrap_up_text");
      return null;
    }
    if (typeof rawText === "string" && sanitized !== rawText.trim())
      logFeatureSad("usage_limit_served_text_altered", "wrap_up_text");
    return `[${sanitized}]`;
  }
  let trimmed = typeof rawText === "string" ? rawText.trim() : "";
  return trimmed === "" ? null : `[${trimmed}]`;
}
//@ chunk-7pwjpdkw.js:37303-37843 placement
/**
 * 额度将满时的收尾提示文本、触发比例与对外通知文案。
 */
var GRACE_CHECKPOINT_NOTE =
  "[Usage limit reached \u2014 grace window active. Checkpoint now: finish the " +
  "current step, then list up to 3 short bullets of the most impactful remaining work. Don't start subagents or long-running work.]";
var TENGU_VELLUM_ANCHOR = "tengu_vellum_anchor";
var WRAP_UP_APPROACHING_CHECKPOINT_NOTE =
  "[Usage limit approaching. Checkpoint now: finish the current step, then list up to 3 short bullets of the most impactful remaining work. Don't start subagents or long-running work.]";
var WRAP_UP_UTILIZATION_THRESHOLD = 0.95;
var WRAP_UP_APPROACHING_NOTICE =
  "Approaching your 5-hour usage limit \u2014 Claude will wrap up the current step.";
var NOTICE = "notice";
export {
  isBotProtectedWrapUpTextOn,
  formatWrapUpText,
  WRAP_UP_TEXT_FLAG,
  parseWrapUpMode,
  TENGU_LANTERN_WICK_MODE,
  GRACE_CHECKPOINT_NOTE,
  USAGE_LIMIT_WRAP_UP_NOTE,
  TENGU_VELLUM_ANCHOR,
  WRAP_UP_APPROACHING_NOTICE,
  NOTICE,
  WRAP_UP_APPROACHING_CHECKPOINT_NOTE,
  WRAP_UP_UTILIZATION_THRESHOLD,
  cachedUsageUtilization,
  freshCachedUtilization,
  cacheUsageUtilization,
};
