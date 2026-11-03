/**
 * services/api/usage.ts
 *
 * /usage 用量（利用率）拉取：订阅用户查询各限额窗口利用率，带重放缓存与认证失败处理。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/api/usage.ts
 * pieces: chunk-1m53rcjd.js (9), chunk-w5ndchqs.js (53)
 * attribution: placement 59, callgraph-fingerprint 1, layout 2
 */
import { isRateLimitMockingEnabled, getRawUtilization, currentUsageWindows } from "../claudeAiLimits.js";
import { logForDebugging } from "../../utils/debug.js";
import { AxiosError, AxiosHeaders, isAxiosError } from "../../../vendor/axios/dist/esm/axios.js";
import { hasApiClient, Agr, hashCredential, apiClient } from "../routines/routinesApi.js";
import {
  checkAndRefreshOAuthTokenIfNeeded,
  getOauthAccountInfo,
  isClaudeAISubscriber,
  hasProfileScope,
  hasStoredOAuthRefreshToken,
  getSubscriptionType,
} from "../../utils/auth.js";
import { parseRetryAfterMs } from "../../bridge/debugUtils.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  isGrowthBookEnabled,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  initializeGrowthBook,
} from "../analytics/growthbook.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { isPolicyAllowed } from "../policyLimits/policyEvidence.js";
import { vc } from "../../utils/taskDescription.js";
import { isOutOfCreditsReason } from "../../utils/fastMode.js";
import { withTimeout } from "../../utils/sleep.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { A, u, o, hu } from "../../../vendor/zod/v4/classic/schemas.js";
import { getTheme } from "../../utils/theme.js";
import { ge } from "../../utils/identity.js";
import { HostScoped } from "../../utils/hostScoped.js";
import {
  getRootSession,
  getTotalCostUSD,
  getTotalAPIDuration,
  getTotalDuration,
  getTotalLinesAdded,
  getTotalLinesRemoved,
  getModelUsage,
} from "../../bootstrap/state.js";
import { withOAuth401Retry } from "../../utils/http.js";
import { withFeatureTelemetry } from "../analytics/featureTelemetry.js";
import {
  LIMIT_MESSAGE_PREFIXES,
  RATE_LIMIT_WARNING_PREFIXES,
  OVERAGE_NOTICE_PREFIXES,
  RATE_LIMIT_ERROR_PREFIXES,
  Ffs,
} from "../rateLimitMessages.js";
import { cachedUsageUtilization, freshCachedUtilization, cacheUsageUtilization } from "../usageLimitGrace.js";
import { planWindowPercent } from "../../utils/format.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { isExpectedApiError, errorMessage } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import {
  costliestBehavior,
  usageRecommendationAction,
  KGe,
  collectUsageRecommendations,
} from "../usageInsights/recommendations.js";
import { fAe } from "../usageInsights/transcriptScan.js";

//@ chunk-w5ndchqs.js:9271-9316 placement
function isMockRateLimit429(e) {
  return isRateLimitMockingEnabled() && e.status === 429;
}
//@ chunk-w5ndchqs.js:9316-9415 placement
var NEAR_LIMIT_UTILIZATION = 0.7,
  m7n = "individual spend limit",
  ZKr = "individual usage limit",
  HTTPS_CLAU_DE_WRAP_UP = "https://clau.de/wrap-up";
//@ chunk-w5ndchqs.js:9415-9432 placement
var ht = 64,
  yt = 200;
