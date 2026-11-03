/**
 * services/claudeAiLimits.ts
 *
 * claude.ai 订阅额度状态：从 anthropic-ratelimit-unified-* 响应头计算当前额度（状态、重置时间、overage、各窗口利用率）、早期预警（按窗口利用率与时间进度）、过期状态清理，以及配额探测请求。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/claudeAiLimits.ts
 * pieces: chunk-0h4e7gnq.js (6), chunk-aepeg2w5.js (9), chunk-w5ndchqs.js (75)
 * attribution: fingerprint 10, affinity 3, placement 60, sole-consumer 1, layout 13, file-local 2, callgraph-witnessed 1
 */
import {
  OVERAGE_STATUS_HEADER,
  OVERAGE_IN_USE_HEADER,
  REPRESENTATIVE_CLAIM_HEADER,
  OVERAGE_DISABLED_REASON_HEADER,
  getSlowOfferArm,
  N8r,
  $8r,
  OVERAGE_SCOPE_HEADER,
} from "./lowPriority/headers.js";
import { getAPIProvider } from "../utils/model/providers.js";
import { getOwn } from "../utils/objectSafety.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "./analytics/growthbook.js";
import { getAnthropicClient } from "./api/client.js";
import { mainAgentContext } from "../utils/agentContext.js";
import { getModelBetas, betasRequestParam } from "../utils/betas.js";
import { toProviderWireModelId } from "../utils/model/model.js";
import { getAPIMetadata } from "./api/claude.js";
import { dD, handleLowPriorityResponseHeaders } from "./lowPriority/lowPriorityMode.js";
import { getGlobalConfig, saveGlobalConfig } from "../utils/config.js";
import { cn } from "./usageLimitGrace.js";
import { createSignal } from "../utils/signal.js";
import { En } from "../../vendor/lodash-es/_inlinedHelpers.js";
import { logError } from "../utils/log.js";
import { logEvent } from "./analytics/index.js";
import { fromEnum, fromEnumOpt } from "./analytics/safeMetadata.js";
import { isEssentialTrafficOnly } from "../utils/privacyLevel.js";
import { isClaudeAISubscriber, getRateLimitTier, getSubscriptionType } from "../utils/auth.js";
import { getIsNonInteractiveSession, setUsageCreditsRequired, getRootSession } from "../bootstrap/state.js";
import { Ot } from "../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { logFeatureOk } from "./analytics/featureTelemetry.js";
import { toSDKRateLimitInfo } from "../utils/messages/mappers.js";
import { usageCreditsOnlyFamily } from "../utils/model/modelDisplay.js";
import { lD, D2, isEnterpriseSubscriber, hasUsageCreditsConsent } from "../utils/planTiers.js";
import { _Ai } from "./api/errors.js";
import { getBareCheckModel } from "../utils/model/smallFastModel.js";
import { HostScoped } from "../utils/hostScoped.js";
import { MockRateLimitState } from "./mockRateLimits.js";
import { Do } from "../utils/git/gitSafeEnv.js";

//@ chunk-w5ndchqs.js:6185-6282 placement
function ke(e, n) {
  let r = Number(e.get(n) ?? 0);
  return Number.isFinite(r) ? Math.max(0, Math.min(1, r)) : 0;
}
//@ chunk-w5ndchqs.js:6282-6386 placement
function futureResetHeader(e, n, r) {
  let s = Number(e.get(n) ?? NaN);
  return Number.isFinite(s) && s * 1000 > r ? Math.round(s) : void 0;
}
/**
 * 解析 anthropic-ratelimit-unified-* 响应头（status、5h/7d 利用率与重置时间、grace 窗口），得到限额快照。
 */
//@ chunk-w5ndchqs.js:6386-7016 placement
function parseUnifiedRateLimitHeaders(e, n) {
  if (e.get("anthropic-ratelimit-unified-status") === null) return { limiterRan: !1 };
  let r = ke(e, "anthropic-ratelimit-unified-grace-5h-utilization"),
    s = ke(e, "anthropic-ratelimit-unified-grace-7d-utilization");
  if (r === 0 && s === 0) return { limiterRan: !0, zone: null };
  let d = futureResetHeader(e, "anthropic-ratelimit-unified-5h-reset", n),
    m = futureResetHeader(e, "anthropic-ratelimit-unified-7d-reset", n),
    h = r > 0 && d !== void 0 && (m === void 0 || d > m),
    y = s > 0 && !h ? "seven_day" : "five_hour",
    w = e.get(OVERAGE_STATUS_HEADER),
    L = w === "allowed" || w === "allowed_warning" ? w : void 0;
  return {
    limiterRan: !0,
    zone: { rateLimitType: y, resetsAt: y === "seven_day" ? m : d, extraUsageStatus: L },
    covered: L !== void 0 || e.get(OVERAGE_IN_USE_HEADER) === "true",
  };
}
/**
 * 额度宽限期"收尾"状态：当前所处区间（zone）、本轮提示是否已放置、子代理提示节流。
 */
//@ chunk-w5ndchqs.js:7016-8336 placement
class WrapUpState {
  zone = null;
  covered = !1;
  turnNote = "none";
  fenceMs = 0;
  getZone(e = Date.now()) {
    let zone = this.zone;
    return zone !== null && zone.resetsAt !== void 0 && e / 1000 >= zone.resetsAt ? null : zone;
  }
  applyResponse(e, n) {
    let r = parseUnifiedRateLimitHeaders(e, n);
    if (!r.limiterRan || n < this.fenceMs) return;
    if (((this.fenceMs = n), r.zone === null || r.zone.resetsAt !== void 0)) this.dropEndedZone(n);
    if (((this.zone = r.zone), (this.covered = r.zone !== null && r.covered), r.zone === null || r.covered))
      this.turnNote = "none";
    else if (this.turnNote === "none") this.turnNote = "owed";
  }
  dropEndedZone(e) {
    if (this.zone !== null && this.getZone(e) === null)
      ((this.zone = null), (this.covered = !1), (this.turnNote = "none"));
  }
  onRefused() {
    if (this.zone !== null && this.zone.extraUsageStatus !== void 0)
      this.zone = { ...this.zone, extraUsageStatus: void 0 };
    this.covered = !1;
  }
  leave(e = Date.now()) {
    ((this.zone = null),
      (this.covered = !1),
      (this.turnNote = "none"),
      (this.fenceMs = Math.max(this.fenceMs, e)));
  }
  onMainTurnStart() {
    this.turnNote = "none";
  }
  takeTurnNote(e = Date.now()) {
    if ((this.dropEndedZone(e), this.turnNote !== "owed")) return !1;
    return ((this.turnNote = "taken"), !0);
  }
  markStartNotePlaced() {
    if (this.turnNote === "taken") this.turnNote = "placed";
  }
  continueAfterWrapUpAt(e = Date.now()) {
    let zone = this.getZone(e);
    return this.turnNote === "placed" && zone !== null && !this.covered && zone.resetsAt !== void 0
      ? { resetsAt: zone.resetsAt, rateLimitType: zone.rateLimitType }
      : null;
  }
  subagentNoteDue(e = Date.now()) {
    return this.getZone(e) !== null && !this.covered;
  }
}
//@ chunk-w5ndchqs.js:8336-8384 placement
function maybeMockRateLimitHeaders(e) {
  if (isRateLimitMockingEnabled()) return applyMockQuotaHeaders(e);
  return e;
}
//@ chunk-w5ndchqs.js:8384-8434 placement
function yhn(e) {
  return e || getAPIProvider() === "gateway" || isRateLimitMockingEnabled();
}
/**
 * 限额类型显示名：five_hour→"5-hour limit"、seven_day→"weekly limit"、seven_day_opus/sonnet、seven_day_overage_included→"Fable limit"、overage→"usage credit limit"。
 */
