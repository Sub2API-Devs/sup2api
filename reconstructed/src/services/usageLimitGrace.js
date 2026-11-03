/**
 * services/usageLimitGrace.ts
 *
 * 2.1.316 新增：额度宽限期：利用率缓存与检查点说明。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-w5ndchqs.js (10)
 * attribution: placement 10
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { create, create_3, create_2, create_15, create_6 } from "../../vendor/zod/lib/index.mjs";
import { getOauthAccountInfo } from "../utils/auth.js";
import { getGlobalConfig, saveGlobalConfig } from "../utils/config.js";
import { claudeAiLimits } from "./claudeAiLimits.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "./analytics/growthbook.js";
import { sanitizeAttributeValue } from "../utils/sanitization.js";
import { logFeatureSad } from "./analytics/featureTelemetry.js";

//@ chunk-w5ndchqs.js:34489-35548 placement
/**
 * 用量快照缓存：有效期常量与校验 schema。
 */
var GRACE_WINDOW_MS = 3600000;
var USAGE_CACHE_TTL_MS = 60000;
var usageUtilizationSchema = DoctorLazy(() => {
  let e = create({
    utilization: create_3().nullable(),
    resets_at: create_2().nullable(),
  }).passthrough();
  let utilization = create({
    five_hour: e.nullish(),
    seven_day: e.nullish(),
    seven_day_oauth_apps: e.nullish(),
    seven_day_opus: e.nullish(),
    seven_day_sonnet: e.nullish(),
    cinder_cove: e.nullish(),
    wattle_ember: e
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
//@ chunk-w5ndchqs.js:35548-35849 placement
function cacheUsageUtilization(utilization, accountUuid, r) {
  let accountUuid_2 = getOauthAccountInfo()?.accountUuid;
  if (accountUuid_2 !== accountUuid) return;
  let cachedUsageUtilization = getGlobalConfig().cachedUsageUtilization;
  let m =
    cachedUsageUtilization && cachedUsageUtilization.accountUuid === accountUuid_2
      ? Date.now() - cachedUsageUtilization.fetchedAtMs
      : Number.POSITIVE_INFINITY;
  if (m >= 0 && m < USAGE_CACHE_TTL_MS) return;
  saveGlobalConfig(
    (h) => ({
      ...h,
      cachedUsageUtilization: {
        fetchedAtMs: Date.now(),
        ...(accountUuid_2 !== undefined && {
          accountUuid: accountUuid_2,
        }),
        utilization,
      },
    }),
    r,
  );
}
//@ chunk-w5ndchqs.js:35849-36202 placement
function cachedUsageUtilization(e) {
  let cachedUsageUtilization = getGlobalConfig().cachedUsageUtilization;
  if (!cachedUsageUtilization) return null;
  let r = usageUtilizationSchema().safeParse(cachedUsageUtilization);
  if (!r.success) return null;
  if (r.data.accountUuid !== getOauthAccountInfo()?.accountUuid) {
    saveGlobalConfig(
      (d) => ({
        ...d,
        cachedUsageUtilization: undefined,
      }),
      e,
    );
    return null;
  }
  let s = Date.now() - r.data.fetchedAtMs;
  if (s < 0 || s > GRACE_WINDOW_MS) return null;
  return {
    utilization: r.data.utilization,
    fetchedAtMs: r.data.fetchedAtMs,
  };
}
//@ chunk-w5ndchqs.js:36202-36387 placement
function freshCachedUtilization(e) {
  let n = cachedUsageUtilization(e);
  if (!n) return null;
  let r = Date.now() - n.fetchedAtMs;
  if (r >= USAGE_CACHE_TTL_MS || claudeAiLimits.lastAppliedObservationAtMs > n.fetchedAtMs) return null;
  return {
    utilization: n.utilization,
    ageMs: r,
  };
}
//@ chunk-w5ndchqs.js:36387-36547 placement
var USAGE_LIMIT_WRAP_UP_NOTE =
  "[Usage limit reached \u2014 grace window active. Wrap up: finish or " +
  "checkpoint; don't start subagents or long work.]";
var TENGU_LANTERN_WICK_MODE = "tengu_lantern_wick_mode";
//@ chunk-w5ndchqs.js:36547-36661 placement
function parseWrapUpMode(featureValue_CACHED_MAY_BE_STALE) {
  let n =
    typeof featureValue_CACHED_MAY_BE_STALE === "string"
      ? featureValue_CACHED_MAY_BE_STALE.trim().toLowerCase()
      : featureValue_CACHED_MAY_BE_STALE;
  return n === "wrap-up" || n === "next-steps" ? n : "off";
}
//@ chunk-w5ndchqs.js:36661-36735 placement
var WRAP_UP_TEXT_FLAG = "tengu_lantern_wick_text";
var BOT_PROTECTED_TENGU_HAZY_WATERFALL = "bot_protected_tengu_hazy_waterfall";
//@ chunk-w5ndchqs.js:36735-36771 placement
/**
 * 是否启用 bot 保护模式下的收尾提示文本清洗开关。
 */
function isBotProtectedWrapUpTextOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(BOT_PROTECTED_TENGU_HAZY_WATERFALL, true) !== false;
}
//@ chunk-w5ndchqs.js:36771-37096 placement
/**
 * 校验并清理服务端下发的收尾提示文本；不合法时上报并返回 null。
 */
function formatWrapUpText(e) {
  if (isBotProtectedWrapUpTextOn()) {
    let r = sanitizeAttributeValue(e);
    if (r === null) {
      if (typeof e === "string" && e.trim() !== "")
        logFeatureSad("usage_limit_served_text_rejected", "wrap_up_text");
      return null;
    }
    if (typeof e === "string" && r !== e.trim())
      logFeatureSad("usage_limit_served_text_altered", "wrap_up_text");
    return `[${r}]`;
  }
  let n = typeof e === "string" ? e.trim() : "";
  return n === "" ? null : `[${n}]`;
}
//@ chunk-w5ndchqs.js:37096-37636 placement
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
  WRAP_UP_UTILIZATION_THRESHOLD,
  cachedUsageUtilization,
  freshCachedUtilization,
  cacheUsageUtilization,
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
};