//@ chunk-w5ndchqs.js:9432-9880 placement
class RememberedResponses {
  maxHoldMs;
  #e = new Map();
  constructor(e) {
    this.maxHoldMs = e;
  }
  remember(e, n) {
    let recordedAtMs = n.recordedAtMs;
    for (let [s, d] of this.#e) if (this.#t(d, recordedAtMs) === void 0) this.#e.delete(s);
    this.#e.set(e, { ...n, untilMs: Math.min(n.untilMs, n.recordedAtMs + this.maxHoldMs) });
  }
  recall(e, n = Date.now()) {
    let r = this.#e.get(e);
    if (r === void 0) return;
    let s = this.#t(r, n);
    if (s === void 0) this.#e.delete(e);
    return s;
  }
  clear() {
    this.#e.clear();
  }
  #t(e, n) {
    return n < e.recordedAtMs || n >= e.untilMs ? void 0 : e;
  }
}
//@ chunk-w5ndchqs.js:9880-10373 placement
class RememberedResponseError extends AxiosError {
  replayed = !0;
  kind;
  recordedAtMs;
  untilMs;
  constructor(e, n = Date.now()) {
    let r = { headers: new AxiosHeaders() },
      max = Math.max(0, Math.round((n - e.recordedAtMs) / 1000)),
      max_2 = Math.max(0, Math.ceil((e.untilMs - n) / 1000));
    super(
      `the endpoint answered ${e.status} ${max}s ago; not asked again for ${max_2}s`,
      "ERR_REMEMBERED_RESPONSE",
      r,
      void 0,
      { status: e.status, statusText: "", headers: {}, config: r, data: e.body },
    );
    ((this.name = "RememberedResponseError"),
      (this.kind = e.kind),
      (this.recordedAtMs = e.recordedAtMs),
      (this.untilMs = e.untilMs));
  }
}
//@ chunk-w5ndchqs.js:10373-10410 placement
function De(e) {
  return e instanceof RememberedResponseError;
}
//@ chunk-w5ndchqs.js:10410-10503 placement
function isAuthRejectedUsageError(e) {
  if (De(e)) return e.kind === "auth_rejected";
  let n = usageErrorResponse(e);
  return n !== void 0 && le(n);
}
//@ chunk-w5ndchqs.js:10503-10583 placement
function le(e) {
  return e.status === 401 || (e.status === 403 && e.anthropicError !== void 0);
}
//@ chunk-w5ndchqs.js:10583-10804 placement
async function claudeAiAuthKey({ credentials: credentials, settle: settle }) {
  if (settle && hasApiClient())
    try {
      await checkAndRefreshOAuthTokenIfNeeded({ credentials: credentials });
    } catch (error) {
      logForDebugging(
        `claudeAiAuthKey: token settle failed (${error instanceof Error ? error.message : String(error)}); keying the token in memory`,
      );
    }
  return Agr();
}
//@ chunk-w5ndchqs.js:10804-11138 placement
function usageErrorResponse(e) {
  if (!isAxiosError(e) || De(e)) return;
  let n = AxiosHeaders.from(e.config?.headers ?? {}).get("Authorization"),
    r = e.response?.headers?.["retry-after"];
  return {
    status: e.response?.status,
    sentAuthKey: typeof n === "string" && n !== "" ? hashCredential(n) : null,
    retryAfterMs: parseRetryAfterMs(typeof r === "string" ? r : typeof r === "number" ? String(r) : void 0),
    anthropicError: hasProgressMessage(e.response?.data),
  };
}
/**
 * 从对象中截取 {error:{type,message}} 摘要（API 错误）。
 */
//@ chunk-w5ndchqs.js:11138-11439 placement = hasProgressMessage (1)
function hasProgressMessage(data) {
  if (typeof data !== "object" || data === null || !("error" in data)) return;
  let error = data.error;
  if (typeof error !== "object" || error === null || !("type" in error) || typeof error.type !== "string")
    return;
  let r =
    "message" in error && typeof error.message === "string" ? truncateToLength(error.message, yt) : void 0;
  return { error: { type: truncateToLength(error.type, ht), ...(r !== void 0 && { message: r }) } };
}
//@ chunk-w5ndchqs.js:11439-12113 placement
var PROMO_OFFER_FLAG = "tengu_starry_waterfall",
  F = {
    menuSuffixPctOff: "at least {pct}% off \xB7 {days} left",
    menuSuffixExtraCredit: "get at least {pct}% extra credit \xB7 {days} left",
    hintPctOff: "Usage credits are at least {pct}% off \xB7 {days} left \xB7 /usage-credits",
    hintExtraCredit: "Buy usage credits and get at least {pct}% extra \xB7 {days} left \xB7 /usage-credits",
    dialogHeaderPctOff: "Limited-time offer: at least {pct}% off \xB7 {days} left",
    dialogHeaderExtraCredit: "Limited-time offer: at least {pct}% extra credit \xB7 {days} left",
    bannerPillPctOff: "At least {pct}% off usage credits \xB7 {days} left",
    bannerPillExtraCredit: "At least {pct}% extra usage credits \xB7 {days} left",
  };