//@ chunk-w5ndchqs.js:20162-20352 fingerprint = RATE_LIMIT_DISPLAY_NAMES (0.705)
var RATE_LIMIT_DISPLAY_NAMES = {
  five_hour: "5-hour limit",
  seven_day: "weekly limit",
  seven_day_opus: "Opus limit",
  seven_day_sonnet: "Sonnet limit",
  seven_day_overage_included: "Fable limit",
  overage: "usage credit limit",
};
/**
 * 时间相对早期预警配置：5 小时窗口利用率 ≥90% 且时间进度 ≤72%；7 天窗口 75%/60%、50%/35%…
 */
//@ chunk-w5ndchqs.js:27877-28134 fingerprint = EARLY_WARNING_CONFIGS (1)
var EARLY_WARNING_CONFIGS = [
  { rateLimitType: "five_hour", windowSeconds: 18000, thresholds: [{ utilization: 0.9, timePct: 0.72 }] },
  {
    rateLimitType: "seven_day",
    windowSeconds: 604800,
    thresholds: [
      { utilization: 0.75, timePct: 0.6 },
      { utilization: 0.5, timePct: 0.35 },
      { utilization: 0.25, timePct: 0.15 },
    ],
  },
];
/**
 * 限额类型显示名，未知类型原样返回。
 */
//@ chunk-w5ndchqs.js:28134-28170 layout
function getRateLimitDisplayName(e) {
  return getOwn(RATE_LIMIT_DISPLAY_NAMES, e) || e;
}
/**
 * 窗口已过时间占比（0–1）。
 */
//@ chunk-w5ndchqs.js:28170-28256 file-local
function computeTimeProgress(resetsAt, windowSeconds) {
  let r = Date.now() / 1000,
    s = resetsAt - windowSeconds,
    d = r - s;
  return Math.max(0, Math.min(1, d / windowSeconds));
}
/**
 * 从 429 响应头构造被拒额度状态（rateLimitType、overage 状态/重置、禁用原因、范围、低优先级提议）。
 */
//@ chunk-w5ndchqs.js:28256-28821 layout
function extractQuotaStatusFromErrorHeaders(e) {
  let n = e.headers?.get?.(REPRESENTATIVE_CLAIM_HEADER),
    r = e.headers?.get?.(OVERAGE_STATUS_HEADER);
  if (!n && !r) return null;
  let s = { status: "rejected", unifiedRateLimitFallbackAvailable: !1, isUsingOverage: !1 },
    d = e.headers?.get?.("anthropic-ratelimit-unified-reset");
  if (d) s.resetsAt = Math.round(Number(d));
  if (n) s.rateLimitType = n;
  if (r) s.overageStatus = r;
  let m = e.headers?.get?.("anthropic-ratelimit-unified-overage-reset");
  if (m) s.overageResetsAt = Math.round(Number(m));
  let h = e.headers?.get?.(OVERAGE_DISABLED_REASON_HEADER);
  if (h) s.overageDisabledReason = h;
  let y = overageScopeHeader(e.headers);
  if (y) s.overageScope = y;
  return (Object.assign(s, parseLowPriorityOffer(e.headers)), s);
}
/**
 * 低优先级（等待额度恢复）提议头：offer、retry-after 秒、最大等待秒。
 */
//@ chunk-w5ndchqs.js:28821-29006 layout
function parseLowPriorityOffer(e) {
  let n = getSlowOfferArm(e);
  if (!n) return {};
  let r = N8r(e),
    s = $8r(e);
  return {
    lowPriorityOffer: n,
    ...(r !== void 0 && { lowPriorityRetryAfterSeconds: r }),
    ...(s !== void 0 && { lowPriorityMaxWaitSeconds: s }),
  };
}
/**
 * 窗口类型 → 头名缩写（5h/7d/7d_oi/overage）；Qt=30 分钟。
 */
//@ chunk-w5ndchqs.js:29006-29124 fingerprint = EARLY_WARNING_CLAIM_MAP (0.608)
var UNIFIED_WINDOW_HEADER_KEYS = [
    ["five_hour", "5h"],
    ["seven_day", "7d"],
    ["seven_day_overage_included", "7d_oi"],
    ["overage", "overage"],
  ],
  EARLY_WARNING_COOLDOWN_MS = 1800000;
/**
 * GrowthBook tengu_sharded_moonbeam（默认开）。
 */
//@ chunk-w5ndchqs.js:29124-29176 layout
function isShardedQuotaEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_sharded_moonbeam", !0);
}
/**
 * GrowthBook tengu_valiant_finch（默认关）。
 */
//@ chunk-w5ndchqs.js:29176-29225 layout
function isValiantFinchEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_valiant_finch", !1);
}
/**
 * 头值转数字（空/非数返回 undefined）。
 */
//@ chunk-w5ndchqs.js:29225-29318 layout
function parseHeaderNumber(e) {
  if (e === null || e === "") return;
  let n = Number(e);
  return Number.isFinite(n) ? n : void 0;
}
/**
 * 解析各窗口 anthropic-ratelimit-unified-{5h,7d,7d_oi,overage}-{utilization,reset,surpassed-threshold,status} 头为读数表。
 */
//@ chunk-w5ndchqs.js:29318-29851 fingerprint = getHeaderBasedEarlyWarning (0.678)
function getHeaderBasedEarlyWarning(e) {
  let n = {};
  for (let [r, s] of UNIFIED_WINDOW_HEADER_KEYS) {
    let d = parseHeaderNumber(e.get(`anthropic-ratelimit-unified-${s}-utilization`)),
      m = parseHeaderNumber(e.get(`anthropic-ratelimit-unified-${s}-reset`)),
      h = parseHeaderNumber(e.get(`anthropic-ratelimit-unified-${s}-surpassed-threshold`)),
      surpassedThreshold = e.get(`anthropic-ratelimit-unified-${s}-status`),
      w = r === "overage" ? void 0 : UNIFIED_STATUS_VALUES.find((L) => L === surpassedThreshold);
    if (d === void 0 && m === void 0 && h === void 0 && w === void 0) continue;
    n[r] = {
      ...(d !== void 0 && { utilization: d }),
      ...(m !== void 0 && { resets_at: Math.round(m) }),
      ...(h !== void 0 && { surpassedThreshold: h }),
      ...(w !== void 0 && { status: w }),
    };
  }
  return n;
}
/**
 * allowed/allowed_warning/rejected。
 */
//@ chunk-w5ndchqs.js:29851-29899 layout
var UNIFIED_STATUS_VALUES = ["allowed", "allowed_warning", "rejected"];
/**
 * 只保留有 utilization 与 resets_at 的窗口读数。
 */
//@ chunk-w5ndchqs.js:29899-30063 layout
function pickWindowReadings(e) {
  let n = {};
  for (let [r] of UNIFIED_WINDOW_HEADER_KEYS) {
    let s = e[r];
    if (s?.utilization !== void 0 && s.resets_at !== void 0)
      n[r] = { utilization: s.utilization, resets_at: s.resets_at };
  }
  return n;
}
/**
 * 读数指纹 "利用率@重置:状态:阈值"，用于去重。
 */
