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
import { hasApiClient, claudeAiBearerDigest, hashCredential, apiClient } from "../routines/routinesApi.js";
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
import { cleanTaskDescription } from "../../utils/taskDescription.js";
import { isOutOfCreditsReason } from "../../utils/fastMode.js";
import { withTimeout } from "../../utils/sleep.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { array, objectSchema, stringSchema, custom } from "../../../vendor/zod/v4/classic/schemas.js";
import { getTheme } from "../../utils/theme.js";
import { identity } from "../../utils/identity.js";
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
  LIMIT_MESSAGE_PREFIX_PATTERNS,
} from "../rateLimitMessages.js";
import { cachedUsageUtilization, freshCachedUtilization, cacheUsageUtilization } from "../usageLimitGrace.js";
import { planWindowPercent } from "../../utils/format.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { isExpectedApiError, errorMessage } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import {
  costliestBehavior,
  usageRecommendationAction,
  MIN_RECOMMENDATION_PCT,
  collectUsageRecommendations,
} from "../usageInsights/recommendations.js";
import { isUsageScanAllowed } from "../usageInsights/transcriptScan.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-w5ndchqs.js:9271-9316 placement
function isMockRateLimit429(error) {
  return isRateLimitMockingEnabled() && error.status === 429;
}
//@ chunk-w5ndchqs.js:9316-9415 placement
/**
 * 用量提示常量：接近上限阈值 0.7、个人花费/用量限额文案与 wrap-up 链接。
 */
var NEAR_LIMIT_UTILIZATION = 0.7;
var INDIVIDUAL_SPEND_LIMIT_TEXT = "individual spend limit";
var INDIVIDUAL_USAGE_LIMIT_TEXT = "individual usage limit";
var HTTPS_CLAU_DE_WRAP_UP = "https://clau.de/wrap-up";
//@ chunk-w5ndchqs.js:9415-9432 placement
var MAX_ERROR_TYPE_CHARS = 64;
var MAX_ERROR_MESSAGE_CHARS = 200;
//@ chunk-w5ndchqs.js:9432-9880 placement
class RememberedResponses {
  maxHoldMs;
  #e = new Map();
  constructor(maxHoldMs) {
    this.maxHoldMs = maxHoldMs;
  }
  remember(key, entry) {
    let recordedAtMs = entry.recordedAtMs;
    for (let [key, entry] of this.#e) if (this.#t(entry, recordedAtMs) === undefined) this.#e.delete(key);
    this.#e.set(key, {
      ...entry,
      untilMs: Math.min(entry.untilMs, entry.recordedAtMs + this.maxHoldMs),
    });
  }
  recall(key, nowMs = Date.now()) {
    let entry = this.#e.get(key);
    if (entry === undefined) return;
    let liveEntry = this.#t(entry, nowMs);
    if (liveEntry === undefined) this.#e.delete(key);
    return liveEntry;
  }
  clear() {
    this.#e.clear();
  }
  #t(entry, nowMs) {
    return nowMs < entry.recordedAtMs || nowMs >= entry.untilMs ? undefined : entry;
  }
}
//@ chunk-w5ndchqs.js:9880-10373 placement
let RememberedResponseError; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-w5ndchqs.js:9880", () => {
  RememberedResponseError = class RememberedResponseError extends AxiosError {
    replayed = true;
    kind;
    recordedAtMs;
    untilMs;
    constructor(entry, nowMs = Date.now()) {
      let config = {
        headers: new AxiosHeaders(),
      };
      let max = Math.max(0, Math.round((nowMs - entry.recordedAtMs) / 1000));
      let max_2 = Math.max(0, Math.ceil((entry.untilMs - nowMs) / 1000));
      super(
        `the endpoint answered ${entry.status} ${max}s ago; not asked again for ${max_2}s`,
        "ERR_REMEMBERED_RESPONSE",
        config,
        undefined,
        {
          status: entry.status,
          statusText: "",
          headers: {},
          config,
          data: entry.body,
        },
      );
      this.name = "RememberedResponseError";
      this.kind = entry.kind;
      this.recordedAtMs = entry.recordedAtMs;
      this.untilMs = entry.untilMs;
    }
  };
});
//@ chunk-w5ndchqs.js:10373-10410 placement
function isRememberedResponseError(error) {
  return error instanceof RememberedResponseError;
}
//@ chunk-w5ndchqs.js:10410-10503 placement
function isAuthRejectedUsageError(error) {
  if (isRememberedResponseError(error)) return error.kind === "auth_rejected";
  let response = usageErrorResponse(error);
  return response !== undefined && isAuthRejection(response);
}
//@ chunk-w5ndchqs.js:10503-10583 placement
function isAuthRejection(response) {
  return response.status === 401 || (response.status === 403 && response.anthropicError !== undefined);
}
//@ chunk-w5ndchqs.js:10583-10804 placement
async function claudeAiAuthKey({ credentials, settle }) {
  if (settle && hasApiClient())
    try {
      await checkAndRefreshOAuthTokenIfNeeded({
        credentials,
      });
    } catch (error) {
      logForDebugging(
        `claudeAiAuthKey: token settle failed (${error instanceof Error ? error.message : String(error)}); keying the token in memory`,
      );
    }
  return claudeAiBearerDigest();
}
//@ chunk-w5ndchqs.js:10804-11138 placement
function usageErrorResponse(error) {
  if (!isAxiosError(error) || isRememberedResponseError(error)) return;
  let authHeader = AxiosHeaders.from(error.config?.headers ?? {}).get("Authorization");
  let retryAfter = error.response?.headers?.["retry-after"];
  return {
    status: error.response?.status,
    sentAuthKey: typeof authHeader === "string" && authHeader !== "" ? hashCredential(authHeader) : null,
    retryAfterMs: parseRetryAfterMs(
      typeof retryAfter === "string"
        ? retryAfter
        : typeof retryAfter === "number"
          ? String(retryAfter)
          : undefined,
    ),
    anthropicError: hasProgressMessage(error.response?.data),
  };
}
//@ chunk-w5ndchqs.js:11138-11439 placement = hasProgressMessage (1)
/**
 * 从对象中截取 {error:{type,message}} 摘要（API 错误）。
 */