//@ chunk-w5ndchqs.js:12113-12203 placement
function ce() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE(PROMO_OFFER_FLAG, {});
  return typeof e === "object" && e !== null && !Array.isArray(e) ? e : {};
}
//@ chunk-w5ndchqs.js:12203-12276 placement
function isPromoOfferEnabled() {
  return ce().enabled === !0 && !isEssentialTrafficOnly() && isPolicyAllowed("allow_promo_offers");
}
//@ chunk-w5ndchqs.js:12276-12361 placement
function promoOfferVersion() {
  let version = ce().version;
  return typeof version === "number" && Number.isFinite(version) ? version : 0;
}
//@ chunk-w5ndchqs.js:12361-12423 placement
function H(e, n) {
  return typeof e === "string" && e.trim() !== "" ? e : n;
}
//@ chunk-w5ndchqs.js:12423-12957 placement
function promoOfferStrings() {
  let e = ce();
  return {
    menuSuffixPctOff: H(e.menuSuffixPctOff, F.menuSuffixPctOff),
    menuSuffixExtraCredit: H(e.menuSuffixExtraCredit, F.menuSuffixExtraCredit),
    hintPctOff: H(e.hintPctOff, F.hintPctOff),
    hintExtraCredit: H(e.hintExtraCredit, F.hintExtraCredit),
    dialogHeaderPctOff: H(e.dialogHeaderPctOff, F.dialogHeaderPctOff),
    dialogHeaderExtraCredit: H(e.dialogHeaderExtraCredit, F.dialogHeaderExtraCredit),
    bannerPillPctOff: H(e.bannerPillPctOff, F.bannerPillPctOff),
    bannerPillExtraCredit: H(e.bannerPillExtraCredit, F.bannerPillExtraCredit),
  };
}
//@ chunk-w5ndchqs.js:12957-12973 placement = SEP_WIDTH (1)
var SEP_WIDTH = " \xB7 ";
//@ chunk-w5ndchqs.js:12973-13279 placement
function fillUsageTemplate(e, n) {
  let r = e;
  if (n.daysLeft === null || n.daysLeft <= 0) {
    let filtered = r.split(SEP_WIDTH).filter((d) => !d.includes("{days}"));
    ((r = filtered.length > 0 ? filtered.join(SEP_WIDTH) : r), (r = r.replaceAll("{days}", "").trim()));
  } else {
    let s = n.daysLeft === 1 ? "1 day" : `${n.daysLeft} days`;
    r = r.replaceAll("{days}", s);
  }
  return vc(r.replaceAll("{pct}", String(n.pct)));
}
//@ chunk-w5ndchqs.js:13279-13354 placement
var freeze = Object.freeze(["Fable", "Fable 5", "Fable 5.1"]),
  freeze_2 = Object.freeze([]);
//@ chunk-w5ndchqs.js:13354-13386 placement
function ze() {
  return isGrowthBookEnabled() ? freeze_2 : freeze;
}
//@ chunk-w5ndchqs.js:13386-13470 placement
function HEt(e) {
  if (e?.is_enabled === !0) return !0;
  return isOutOfCreditsReason(e?.disabled_reason ?? null);
}
//@ chunk-w5ndchqs.js:13470-13614 placement
var USAGE_LIMIT_KEYS = [
  "five_hour",
  "seven_day",
  "seven_day_oauth_apps",
  "seven_day_opus",
  "seven_day_sonnet",
  "cinder_cove",
  "wattle_ember",
  "extra_usage",
  "limits",
];
//@ chunk-w5ndchqs.js:13614-13686 placement
function isPlainObject(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e);
}
//@ chunk-w5ndchqs.js:13686-13782 placement
function kVe(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e) && USAGE_LIMIT_KEYS.some((n) => n in e);
}
//@ chunk-w5ndchqs.js:13782-13827 placement
var TENGU_USAGE_OVERAGE_INCLUDED_MODELS = "tengu_usage_overage_included_models";
//@ chunk-w5ndchqs.js:13827-13957 placement
function overageIncludedModels() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_USAGE_OVERAGE_INCLUDED_MODELS, null);
  if (e === null || e === void 0) return ze();
  return Array.isArray(e) ? e.filter((n) => typeof n === "string") : [];
}
//@ chunk-w5ndchqs.js:13957-14015 placement
var Et = 1500,
  Fe = "usage: overage-included models allowlist";
/**
 * 超额包含模型白名单仍来自回退值或磁盘缓存时，限时等待 GrowthBook 初始化，以便按模型显示的用量行使用最新名单。
 */
//@ chunk-w5ndchqs.js:14015-14478 placement
async function refreshOverageModelsFlag() {
  let e = () => getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_USAGE_OVERAGE_INCLUDED_MODELS, []).source,
    now = Date.now();
  try {
    let r = e();
    if (r !== "fallback" && r !== "disk") return;
    (await withTimeout(initializeGrowthBook(), Et, Fe),
      logForDebugging(
        `usage: GrowthBook init settled after ${Date.now() - now}ms; overage-included models allowlist now read from ${e()} (was ${r})`,
      ));
  } catch (error) {
    logForDebugging(
      `usage: overage-included models allowlist not refreshed after ${Date.now() - now}ms (${error instanceof Error && error.message === Fe ? "timeout" : "error"}); per-model rows use the cached list`,
      { level: "warn" },
    );
  }
}
//@ chunk-w5ndchqs.js:14478-14644 placement
var TENGU_RATE_LIMIT_PROMO_NOTICES = "tengu_rate_limit_promo_notices",
  Ct = DoctorLazy(() =>
    A(
      u({
        bar: o(),
        text: o(),
        variant: hu((e) => typeof e === "string" && Object.hasOwn(getTheme("dark"), e))
          .optional()
          .catch(void 0),
      }),
    ),
  );