//@ chunk-w5ndchqs.js:30063-30173 layout
function readingFingerprint(e, n) {
  return `${Math.round(e.utilization * 100)}@${e.resets_at}:${n?.status}:${n?.surpassedThreshold}`;
}
/**
 * 读数的 utilization 与 resets_at 都是有限数。
 */
//@ chunk-w5ndchqs.js:30173-30269 layout
function isValidUtilization(e) {
  return e !== void 0 && Number.isFinite(e.utilization) && Number.isFinite(e.resets_at);
}
/**
 * 读数有阈值或完整利用率信息。
 */
//@ chunk-w5ndchqs.js:30269-30367 layout
function hasReadingSignal(e) {
  return e.surpassedThreshold !== void 0 || (e.utilization !== void 0 && e.resets_at !== void 0);
}
/**
 * 配额探测：发一次 max_tokens=1 的 "quota" 请求以获取限额响应头。
 */
//@ chunk-w5ndchqs.js:30367-30645 fingerprint = makeTestQuery (0.93)
async function makeTestQuery(e, n, r) {
  let anthropic = await getAnthropicClient({
      maxRetries: 0,
      model: e,
      source: "quota_check",
      agentContext: mainAgentContext(),
      credentials: n,
    }),
    messages = [{ role: "user", content: "quota" }],
    betas = getModelBetas(e);
  return anthropic.beta.messages
    .create(
      {
        model: toProviderWireModelId(e),
        max_tokens: 1,
        messages: messages,
        metadata: getAPIMetadata(),
        ...betasRequestParam(betas),
      },
      { signal: r },
    )
    .asResponse();
}
/**
 * 执行一次配额探测请求。
 */
//@ chunk-w5ndchqs.js:30645-30687 layout
async function runQuotaProbe(e, n, r) {
  await makeTestQuery(e, n, r);
}
/**
 * 响应头里有 surpassed-threshold 的窗口直接作为预警（allowed_warning）。
 */
//@ chunk-w5ndchqs.js:30687-31000 file-local
function extractRawUtilization(e, n, r) {
  for (let [s] of UNIFIED_WINDOW_HEADER_KEYS) {
    if (r && s === "five_hour") continue;
    let d = e[s];
    if (d?.surpassedThreshold !== void 0)
      return {
        status: "allowed_warning",
        resetsAt: d.resets_at,
        rateLimitType: s,
        utilization: d.utilization,
        unifiedRateLimitFallbackAvailable: n,
        isUsingOverage: !1,
        surpassedThreshold: d.surpassedThreshold,
      };
  }
  return null;
}
/**
 * 按配置判断某窗口利用率是否超过对应时间进度的阈值。
 */
//@ chunk-w5ndchqs.js:31000-31370 fingerprint = getTimeRelativeEarlyWarning (0.722)
function getTimeRelativeEarlyWarning(headers, config, unifiedRateLimitFallbackAvailable) {
  let { rateLimitType: rateLimitType, windowSeconds: windowSeconds, thresholds: thresholds } = config,
    h = headers[rateLimitType];
  if (h?.utilization === void 0 || h.resets_at === void 0) return null;
  let { utilization: utilization, resets_at: resets_at } = h,
    timeProgress = computeTimeProgress(resets_at, windowSeconds);
  if (!thresholds.some((R) => utilization >= R.utilization && timeProgress <= R.timePct)) return null;
  return {
    status: "allowed_warning",
    resetsAt: resets_at,
    rateLimitType: rateLimitType,
    utilization: utilization,
    unifiedRateLimitFallbackAvailable: unifiedRateLimitFallbackAvailable,
    isUsingOverage: !1,
  };
}
/**
 * 早期预警：先看服务器阈值头，再按时间相对配置（Fable 场景跳过 5 小时窗口）。
 */
//@ chunk-w5ndchqs.js:31370-31528 callgraph-witnessed = getEarlyWarningFromHeaders (0)
function getEarlyWarningFromHeaders(headers, unifiedRateLimitFallbackAvailable) {
  let r = dD(),
    s = extractRawUtilization(headers, unifiedRateLimitFallbackAvailable, r);
  if (s) return s;
  for (let config of EARLY_WARNING_CONFIGS) {
    if (r && config.rateLimitType === "five_hour") continue;
    let timeRelativeWarning = getTimeRelativeEarlyWarning(headers, config, unifiedRateLimitFallbackAvailable);
    if (timeRelativeWarning) return timeRelativeWarning;
  }
  return null;
}
/**
 * 从 anthropic-ratelimit-unified-* 头计算额度：status、reset、fallback、representative-claim、overage-status/reset/disabled-reason/scope、upgrade-paths、月度/频道利用率、宽限；附带早期预警与各窗口读数。
 */
//@ chunk-w5ndchqs.js:31528-32905 fingerprint = computeNewLimitsFromHeaders (0.744)
function computeNewLimitsFromHeaders(e, n) {
  let r = e.get("anthropic-ratelimit-unified-status") || "allowed",
    resetsAtHeader = e.get("anthropic-ratelimit-unified-reset"),
    d = resetsAtHeader ? Math.round(Number(resetsAtHeader)) : void 0,
    m = e.get("anthropic-ratelimit-unified-fallback") === "available",
    rateLimitType = e.get("anthropic-ratelimit-unified-representative-claim"),
    overageStatus = e.get("anthropic-ratelimit-unified-overage-status"),
    overageResetsAtHeader = e.get("anthropic-ratelimit-unified-overage-reset"),
    L = overageResetsAtHeader ? Math.round(Number(overageResetsAtHeader)) : void 0,
    overageDisabledReason = e.get("anthropic-ratelimit-unified-overage-disabled-reason"),
    R = overageScopeHeader(e),
    U = e.get(OVERAGE_IN_USE_HEADER) === "true",
    S = parseLowPriorityOffer(e),
    E = e.get("anthropic-ratelimit-unified-upgrade-paths"),
    C = E ? E.split(",").map((lt) => lt.trim()) : void 0,
    P = e.get("anthropic-ratelimit-unified-overage-period-monthly-utilization"),
    O = P ? Number(P) : NaN,
    I = Number.isFinite(O) ? { utilization: O } : void 0,
    z = e.get("anthropic-ratelimit-unified-overage-period-channel-utilization"),
    k = z ? Number(z) : NaN,
    Q = Number.isFinite(k) ? { utilization: k } : void 0,
    Ee = {
      status: r === "allowed_warning" ? "allowed" : r,
      resetsAt: d,
      unifiedRateLimitFallbackAvailable: m,
      ...(rateLimitType && { rateLimitType: rateLimitType }),
      ...(overageStatus && { overageStatus: overageStatus }),
      ...(L && { overageResetsAt: L }),
      ...(overageDisabledReason && { overageDisabledReason: overageDisabledReason }),
      ...(R && { overageScope: R }),
      ...(C && { upgradePaths: C }),
      isUsingOverage:
        r === "rejected" && (overageStatus === "allowed" || overageStatus === "allowed_warning"),
      ...(U && { overageInUse: U }),
      ...(I && { overagePeriodMonthly: I }),
      ...(Q && { overagePeriodChannel: Q }),
      ...(n && { rateLimitGraceActive: !0 }),
      ...S,
    },
    xe = getHeaderBasedEarlyWarning(e);
  return { base: Ee, own: withEarlyWarning(Ee, xe), readings: xe };
}
/**
 * allowed 状态时叠加早期预警信息。
 */