function hasProgressMessage(data) {
  if (typeof data !== "object" || data === null || !("error" in data)) return;
  let error = data.error;
  if (typeof error !== "object" || error === null || !("type" in error) || typeof error.type !== "string")
    return;
  let message =
    "message" in error && typeof error.message === "string"
      ? truncateToLength(error.message, MAX_ERROR_MESSAGE_CHARS)
      : undefined;
  return {
    error: {
      type: truncateToLength(error.type, MAX_ERROR_TYPE_CHARS),
      ...(message !== undefined && {
        message,
      }),
    },
  };
}
//@ chunk-w5ndchqs.js:11439-12113 placement
/**
 * 用量页促销文案表（tengu_starry_waterfall）：菜单后缀、提示、对话框标题、横幅四种场景的折扣/返现文案与默认值。
 */
var PROMO_OFFER_FLAG = "tengu_starry_waterfall";
var PROMO_OFFER_TEXTS = {
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
function promoOfferConfig() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(PROMO_OFFER_FLAG, {});
  return typeof featureValue_CACHED_MAY_BE_STALE === "object" &&
    featureValue_CACHED_MAY_BE_STALE !== null &&
    !Array.isArray(featureValue_CACHED_MAY_BE_STALE)
    ? featureValue_CACHED_MAY_BE_STALE
    : {};
}
//@ chunk-w5ndchqs.js:12203-12276 placement
function isPromoOfferEnabled() {
  return (
    promoOfferConfig().enabled === true && !isEssentialTrafficOnly() && isPolicyAllowed("allow_promo_offers")
  );
}
//@ chunk-w5ndchqs.js:12276-12361 placement
function promoOfferVersion() {
  let version = promoOfferConfig().version;
  return typeof version === "number" && Number.isFinite(version) ? version : 0;
}
//@ chunk-w5ndchqs.js:12361-12423 placement
function withDefaultText(text, fallback) {
  return typeof text === "string" && text.trim() !== "" ? text : fallback;
}
//@ chunk-w5ndchqs.js:12423-12957 placement
function promoOfferStrings() {
  let config = promoOfferConfig();
  return {
    menuSuffixPctOff: withDefaultText(config.menuSuffixPctOff, PROMO_OFFER_TEXTS.menuSuffixPctOff),
    menuSuffixExtraCredit: withDefaultText(
      config.menuSuffixExtraCredit,
      PROMO_OFFER_TEXTS.menuSuffixExtraCredit,
    ),
    hintPctOff: withDefaultText(config.hintPctOff, PROMO_OFFER_TEXTS.hintPctOff),
    hintExtraCredit: withDefaultText(config.hintExtraCredit, PROMO_OFFER_TEXTS.hintExtraCredit),
    dialogHeaderPctOff: withDefaultText(config.dialogHeaderPctOff, PROMO_OFFER_TEXTS.dialogHeaderPctOff),
    dialogHeaderExtraCredit: withDefaultText(
      config.dialogHeaderExtraCredit,
      PROMO_OFFER_TEXTS.dialogHeaderExtraCredit,
    ),
    bannerPillPctOff: withDefaultText(config.bannerPillPctOff, PROMO_OFFER_TEXTS.bannerPillPctOff),
    bannerPillExtraCredit: withDefaultText(
      config.bannerPillExtraCredit,
      PROMO_OFFER_TEXTS.bannerPillExtraCredit,
    ),
  };
}
//@ chunk-w5ndchqs.js:12957-12973 placement = SEP_WIDTH (1)
var SEP = " \xB7 ";
//@ chunk-w5ndchqs.js:12973-13279 placement
function fillUsageTemplate(template, values) {
  let result = template;
  if (values.daysLeft === null || values.daysLeft <= 0) {
    let filtered = result.split(SEP).filter((segment) => !segment.includes("{days}"));
    result = filtered.length > 0 ? filtered.join(SEP) : result;
    result = result.replaceAll("{days}", "").trim();
  } else {
    let daysText = values.daysLeft === 1 ? "1 day" : `${values.daysLeft} days`;
    result = result.replaceAll("{days}", daysText);
  }
  return cleanTaskDescription(result.replaceAll("{pct}", String(values.pct)));
}
//@ chunk-w5ndchqs.js:13279-13354 placement
var FABLE_MODEL_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var EMPTY_MODEL_LIST;
deferInit("chunk-w5ndchqs.js:13279", () => {
  FABLE_MODEL_NAMES = Object.freeze(["Fable", "Fable 5", "Fable 5.1"]);
  EMPTY_MODEL_LIST = Object.freeze([]);
});
//@ chunk-w5ndchqs.js:13354-13386 placement
function defaultFrozenUsage() {
  return isGrowthBookEnabled() ? EMPTY_MODEL_LIST : FABLE_MODEL_NAMES;
}
//@ chunk-w5ndchqs.js:13386-13470 placement
/**
 * 导出函数 `isLimitEnabled`：参数 e，返回 !0; return isOutOfCreditsReason(e?.disabled_reason ?? null)。
 */