//@ chunk-w5ndchqs.js:14644-14721 placement
function a2o() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_RATE_LIMIT_PROMO_NOTICES, []),
    safeParse = Ct().safeParse(e);
  return safeParse.success ? safeParse.data : [];
}
//@ chunk-w5ndchqs.js:14721-14847 placement
function isModelScopedWeeklyLimit(e) {
  return (
    e !== null &&
    typeof e === "object" &&
    e.kind === "weekly_scoped" &&
    typeof e.scope?.model?.display_name === "string"
  );
}
//@ chunk-w5ndchqs.js:14847-14938 placement
function _hn(e) {
  return (
    Array.isArray(e) && e.some((n) => typeof n === "object" && n !== null && isModelScopedWeeklyLimit(n))
  );
}
/**
 * 判断用量 limits 数组里是否有按模型划分的条目（或无法识别的条目）。
 */
//@ chunk-w5ndchqs.js:14938-15044 placement
function hasModelScopedLimits(e) {
  return Array.isArray(e) && e.some((n) => typeof n !== "object" || n === null || n.scope?.model != null);
}
/**
 * 从用量 limits 中挑出指定模型的周用量条目，转成"Current week (模型名)"行。
 */
//@ chunk-w5ndchqs.js:15044-15384 placement
function modelScopedWeeklyRows(limits, modelNames) {
  let mapped = modelNames.map((s) => s.toLowerCase());
  if (mapped.length === 0 || !Array.isArray(limits)) return [];
  return limits
    .filter(isModelScopedWeeklyLimit)
    .filter((s) => mapped.includes(s.scope.model.display_name.toLowerCase()))
    .map((s) => ({
      title: `Current week (${s.scope.model.display_name})`,
      displayName: s.scope.model.display_name,
      limit: { utilization: s.percent, resets_at: s.resets_at },
    }));
}
//@ chunk-w5ndchqs.js:15384-15555 placement
var USAGE_CACHE_TTL_MS = 300000,
  REMEMBERED_RESPONSE_TTL_MS = 3600000,
  REFUSAL_REMEMBER_MS = 3600000,
  rememberedUsageResponses = ge(new RememberedResponses(REMEMBERED_RESPONSE_TTL_MS), (e) => e.clear()),
  usageOauthRefreshLatch = ge({ attempted: !1 }, (e) => {
    e.attempted = !1;
  }),
  usageRefusedKeys = ge(new Set(), (e) => {
    e.clear();
  }),
  TENGU_FEDERATED_ROBIN = "tengu_federated_robin";
//@ chunk-w5ndchqs.js:15555-15585 placement
function Be() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_FEDERATED_ROBIN, !0);
}
//@ chunk-w5ndchqs.js:15585-15621 placement
function kt(e) {
  return e >= 200 && e < 300;
}
//@ chunk-w5ndchqs.js:15621-15708 placement
var Wt = new HostScoped(() => ({ pending: null, requester: null, credentials: void 0, offerSurface: null }));
//@ chunk-w5ndchqs.js:15708-15790 placement
function Mt() {
  let e = getOauthAccountInfo();
  return `${e?.organizationUuid ?? ""}:${e?.accountUuid ?? ""}`;
}
/**
 * 请求 /api/oauth/usage（可带 at_wall、cedar_ember、skip_spend 参数）取当前额度利用率；记住被拒的 bearer，避免反复请求。
 */