//@ chunk-w5ndchqs.js:32905-33037 layout
function withEarlyWarning(e, n) {
  if (e.status !== "allowed") return e;
  let r = getEarlyWarningFromHeaders(n, e.unifiedRateLimitFallbackAvailable);
  return r ? carryOverageFields(r, e.upgradePaths, e) : e;
}
//@ chunk-w5ndchqs.js:33037-33073 placement
function it(e, n) {
  return computeNewLimitsFromHeaders(e, n).own;
}
/**
 * 把超额（overage）相关字段与升级路径合并到限额状态中（宽限期内不带超额状态字段）。
 */
//@ chunk-w5ndchqs.js:33073-33580 placement
function carryOverageFields(limits, upgradePaths, previous) {
  return {
    ...limits,
    ...(upgradePaths && { upgradePaths: upgradePaths }),
    ...(!previous.rateLimitGraceActive && {
      ...(previous.overageStatus && { overageStatus: previous.overageStatus }),
      ...(previous.overageResetsAt && { overageResetsAt: previous.overageResetsAt }),
      ...(previous.overageDisabledReason && { overageDisabledReason: previous.overageDisabledReason }),
    }),
    ...(previous.overageInUse && { overageInUse: !0 }),
    ...(previous.overagePeriodMonthly && { overagePeriodMonthly: previous.overagePeriodMonthly }),
    ...(previous.overagePeriodChannel && { overagePeriodChannel: previous.overagePeriodChannel }),
    ...(previous.rateLimitGraceActive && { rateLimitGraceActive: !0 }),
  };
}
//@ chunk-w5ndchqs.js:33674-33808 placement
function toAllowedLimits(e) {
  let {
    resetsAt: resetsAt,
    rateLimitType: rateLimitType,
    utilization: utilization,
    surpassedThreshold: surpassedThreshold,
    upgradePaths: upgradePaths,
    ...h
  } = e;
  return { ...h, status: "allowed" };
}
//@ chunk-w5ndchqs.js:33808-34257 placement
function creditsRequiredDetails(e) {
  let n = e.error?.error?.details;
  if (n?.error_code !== "credits_required") return {};
  return {
    errorCode: "credits_required",
    ...(typeof n.disabled_reason === "string" && { overageDisabledReason: n.disabled_reason }),
    ...(typeof n.can_user_purchase_credits === "boolean" && {
      canUserPurchaseCredits: n.can_user_purchase_credits,
    }),
    ...(typeof n.has_chargeable_saved_payment_method === "boolean" && {
      hasChargeableSavedPaymentMethod: n.has_chargeable_saved_payment_method,
    }),
  };
}
//@ chunk-w5ndchqs.js:34257-34371 placement
function cacheExtraUsageDisabledReason(e, n) {
  if (getGlobalConfig().cachedExtraUsageDisabledReason !== e)
    saveGlobalConfig((r) => ({ ...r, cachedExtraUsageDisabledReason: e }), n);
}
/**
 * 缓存 overage-disabled-reason（网关模式除外）。
 */
//@ chunk-w5ndchqs.js:34371-34489 fingerprint = cacheExtraUsageDisabledReason (0.61)
function cacheExtraUsageDisabledReason_2(e, n) {
  if (getAPIProvider() === "gateway") return;
  cacheExtraUsageDisabledReason(e.get("anthropic-ratelimit-unified-overage-disabled-reason") ?? null, n);
}
//@ chunk-w5ndchqs.js:37636-37763 placement
function earlyWarningThresholdFor(e) {
  switch (e) {
    case "default_claude_max_5x":
      return 0.99;
    case "default_claude_max_20x":
      return 0.9975;
    default:
      return cn;
  }
}
/**
 * claude.ai 订阅额度的进程级跟踪器：当前限额状态、窗口利用率、宽限期、超额使用、额度拒绝事件与订阅者通知（tengu_claudeai_limits_status_changed）。
 */