function isLimitEnabled(limit) {
  if (limit?.is_enabled === true) return true;
  return isOutOfCreditsReason(limit?.disabled_reason ?? null);
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
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
//@ chunk-w5ndchqs.js:13686-13782 placement
/**
 * 导出函数 `hasUsageLimitKeys`：参数 e，返回 typeof e === "object" && e !== null && !Array.isArray(e) && USAGE_LIMIT_KEYS.some((n) => n in e)。
 */
function hasUsageLimitKeys(utilization) {
  return (
    typeof utilization === "object" &&
    utilization !== null &&
    !Array.isArray(utilization) &&
    USAGE_LIMIT_KEYS.some((key) => key in utilization)
  );
}
//@ chunk-w5ndchqs.js:13782-13827 placement
var TENGU_USAGE_OVERAGE_INCLUDED_MODELS = "tengu_usage_overage_included_models";
//@ chunk-w5ndchqs.js:13827-13957 placement
function overageIncludedModels() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    TENGU_USAGE_OVERAGE_INCLUDED_MODELS,
    null,
  );
  if (featureValue_CACHED_MAY_BE_STALE === null || featureValue_CACHED_MAY_BE_STALE === undefined)
    return defaultFrozenUsage();
  return Array.isArray(featureValue_CACHED_MAY_BE_STALE)
    ? featureValue_CACHED_MAY_BE_STALE.filter((model) => typeof model === "string")
    : [];
}
//@ chunk-w5ndchqs.js:13957-14015 placement
var GROWTHBOOK_WAIT_MS = 1500;
var GROWTHBOOK_WAIT_REASON = "usage: overage-included models allowlist";
//@ chunk-w5ndchqs.js:14015-14478 placement
/**
 * 超额包含模型白名单仍来自回退值或磁盘缓存时，限时等待 GrowthBook 初始化，以便按模型显示的用量行使用最新名单。
 */
async function refreshOverageModelsFlag() {
  let readSource = () =>
    getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_USAGE_OVERAGE_INCLUDED_MODELS, []).source;
  let now = Date.now();
  try {
    let source = readSource();
    if (source !== "fallback" && source !== "disk") return;
    await withTimeout(initializeGrowthBook(), GROWTHBOOK_WAIT_MS, GROWTHBOOK_WAIT_REASON);
    logForDebugging(
      `usage: GrowthBook init settled after ${Date.now() - now}ms; overage-included models allowlist now read from ${readSource()} (was ${source})`,
    );
  } catch (error) {
    logForDebugging(
      `usage: overage-included models allowlist not refreshed after ${Date.now() - now}ms (${error instanceof Error && error.message === GROWTHBOOK_WAIT_REASON ? "timeout" : "error"}); per-model rows use the cached list`,
      {
        level: "warn",
      },
    );
  }
}
//@ chunk-w5ndchqs.js:14478-14644 placement
/**
 * 限额页促销通知（tengu_rate_limit_promo_notices）的 schema：进度条文字、说明文字与可选主题变体。
 */
var TENGU_RATE_LIMIT_PROMO_NOTICES; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var promoNoticeSchema;
deferInit("chunk-w5ndchqs.js:14478", () => {
  TENGU_RATE_LIMIT_PROMO_NOTICES = "tengu_rate_limit_promo_notices";
  promoNoticeSchema = DoctorLazy(() =>
    array(
      objectSchema({
        bar: stringSchema(),
        text: stringSchema(),
        variant: custom((name) => typeof name === "string" && Object.hasOwn(getTheme("dark"), name))
          .optional()
          .catch(undefined),
      }),
    ),
  );
});
//@ chunk-w5ndchqs.js:14644-14721 placement
/**
 * 导出函数 `rateLimitPromoNotices`：返回 safeParse.success ? safeParse.data : []。
 */
function rateLimitPromoNotices() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    TENGU_RATE_LIMIT_PROMO_NOTICES,
    [],
  );
  let parsed = promoNoticeSchema().safeParse(featureValue_CACHED_MAY_BE_STALE);
  return parsed.success ? parsed.data : [];
}
//@ chunk-w5ndchqs.js:14721-14847 placement
function isModelScopedWeeklyLimit(limit) {
  return (
    limit !== null &&
    typeof limit === "object" &&
    limit.kind === "weekly_scoped" &&
    typeof limit.scope?.model?.display_name === "string"
  );
}
//@ chunk-w5ndchqs.js:14847-14938 placement
/**
 * 导出函数 `hasModelScopedLimit`：参数 e，返回 ( Array.isArray(e) && e.some((n) => typeof n === "object" && n !== null && isModelScopedWeeklyLimit(n)) )。
 */