//@ chunk-w5ndchqs.js:15790-16363 placement
async function fetchUtilization(e, n = {}) {
  if (n.read !== "at_wall" && n.read !== "starry_waterfall")
    return fetchUtilization_2(e, n.read ?? "plain", usageEndpointPath(n));
  let of = Wt.of(getRootSession().host),
    s = Mt(),
    d = of.pending !== null && of.requester === s && of.credentials === e;
  if (n.read === "starry_waterfall") {
    if (d && of.offerSurface === n.surface) return of.pending;
    return fetchUtilization_2(e, "starry_waterfall", usageEndpointPath(n));
  }
  if (d) return of.pending;
  let m = usageEndpointPath(n),
    h = fetchUtilization_2(e, "at_wall", m).finally(() => {
      if (of.pending === h)
        ((of.pending = null), (of.requester = null), (of.credentials = void 0), (of.offerSurface = null));
    });
  return (
    (of.pending = h),
    (of.requester = s),
    (of.credentials = e),
    (of.offerSurface = m.includes(`${STARRY_WATERFALL}=`) ? Ve(n) : null),
    h
  );
}
//@ chunk-w5ndchqs.js:16363-16389 placement
var STARRY_WATERFALL = "starry_waterfall";
//@ chunk-w5ndchqs.js:16389-16433 placement
function Ve(e) {
  return e.surface ?? "cli_menu";
}
//@ chunk-w5ndchqs.js:16433-16789 placement
function usageEndpointPath(e) {
  switch (e.read) {
    case void 0:
    case "plain":
      return "/api/oauth/usage";
    case "cedar_ember":
      return "/api/oauth/usage?cedar_ember=1&skip_spend=1";
    case "at_wall":
      return isPromoOfferEnabled()
        ? `/api/oauth/usage?at_wall=1&${STARRY_WATERFALL}=${Ve(e)}&skip_spend=1`
        : "/api/oauth/usage?at_wall=1&skip_spend=1";
    case "starry_waterfall":
      return `/api/oauth/usage?${STARRY_WATERFALL}=${e.surface}&skip_spend=1`;
  }
}
/**
 * 拉取订阅利用率（各窗口），失败结果可重放；auth_rejected 时等待挂起刷新后重试。
 */
//@ chunk-w5ndchqs.js:16789-18746 callgraph-fingerprint = fetchUtilization (0.181)
async function fetchUtilization_2(e, n, r) {
  let tokens = Be();
  if (!tokens) rememberedUsageResponses.clear();
  let d =
    tokens && isClaudeAISubscriber() && hasProfileScope()
      ? recallUsageOutcome(await claudeAiAuthKey({ credentials: e, settle: !1 }))
      : void 0;
  if (d !== void 0) d = recallUsageOutcome(await claudeAiAuthKey({ credentials: e, settle: !0 }));
  if (d?.kind === "auth_rejected" && usageRefusedKeys.size > 0)
    (await Promise.allSettled([...usageRefusedKeys]),
      (d = recallUsageOutcome(await claudeAiAuthKey({ credentials: e, settle: !0 }))));
  if (d !== void 0) {
    let h = new RememberedResponseError(d);
    throw (logForDebugging(`fetchUtilization: ${r} replayed \u2014 ${h.message}`), h);
  }
  let m = async () => {
    if (!isClaudeAISubscriber() || !hasProfileScope()) return {};
    let h = 0,
      y,
      authResult = hasStoredOAuthRefreshToken(),
      L = null,
      x,
      R = () => {
        let S,
          promise = new Promise((C) => {
            S = C;
          });
        return (
          (x = promise),
          withOAuth401Retry(
            async () => {
              h++;
              let C = await claudeAiAuthKey({ credentials: e, settle: !1 });
              if (y !== void 0 && C === y.key) throw y.error;
              logForDebugging(`fetchUtilization: GET ${r} (attempt ${h})`);
              try {
                let response = await apiClient.get(r, {
                  timeout: 5000,
                  headers: { "Content-Type": "application/json" },
                  refreshOAuth: !0,
                  credentials: e,
                  validateStatus: kt,
                });
                if (!response.ok)
                  throw Error(
                    `Auth error: ${response.reason === "no-auth" ? response.detail : response.reason}`,
                  );
                return response;
              } catch (error) {
                let O = tokens ? rememberUsageRefusal(error, C) : null;
                if (O !== null) y = { key: O, error: error };
                let I = usageErrorResponse(error);
                if (((L = I?.sentAuthKey ?? C), I?.status === 401)) usageRefusedKeys.add(promise);
                throw error;
              }
            },
            authResult
              ? {
                  credentials: e,
                  gateToSessionOAuthCredential: !0,
                  oauthRefreshLatch: usageOauthRefreshLatch,
                }
              : { credentials: e },
          ).then(
            (C) => (S(!0), usageRefusedKeys.delete(promise), C),
            (C) => {
              throw (S(!1), usageRefusedKeys.delete(promise), C);
            },
          )
        );
      },
      U;
    try {
      U = await R();
    } catch (error) {
      let filtered = [...usageRefusedKeys].filter((I) => I !== x);
      if (usageErrorResponse(error)?.status !== 401 || filtered.length === 0) throw error;
      let settled = await Promise.allSettled(filtered),
        P = await claudeAiAuthKey({ credentials: e, settle: !0 });
      if (P === null || P === L) throw error;
      let O = tokens ? recallUsageOutcome(P) : void 0;
      if (O !== void 0) throw new RememberedResponseError(O);
      if (!tokens && !settled.some((I) => I.status === "fulfilled" && I.value)) throw error;
      (logForDebugging(
        `fetchUtilization: ${r} 401 during another read's token refresh; re-sending with the refreshed bearer`,
      ),
        (U = await R()));
    }
    return (
      (usageOauthRefreshLatch.attempted = !1),
      logForDebugging(
        `fetchUtilization: 200 after ${h} attempt(s)${h > 1 ? " (401\u2192refresh\u2192retry succeeded)" : ""}`,
      ),
      U.data
    );
  };
  switch (n) {
    case "at_wall":
      return withFeatureTelemetry("api_usage_fetch_at_wall", m, usageErrorKind);
    case "cedar_ember":
      return withFeatureTelemetry("api_usage_fetch_cedar_ember", m, usageErrorKind);
    case "starry_waterfall":
      return withFeatureTelemetry("api_usage_fetch_starry_waterfall", m, usageErrorKind);
    case "plain":
      return withFeatureTelemetry("api_usage_fetch", m, usageErrorKind);
  }
}
/**
 * 从重放缓存取上次的用量查询结果。
 */