//@ chunk-w5ndchqs.js:37763-47376 placement
class ClaudeAiLimitsTracker {
  currentLimits = { status: "allowed", unifiedRateLimitFallbackAvailable: !1, isUsingOverage: !1 };
  rawUtilization = {};
  rawWindowLevels = {};
  lastSeenWindows = {};
  lastEmittedWindowParts = {};
  lastEmittedGraceExtraUsageStatus = void 0;
  lastAppliedObservationAtMs = 0;
  accountEpoch = 0;
  limitsObserved = !1;
  retiredAtMs = {};
  longContext1mOkLogged = !1;
  statusChanged = createSignal();
  overageInUse = createSignal();
  quotaRejected = createSignal();
  usageLimitWaits = new Set();
  usageLimitWaitsChanged = createSignal();
  wrapUp = new WrapUpState();
  pendingNearLimitWrapUpHint = !1;
  nearLimitWrapUpWindowKey = null;
  isFromPreviousAccount(e) {
    return e !== void 0 && e !== this.accountEpoch;
  }
  isStaleObservation(e) {
    if (e < this.lastAppliedObservationAtMs) return !0;
    return ((this.lastAppliedObservationAtMs = e), (this.limitsObserved = !0), !1);
  }
  applyWindowReadings(e, n, r, s) {
    let { overageDisabledReason: overageDisabledReason } = n;
    if (
      overageDisabledReason !== void 0 &&
      overageDisabledReason !== "fetch_error" &&
      overageDisabledReason !== "unknown"
    )
      this.retireWindows(["overage"], r);
    if (!s) {
      ((this.rawUtilization = pickWindowReadings(e)), (this.rawWindowLevels = {}));
      for (let [m] of UNIFIED_WINDOW_HEADER_KEYS) {
        let { status: status, surpassedThreshold: surpassedThreshold } = e[m] ?? {};
        if (status !== void 0 || surpassedThreshold !== void 0)
          this.rawWindowLevels[m] = {
            ...(status !== void 0 && { status: status }),
            ...(surpassedThreshold !== void 0 && { surpassedThreshold: surpassedThreshold }),
          };
      }
    }
    this.recordSeenWindows(e, n, r);
  }
  recordSeenWindows(e, { upgradePaths: n, unifiedRateLimitFallbackAvailable: r }, s) {
    let d = pickWindowReadings(e);
    for (let [m] of UNIFIED_WINDOW_HEADER_KEYS) {
      if (this.isRetiredReading(m, s)) continue;
      let h = d[m],
        y = this.lastSeenWindows[m];
      if (isValidUtilization(h) && (y === void 0 || s >= y.observedAtMs)) {
        let w = e[m]?.surpassedThreshold;
        this.lastSeenWindows[m] = {
          ...h,
          observedAtMs: s,
          ...(w !== void 0 && { surpassedThreshold: w }),
          ...(n && { upgradePaths: n }),
          unifiedRateLimitFallbackAvailable: r,
        };
      }
    }
  }
  currentWindows(e) {
    let n = this.lastAppliedObservationAtMs - EARLY_WARNING_COOLDOWN_MS,
      r = {};
    for (let [s] of UNIFIED_WINDOW_HEADER_KEYS) {
      let d = this.lastSeenWindows[s];
      if (d !== void 0 && d.observedAtMs >= n && at(d, e)) r[s] = d;
    }
    return r;
  }
  deriveTrackedLimits(e, n, r, s) {
    if (e.status !== "allowed") return e;
    let d = isShardedQuotaEnabled(),
      m = d ? this.currentWindows(s) : {},
      h = {},
      y = {};
    for (let [L] of UNIFIED_WINDOW_HEADER_KEYS) {
      let x = m[L];
      if (x !== void 0 && x.utilization < 1 && (x.surpassedThreshold === void 0 || x.surpassedThreshold < 1))
        y[L] = x;
      let R = n[L];
      if (R !== void 0 && hasReadingSignal(R) && !(d && this.isRetiredReading(L, r)))
        ((h[L] = R), (y[L] = R));
    }
    let w = getEarlyWarningFromHeaders(y, e.unifiedRateLimitFallbackAvailable);
    if (!w) return e;
    for (let [L] of UNIFIED_WINDOW_HEADER_KEYS) {
      let x = m[L];
      if (L === w.rateLimitType && h[L] === void 0 && x !== void 0)
        return carryOverageFields(
          { ...w, unifiedRateLimitFallbackAvailable: x.unifiedRateLimitFallbackAvailable },
          x.upgradePaths,
          e,
        );
    }
    return carryOverageFields(w, e.upgradePaths, e);
  }
  resetCurrentLimits() {
    ((this.currentLimits = { status: "allowed", unifiedRateLimitFallbackAvailable: !1, isUsingOverage: !1 }),
      (this.rawUtilization = {}),
      (this.rawWindowLevels = {}),
      (this.lastSeenWindows = {}),
      (this.lastEmittedWindowParts = {}),
      (this.lastEmittedGraceExtraUsageStatus = void 0),
      this.accountEpoch++,
      (this.lastAppliedObservationAtMs = Date.now()),
      this.retireWindows(void 0, this.lastAppliedObservationAtMs),
      (this.limitsObserved = !1));
  }
  forgetHeldWindows(e) {
    let now = Date.now();
    this.retireWindows(e, now);
    for (let [d] of UNIFIED_WINDOW_HEADER_KEYS)
      if (e === void 0 || e.includes(d)) delete this.rawWindowLevels[d];
    let { status: status, rateLimitType: rateLimitType } = this.currentLimits;
    if (
      isShardedQuotaEnabled() &&
      status === "allowed_warning" &&
      rateLimitType !== void 0 &&
      (e === void 0 || e.includes(rateLimitType))
    ) {
      let deriveTrackedLimits = this.deriveTrackedLimits(toAllowedLimits(this.currentLimits), {}, now, now);
      if (!En(this.currentLimits, deriveTrackedLimits))
        try {
          this.emitStatusChange(deriveTrackedLimits);
        } catch (error) {
          logError(error);
        }
    }
  }
  isRetiredReading(e, n) {
    let r = this.retiredAtMs[e];
    return r !== void 0 && n <= r;
  }
  retireWindows(e, n) {
    for (let [r] of UNIFIED_WINDOW_HEADER_KEYS) {
      if (e !== void 0 && !e.includes(r)) continue;
      let s = this.retiredAtMs[r];
      if (s === void 0 || n > s) this.retiredAtMs[r] = n;
      let d = this.lastSeenWindows[r];
      if (d !== void 0 && d.observedAtMs <= n) delete this.lastSeenWindows[r];
    }
  }
  emitStatusChange(e) {
    let currentLimits = this.currentLimits;
    if (
      ((this.currentLimits = e),
      (this.limitsObserved = !0),
      isValidUtilization(this.rawUtilization.five_hour))
    )
      this.lastEmittedWindowParts.five_hour = readingFingerprint(
        this.rawUtilization.five_hour,
        this.rawWindowLevels.five_hour,
      );
    if (isValidUtilization(this.rawUtilization.seven_day))
      this.lastEmittedWindowParts.seven_day = readingFingerprint(
        this.rawUtilization.seven_day,
        this.rawWindowLevels.seven_day,
      );
    if (isValidUtilization(this.rawUtilization.seven_day_overage_included))
      this.lastEmittedWindowParts.seven_day_overage_included = readingFingerprint(
        this.rawUtilization.seven_day_overage_included,
        this.rawWindowLevels.seven_day_overage_included,
      );
    if (
      ((this.lastEmittedGraceExtraUsageStatus = this.wrapUp.getZone()?.extraUsageStatus),
      this.statusChanged.emit(e),
      currentLimits.status === e.status && currentLimits.isUsingOverage === e.isUsingOverage)
    )
      return;
    let r = Math.round(((e.resetsAt ? e.resetsAt - Date.now() / 1000 : 0) / 3600) * 10) / 10;
    logEvent("tengu_claudeai_limits_status_changed", {
      status: fromEnum(e.status),
      previousStatus: fromEnum(currentLimits.status),
      rateLimitType: fromEnumOpt(e.rateLimitType),
      isUsingOverage: e.isUsingOverage,
      unifiedRateLimitFallbackAvailable: e.unifiedRateLimitFallbackAvailable,
      hoursTillReset: r,
    });
  }
  restoreLimits(e, n) {
    ((this.currentLimits = e), (this.limitsObserved = n), this.statusChanged.emit(e));
  }
  async probeQuotaStatus(e, n, r) {
    if (isEssentialTrafficOnly()) return null;
    if (!yhn(isClaudeAISubscriber())) return null;
    if (getIsNonInteractiveSession()) return null;
    let accountEpoch = this.accountEpoch;
    try {
      let d = await makeTestQuery(e, n),
        extractQuotaStatusFromHeaders = this.extractQuotaStatusFromHeaders(
          d.headers,
          e,
          !1,
          Date.now(),
          accountEpoch,
          r,
        );
      if (this.isFromPreviousAccount(accountEpoch)) return null;
      return (
        extractQuotaStatusFromHeaders ??
        it(maybeMockRateLimitHeaders(d.headers), this.wrapUp.getZone() !== null)
      );
    } catch (error) {
      if (error instanceof Ot) this.extractQuotaStatusFromError(error, "other", Date.now(), accountEpoch, r);
      return null;
    }
  }
  extractQuotaStatusFromHeaders(e, n, r = !1, s = Date.now(), d, m) {
    if (this.isFromPreviousAccount(d)) return null;
    let h = isClaudeAISubscriber();
    if (!yhn(h)) {
      if (
        ((this.rawUtilization = {}),
        (this.rawWindowLevels = {}),
        (this.lastSeenWindows = {}),
        this.currentLimits.status !== "allowed" ||
          this.currentLimits.resetsAt ||
          this.currentLimits.rateLimitGraceActive)
      ) {
        let S = { status: "allowed", unifiedRateLimitFallbackAvailable: !1, isUsingOverage: !1 };
        this.emitStatusChange(S);
      }
      return null;
    }
    let y = maybeMockRateLimitHeaders(e),
      zone = this.wrapUp.getZone(),
      { base: base, own: own, readings: readings } = computeNewLimitsFromHeaders(y, zone !== null);
    if (
      (cacheExtraUsageDisabledReason_2(y, m),
      handleLowPriorityResponseHeaders(y, s),
      r && !this.longContext1mOkLogged)
    )
      ((this.longContext1mOkLogged = !0), logFeatureOk("context_1m_entitlement"));
    let isStaleObservation = this.isStaleObservation(s);
    if ((this.applyWindowReadings(readings, base, s, isStaleObservation), !isStaleObservation)) {
      if (this.nearLimitWrapUpWindowKey !== null && Date.now() / 1000 > this.nearLimitWrapUpWindowKey)
        ((this.pendingNearLimitWrapUpHint = !1), (this.nearLimitWrapUpWindowKey = null));
      let five_hour = this.rawUtilization.five_hour;
      if (
        five_hour !== void 0 &&
        Number.isFinite(five_hour.resets_at) &&
        Number.isFinite(five_hour.utilization) &&
        five_hour.resets_at * 1000 > Date.now()
      ) {
        let C = earlyWarningThresholdFor(getRateLimitTier());
        if (five_hour.utilization >= C && !dD()) {
          if (base.overageStatus === "allowed" || base.overageStatus === "allowed_warning")
            this.pendingNearLimitWrapUpHint = !1;
          else if (this.nearLimitWrapUpWindowKey !== five_hour.resets_at)
            ((this.pendingNearLimitWrapUpHint = !0), (this.nearLimitWrapUpWindowKey = five_hour.resets_at));
        }
      }
      let deriveTrackedLimits = this.deriveTrackedLimits(base, readings, s, Date.now());
      if (!En(this.currentLimits, deriveTrackedLimits)) this.emitStatusChange(deriveTrackedLimits);
      else {
        let C = isValidUtilization(this.rawUtilization.five_hour) ? this.rawUtilization.five_hour : void 0,
          P = isValidUtilization(this.rawUtilization.seven_day) ? this.rawUtilization.seven_day : void 0,
          O = isValidUtilization(this.rawUtilization.seven_day_overage_included)
            ? this.rawUtilization.seven_day_overage_included
            : void 0,
          rawWindowLevels = this.rawWindowLevels;
        if (
          (C !== void 0 &&
            readingFingerprint(C, rawWindowLevels.five_hour) !== this.lastEmittedWindowParts.five_hour) ||
          (P !== void 0 &&
            readingFingerprint(P, rawWindowLevels.seven_day) !== this.lastEmittedWindowParts.seven_day) ||
          (O !== void 0 &&
            readingFingerprint(O, rawWindowLevels.seven_day_overage_included) !==
              this.lastEmittedWindowParts.seven_day_overage_included) ||
          zone?.extraUsageStatus !== this.lastEmittedGraceExtraUsageStatus
        )
          this.emitStatusChange(deriveTrackedLimits);
      }
    } else {
      let { rateLimitGraceActive: rateLimitGraceActive, ...E } = this.currentLimits,
        C = {
          ...(zone !== null && E.status === "allowed_warning" ? toSDKRateLimitInfo(E) : E),
          ...(zone !== null && { rateLimitGraceActive: !0 }),
        };
      if (!En(this.currentLimits, C) || zone?.extraUsageStatus !== this.lastEmittedGraceExtraUsageStatus)
        this.emitStatusChange(C);
    }
    if (own.overageInUse === !0) {
      let S = own.isUsingOverage === !0 && own.rateLimitType !== "seven_day_overage_included",
        E = usageCreditsOnlyFamily(n);
      if (
        !S &&
        !r &&
        !lD() &&
        E !== void 0 &&
        !D2() &&
        !isEnterpriseSubscriber() &&
        !hasUsageCreditsConsent(E)
      )
        setUsageCreditsRequired(!0);
      this.overageInUse.emit(n, own.isUsingOverage === !0, r);
    }
    return own;
  }
  resetGraceState() {
    this.wrapUp.leave();
  }
  resetNearLimitWrapUpState() {
    ((this.pendingNearLimitWrapUpHint = !1), (this.nearLimitWrapUpWindowKey = null));
  }
  extractGraceStatusFromHeaders(e, n, r = Date.now(), s) {
    if (n && !this.isFromPreviousAccount(s)) this.wrapUp.applyResponse(e, r);
  }
  consumePendingNearLimitWrapUpHint() {
    if (!this.pendingNearLimitWrapUpHint) return !1;
    return ((this.pendingNearLimitWrapUpHint = !1), !dD());
  }
  beginUsageLimitWait(e) {
    return (
      this.usageLimitWaits.add(e),
      this.emitUsageLimitWaitsChanged(),
      () => {
        if (this.usageLimitWaits.delete(e)) this.emitUsageLimitWaitsChanged();
      }
    );
  }
  emitUsageLimitWaitsChanged() {
    try {
      this.usageLimitWaitsChanged.emit();
    } catch (error) {
      logError(error);
    }
  }
  extractQuotaStatusFromError(e, n, r = Date.now(), s, d) {
    let m = e.status === void 0 && _Ai(e) && isValiantFinchEnabled();
    if (this.isFromPreviousAccount(s) || !yhn(isClaudeAISubscriber()) || (e.status !== 429 && !m)) return;
    if (getAPIProvider() === "gateway" && !e.headers?.get?.("anthropic-ratelimit-unified-status")) return;
    try {
      let isStaleObservation = this.isStaleObservation(r),
        status = this.currentLimits.status,
        isUsingOverage = this.currentLimits.isUsingOverage,
        L = this.rawUtilization.five_hour?.utilization,
        x = this.rawUtilization.seven_day?.utilization,
        R = this.rawUtilization.overage?.utilization,
        U = { ...this.currentLimits };
      if (e.headers) {
        let E = maybeMockRateLimitHeaders(e.headers),
          C = computeNewLimitsFromHeaders(E, this.wrapUp.getZone() !== null);
        if (((U = C.own), this.applyWindowReadings(C.readings, C.base, r, isStaleObservation), !m))
          cacheExtraUsageDisabledReason_2(E, d);
        else if (getAPIProvider() !== "gateway") cacheExtraUsageDisabledReason("out_of_credits", d);
        if (E.get("anthropic-ratelimit-unified-status") !== null) this.wrapUp.onRefused();
      }
      if (((U = buildRejectedLimits(U, e)), m)) {
        let { overageInUse: overageInUse, ...C } = U;
        U = { ...C, overageStatus: "rejected", overageDisabledReason: "out_of_credits", isUsingOverage: !1 };
      }
      if (
        (status !== "rejected" || isUsingOverage) &&
        !(status === "allowed" && !isUsingOverage && L === void 0 && x === void 0 && R === void 0) &&
        !m
      ) {
        let E =
          U.rateLimitType === "five_hour"
            ? L
            : U.rateLimitType?.startsWith("seven_day")
              ? x
              : U.rateLimitType === "overage"
                ? R
                : Math.max(L ?? 0, x ?? 0, R ?? 0);
        if (E === void 0 || E < 0.8)
          logEvent("tengu_quota_mismatch", {
            priorStatus: fromEnum(status),
            priorIsUsingOverage: isUsingOverage,
            priorFiveHourUtilization: L,
            priorSevenDayUtilization: x,
            priorOverageUtilization: R,
            rateLimitType: fromEnumOpt(U.rateLimitType) ?? void 0,
            subscriptionType: fromEnumOpt(getSubscriptionType()) ?? void 0,
            hadPriorUtilizationData: L !== void 0 || x !== void 0 || R !== void 0,
          });
      }
      if (!isStaleObservation)
        try {
          this.quotaRejected.emit(U, n);
        } catch (error) {
          logError(error);
        }
      if (!isStaleObservation && !En(this.currentLimits, U)) this.emitStatusChange(U);
    } catch (error) {
      logError(error);
    }
  }
}
//@ chunk-w5ndchqs.js:47376-47389 placement
var claudeAiLimits = new ClaudeAiLimitsTracker();
//@ chunk-w5ndchqs.js:47389-47426 placement
function getCurrentLimits() {
  return claudeAiLimits.currentLimits;
}
//@ chunk-w5ndchqs.js:47426-47468 placement
function getRawUtilization() {
  return liveWindowsOf(claudeAiLimits.rawUtilization);
}
//@ chunk-w5ndchqs.js:47468-47508 placement
function getRawWindowLevels() {
  return claudeAiLimits.rawWindowLevels;
}
//@ chunk-w5ndchqs.js:47508-47625 placement
function hasSurpassedThreshold(e) {
  return (
    claudeAiLimits.rawWindowLevels[e]?.surpassedThreshold ??
    claudeAiLimits.currentWindows(Date.now())[e]?.surpassedThreshold
  );
}
/**
 * 取当前各统一限额窗口的使用率与重置时间。
 */