function hasModelScopedLimit(limits) {
  return (
    Array.isArray(limits) &&
    limits.some((limit) => typeof limit === "object" && limit !== null && isModelScopedWeeklyLimit(limit))
  );
}
//@ chunk-w5ndchqs.js:14938-15044 placement
/**
 * 判断用量 limits 数组里是否有按模型划分的条目（或无法识别的条目）。
 */
function hasModelScopedLimits(limits) {
  return (
    Array.isArray(limits) &&
    limits.some((limit) => typeof limit !== "object" || limit === null || limit.scope?.model != null)
  );
}
//@ chunk-w5ndchqs.js:15044-15384 placement
/**
 * 从用量 limits 中挑出指定模型的周用量条目，转成"Current week (模型名)"行。
 */
function modelScopedWeeklyRows(limits, modelNames) {
  let mapped = modelNames.map((modelName) => modelName.toLowerCase());
  if (mapped.length === 0 || !Array.isArray(limits)) return [];
  return limits
    .filter(isModelScopedWeeklyLimit)
    .filter((limit) => mapped.includes(limit.scope.model.display_name.toLowerCase()))
    .map((limit) => ({
      title: `Current week (${limit.scope.model.display_name})`,
      displayName: limit.scope.model.display_name,
      limit: {
        utilization: limit.percent,
        resets_at: limit.resets_at,
      },
    }));
}
//@ chunk-w5ndchqs.js:15384-15555 placement
var USAGE_CACHE_TTL_MS_2; // deferred: uses RememberedResponses of its import cycle while loading; runs once the cycle is complete
var REMEMBERED_RESPONSE_TTL_MS;
var REFUSAL_REMEMBER_MS;
var rememberedUsageResponses;
var usageOauthRefreshLatch;
var usageRefusedKeys;
var TENGU_FEDERATED_ROBIN;
deferInit("chunk-w5ndchqs.js:15384", () => {
  USAGE_CACHE_TTL_MS_2 = 300000;
  REMEMBERED_RESPONSE_TTL_MS = 3600000;
  REFUSAL_REMEMBER_MS = 3600000;
  rememberedUsageResponses = identity(new RememberedResponses(REMEMBERED_RESPONSE_TTL_MS), (store) =>
    store.clear(),
  );
  usageOauthRefreshLatch = identity(
    {
      attempted: false,
    },
    (latch) => {
      latch.attempted = false;
    },
  );
  usageRefusedKeys = identity(new Set(), (keys) => {
    keys.clear();
  });
  TENGU_FEDERATED_ROBIN = "tengu_federated_robin";
});
//@ chunk-w5ndchqs.js:15555-15585 placement
function federatedRobinEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_FEDERATED_ROBIN, true);
}
//@ chunk-w5ndchqs.js:15585-15621 placement
function is2xx(status) {
  return status >= 200 && status < 300;
}
//@ chunk-w5ndchqs.js:15621-15708 placement
var usageFetchState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-w5ndchqs.js:15621", () => {
  usageFetchState = new HostScoped(() => ({
    pending: null,
    requester: null,
    credentials: undefined,
    offerSurface: null,
  }));
});
//@ chunk-w5ndchqs.js:15708-15790 placement
function oauthAccountKey() {
  let oauthAccountInfo = getOauthAccountInfo();
  return `${oauthAccountInfo?.organizationUuid ?? ""}:${oauthAccountInfo?.accountUuid ?? ""}`;
}
//@ chunk-w5ndchqs.js:15790-16363 placement
/**
 * 请求 /api/oauth/usage（可带 at_wall、cedar_ember、skip_spend 参数）取当前额度利用率；记住被拒的 bearer，避免反复请求。
 */
async function fetchUtilization(credentials, options = {}) {
  if (options.read !== "at_wall" && options.read !== "starry_waterfall")
    return fetchUtilization_2(credentials, options.read ?? "plain", usageEndpointPath(options));
  let fetchState = usageFetchState.of(getRootSession().host);
  let accountKey = oauthAccountKey();
  let pending =
    fetchState.pending !== null &&
    fetchState.requester === accountKey &&
    fetchState.credentials === credentials;
  if (options.read === "starry_waterfall") {
    if (pending && fetchState.offerSurface === options.surface) return fetchState.pending;
    return fetchUtilization_2(credentials, "starry_waterfall", usageEndpointPath(options));
  }
  if (pending) return fetchState.pending;
  let endpoint = usageEndpointPath(options);
  let promise = fetchUtilization_2(credentials, "at_wall", endpoint).finally(() => {
    if (fetchState.pending === promise) {
      fetchState.pending = null;
      fetchState.requester = null;
      fetchState.credentials = undefined;
      fetchState.offerSurface = null;
    }
  });
  fetchState.pending = promise;
  fetchState.requester = accountKey;
  fetchState.credentials = credentials;
  fetchState.offerSurface = endpoint.includes(`${STARRY_WATERFALL}=`) ? offerSurfaceOrDefault(options) : null;
  return promise;
}
//@ chunk-w5ndchqs.js:16363-16389 placement
var STARRY_WATERFALL = "starry_waterfall";
//@ chunk-w5ndchqs.js:16389-16433 placement
function offerSurfaceOrDefault(surface) {
  return surface.surface ?? "cli_menu";
}
//@ chunk-w5ndchqs.js:16433-16789 placement
function usageEndpointPath(endpoint) {
  switch (endpoint.read) {
    case undefined:
    case "plain":
      return "/api/oauth/usage";
    case "cedar_ember":
      return "/api/oauth/usage?cedar_ember=1&skip_spend=1";
    case "at_wall":
      return isPromoOfferEnabled()
        ? `/api/oauth/usage?at_wall=1&${STARRY_WATERFALL}=${offerSurfaceOrDefault(endpoint)}&skip_spend=1`
        : "/api/oauth/usage?at_wall=1&skip_spend=1";
    case "starry_waterfall":
      return `/api/oauth/usage?${STARRY_WATERFALL}=${endpoint.surface}&skip_spend=1`;
  }
}
//@ chunk-w5ndchqs.js:16789-18746 callgraph-fingerprint = fetchUtilization (0.181)
/**
 * 拉取订阅利用率（各窗口），失败结果可重放；auth_rejected 时等待挂起刷新后重试。
 */