//@ chunk-w5ndchqs.js:18746-18796 layout
function recallUsageOutcome(e) {
  return e === null ? void 0 : rememberedUsageResponses.recall(e);
}
/**
 * 上次查询被限流时返回解除时间。
 */
//@ chunk-w5ndchqs.js:18796-18927 layout
async function getUsageRateLimitedUntil(e) {
  if (!Be()) return;
  let n = recallUsageOutcome(await claudeAiAuthKey({ credentials: e, settle: !1 }));
  return n?.kind === "rate_limited" ? n.untilMs : void 0;
}
//@ chunk-w5ndchqs.js:18927-19564 placement
function rememberUsageRefusal(e, n) {
  try {
    let r = usageErrorResponse(e);
    if (r === void 0 || r.status === void 0) return null;
    let s = r.sentAuthKey ?? n;
    if (s === null) return null;
    let { status: status, anthropicError: anthropicError } = r,
      h,
      y;
    if (le(r)) ((h = "auth_rejected"), (y = REFUSAL_REMEMBER_MS));
    else if (status === 429 || status === 403) {
      h = "rate_limited";
      let L = r.retryAfterMs ?? 0;
      y = Math.min(L > 0 ? L : USAGE_CACHE_TTL_MS, REMEMBERED_RESPONSE_TTL_MS);
    } else return null;
    let now = Date.now();
    return (
      rememberedUsageResponses.remember(s, {
        kind: h,
        status: status,
        body: anthropicError,
        recordedAtMs: now,
        untilMs: now + y,
      }),
      logForDebugging(
        `fetchUtilization: ${status} remembered for this bearer; not asking again for ${Math.round(y / 1000)}s`,
      ),
      s
    );
  } catch (error) {
    return (
      logForDebugging(
        `fetchUtilization: could not record the endpoint's answer: ${error instanceof Error ? error.message : String(error)}`,
        { level: "error" },
      ),
      null
    );
  }
}
//@ chunk-w5ndchqs.js:19564-19769 placement
function usageErrorKind(e) {
  let n = usageErrorResponse(e);
  if (n === void 0) return "error";
  switch (n.status) {
    case void 0:
      return "network";
    case 401:
      return "http_401";
    case 403:
      return "http_403";
    case 429:
      return "http_429";
    default:
      return "http_other";
  }
}
//@ chunk-w5ndchqs.js:19769-19998 placement
var ORG_SPEND_CAP_REASONS = new Set(["org_level_disabled_until", "org_spend_cap_reached"]),
  Nt = "channel's monthly spend limit",
  zt = "channel's monthly usage limit",
  Ke = " \xB7 an org owner or channel manager can raise it in the channel's Claude settings";