//@ chunk-w5ndchqs.js:47625-47776 placement
function currentUsageWindows() {
  let currentWindows = claudeAiLimits.currentWindows(Date.now()),
    n = {};
  for (let [r] of UNIFIED_WINDOW_HEADER_KEYS) {
    let s = currentWindows[r];
    if (s) n[r] = { utilization: s.utilization, resets_at: s.resets_at };
  }
  return n;
}
//@ chunk-w5ndchqs.js:47776-47879 placement
function liveWindowsOf(e) {
  let now = Date.now(),
    r = {};
  for (let [s] of UNIFIED_WINDOW_HEADER_KEYS) {
    let d = e[s];
    if (d !== void 0 && at(d, now)) r[s] = d;
  }
  return r;
}
//@ chunk-w5ndchqs.js:47879-47966 placement
function at(e, n) {
  let r = n / 1000,
    s = r + 31536000;
  return isValidUtilization(e) && e.resets_at > r && e.resets_at < s;
}
//@ chunk-w5ndchqs.js:47966-48002 placement
function getLimitsAccountEpoch() {
  return claudeAiLimits.accountEpoch;
}
//@ chunk-w5ndchqs.js:48002-48041 placement
function areLimitsObserved() {
  return claudeAiLimits.limitsObserved;
}
//@ chunk-w5ndchqs.js:48041-48092 placement
function lastLimitsObservationAt() {
  return claudeAiLimits.lastAppliedObservationAtMs;
}
//@ chunk-w5ndchqs.js:48092-48144 placement
function onLimitsStatusChanged(e) {
  return claudeAiLimits.statusChanged.subscribe(e);
}
//@ chunk-w5ndchqs.js:48144-48195 placement
function onOverageInUse(e) {
  return claudeAiLimits.overageInUse.subscribe(e);
}
//@ chunk-w5ndchqs.js:48195-48247 placement
function onQuotaRejected(e) {
  return claudeAiLimits.quotaRejected.subscribe(e);
}
//@ chunk-w5ndchqs.js:48247-48295 placement
function beginUsageLimitWait(e) {
  return claudeAiLimits.beginUsageLimitWait(e);
}
//@ chunk-w5ndchqs.js:48295-48339 placement
function usageLimitWaits() {
  return [...claudeAiLimits.usageLimitWaits];
}
//@ chunk-w5ndchqs.js:48339-48400 placement
function onUsageLimitWaitsChanged(e) {
  return claudeAiLimits.usageLimitWaitsChanged.subscribe(e);
}
//@ chunk-w5ndchqs.js:48400-48438 placement
function resetCurrentLimits() {
  claudeAiLimits.resetCurrentLimits();
}
//@ chunk-w5ndchqs.js:48438-48477 placement
function forgetHeldWindows(e) {
  claudeAiLimits.forgetHeldWindows(e);
}
//@ chunk-w5ndchqs.js:48477-48515 placement
function emitLimitsStatusChange(e) {
  claudeAiLimits.emitStatusChange(e);
}
//@ chunk-w5ndchqs.js:48515-48554 placement
function restoreLimits(e, n) {
  claudeAiLimits.restoreLimits(e, n);
}
//@ chunk-w5ndchqs.js:48554-48614 placement
async function probeQuotaStatusAtStart(e, n) {
  await claudeAiLimits.probeQuotaStatus(getBareCheckModel(), e, n);
}
//@ chunk-w5ndchqs.js:48614-48667 placement
function probeQuotaStatus(e, n, r) {
  return claudeAiLimits.probeQuotaStatus(e, n, r);
}
//@ chunk-w5ndchqs.js:48667-48759 placement
function extractQuotaStatusFromHeaders(e, n, r = !1, s = Date.now(), d, m) {
  return claudeAiLimits.extractQuotaStatusFromHeaders(e, n, r, s, d, m);
}
//@ chunk-w5ndchqs.js:48759-48835 placement
function extractQuotaStatusFromError(e, n, r = Date.now(), s, d) {
  claudeAiLimits.extractQuotaStatusFromError(e, n, r, s, d);
}
/**
 * 构造 rejected 额度状态（合并错误里的字段）。旧版名错配。
 */