async function fetchUtilization_2(credentials, mode, operation) {
  let tokens = federatedRobinEnabled();
  if (!tokens) rememberedUsageResponses.clear();
  let replayKey =
    tokens && isClaudeAISubscriber() && hasProfileScope()
      ? recallUsageOutcome(
          await claudeAiAuthKey({
            credentials,
            settle: false,
          }),
        )
      : undefined;
  if (replayKey !== undefined)
    replayKey = recallUsageOutcome(
      await claudeAiAuthKey({
        credentials,
        settle: true,
      }),
    );
  if (replayKey?.kind === "auth_rejected" && usageRefusedKeys.size > 0) {
    await Promise.allSettled([...usageRefusedKeys]);
    replayKey = recallUsageOutcome(
      await claudeAiAuthKey({
        credentials,
        settle: true,
      }),
    );
  }
  if (replayKey !== undefined) {
    let replayError = new RememberedResponseError(replayKey);
    logForDebugging(`fetchUtilization: ${operation} replayed \u2014 ${replayError.message}`);
    throw replayError;
  }
  let fetchOnce = async () => {
    if (!isClaudeAISubscriber() || !hasProfileScope()) return {};
    let attempts = 0;
    let refusal;
    let authResult = hasStoredOAuthRefreshToken();
    let authKeyUsed = null;
    let promise;
    let attemptOnce = () => {
      let settleRefusal;
      let promise_2 = new Promise((resolve) => {
        settleRefusal = resolve;
      });
      promise = promise_2;
      return withOAuth401Retry(
        async () => {
          attempts++;
          let authKey = await claudeAiAuthKey({
            credentials,
            settle: false,
          });
          if (refusal !== undefined && authKey === refusal.key) throw refusal.error;
          logForDebugging(`fetchUtilization: GET ${operation} (attempt ${attempts})`);
          try {
            let response = await apiClient.get(operation, {
              timeout: 5000,
              headers: {
                "Content-Type": "application/json",
              },
              refreshOAuth: true,
              credentials,
              validateStatus: is2xx,
            });
            if (!response.ok)
              throw Error(`Auth error: ${response.reason === "no-auth" ? response.detail : response.reason}`);
            return response;
          } catch (error) {
            let refusedKey = tokens ? rememberUsageRefusal(error, authKey) : null;
            if (refusedKey !== null)
              refusal = {
                key: refusedKey,
                error,
              };
            let errorResponse = usageErrorResponse(error);
            authKeyUsed = errorResponse?.sentAuthKey ?? authKey;
            if (errorResponse?.status === 401) usageRefusedKeys.add(promise_2);
            throw error;
          }
        },
        authResult
          ? {
              credentials,
              gateToSessionOAuthCredential: true,
              oauthRefreshLatch: usageOauthRefreshLatch,
            }
          : {
              credentials,
            },
      ).then(
        (error) => {
          settleRefusal(true);
          usageRefusedKeys.delete(promise_2);
          return error;
        },
        (error) => {
          settleRefusal(false);
          usageRefusedKeys.delete(promise_2);
          throw error;
        },
      );
    };
    let utilization;
    try {
      utilization = await attemptOnce();
    } catch (error) {
      let filtered = [...usageRefusedKeys].filter((usageRefusedKey) => usageRefusedKey !== promise);
      if (usageErrorResponse(error)?.status !== 401 || filtered.length === 0) throw error;
      let settled = await Promise.allSettled(filtered);
      let freshAuthKey = await claudeAiAuthKey({
        credentials,
        settle: true,
      });
      if (freshAuthKey === null || freshAuthKey === authKeyUsed) throw error;
      let cachedOutcome = tokens ? recallUsageOutcome(freshAuthKey) : undefined;
      if (cachedOutcome !== undefined) throw new RememberedResponseError(cachedOutcome);
      if (
        !tokens &&
        !settled.some((settledResult) => settledResult.status === "fulfilled" && settledResult.value)
      )
        throw error;
      logForDebugging(
        `fetchUtilization: ${operation} 401 during another read's token refresh; re-sending with the refreshed bearer`,
      );
      utilization = await attemptOnce();
    }
    usageOauthRefreshLatch.attempted = false;
    logForDebugging(
      `fetchUtilization: 200 after ${attempts} attempt(s)${attempts > 1 ? " (401\u2192refresh\u2192retry succeeded)" : ""}`,
    );
    return utilization.data;
  };
  switch (mode) {
    case "at_wall":
      return withFeatureTelemetry("api_usage_fetch_at_wall", fetchOnce, usageErrorKind);
    case "cedar_ember":
      return withFeatureTelemetry("api_usage_fetch_cedar_ember", fetchOnce, usageErrorKind);
    case "starry_waterfall":
      return withFeatureTelemetry("api_usage_fetch_starry_waterfall", fetchOnce, usageErrorKind);
    case "plain":
      return withFeatureTelemetry("api_usage_fetch", fetchOnce, usageErrorKind);
  }
}
//@ chunk-w5ndchqs.js:18746-18796 layout
/**
 * 从重放缓存取上次的用量查询结果。
 */