//@ chunk-w5ndchqs.js:19998-20046 placement
function Z() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_vellum_anchor", !1);
}
//@ chunk-w5ndchqs.js:20046-20083 placement
var Ft = [
  ...LIMIT_MESSAGE_PREFIXES,
  ...RATE_LIMIT_WARNING_PREFIXES,
  ...OVERAGE_NOTICE_PREFIXES,
  ...RATE_LIMIT_ERROR_PREFIXES,
];
//@ chunk-w5ndchqs.js:20083-20162 placement
function isRateLimitText(e) {
  return Ft.some((n) => e.startsWith(n)) || Ffs.some((n) => n.test(e));
}
//@ chunk-1m53rcjd.js:610-1020 placement
function normalizeUsageLimits(e) {
  let a = getRawUtilization();
  if (!a.five_hour && !a.seven_day) {
    let n = cachedUsageUtilization(e);
    return n ? { utilization: n.utilization, source: "persisted", fetchedAtMs: n.fetchedAtMs } : null;
  }
  let s = (n) =>
      n
        ? {
            utilization: planWindowPercent(n.utilization),
            resets_at: new Date(n.resets_at * 1000).toISOString(),
          }
        : void 0,
    i = overageIncludedLimitRow(currentUsageWindows().seven_day_overage_included, e);
  return {
    utilization: { five_hour: s(a.five_hour), seven_day: s(a.seven_day), ...(i && { limits: [i] }) },
    source: "headers",
  };
}
//@ chunk-1m53rcjd.js:1020-1307 placement
function overageIncludedLimitRow(e, a) {
  if (!e) return;
  let s = overageIncludedModels();
  if (!s[0]) return;
  let i = modelScopedWeeklyRows(cachedUsageUtilization(a)?.utilization.limits, s),
    n = i.length === 1 ? i[0].displayName : s[0];
  return {
    kind: "weekly_scoped",
    group: "weekly",
    percent: planWindowPercent(e.utilization),
    resets_at: new Date(e.resets_at * 1000).toISOString(),
    scope: { model: { display_name: n } },
  };
}
//@ chunk-1m53rcjd.js:1307-1456 placement
function seededUsageResult(e, a, s) {
  return {
    status: "seeded",
    utilization: e.utilization,
    rateLimitedVia: a,
    seedSource: e.source,
    seedFetchedAtMs: e.fetchedAtMs,
    heldUntilMs: s,
  };
}
//@ chunk-1m53rcjd.js:1456-1466 placement
var y = 200;
//@ chunk-1m53rcjd.js:1466-1565 placement
function h(e) {
  if (e.length <= y) return e;
  return `${e.slice(0, y).replace(/[\uD800-\uDBFF]$/, "")}\u2026`;
}
/**
 * 获取用量并补上按模型划分的周用量：由响应头播种的结果先刷新白名单再生成该模型的行，返回结果含模型条目时也刷新白名单。
 */
//@ chunk-1m53rcjd.js:1565-1905 placement
async function fetchUsageWithModelScopes(credentials, storage) {
  let s = await fetchUsage(credentials, storage);
  if (s.status !== "ok" && s.status !== "seeded") return s;
  if (s.status === "seeded" && s.seedSource === "headers") {
    let seven_day_overage_included = currentUsageWindows().seven_day_overage_included;
    if (seven_day_overage_included) {
      await refreshOverageModelsFlag();
      let n = overageIncludedLimitRow(seven_day_overage_included, credentials),
        { limits: limits, ...o } = s.utilization;
      return { ...s, utilization: n ? { ...o, limits: [n] } : o };
    }
  }
  if (_hn(s.utilization.limits)) await refreshOverageModelsFlag();
  return s;
}
//@ chunk-1m53rcjd.js:1905-2935 placement
async function fetchUsage(e, a) {
  let s = getOauthAccountInfo()?.accountUuid;
  if (isClaudeAISubscriber() && hasProfileScope()) {
    let i = freshCachedUtilization(e);
    if (i)
      return (
        logForDebugging(
          `Usage read answered from a snapshot ${Math.round(i.ageMs / 1000)}s old; endpoint not asked`,
        ),
        { status: "ok", utilization: i.utilization }
      );
  }
  try {
    let i = await fetchUtilization(a);
    if (!i) return { status: "empty_response" };
    let n = isClaudeAISubscriber() && hasProfileScope(),
      u = isPlainObject(i),
      o = kVe(i);
    if (!u || (n && !o)) {
      logForDebugging("Usage fetch returned a fieldless or non-object body (in-band error)", {
        level: "error",
      });
      let c = u && "error" in i ? i.error : void 0,
        m =
          typeof c === "object" && c !== null && "type" in c && c.type === "rate_limit_error"
            ? "envelope"
            : null,
        p = normalizeUsageLimits(e);
      if (p) return seededUsageResult(p, m);
      return { status: "unavailable", rateLimitedVia: m, responseBody: h(jsonStringify(i)) };
    }
    if (o) cacheUsageUtilization(i, s, e);
    return { status: "ok", utilization: i };
  } catch (error) {
    if (isExpectedApiError(error))
      logForDebugging(`Failed to load usage data: ${errorMessage(error)}`, { level: "error" });
    else logError(error);
    let n = error,
      u = n.response?.status === 429 ? "http_429" : null,
      o =
        u === null
          ? void 0
          : await getUsageRateLimitedUntil(a).catch((m) => {
              logError(m);
              return;
            }),
      c = normalizeUsageLimits(e);
    if (c) return seededUsageResult(c, u, o);
    return {
      status: "unavailable",
      rateLimitedVia: u,
      heldUntilMs: o,
      responseBody: n.response?.data ? h(jsonStringify(n.response.data)) : void 0,
    };
  }
}
/**
 * 汇总用量行为：最耗费的行为与推荐（可附修复动作）、请求数、会话数、占比超过阈值的行为，以及代理、技能、插件、MCP 服务器统计。
 */