//@ chunk-w5ndchqs.js:48918-48976 affinity = extractQuotaStatusFromError (1)
function buildRejectedLimits(e, n) {
  return { ...e, status: "rejected", ...creditsRequiredDetails(n) };
}
//@ chunk-w5ndchqs.js:48976-49011 placement
function resetGraceState() {
  claudeAiLimits.resetGraceState();
}
//@ chunk-w5ndchqs.js:49011-49056 placement
function resetNearLimitWrapUpState() {
  claudeAiLimits.resetNearLimitWrapUpState();
}
//@ chunk-w5ndchqs.js:49056-49130 placement
function extractGraceStatusFromHeaders(e, n, r = Date.now(), s) {
  claudeAiLimits.extractGraceStatusFromHeaders(e, n, r, s);
}
//@ chunk-w5ndchqs.js:49130-49172 placement
function wrapUpOnMainTurnStart() {
  claudeAiLimits.wrapUp.onMainTurnStart();
}
//@ chunk-w5ndchqs.js:49172-49218 placement
function takeWrapUpTurnNote() {
  return claudeAiLimits.wrapUp.takeTurnNote();
}
//@ chunk-w5ndchqs.js:49218-49264 placement
function markWrapUpStartNotePlaced() {
  claudeAiLimits.wrapUp.markStartNotePlaced();
}
//@ chunk-w5ndchqs.js:49264-49331 placement
function pn(e = Date.now()) {
  return claudeAiLimits.wrapUp.continueAfterWrapUpAt(e);
}
//@ chunk-w5ndchqs.js:49331-49498 placement
function emitStatusChange(limits = Date.now()) {
  let n = pn(limits);
  return n === null
    ? null
    : {
        status: "rejected",
        resetsAt: n.resetsAt,
        rateLimitType: n.rateLimitType,
        unifiedRateLimitFallbackAvailable: !1,
      };
}
//@ chunk-w5ndchqs.js:49498-49547 placement
function isSubagentWrapUpNoteDue() {
  return claudeAiLimits.wrapUp.subagentNoteDue();
}
//@ chunk-w5ndchqs.js:49547-49588 placement
function getWrapUpZone() {
  return claudeAiLimits.wrapUp.getZone();
}
//@ chunk-w5ndchqs.js:49588-49648 placement
function consumeNearLimitWrapUpHint() {
  return claudeAiLimits.consumePendingNearLimitWrapUpHint();
}
//@ chunk-w5ndchqs.js:49648-49769 placement
function overageScopeHeader(e) {
  let n = e?.get?.(OVERAGE_SCOPE_HEADER);
  if (n === "service" || n === "channel" || n === "group_pool" || n === "organization") return n;
  return;
}
//@ chunk-aepeg2w5.js:279315-279407 placement
var PCn = "https://support.claude.com/en/articles/12429409-extra-usage-for-paid-claude-plans";
/**
 * 用量设置页面与帮助链接。
 */
