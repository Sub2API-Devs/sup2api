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
var GRACE_WINDOW_MS = 3600000,
  rt = 60000,
  un = DoctorLazy(() => {
    let passthrough = create({
        utilization: create_3().nullable(),
        resets_at: create_2().nullable(),
      }).passthrough(),
      passthrough_2 = create({
        five_hour: passthrough.nullish(),
        seven_day: passthrough.nullish(),
        seven_day_oauth_apps: passthrough.nullish(),
        seven_day_opus: passthrough.nullish(),
        seven_day_sonnet: passthrough.nullish(),
        cinder_cove: passthrough.nullish(),
        wattle_ember: passthrough
          .extend({
            label: create_2().nullish(),
            limit_dollars: create_3().nullish(),
            used_dollars: create_3().nullish(),
            remaining_dollars: create_3().nullish(),
            periods: create_15(
              create({ starts_at: create_2(), ends_at: create_2() }).passthrough(),
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
              model: create({ display_name: create_2() }).passthrough().nullish(),
              surface: create({ display_name: create_2() }).passthrough().nullish(),
            })
              .passthrough()
              .nullish(),
          }).passthrough(),
        ).nullish(),
      }).passthrough();
    return create({
      fetchedAtMs: create_3(),
      accountUuid: create_2().optional(),
      utilization: passthrough_2,
    });
  });
//@ chunk-w5ndchqs.js:35548-35849 placement
function cacheUsageUtilization(e, n, r) {
  let s = getOauthAccountInfo()?.accountUuid;
  if (s !== n) return;
  let cachedUsageUtilization = getGlobalConfig().cachedUsageUtilization,
    m =
      cachedUsageUtilization && cachedUsageUtilization.accountUuid === s
        ? Date.now() - cachedUsageUtilization.fetchedAtMs
        : Number.POSITIVE_INFINITY;
  if (m >= 0 && m < rt) return;
  saveGlobalConfig(
    (h) => ({
      ...h,
      cachedUsageUtilization: {
        fetchedAtMs: Date.now(),
        ...(s !== void 0 && { accountUuid: s }),
        utilization: e,
      },
    }),
    r,
  );
}
//@ chunk-w5ndchqs.js:35849-36202 placement
function cachedUsageUtilization(e) {
  let cachedUsageUtilization = getGlobalConfig().cachedUsageUtilization;
  if (!cachedUsageUtilization) return null;
  let safeParse = un().safeParse(cachedUsageUtilization);
  if (!safeParse.success) return null;
  if (safeParse.data.accountUuid !== getOauthAccountInfo()?.accountUuid)
    return (saveGlobalConfig((d) => ({ ...d, cachedUsageUtilization: void 0 }), e), null);
  let s = Date.now() - safeParse.data.fetchedAtMs;
  if (s < 0 || s > GRACE_WINDOW_MS) return null;
  return { utilization: safeParse.data.utilization, fetchedAtMs: safeParse.data.fetchedAtMs };
}
//@ chunk-w5ndchqs.js:36202-36387 placement
function freshCachedUtilization(e) {
  let n = cachedUsageUtilization(e);
  if (!n) return null;
  let r = Date.now() - n.fetchedAtMs;
  if (r >= rt || claudeAiLimits.lastAppliedObservationAtMs > n.fetchedAtMs) return null;
  return { utilization: n.utilization, ageMs: r };
}
//@ chunk-w5ndchqs.js:36387-36547 placement
var USAGE_LIMIT_WRAP_UP_NOTE =
    "[Usage limit reached \u2014 grace window active. Wrap up: finish or " +
    "checkpoint; don't start subagents or long work.]",
  TENGU_LANTERN_WICK_MODE = "tengu_lantern_wick_mode";
//@ chunk-w5ndchqs.js:36547-36661 placement
function parseWrapUpMode(e) {
  let n = typeof e === "string" ? e.trim().toLowerCase() : e;
  return n === "wrap-up" || n === "next-steps" ? n : "off";
}
//@ chunk-w5ndchqs.js:36661-36735 placement
var WRAP_UP_TEXT_FLAG = "tengu_lantern_wick_text",
  BOT_PROTECTED_TENGU_HAZY_WATERFALL = "bot_protected_tengu_hazy_waterfall";
//@ chunk-w5ndchqs.js:36735-36771 placement
function bhn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(BOT_PROTECTED_TENGU_HAZY_WATERFALL, !0) !== !1;
}
/**
 * 校验并清理服务端下发的收尾提示文本；不合法时上报并返回 null。
 */
//@ chunk-w5ndchqs.js:36771-37096 placement
function formatWrapUpText(e) {
  if (bhn()) {
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
var GRACE_CHECKPOINT_NOTE =
    "[Usage limit reached \u2014 grace window active. Checkpoint now: finish the " +
    "current step, then list up to 3 short bullets of the most impactful remaining work. Don't start subagents or long-running work.]",
  TENGU_VELLUM_ANCHOR = "tengu_vellum_anchor",
  hJs =
    "[Usage limit approaching. Checkpoint now: finish the current step, then list up to 3 short bullets of the most impactful remaining work. Don't start subagents or long-running work.]",
  cn = 0.95,
  yJs = "Approaching your 5-hour usage limit \u2014 Claude will wrap up the current step.",
  NOTICE = "notice";

export {
  cn,
  cachedUsageUtilization,
  freshCachedUtilization,
  cacheUsageUtilization,
  bhn,
  formatWrapUpText,
  WRAP_UP_TEXT_FLAG,
  parseWrapUpMode,
  TENGU_LANTERN_WICK_MODE,
  GRACE_CHECKPOINT_NOTE,
  USAGE_LIMIT_WRAP_UP_NOTE,
  TENGU_VELLUM_ANCHOR,
  yJs,
  NOTICE,
  hJs,
};