//@ chunk-1m53rcjd.js:2935-3370 placement
function usageBehaviorSummary(e, a, s) {
  let i = costliestBehavior(e, a, s);
  return {
    recommendations: i.map(({ key: key, pct: pct, title: title, detail: detail }) => ({
      key: key,
      pct: pct,
      title: title,
      detail: detail,
    })),
    fix: s && usageRecommendationAction(i),
    request_count: e.requestCount,
    session_count: e.sessionCount,
    behaviors: e.behaviors
      .filter((behavior) => e.totalCost > 0 && (behavior.cost / e.totalCost) * 100 >= KGe)
      .map((n) => ({ key: n.key, pct: Math.round((n.cost / e.totalCost) * 100), count: n.count })),
    agents: e.agents,
    skills: e.skills,
    plugins: e.plugins,
    mcp_servers: e.mcpServers,
  };
}
//@ chunk-1m53rcjd.js:3370-4583 placement
async function projectModelScopedUsage({
  includeBehaviors: includeBehaviors = !0,
  storageV5: storageV5,
  credentials: credentials,
  live: live,
}) {
  let n = isClaudeAISubscriber(),
    u = n && hasProfileScope(),
    [o, c] = await Promise.all([
      u ? fetchUsageWithModelScopes(storageV5, credentials) : Promise.resolve(null),
      includeBehaviors && n && fAe().allowed
        ? collectUsageRecommendations(storageV5).then(
            (r) => ({
              day: usageBehaviorSummary(r.day, r.evidence.day, live),
              week: usageBehaviorSummary(r.week, r.evidence.week, live),
            }),
            (r) => (logError(r), null),
          )
        : Promise.resolve(null),
    ]),
    m = o?.status === "ok" || o?.status === "seeded" ? o.utilization : null,
    p;
  if (m !== null)
    try {
      p = modelScopedWeeklyRows(m.limits, overageIncludedModels()).map((r) => ({
        display_name: r.displayName,
        utilization: r.limit.utilization ?? null,
        resets_at:
          typeof r.limit.resets_at === "number"
            ? new Date(r.limit.resets_at * 1000).toISOString()
            : (r.limit.resets_at ?? null),
      }));
    } catch (error) {
      logForDebugging(`model_scoped projection failed: ${errorMessage(error)}`, { level: "error" });
    }
  let f = m;
  if (m !== null && o?.status === "seeded") {
    let { limits: limits, ...R } = m;
    f = R;
  }
  let z =
    p !== void 0 &&
    o?.status === "ok" &&
    (o.utilization.five_hour != null || o.utilization.seven_day != null) &&
    Array.isArray(o.utilization.limits) &&
    !hasModelScopedLimits(o.utilization.limits);
  return {
    session: {
      total_cost_usd: getTotalCostUSD(),
      total_api_duration_ms: getTotalAPIDuration(),
      total_duration_ms: getTotalDuration(),
      total_lines_added: getTotalLinesAdded(),
      total_lines_removed: getTotalLinesRemoved(),
      model_usage: getModelUsage(),
    },
    subscription_type: getSubscriptionType(),
    rate_limits_available: u,
    rate_limits:
      m === null
        ? null
        : p !== void 0 && p.length > 0
          ? { ...f, model_scoped: p }
          : z
            ? { ...f, model_scoped: [] }
            : f,
    behaviors: c,
  };
}

export {
  ORG_SPEND_CAP_REASONS,
  Nt,
  Ke,
  m7n,
  Z,
  zt,
  ZKr,
  fetchUtilization,
  HEt,
  promoOfferStrings,
  fillUsageTemplate,
  HTTPS_CLAU_DE_WRAP_UP,
  fetchUsageWithModelScopes,
  overageIncludedModels,
  NEAR_LIMIT_UTILIZATION,
  normalizeUsageLimits,
  _hn,
  a2o,
  modelScopedWeeklyRows,
  projectModelScopedUsage,
  isMockRateLimit429,
  isRateLimitText,
  kVe,
  isAuthRejectedUsageError,
  isPromoOfferEnabled,
  promoOfferVersion,
};