function recallUsageOutcome(key) {
  return key === null ? undefined : rememberedUsageResponses.recall(key);
}
//@ chunk-w5ndchqs.js:18796-18927 layout
/**
 * 上次查询被限流时返回解除时间。
 */
async function getUsageRateLimitedUntil(credentials) {
  if (!federatedRobinEnabled()) return;
  let outcome = recallUsageOutcome(
    await claudeAiAuthKey({
      credentials,
      settle: false,
    }),
  );
  return outcome?.kind === "rate_limited" ? outcome.untilMs : undefined;
}
//@ chunk-w5ndchqs.js:18927-19564 placement
function rememberUsageRefusal(error, err) {
  try {
    let response = usageErrorResponse(error);
    if (response === undefined || response.status === undefined) return null;
    let sentAuthKey = response.sentAuthKey ?? err;
    if (sentAuthKey === null) return null;
    let { status, anthropicError } = response;
    let body;
    let entry;
    if (isAuthRejection(response)) {
      body = "auth_rejected";
      entry = REFUSAL_REMEMBER_MS;
    } else if (status === 429 || status === 403) {
      body = "rate_limited";
      let retryAfterMs = response.retryAfterMs ?? 0;
      entry = Math.min(retryAfterMs > 0 ? retryAfterMs : USAGE_CACHE_TTL_MS_2, REMEMBERED_RESPONSE_TTL_MS);
    } else return null;
    let now = Date.now();
    rememberedUsageResponses.remember(sentAuthKey, {
      kind: body,
      status,
      body: anthropicError,
      recordedAtMs: now,
      untilMs: now + entry,
    });
    logForDebugging(
      `fetchUtilization: ${status} remembered for this bearer; not asking again for ${Math.round(entry / 1000)}s`,
    );
    return sentAuthKey;
  } catch (error) {
    logForDebugging(
      `fetchUtilization: could not record the endpoint's answer: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "error",
      },
    );
    return null;
  }
}
//@ chunk-w5ndchqs.js:19564-19769 placement
function usageErrorKind(error) {
  let response = usageErrorResponse(error);
  if (response === undefined) return "error";
  switch (response.status) {
    case undefined:
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
/**
 * 组织花费上限原因集合与“频道月度花费/用量上限”文案和提升提示。
 */
var ORG_SPEND_CAP_REASONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var CHANNEL_SPEND_LIMIT_TEXT;
var CHANNEL_USAGE_LIMIT_TEXT;
var ORG_RAISE_HINT;
deferInit("chunk-w5ndchqs.js:19769", () => {
  ORG_SPEND_CAP_REASONS = new Set(["org_level_disabled_until", "org_spend_cap_reached"]);
  CHANNEL_SPEND_LIMIT_TEXT = "channel's monthly spend limit";
  CHANNEL_USAGE_LIMIT_TEXT = "channel's monthly usage limit";
  ORG_RAISE_HINT = " \xB7 an org owner or channel manager can raise it in the channel's Claude settings";
});
//@ chunk-w5ndchqs.js:19998-20046 placement
function isVellumAnchorEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_vellum_anchor", false);
}
//@ chunk-w5ndchqs.js:20046-20083 placement
var LIMIT_MESSAGE_PREFIXES_ALL; // deferred: uses LIMIT_MESSAGE_PREFIXES (../rateLimitMessages.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-w5ndchqs.js:20046", () => {
  LIMIT_MESSAGE_PREFIXES_ALL = [
    ...LIMIT_MESSAGE_PREFIXES,
    ...RATE_LIMIT_WARNING_PREFIXES,
    ...OVERAGE_NOTICE_PREFIXES,
    ...RATE_LIMIT_ERROR_PREFIXES,
  ];
});
//@ chunk-w5ndchqs.js:20083-20162 placement
function isRateLimitText(text) {
  return (
    LIMIT_MESSAGE_PREFIXES_ALL.some((prefix) => text.startsWith(prefix)) ||
    LIMIT_MESSAGE_PREFIX_PATTERNS.some((pattern) => pattern.test(text))
  );
}
//@ chunk-1m53rcjd.js:610-1020 placement
function normalizeUsageLimits(credentials) {
  let rawUtilization = getRawUtilization();
  if (!rawUtilization.five_hour && !rawUtilization.seven_day) {
    let cached = cachedUsageUtilization(credentials);
    return cached
      ? {
          utilization: cached.utilization,
          source: "persisted",
          fetchedAtMs: cached.fetchedAtMs,
        }
      : null;
  }
  let windowRow = (rawWindow) =>
    rawWindow
      ? {
          utilization: planWindowPercent(rawWindow.utilization),
          resets_at: new Date(rawWindow.resets_at * 1000).toISOString(),
        }
      : undefined;
  let overageRow = overageIncludedLimitRow(currentUsageWindows().seven_day_overage_included, credentials);
  return {
    utilization: {
      five_hour: windowRow(rawUtilization.five_hour),
      seven_day: windowRow(rawUtilization.seven_day),
      ...(overageRow && {
        limits: [overageRow],
      }),
    },
    source: "headers",
  };
}
//@ chunk-1m53rcjd.js:1020-1307 placement
function overageIncludedLimitRow(sevenDayOverageIncluded, credentials) {
  if (!sevenDayOverageIncluded) return;
  let modelNames = overageIncludedModels();
  if (!modelNames[0]) return;
  let scopedRows = modelScopedWeeklyRows(cachedUsageUtilization(credentials)?.utilization.limits, modelNames);
  let displayName = scopedRows.length === 1 ? scopedRows[0].displayName : modelNames[0];
  return {
    kind: "weekly_scoped",
    group: "weekly",
    percent: planWindowPercent(sevenDayOverageIncluded.utilization),
    resets_at: new Date(sevenDayOverageIncluded.resets_at * 1000).toISOString(),
    scope: {
      model: {
        display_name: displayName,
      },
    },
  };
}
//@ chunk-1m53rcjd.js:1307-1456 placement
function seededUsageResult(seeded, rateLimitedVia, heldUntilMs) {
  return {
    status: "seeded",
    utilization: seeded.utilization,
    rateLimitedVia,
    seedSource: seeded.source,
    seedFetchedAtMs: seeded.fetchedAtMs,
    heldUntilMs,
  };
}
//@ chunk-1m53rcjd.js:1456-1466 placement
var MAX_REMEMBERED_ERROR_CHARS = 200;
//@ chunk-1m53rcjd.js:1466-1565 placement
function truncateWithEllipsisUsage(text) {
  if (text.length <= MAX_REMEMBERED_ERROR_CHARS) return text;
  return `${text.slice(0, MAX_REMEMBERED_ERROR_CHARS).replace(/[\uD800-\uDBFF]$/, "")}\u2026`;
}
//@ chunk-1m53rcjd.js:1565-1905 placement
/**
 * 获取用量并补上按模型划分的周用量：由响应头播种的结果先刷新白名单再生成该模型的行，返回结果含模型条目时也刷新白名单。
 */
async function fetchUsageWithModelScopes(credentials, storage) {
  let usage = await fetchUsage(credentials, storage);
  if (usage.status !== "ok" && usage.status !== "seeded") return usage;
  if (usage.status === "seeded" && usage.seedSource === "headers") {
    let sevenDayOverageIncluded = currentUsageWindows().seven_day_overage_included;
    if (sevenDayOverageIncluded) {
      await refreshOverageModelsFlag();
      let overageRow = overageIncludedLimitRow(sevenDayOverageIncluded, credentials);
      let { limits, ...rest } = usage.utilization;
      return {
        ...usage,
        utilization: overageRow
          ? {
              ...rest,
              limits: [overageRow],
            }
          : rest,
      };
    }
  }
  if (hasModelScopedLimit(usage.utilization.limits)) await refreshOverageModelsFlag();
  return usage;
}
//@ chunk-1m53rcjd.js:1905-2935 placement
async function fetchUsage(credentials, credentials_2) {
  let accountUuid = getOauthAccountInfo()?.accountUuid;
  if (isClaudeAISubscriber() && hasProfileScope()) {
    let cached = freshCachedUtilization(credentials);
    if (cached) {
      logForDebugging(
        `Usage read answered from a snapshot ${Math.round(cached.ageMs / 1000)}s old; endpoint not asked`,
      );
      return {
        status: "ok",
        utilization: cached.utilization,
      };
    }
  }
  try {
    let utilization = await fetchUtilization(credentials_2);
    if (!utilization)
      return {
        status: "empty_response",
      };
    let isSubscriber = isClaudeAISubscriber() && hasProfileScope();
    let isObject = isPlainObject(utilization);
    let hasLimits = hasUsageLimitKeys(utilization);
    if (!isObject || (isSubscriber && !hasLimits)) {
      logForDebugging("Usage fetch returned a fieldless or non-object body (in-band error)", {
        level: "error",
      });
      let error = isObject && "error" in utilization ? utilization.error : undefined;
      let rateLimitedVia =
        typeof error === "object" && error !== null && "type" in error && error.type === "rate_limit_error"
          ? "envelope"
          : null;
      let seeded = normalizeUsageLimits(credentials);
      if (seeded) return seededUsageResult(seeded, rateLimitedVia);
      return {
        status: "unavailable",
        rateLimitedVia,
        responseBody: truncateWithEllipsisUsage(jsonStringify(utilization)),
      };
    }
    if (hasLimits) cacheUsageUtilization(utilization, accountUuid, credentials);
    return {
      status: "ok",
      utilization,
    };
  } catch (error) {
    if (isExpectedApiError(error))
      logForDebugging(`Failed to load usage data: ${errorMessage(error)}`, {
        level: "error",
      });
    else logError(error);
    let failure = error;
    let rateLimitedVia = failure.response?.status === 429 ? "http_429" : null;
    let heldUntilMs =
      rateLimitedVia === null
        ? undefined
        : await getUsageRateLimitedUntil(credentials_2).catch((error) => {
            logError(error);
            return;
          });
    let seeded = normalizeUsageLimits(credentials);
    if (seeded) return seededUsageResult(seeded, rateLimitedVia, heldUntilMs);
    return {
      status: "unavailable",
      rateLimitedVia,
      heldUntilMs,
      responseBody: failure.response?.data
        ? truncateWithEllipsisUsage(jsonStringify(failure.response.data))
        : undefined,
    };
  }
}
//@ chunk-1m53rcjd.js:2935-3370 placement
/**
 * 汇总用量行为：最耗费的行为与推荐（可附修复动作）、请求数、会话数、占比超过阈值的行为，以及代理、技能、插件、MCP 服务器统计。
 */
function usageBehaviorSummary(report, evidence, live) {
  let recommendations = costliestBehavior(report, evidence, live);
  return {
    recommendations: recommendations.map(({ key, pct, title, detail }) => ({
      key,
      pct,
      title,
      detail,
    })),
    fix: live && usageRecommendationAction(recommendations),
    request_count: report.requestCount,
    session_count: report.sessionCount,
    behaviors: report.behaviors
      .filter(
        (behavior) =>
          report.totalCost > 0 && (behavior.cost / report.totalCost) * 100 >= MIN_RECOMMENDATION_PCT,
      )
      .map((behavior) => ({
        key: behavior.key,
        pct: Math.round((behavior.cost / report.totalCost) * 100),
        count: behavior.count,
      })),
    agents: report.agents,
    skills: report.skills,
    plugins: report.plugins,
    mcp_servers: report.mcpServers,
  };
}
//@ chunk-1m53rcjd.js:3370-4583 placement
async function projectModelScopedUsage({ includeBehaviors = true, storageV5, credentials, live }) {
  let isSubscriber = isClaudeAISubscriber();
  let rateLimitsAvailable = isSubscriber && hasProfileScope();
  let [usageResult, behaviors] = await Promise.all([
    rateLimitsAvailable ? fetchUsageWithModelScopes(storageV5, credentials) : Promise.resolve(null),
    includeBehaviors && isSubscriber && isUsageScanAllowed().allowed
      ? collectUsageRecommendations(storageV5).then(
          (usageRecommendations) => ({
            day: usageBehaviorSummary(usageRecommendations.day, usageRecommendations.evidence.day, live),
            week: usageBehaviorSummary(usageRecommendations.week, usageRecommendations.evidence.week, live),
          }),
          (error) => {
            logError(error);
            return null;
          },
        )
      : Promise.resolve(null),
  ]);
  let utilization =
    usageResult?.status === "ok" || usageResult?.status === "seeded" ? usageResult.utilization : null;
  let modelScoped;
  if (utilization !== null)
    try {
      modelScoped = modelScopedWeeklyRows(utilization.limits, overageIncludedModels()).map((row) => ({
        display_name: row.displayName,
        utilization: row.limit.utilization ?? null,
        resets_at:
          typeof row.limit.resets_at === "number"
            ? new Date(row.limit.resets_at * 1000).toISOString()
            : (row.limit.resets_at ?? null),
      }));
    } catch (error) {
      logForDebugging(`model_scoped projection failed: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  let baseUtilization = utilization;
  if (utilization !== null && usageResult?.status === "seeded") {
    let { limits, ...rest } = utilization;
    baseUtilization = rest;
  }
  let emptyModelScoped =
    modelScoped !== undefined &&
    usageResult?.status === "ok" &&
    (usageResult.utilization.five_hour != null || usageResult.utilization.seven_day != null) &&
    Array.isArray(usageResult.utilization.limits) &&
    !hasModelScopedLimits(usageResult.utilization.limits);
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
    rate_limits_available: rateLimitsAvailable,
    rate_limits:
      utilization === null
        ? null
        : modelScoped !== undefined && modelScoped.length > 0
          ? {
              ...baseUtilization,
              model_scoped: modelScoped,
            }
          : emptyModelScoped
            ? {
                ...baseUtilization,
                model_scoped: [],
              }
            : baseUtilization,
    behaviors,
  };
}
export {
  ORG_SPEND_CAP_REASONS,
  CHANNEL_SPEND_LIMIT_TEXT,
  ORG_RAISE_HINT,
  INDIVIDUAL_SPEND_LIMIT_TEXT,
  isVellumAnchorEnabled,
  CHANNEL_USAGE_LIMIT_TEXT,
  INDIVIDUAL_USAGE_LIMIT_TEXT,
  fetchUtilization,
  isLimitEnabled,
  promoOfferStrings,
  fillUsageTemplate,
  HTTPS_CLAU_DE_WRAP_UP,
  fetchUsageWithModelScopes,
  overageIncludedModels,
  NEAR_LIMIT_UTILIZATION,
  normalizeUsageLimits,
  hasModelScopedLimit,
  rateLimitPromoNotices,
  modelScopedWeeklyRows,
  projectModelScopedUsage,
  isMockRateLimit429,
  isRateLimitText,
  hasUsageLimitKeys,
  isAuthRejectedUsageError,
  isPromoOfferEnabled,
  promoOfferVersion,
};