//@ chunk-aepeg2w5.js:279407-279574 placement
var USAGE_SETTINGS_URL = "https://claude.ai/settings/usage?from=cc_cli_limit_message",
  HTTPS_CLAUDE_AI_ADMIN_SETTINGS_USAGE = "https://claude.ai/admin-settings/usage",
  wwi = "https://support.claude.com/en/articles/12429409";
//@ chunk-aepeg2w5.js:279574-279587 placement
var MAX = "max";
/**
 * 按 host 存放的 MockRateLimitState 单例槽。
 */
//@ chunk-aepeg2w5.js:288283-288308 sole-consumer
var mockRateLimitStateSlot = new HostScoped(() => new MockRateLimitState());
//@ chunk-aepeg2w5.js:288308-288345 placement
function Zt() {
  return mockRateLimitStateSlot.of(getRootSession().host);
}
//@ chunk-aepeg2w5.js:288345-288372 placement
function Ewi() {
  return null;
}
//@ chunk-aepeg2w5.js:288372-288437 placement
function checkQuotaStatus() {
  let e = Zt();
  return (e.enabled, null);
  return e.headers;
}
/**
 * 用模拟的配额状态覆盖响应头中的统一限额字段（无模拟状态时原样返回）。
 */
//@ chunk-aepeg2w5.js:288437-288684 placement
function applyMockQuotaHeaders(e) {
  let n = checkQuotaStatus();
  if (!n) return e;
  let r = new globalThis.Headers(e);
  return (
    r.delete("anthropic-ratelimit-unified-5h-status"),
    r.delete("anthropic-ratelimit-unified-7d-status"),
    Object.entries(n).forEach(([s, h]) => {
      if (h !== void 0) r.set(s, h);
    }),
    r
  );
}
/**
 * 限额模拟（外部构建恒为 false）。
 */
//@ chunk-aepeg2w5.js:288684-288708 placement
function isRateLimitMockingEnabled() {
  return !1;
}
/**
 * 默认额度状态 {status:"allowed", isUsingOverage:false}。
 */
//@ chunk-0h4e7gnq.js:48384-48429 fingerprint = currentLimits (0.823)
var currentLimits = { status: "allowed", isUsingOverage: !1 };
/**
 * 额度状态是否为"完全正常"（allowed、无重置时间、未用 overage、无宽限）。
 */
//@ chunk-0h4e7gnq.js:48429-48567 fingerprint = extractQuotaStatusFromHeaders (0.677)
function extractQuotaStatusFromHeaders_2(headers) {
  return (
    headers.status === "allowed" &&
    headers.resetsAt === void 0 &&
    headers.isUsingOverage !== !0 &&
    headers.overageInUse !== !0 &&
    headers.rateLimitGraceActive !== !0
  );
}
/**
 * 额度状态的重置时间已过则清回默认（clear），overage 重置时间已过则剥离 overage 字段（overage_strip）。
 */
//@ chunk-0h4e7gnq.js:48567-49100 affinity
function expireStaleLimits(e, n = Date.now() / 1000) {
  let s = dropExpiredWindows(e, n),
    y = e.resetsAt !== void 0 && e.resetsAt <= n,
    r = e.overageResetsAt !== void 0 && e.overageResetsAt <= n,
    S = e.status === "rejected" && e.overageStatus === "rejected" && r;
  if (y || S)
    return {
      info: { ...currentLimits, ...(s.unifiedWindows !== void 0 && { unifiedWindows: s.unifiedWindows }) },
      degradation: "clear",
    };
  if (r) {
    let {
      overageStatus: overageStatus,
      overageResetsAt: overageResetsAt,
      overageDisabledReason: overageDisabledReason,
      limitScope: limitScope,
      adminRequestOffer: adminRequestOffer,
      ...I
    } = s;
    return { info: { ...I, isUsingOverage: I.isUsingOverage ?? !1 }, degradation: "overage_strip" };
  }
  return { info: s, degradation: "none" };
}
/**
 * 取限额窗口列表最后一项的当前状态（Sd）。
 */
//@ chunk-0h4e7gnq.js:49100-49182 affinity
function getLatestLimitStatus(e, n = Date.now() / 1000) {
  let at = e.at(-1);
  return at === void 0 ? void 0 : expireStaleLimits(at, n);
}
//@ chunk-0h4e7gnq.js:49444-49499 placement
function kd(e) {
  return Object.keys(e).length > 0 ? e : void 0;
}
//@ chunk-0h4e7gnq.js:49499-49711 placement
function dropExpiredWindows(e, n) {
  let { unifiedWindows: unifiedWindows, ...y } = e;
  if (unifiedWindows === void 0) return e;
  let r = Do(unifiedWindows, (h) => h !== void 0 && h.resetsAt > n),
    S = Object.keys(r).length;
  if (S === 0) return y;
  return S === Object.keys(unifiedWindows).length ? e : { ...y, unifiedWindows: r };
}

export {
  getLimitsAccountEpoch,
  getLatestLimitStatus,
  extractQuotaStatusFromHeaders_2,
  getCurrentLimits,
  areLimitsObserved,
  emitLimitsStatusChange,
  kd,
  HTTPS_CLAUDE_AI_ADMIN_SETTINGS_USAGE,
  USAGE_SETTINGS_URL,
  isValidUtilization,
  getWrapUpZone,
  getRawUtilization,
  getRawWindowLevels,
  onLimitsStatusChanged,
  Zt,
  MAX,
  currentLimits,
  getRateLimitDisplayName,
  lastLimitsObservationAt,
  PCn,
  wwi,
  onOverageInUse,
  hasSurpassedThreshold,
  isRateLimitMockingEnabled,
  currentUsageWindows,
  extractQuotaStatusFromHeaders,
  extractQuotaStatusFromError,
  beginUsageLimitWait,
  extractGraceStatusFromHeaders,
  maybeMockRateLimitHeaders,
  buildRejectedLimits,
  it,
  probeQuotaStatusAtStart,
  emitStatusChange,
  probeQuotaStatus,
  onQuotaRejected,
  forgetHeldWindows,
  resetGraceState,
  resetNearLimitWrapUpState,
  resetCurrentLimits,
  RATE_LIMIT_DISPLAY_NAMES,
  isSubagentWrapUpNoteDue,
  wrapUpOnMainTurnStart,
  takeWrapUpTurnNote,
  markWrapUpStartNotePlaced,
  consumeNearLimitWrapUpHint,
  yhn,
  extractQuotaStatusFromErrorHeaders,
  creditsRequiredDetails,
  cacheExtraUsageDisabledReason,
  runQuotaProbe,
  restoreLimits,
  onUsageLimitWaitsChanged,
  usageLimitWaits,
  Ewi,
  checkQuotaStatus,
  claudeAiLimits,
};
