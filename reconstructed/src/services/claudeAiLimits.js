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
import { HostScoped } from "../utils/hostScoped.js";
import { MockRateLimitState } from "./mockRateLimits.js";
import { getRootSession, getIsNonInteractiveSession, setUsageCreditsRequired } from "../bootstrap/state.js";
import {
  OVERAGE_STATUS_HEADER,
  OVERAGE_IN_USE_HEADER,
  REPRESENTATIVE_CLAIM_HEADER,
  OVERAGE_DISABLED_REASON_HEADER,
  getSlowOfferArm,
  getSlowRetryAfter,
  getSlowMaxWait,
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
import { isLowPriorityActive, handleLowPriorityResponseHeaders } from "./lowPriority/lowPriorityMode.js";
import { getGlobalConfig, saveGlobalConfig } from "../utils/config.js";
import { WRAP_UP_UTILIZATION_THRESHOLD } from "./usageLimitGrace.js";
import { createSignal } from "../utils/signal.js";
import { import_sortedIndex_2 } from "../../vendor/lodash-es/_inlinedHelpers.js";
import { logError } from "../utils/log.js";
import { logEvent } from "./analytics/index.js";
import { fromEnum, fromEnumOpt } from "./analytics/safeMetadata.js";
import { isEssentialTrafficOnly } from "../utils/privacyLevel.js";
import { isClaudeAISubscriber, getRateLimitTier, getSubscriptionType } from "../utils/auth.js";
import { APIError } from "../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { logFeatureOk } from "./analytics/featureTelemetry.js";
import { toSDKRateLimitInfo } from "../utils/messages/mappers.js";
import { usageCreditsOnlyFamily } from "../utils/model/modelDisplay.js";
import {
  isUsageBasedBilling,
  usesPayAsYouGo,
  isEnterpriseSubscriber,
  hasUsageCreditsConsent,
} from "../utils/planTiers.js";
import { isExtraUsageOutOfCredits } from "./api/errors.js";
import { getBareCheckModel } from "../utils/model/smallFastModel.js";
import { pickByHelper } from "../utils/git/gitSafeEnv.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-aepeg2w5.js:279315-279407 placement
/**
 * 付费计划“额外用量”帮助文章链接。
 */
var EXTRA_USAGE_HELP_URL =
  "https://support.claude.com/en/articles/12429409-extra-usage-for-paid-claude-plans";
//@ chunk-aepeg2w5.js:279407-279574 placement
/**
 * 支持文章（12429409）链接常量。
 */
var USAGE_SETTINGS_URL = "https://claude.ai/settings/usage?from=cc_cli_limit_message";
var HTTPS_CLAUDE_AI_ADMIN_SETTINGS_USAGE = "https://claude.ai/admin-settings/usage";
var EXTRA_USAGE_SUPPORT_URL = "https://support.claude.com/en/articles/12429409";
//@ chunk-aepeg2w5.js:279574-279587 placement
var MAX = "max";
//@ chunk-aepeg2w5.js:288283-288308 sole-consumer
/**
 * 按 host 存放的 MockRateLimitState 单例槽。
 */
var mockRateLimitStateSlot; // deferred: uses MockRateLimitState (./mockRateLimits.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:288283", () => {
  mockRateLimitStateSlot = new HostScoped(() => new MockRateLimitState());
});
//@ chunk-aepeg2w5.js:288308-288345 placement
/**
 * 取当前宿主的限速模拟状态槽（mockRateLimitStateSlot）。
 */
function getMockRateLimitState() {
  return mockRateLimitStateSlot.of(getRootSession().host);
}
//@ chunk-aepeg2w5.js:288345-288372 placement
/**
 * 限速模拟关闭时的占位实现，永远返回 null。
 */
function getDisabledMockRateLimitState() {
  return null;
}
//@ chunk-aepeg2w5.js:288372-288437 placement
function checkQuotaStatus() {
  let mockRateLimitState = getMockRateLimitState();
  mockRateLimitState.enabled;
  return null;
  return mockRateLimitState.headers;
}
//@ chunk-aepeg2w5.js:288437-288684 placement
/**
 * 用模拟的配额状态覆盖响应头中的统一限额字段（无模拟状态时原样返回）。
 */
function applyMockQuotaHeaders(init) {
  let quotaOverride = checkQuotaStatus();
  if (!quotaOverride) return init;
  let headers = new globalThis.Headers(init);
  headers.delete("anthropic-ratelimit-unified-5h-status");
  headers.delete("anthropic-ratelimit-unified-7d-status");
  Object.entries(quotaOverride).forEach(([key, value]) => {
    if (value !== undefined) headers.set(key, value);
  });
  return headers;
}
//@ chunk-aepeg2w5.js:288684-288708 placement
/**
 * 限额模拟（外部构建恒为 false）。
 */
function isRateLimitMockingEnabled() {
  return false;
}
//@ chunk-w5ndchqs.js:6185-6282 placement
/**
 * 从响应头读使用率：转数字、夹到 0–1，非法值按 0。
 */
function readUtilizationHeader(headers, name) {
  let value = Number(headers.get(name) ?? 0);
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}
//@ chunk-w5ndchqs.js:6282-6386 placement
function futureResetHeader(headers, name, nowMs) {
  let seconds = Number(headers.get(name) ?? NaN);
  return Number.isFinite(seconds) && seconds * 1000 > nowMs ? Math.round(seconds) : undefined;
}
//@ chunk-w5ndchqs.js:6386-7016 placement
/**
 * 解析 anthropic-ratelimit-unified-* 响应头（status、5h/7d 利用率与重置时间、grace 窗口），得到限额快照。
 */
function parseUnifiedRateLimitHeaders(headers, nowMs) {
  if (headers.get("anthropic-ratelimit-unified-status") === null)
    return {
      limiterRan: false,
    };
  let utilizationHeader = readUtilizationHeader(headers, "anthropic-ratelimit-unified-grace-5h-utilization");
  let utilizationHeader_2 = readUtilizationHeader(
    headers,
    "anthropic-ratelimit-unified-grace-7d-utilization",
  );
  if (utilizationHeader === 0 && utilizationHeader_2 === 0)
    return {
      limiterRan: true,
      zone: null,
    };
  let fiveHourResetAt = futureResetHeader(headers, "anthropic-ratelimit-unified-5h-reset", nowMs);
  let sevenDayResetAt = futureResetHeader(headers, "anthropic-ratelimit-unified-7d-reset", nowMs);
  let preferFiveHour =
    utilizationHeader > 0 &&
    fiveHourResetAt !== undefined &&
    (sevenDayResetAt === undefined || fiveHourResetAt > sevenDayResetAt);
  let activeRateLimitType = utilizationHeader_2 > 0 && !preferFiveHour ? "seven_day" : "five_hour";
  let overageStatusHeader = headers.get(OVERAGE_STATUS_HEADER);
  let extraUsageStatus =
    overageStatusHeader === "allowed" || overageStatusHeader === "allowed_warning"
      ? overageStatusHeader
      : undefined;
  return {
    limiterRan: true,
    zone: {
      rateLimitType: activeRateLimitType,
      resetsAt: activeRateLimitType === "seven_day" ? sevenDayResetAt : fiveHourResetAt,
      extraUsageStatus,
    },
    covered: extraUsageStatus !== undefined || headers.get(OVERAGE_IN_USE_HEADER) === "true",
  };
}
//@ chunk-w5ndchqs.js:7016-8336 placement
/**
 * 额度宽限期"收尾"状态：当前所处区间（zone）、本轮提示是否已放置、子代理提示节流。
 */
class WrapUpState {
  zone = null;
  covered = false;
  turnNote = "none";
  fenceMs = 0;
  getZone(nowMs = Date.now()) {
    let zone = this.zone;
    return zone !== null && zone.resetsAt !== undefined && nowMs / 1000 >= zone.resetsAt ? null : zone;
  }
  applyResponse(headers, nowMs) {
    let unifiedRateLimitHeaders = parseUnifiedRateLimitHeaders(headers, nowMs);
    if (!unifiedRateLimitHeaders.limiterRan || nowMs < this.fenceMs) return;
    this.fenceMs = nowMs;
    if (unifiedRateLimitHeaders.zone === null || unifiedRateLimitHeaders.zone.resetsAt !== undefined)
      this.dropEndedZone(nowMs);
    this.zone = unifiedRateLimitHeaders.zone;
    this.covered = unifiedRateLimitHeaders.zone !== null && unifiedRateLimitHeaders.covered;
    if (unifiedRateLimitHeaders.zone === null || unifiedRateLimitHeaders.covered) this.turnNote = "none";
    else if (this.turnNote === "none") this.turnNote = "owed";
  }
  dropEndedZone(nowMs) {
    if (this.zone !== null && this.getZone(nowMs) === null) {
      this.zone = null;
      this.covered = false;
      this.turnNote = "none";
    }
  }
  onRefused() {
    if (this.zone !== null && this.zone.extraUsageStatus !== undefined)
      this.zone = {
        ...this.zone,
        extraUsageStatus: undefined,
      };
    this.covered = false;
  }
  leave(nowMs = Date.now()) {
    this.zone = null;
    this.covered = false;
    this.turnNote = "none";
    this.fenceMs = Math.max(this.fenceMs, nowMs);
  }
  onMainTurnStart() {
    this.turnNote = "none";
  }
  takeTurnNote(nowMs = Date.now()) {
    this.dropEndedZone(nowMs);
    if (this.turnNote !== "owed") return false;
    this.turnNote = "taken";
    return true;
  }
  markStartNotePlaced() {
    if (this.turnNote === "taken") this.turnNote = "placed";
  }
  continueAfterWrapUpAt(nowMs = Date.now()) {
    let zone = this.getZone(nowMs);
    return this.turnNote === "placed" && zone !== null && !this.covered && zone.resetsAt !== undefined
      ? {
          resetsAt: zone.resetsAt,
          rateLimitType: zone.rateLimitType,
        }
      : null;
  }
  subagentNoteDue(nowMs = Date.now()) {
    return this.getZone(nowMs) !== null && !this.covered;
  }
}
//@ chunk-w5ndchqs.js:8336-8384 placement
function maybeMockRateLimitHeaders(headers) {
  if (isRateLimitMockingEnabled()) return applyMockQuotaHeaders(headers);
  return headers;
}
//@ chunk-w5ndchqs.js:8384-8434 placement
/**
 * 是否应展示限额相关界面：Claude.ai 订阅、网关提供方或限速模拟开启时成立。
 */
function isLimitsDisplayEnabled(flag) {
  return flag || getAPIProvider() === "gateway" || isRateLimitMockingEnabled();
}
//@ chunk-w5ndchqs.js:20162-20352 fingerprint = RATE_LIMIT_DISPLAY_NAMES (0.705)
/**
 * 限额类型显示名：five_hour→"5-hour limit"、seven_day→"weekly limit"、seven_day_opus/sonnet、seven_day_overage_included→"Fable limit"、overage→"usage credit limit"。
 */
var RATE_LIMIT_DISPLAY_NAMES = {
  five_hour: "5-hour limit",
  seven_day: "weekly limit",
  seven_day_opus: "Opus limit",
  seven_day_sonnet: "Sonnet limit",
  seven_day_overage_included: "Fable limit",
  overage: "usage credit limit",
};
//@ chunk-w5ndchqs.js:27877-28134 fingerprint = EARLY_WARNING_CONFIGS (1)
/**
 * 时间相对早期预警配置：5 小时窗口利用率 ≥90% 且时间进度 ≤72%；7 天窗口 75%/60%、50%/35%…
 */
var EARLY_WARNING_CONFIGS = [
  {
    rateLimitType: "five_hour",
    windowSeconds: 18000,
    thresholds: [
      {
        utilization: 0.9,
        timePct: 0.72,
      },
    ],
  },
  {
    rateLimitType: "seven_day",
    windowSeconds: 604800,
    thresholds: [
      {
        utilization: 0.75,
        timePct: 0.6,
      },
      {
        utilization: 0.5,
        timePct: 0.35,
      },
      {
        utilization: 0.25,
        timePct: 0.15,
      },
    ],
  },
];
//@ chunk-w5ndchqs.js:28134-28170 layout
/**
 * 限额类型显示名，未知类型原样返回。
 */
function getRateLimitDisplayName(type) {
  return getOwn(RATE_LIMIT_DISPLAY_NAMES, type) || type;
}
//@ chunk-w5ndchqs.js:28170-28256 file-local
/**
 * 窗口已过时间占比（0–1）。
 */
function computeTimeProgress(resetsAt, windowSeconds) {
  let nowSeconds = Date.now() / 1000;
  let windowStart = resetsAt - windowSeconds;
  let elapsed = nowSeconds - windowStart;
  return Math.max(0, Math.min(1, elapsed / windowSeconds));
}
//@ chunk-w5ndchqs.js:28256-28821 layout
/**
 * 从 429 响应头构造被拒额度状态（rateLimitType、overage 状态/重置、禁用原因、范围、低优先级提议）。
 */
function extractQuotaStatusFromErrorHeaders(error) {
  let claim = error.headers?.get?.(REPRESENTATIVE_CLAIM_HEADER);
  let overageStatus = error.headers?.get?.(OVERAGE_STATUS_HEADER);
  if (!claim && !overageStatus) return null;
  let limits = {
    status: "rejected",
    unifiedRateLimitFallbackAvailable: false,
    isUsingOverage: false,
  };
  let resetHeader = error.headers?.get?.("anthropic-ratelimit-unified-reset");
  if (resetHeader) limits.resetsAt = Math.round(Number(resetHeader));
  if (claim) limits.rateLimitType = claim;
  if (overageStatus) limits.overageStatus = overageStatus;
  let overageResetHeader = error.headers?.get?.("anthropic-ratelimit-unified-overage-reset");
  if (overageResetHeader) limits.overageResetsAt = Math.round(Number(overageResetHeader));
  let disabledReason = error.headers?.get?.(OVERAGE_DISABLED_REASON_HEADER);
  if (disabledReason) limits.overageDisabledReason = disabledReason;
  let scope = overageScopeHeader(error.headers);
  if (scope) limits.overageScope = scope;
  Object.assign(limits, parseLowPriorityOffer(error.headers));
  return limits;
}
//@ chunk-w5ndchqs.js:28821-29006 layout
/**
 * 低优先级（等待额度恢复）提议头：offer、retry-after 秒、最大等待秒。
 */
function parseLowPriorityOffer(headers) {
  let slowOfferArm = getSlowOfferArm(headers);
  if (!slowOfferArm) return {};
  let slowRetryAfter = getSlowRetryAfter(headers);
  let slowMaxWait = getSlowMaxWait(headers);
  return {
    lowPriorityOffer: slowOfferArm,
    ...(slowRetryAfter !== undefined && {
      lowPriorityRetryAfterSeconds: slowRetryAfter,
    }),
    ...(slowMaxWait !== undefined && {
      lowPriorityMaxWaitSeconds: slowMaxWait,
    }),
  };
}
//@ chunk-w5ndchqs.js:29006-29124 fingerprint = EARLY_WARNING_CLAIM_MAP (0.608)
/**
 * 窗口类型 → 头名缩写（5h/7d/7d_oi/overage）；Qt=30 分钟。
 */
var UNIFIED_WINDOW_HEADER_KEYS = [
  ["five_hour", "5h"],
  ["seven_day", "7d"],
  ["seven_day_overage_included", "7d_oi"],
  ["overage", "overage"],
];
var EARLY_WARNING_COOLDOWN_MS = 1800000;
//@ chunk-w5ndchqs.js:29124-29176 layout
/**
 * GrowthBook tengu_sharded_moonbeam（默认开）。
 */
function isShardedQuotaEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_sharded_moonbeam", true);
}
//@ chunk-w5ndchqs.js:29176-29225 layout
/**
 * GrowthBook tengu_valiant_finch（默认关）。
 */
function isValiantFinchEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_valiant_finch", false);
}
//@ chunk-w5ndchqs.js:29225-29318 layout
/**
 * 头值转数字（空/非数返回 undefined）。
 */
function parseHeaderNumber(raw) {
  if (raw === null || raw === "") return;
  let value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}
//@ chunk-w5ndchqs.js:29318-29851 fingerprint = getHeaderBasedEarlyWarning (0.678)
/**
 * 解析各窗口 anthropic-ratelimit-unified-{5h,7d,7d_oi,overage}-{utilization,reset,surpassed-threshold,status} 头为读数表。
 */
function getHeaderBasedEarlyWarning(headers) {
  let readings = {};
  for (let [key, suffix] of UNIFIED_WINDOW_HEADER_KEYS) {
    let headerNumber = parseHeaderNumber(headers.get(`anthropic-ratelimit-unified-${suffix}-utilization`));
    let headerNumber_2 = parseHeaderNumber(headers.get(`anthropic-ratelimit-unified-${suffix}-reset`));
    let headerNumber_3 = parseHeaderNumber(
      headers.get(`anthropic-ratelimit-unified-${suffix}-surpassed-threshold`),
    );
    let surpassedThreshold = headers.get(`anthropic-ratelimit-unified-${suffix}-status`);
    let statusValue =
      key === "overage"
        ? undefined
        : UNIFIED_STATUS_VALUES.find((statusCandidate) => statusCandidate === surpassedThreshold);
    if (
      headerNumber === undefined &&
      headerNumber_2 === undefined &&
      headerNumber_3 === undefined &&
      statusValue === undefined
    )
      continue;
    readings[key] = {
      ...(headerNumber !== undefined && {
        utilization: headerNumber,
      }),
      ...(headerNumber_2 !== undefined && {
        resets_at: Math.round(headerNumber_2),
      }),
      ...(headerNumber_3 !== undefined && {
        surpassedThreshold: headerNumber_3,
      }),
      ...(statusValue !== undefined && {
        status: statusValue,
      }),
    };
  }
  return readings;
}
//@ chunk-w5ndchqs.js:29851-29899 layout
/**
 * allowed/allowed_warning/rejected。
 */
var UNIFIED_STATUS_VALUES = ["allowed", "allowed_warning", "rejected"];
//@ chunk-w5ndchqs.js:29899-30063 layout
/**
 * 只保留有 utilization 与 resets_at 的窗口读数。
 */
function pickWindowReadings(readings) {
  let result = {};
  for (let [key] of UNIFIED_WINDOW_HEADER_KEYS) {
    let entry = readings[key];
    if (entry?.utilization !== undefined && entry.resets_at !== undefined)
      result[key] = {
        utilization: entry.utilization,
        resets_at: entry.resets_at,
      };
  }
  return result;
}
//@ chunk-w5ndchqs.js:30063-30173 layout
/**
 * 读数指纹 "利用率@重置:状态:阈值"，用于去重。
 */
function readingFingerprint(reading, limits) {
  return `${Math.round(reading.utilization * 100)}@${reading.resets_at}:${limits?.status}:${limits?.surpassedThreshold}`;
}
//@ chunk-w5ndchqs.js:30173-30269 layout
/**
 * 读数的 utilization 与 resets_at 都是有限数。
 */
function isValidUtilization(reading) {
  return reading !== undefined && Number.isFinite(reading.utilization) && Number.isFinite(reading.resets_at);
}
//@ chunk-w5ndchqs.js:30269-30367 layout
/**
 * 读数有阈值或完整利用率信息。
 */
function hasReadingSignal(reading) {
  return (
    reading.surpassedThreshold !== undefined ||
    (reading.utilization !== undefined && reading.resets_at !== undefined)
  );
}
//@ chunk-w5ndchqs.js:30367-30645 fingerprint = makeTestQuery (0.93)
/**
 * 配额探测：发一次 max_tokens=1 的 "quota" 请求以获取限额响应头。
 */
async function makeTestQuery(model, credentials, signal) {
  let anthropic = await getAnthropicClient({
    maxRetries: 0,
    model,
    source: "quota_check",
    agentContext: mainAgentContext(),
    credentials,
  });
  let messages = [
    {
      role: "user",
      content: "quota",
    },
  ];
  let betas = getModelBetas(model);
  return anthropic.beta.messages
    .create(
      {
        model: toProviderWireModelId(model),
        max_tokens: 1,
        messages,
        metadata: getAPIMetadata(),
        ...betasRequestParam(betas),
      },
      {
        signal,
      },
    )
    .asResponse();
}
//@ chunk-w5ndchqs.js:30645-30687 layout
/**
 * 执行一次配额探测请求。
 */
async function runQuotaProbe(model, credentials, signal) {
  await makeTestQuery(model, credentials, signal);
}
//@ chunk-w5ndchqs.js:30687-31000 file-local
/**
 * 响应头里有 surpassed-threshold 的窗口直接作为预警（allowed_warning）。
 */
function extractRawUtilization(headers, unifiedRateLimitFallbackAvailable, skipFiveHour) {
  for (let [key] of UNIFIED_WINDOW_HEADER_KEYS) {
    if (skipFiveHour && key === "five_hour") continue;
    let entry = headers[key];
    if (entry?.surpassedThreshold !== undefined)
      return {
        status: "allowed_warning",
        resetsAt: entry.resets_at,
        rateLimitType: key,
        utilization: entry.utilization,
        unifiedRateLimitFallbackAvailable,
        isUsingOverage: false,
        surpassedThreshold: entry.surpassedThreshold,
      };
  }
  return null;
}
//@ chunk-w5ndchqs.js:31000-31370 fingerprint = getTimeRelativeEarlyWarning (0.722)
/**
 * 按配置判断某窗口利用率是否超过对应时间进度的阈值。
 */
function getTimeRelativeEarlyWarning(headers, config, unifiedRateLimitFallbackAvailable) {
  let { rateLimitType, windowSeconds, thresholds } = config;
  let reading = headers[rateLimitType];
  if (reading?.utilization === undefined || reading.resets_at === undefined) return null;
  let { utilization, resets_at: resetsAt } = reading;
  let timeProgress = computeTimeProgress(resetsAt, windowSeconds);
  if (!thresholds.some((t) => utilization >= t.utilization && timeProgress <= t.timePct)) return null;
  return {
    status: "allowed_warning",
    resetsAt,
    rateLimitType,
    utilization,
    unifiedRateLimitFallbackAvailable,
    isUsingOverage: false,
  };
}
//@ chunk-w5ndchqs.js:31370-31528 callgraph-witnessed = getEarlyWarningFromHeaders (0)
/**
 * 早期预警：先看服务器阈值头，再按时间相对配置（Fable 场景跳过 5 小时窗口）。
 */
function getEarlyWarningFromHeaders(headers, unifiedRateLimitFallbackAvailable) {
  let lowPriorityActive = isLowPriorityActive();
  let rawUtilization = extractRawUtilization(headers, unifiedRateLimitFallbackAvailable, lowPriorityActive);
  if (rawUtilization) return rawUtilization;
  for (let config of EARLY_WARNING_CONFIGS) {
    if (lowPriorityActive && config.rateLimitType === "five_hour") continue;
    let timeRelativeWarning = getTimeRelativeEarlyWarning(headers, config, unifiedRateLimitFallbackAvailable);
    if (timeRelativeWarning) return timeRelativeWarning;
  }
  return null;
}
//@ chunk-w5ndchqs.js:31528-32905 fingerprint = computeNewLimitsFromHeaders (0.744)
/**
 * 从 anthropic-ratelimit-unified-* 头计算额度：status、reset、fallback、representative-claim、overage-status/reset/disabled-reason/scope、upgrade-paths、月度/频道利用率、宽限；附带早期预警与各窗口读数。
 */
function computeNewLimitsFromHeaders(headers, graceActive) {
  let unifiedStatus = headers.get("anthropic-ratelimit-unified-status") || "allowed";
  let resetsAtHeader = headers.get("anthropic-ratelimit-unified-reset");
  let resetsAt = resetsAtHeader ? Math.round(Number(resetsAtHeader)) : undefined;
  let unifiedRateLimitFallbackAvailable = headers.get("anthropic-ratelimit-unified-fallback") === "available";
  let rateLimitType = headers.get("anthropic-ratelimit-unified-representative-claim");
  let overageStatus = headers.get("anthropic-ratelimit-unified-overage-status");
  let overageResetsAtHeader = headers.get("anthropic-ratelimit-unified-overage-reset");
  let overageResetsAt = overageResetsAtHeader ? Math.round(Number(overageResetsAtHeader)) : undefined;
  let overageDisabledReason = headers.get("anthropic-ratelimit-unified-overage-disabled-reason");
  let overageScope = overageScopeHeader(headers);
  let overageInUse = headers.get(OVERAGE_IN_USE_HEADER) === "true";
  let lowPriorityOffer = parseLowPriorityOffer(headers);
  let upgradePathsHeader = headers.get("anthropic-ratelimit-unified-upgrade-paths");
  let upgradePaths = upgradePathsHeader
    ? upgradePathsHeader.split(",").map((upgradePath) => upgradePath.trim())
    : undefined;
  let monthlyUtilizationHeader = headers.get(
    "anthropic-ratelimit-unified-overage-period-monthly-utilization",
  );
  let monthlyUtilization = monthlyUtilizationHeader ? Number(monthlyUtilizationHeader) : NaN;
  let overagePeriodMonthly = Number.isFinite(monthlyUtilization)
    ? {
        utilization: monthlyUtilization,
      }
    : undefined;
  let channelUtilizationHeader = headers.get(
    "anthropic-ratelimit-unified-overage-period-channel-utilization",
  );
  let channelUtilization = channelUtilizationHeader ? Number(channelUtilizationHeader) : NaN;
  let overagePeriodChannel = Number.isFinite(channelUtilization)
    ? {
        utilization: channelUtilization,
      }
    : undefined;
  let parsedLimits = {
    status: unifiedStatus === "allowed_warning" ? "allowed" : unifiedStatus,
    resetsAt,
    unifiedRateLimitFallbackAvailable,
    ...(rateLimitType && {
      rateLimitType,
    }),
    ...(overageStatus && {
      overageStatus,
    }),
    ...(overageResetsAt && {
      overageResetsAt,
    }),
    ...(overageDisabledReason && {
      overageDisabledReason,
    }),
    ...(overageScope && {
      overageScope,
    }),
    ...(upgradePaths && {
      upgradePaths,
    }),
    isUsingOverage:
      unifiedStatus === "rejected" && (overageStatus === "allowed" || overageStatus === "allowed_warning"),
    ...(overageInUse && {
      overageInUse,
    }),
    ...(overagePeriodMonthly && {
      overagePeriodMonthly,
    }),
    ...(overagePeriodChannel && {
      overagePeriodChannel,
    }),
    ...(graceActive && {
      rateLimitGraceActive: true,
    }),
    ...lowPriorityOffer,
  };
  let headerBasedEarlyWarning = getHeaderBasedEarlyWarning(headers);
  return {
    base: parsedLimits,
    own: withEarlyWarning(parsedLimits, headerBasedEarlyWarning),
    readings: headerBasedEarlyWarning,
  };
}
//@ chunk-w5ndchqs.js:32905-33037 layout
/**
 * allowed 状态时叠加早期预警信息。
 */
function withEarlyWarning(previous, headers) {
  if (previous.status !== "allowed") return previous;
  let limits = getEarlyWarningFromHeaders(headers, previous.unifiedRateLimitFallbackAvailable);
  return limits ? carryOverageFields(limits, previous.upgradePaths, previous) : previous;
}
//@ chunk-w5ndchqs.js:33037-33073 placement
/**
 * 用响应头重算限额并写回“自有”部分（宽限期结束前后合并超额字段）。
 */
function refreshLimitsFromHeaders(headers, model) {
  return computeNewLimitsFromHeaders(headers, model).own;
}
//@ chunk-w5ndchqs.js:33073-33580 placement
/**
 * 把超额（overage）相关字段与升级路径合并到限额状态中（宽限期内不带超额状态字段）。
 */
function carryOverageFields(limits, upgradePaths, previous) {
  return {
    ...limits,
    ...(upgradePaths && {
      upgradePaths,
    }),
    ...(!previous.rateLimitGraceActive && {
      ...(previous.overageStatus && {
        overageStatus: previous.overageStatus,
      }),
      ...(previous.overageResetsAt && {
        overageResetsAt: previous.overageResetsAt,
      }),
      ...(previous.overageDisabledReason && {
        overageDisabledReason: previous.overageDisabledReason,
      }),
    }),
    ...(previous.overageInUse && {
      overageInUse: true,
    }),
    ...(previous.overagePeriodMonthly && {
      overagePeriodMonthly: previous.overagePeriodMonthly,
    }),
    ...(previous.overagePeriodChannel && {
      overagePeriodChannel: previous.overagePeriodChannel,
    }),
    ...(previous.rateLimitGraceActive && {
      rateLimitGraceActive: true,
    }),
  };
}
//@ chunk-w5ndchqs.js:33674-33808 placement
function toAllowedLimits(currentLimits) {
  let { resetsAt, rateLimitType, utilization, surpassedThreshold, upgradePaths, ...rest } = currentLimits;
  return {
    ...rest,
    status: "allowed",
  };
}
//@ chunk-w5ndchqs.js:33808-34257 placement
function creditsRequiredDetails(error) {
  let details = error.error?.error?.details;
  if (details?.error_code !== "credits_required") return {};
  return {
    errorCode: "credits_required",
    ...(typeof details.disabled_reason === "string" && {
      overageDisabledReason: details.disabled_reason,
    }),
    ...(typeof details.can_user_purchase_credits === "boolean" && {
      canUserPurchaseCredits: details.can_user_purchase_credits,
    }),
    ...(typeof details.has_chargeable_saved_payment_method === "boolean" && {
      hasChargeableSavedPaymentMethod: details.has_chargeable_saved_payment_method,
    }),
  };
}
//@ chunk-w5ndchqs.js:34257-34371 placement
function cacheExtraUsageDisabledReason(reason, storageV5) {
  if (getGlobalConfig().cachedExtraUsageDisabledReason !== reason)
    saveGlobalConfig(
      (config) => ({
        ...config,
        cachedExtraUsageDisabledReason: reason,
      }),
      storageV5,
    );
}
//@ chunk-w5ndchqs.js:34371-34489 fingerprint = cacheExtraUsageDisabledReason (0.61)
/**
 * 缓存 overage-disabled-reason（网关模式除外）。
 */
function cacheExtraUsageDisabledReason_2(headers, storage) {
  if (getAPIProvider() === "gateway") return;
  cacheExtraUsageDisabledReason(
    headers.get("anthropic-ratelimit-unified-overage-disabled-reason") ?? null,
    storage,
  );
}
//@ chunk-w5ndchqs.js:37636-37763 placement
function earlyWarningThresholdFor(rateLimitTier) {
  switch (rateLimitTier) {
    case "default_claude_max_5x":
      return 0.99;
    case "default_claude_max_20x":
      return 0.9975;
    default:
      return WRAP_UP_UTILIZATION_THRESHOLD;
  }
}
//@ chunk-w5ndchqs.js:37763-47376 placement
/**
 * claude.ai 订阅额度的进程级跟踪器：当前限额状态、窗口利用率、宽限期、超额使用、额度拒绝事件与订阅者通知（tengu_claudeai_limits_status_changed）。
 */
class ClaudeAiLimitsTracker {
  currentLimits = {
    status: "allowed",
    unifiedRateLimitFallbackAvailable: false,
    isUsingOverage: false,
  };
  rawUtilization = {};
  rawWindowLevels = {};
  lastSeenWindows = {};
  lastEmittedWindowParts = {};
  lastEmittedGraceExtraUsageStatus = undefined;
  lastAppliedObservationAtMs = 0;
  accountEpoch = 0;
  limitsObserved = false;
  retiredAtMs = {};
  longContext1mOkLogged = false;
  statusChanged = createSignal();
  overageInUse = createSignal();
  quotaRejected = createSignal();
  usageLimitWaits = new Set();
  usageLimitWaitsChanged = createSignal();
  wrapUp = new WrapUpState();
  pendingNearLimitWrapUpHint = false;
  nearLimitWrapUpWindowKey = null;
  isFromPreviousAccount(epoch) {
    return epoch !== undefined && epoch !== this.accountEpoch;
  }
  isStaleObservation(observedAtMs) {
    if (observedAtMs < this.lastAppliedObservationAtMs) return true;
    this.lastAppliedObservationAtMs = observedAtMs;
    this.limitsObserved = true;
    return false;
  }
  applyWindowReadings(readings, base, observedAtMs, stale) {
    let { overageDisabledReason } = base;
    if (
      overageDisabledReason !== undefined &&
      overageDisabledReason !== "fetch_error" &&
      overageDisabledReason !== "unknown"
    )
      this.retireWindows(["overage"], observedAtMs);
    if (!stale) {
      this.rawUtilization = pickWindowReadings(readings);
      this.rawWindowLevels = {};
      for (let [key] of UNIFIED_WINDOW_HEADER_KEYS) {
        let { status, surpassedThreshold } = readings[key] ?? {};
        if (status !== undefined || surpassedThreshold !== undefined)
          this.rawWindowLevels[key] = {
            ...(status !== undefined && {
              status,
            }),
            ...(surpassedThreshold !== undefined && {
              surpassedThreshold,
            }),
          };
      }
    }
    this.recordSeenWindows(readings, base, observedAtMs);
  }
  recordSeenWindows(readings, { upgradePaths, unifiedRateLimitFallbackAvailable }, observedAtMs) {
    let picked = pickWindowReadings(readings);
    for (let [key] of UNIFIED_WINDOW_HEADER_KEYS) {
      if (this.isRetiredReading(key, observedAtMs)) continue;
      let reading = picked[key];
      let seen = this.lastSeenWindows[key];
      if (isValidUtilization(reading) && (seen === undefined || observedAtMs >= seen.observedAtMs)) {
        let surpassedThreshold = readings[key]?.surpassedThreshold;
        this.lastSeenWindows[key] = {
          ...reading,
          observedAtMs,
          ...(surpassedThreshold !== undefined && {
            surpassedThreshold,
          }),
          ...(upgradePaths && {
            upgradePaths,
          }),
          unifiedRateLimitFallbackAvailable,
        };
      }
    }
  }
  currentWindows(now) {
    let cutoff = this.lastAppliedObservationAtMs - EARLY_WARNING_COOLDOWN_MS;
    let out = {};
    for (let [key] of UNIFIED_WINDOW_HEADER_KEYS) {
      let seen = this.lastSeenWindows[key];
      if (seen !== undefined && seen.observedAtMs >= cutoff && isUtilizationEntryUsable(seen, now))
        out[key] = seen;
    }
    return out;
  }
  deriveTrackedLimits(previous, readings, observedAtMs, now) {
    if (previous.status !== "allowed") return previous;
    let sharded = isShardedQuotaEnabled();
    let current = sharded ? this.currentWindows(now) : {};
    let merged = {};
    let headers = {};
    for (let [key] of UNIFIED_WINDOW_HEADER_KEYS) {
      let windowReading = current[key];
      if (
        windowReading !== undefined &&
        windowReading.utilization < 1 &&
        (windowReading.surpassedThreshold === undefined || windowReading.surpassedThreshold < 1)
      )
        headers[key] = windowReading;
      let reading = readings[key];
      if (
        reading !== undefined &&
        hasReadingSignal(reading) &&
        !(sharded && this.isRetiredReading(key, observedAtMs))
      ) {
        merged[key] = reading;
        headers[key] = reading;
      }
    }
    let limits = getEarlyWarningFromHeaders(headers, previous.unifiedRateLimitFallbackAvailable);
    if (!limits) return previous;
    for (let [key] of UNIFIED_WINDOW_HEADER_KEYS) {
      let windowReading = current[key];
      if (key === limits.rateLimitType && merged[key] === undefined && windowReading !== undefined)
        return carryOverageFields(
          {
            ...limits,
            unifiedRateLimitFallbackAvailable: windowReading.unifiedRateLimitFallbackAvailable,
          },
          windowReading.upgradePaths,
          previous,
        );
    }
    return carryOverageFields(limits, previous.upgradePaths, previous);
  }
  resetCurrentLimits() {
    this.currentLimits = {
      status: "allowed",
      unifiedRateLimitFallbackAvailable: false,
      isUsingOverage: false,
    };
    this.rawUtilization = {};
    this.rawWindowLevels = {};
    this.lastSeenWindows = {};
    this.lastEmittedWindowParts = {};
    this.lastEmittedGraceExtraUsageStatus = undefined;
    this.accountEpoch++;
    this.lastAppliedObservationAtMs = Date.now();
    this.retireWindows(undefined, this.lastAppliedObservationAtMs);
    this.limitsObserved = false;
  }
  forgetHeldWindows(windows) {
    let now = Date.now();
    this.retireWindows(windows, now);
    for (let [key] of UNIFIED_WINDOW_HEADER_KEYS)
      if (windows === undefined || windows.includes(key)) delete this.rawWindowLevels[key];
    let { status, rateLimitType } = this.currentLimits;
    if (
      isShardedQuotaEnabled() &&
      status === "allowed_warning" &&
      rateLimitType !== undefined &&
      (windows === undefined || windows.includes(rateLimitType))
    ) {
      let next = this.deriveTrackedLimits(toAllowedLimits(this.currentLimits), {}, now, now);
      if (!import_sortedIndex_2(this.currentLimits, next))
        try {
          this.emitStatusChange(next);
        } catch (error) {
          logError(error);
        }
    }
  }
  isRetiredReading(name, observedAtMs) {
    let retiredAt = this.retiredAtMs[name];
    return retiredAt !== undefined && observedAtMs <= retiredAt;
  }
  retireWindows(windows, retiredAtMs) {
    for (let [name] of UNIFIED_WINDOW_HEADER_KEYS) {
      if (windows !== undefined && !windows.includes(name)) continue;
      let previous = this.retiredAtMs[name];
      if (previous === undefined || retiredAtMs > previous) this.retiredAtMs[name] = retiredAtMs;
      let seen = this.lastSeenWindows[name];
      if (seen !== undefined && seen.observedAtMs <= retiredAtMs) delete this.lastSeenWindows[name];
    }
  }
  emitStatusChange(limits) {
    let currentLimits = this.currentLimits;
    this.currentLimits = limits;
    this.limitsObserved = true;
    if (isValidUtilization(this.rawUtilization.five_hour))
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
    this.lastEmittedGraceExtraUsageStatus = this.wrapUp.getZone()?.extraUsageStatus;
    this.statusChanged.emit(limits);
    if (currentLimits.status === limits.status && currentLimits.isUsingOverage === limits.isUsingOverage)
      return;
    let hoursTillReset =
      Math.round(((limits.resetsAt ? limits.resetsAt - Date.now() / 1000 : 0) / 3600) * 10) / 10;
    logEvent("tengu_claudeai_limits_status_changed", {
      status: fromEnum(limits.status),
      previousStatus: fromEnum(currentLimits.status),
      rateLimitType: fromEnumOpt(limits.rateLimitType),
      isUsingOverage: limits.isUsingOverage,
      unifiedRateLimitFallbackAvailable: limits.unifiedRateLimitFallbackAvailable,
      hoursTillReset,
    });
  }
  restoreLimits(limits, limitsObserved) {
    this.currentLimits = limits;
    this.limitsObserved = limitsObserved;
    this.statusChanged.emit(limits);
  }
  async probeQuotaStatus(model, credentials, storageV5) {
    if (isEssentialTrafficOnly()) return null;
    if (!isLimitsDisplayEnabled(isClaudeAISubscriber())) return null;
    if (getIsNonInteractiveSession()) return null;
    let accountEpoch = this.accountEpoch;
    try {
      let testQuery = await makeTestQuery(model, credentials);
      let status = this.extractQuotaStatusFromHeaders(
        testQuery.headers,
        model,
        false,
        Date.now(),
        accountEpoch,
        storageV5,
      );
      if (this.isFromPreviousAccount(accountEpoch)) return null;
      return (
        status ??
        refreshLimitsFromHeaders(maybeMockRateLimitHeaders(testQuery.headers), this.wrapUp.getZone() !== null)
      );
    } catch (error) {
      if (error instanceof APIError)
        this.extractQuotaStatusFromError(error, "other", Date.now(), accountEpoch, storageV5);
      return null;
    }
  }
  extractQuotaStatusFromHeaders(
    headers,
    model,
    longContext1m = false,
    observedAtMs = Date.now(),
    epoch,
    storageV5,
  ) {
    if (this.isFromPreviousAccount(epoch)) return null;
    let isSubscriber = isClaudeAISubscriber();
    if (!isLimitsDisplayEnabled(isSubscriber)) {
      this.rawUtilization = {};
      this.rawWindowLevels = {};
      this.lastSeenWindows = {};
      if (
        this.currentLimits.status !== "allowed" ||
        this.currentLimits.resetsAt ||
        this.currentLimits.rateLimitGraceActive
      ) {
        let allowed = {
          status: "allowed",
          unifiedRateLimitFallbackAvailable: false,
          isUsingOverage: false,
        };
        this.emitStatusChange(allowed);
      }
      return null;
    }
    let mockedHeaders = maybeMockRateLimitHeaders(headers);
    let zone = this.wrapUp.getZone();
    let { base, own, readings } = computeNewLimitsFromHeaders(mockedHeaders, zone !== null);
    cacheExtraUsageDisabledReason_2(mockedHeaders, storageV5);
    handleLowPriorityResponseHeaders(mockedHeaders, observedAtMs);
    if (longContext1m && !this.longContext1mOkLogged) {
      this.longContext1mOkLogged = true;
      logFeatureOk("context_1m_entitlement");
    }
    let stale = this.isStaleObservation(observedAtMs);
    this.applyWindowReadings(readings, base, observedAtMs, stale);
    if (!stale) {
      if (this.nearLimitWrapUpWindowKey !== null && Date.now() / 1000 > this.nearLimitWrapUpWindowKey) {
        this.pendingNearLimitWrapUpHint = false;
        this.nearLimitWrapUpWindowKey = null;
      }
      let fiveHour = this.rawUtilization.five_hour;
      if (
        fiveHour !== undefined &&
        Number.isFinite(fiveHour.resets_at) &&
        Number.isFinite(fiveHour.utilization) &&
        fiveHour.resets_at * 1000 > Date.now()
      ) {
        let threshold = earlyWarningThresholdFor(getRateLimitTier());
        if (fiveHour.utilization >= threshold && !isLowPriorityActive()) {
          if (base.overageStatus === "allowed" || base.overageStatus === "allowed_warning")
            this.pendingNearLimitWrapUpHint = false;
          else if (this.nearLimitWrapUpWindowKey !== fiveHour.resets_at) {
            this.pendingNearLimitWrapUpHint = true;
            this.nearLimitWrapUpWindowKey = fiveHour.resets_at;
          }
        }
      }
      let next = this.deriveTrackedLimits(base, readings, observedAtMs, Date.now());
      if (!import_sortedIndex_2(this.currentLimits, next)) this.emitStatusChange(next);
      else {
        let fiveHour = isValidUtilization(this.rawUtilization.five_hour)
          ? this.rawUtilization.five_hour
          : undefined;
        let sevenDay = isValidUtilization(this.rawUtilization.seven_day)
          ? this.rawUtilization.seven_day
          : undefined;
        let sevenDayOverageIncluded = isValidUtilization(this.rawUtilization.seven_day_overage_included)
          ? this.rawUtilization.seven_day_overage_included
          : undefined;
        let rawWindowLevels = this.rawWindowLevels;
        if (
          (fiveHour !== undefined &&
            readingFingerprint(fiveHour, rawWindowLevels.five_hour) !==
              this.lastEmittedWindowParts.five_hour) ||
          (sevenDay !== undefined &&
            readingFingerprint(sevenDay, rawWindowLevels.seven_day) !==
              this.lastEmittedWindowParts.seven_day) ||
          (sevenDayOverageIncluded !== undefined &&
            readingFingerprint(sevenDayOverageIncluded, rawWindowLevels.seven_day_overage_included) !==
              this.lastEmittedWindowParts.seven_day_overage_included) ||
          zone?.extraUsageStatus !== this.lastEmittedGraceExtraUsageStatus
        )
          this.emitStatusChange(next);
      }
    } else {
      let { rateLimitGraceActive, ...limits } = this.currentLimits;
      let withGrace = {
        ...(zone !== null && limits.status === "allowed_warning" ? toSDKRateLimitInfo(limits) : limits),
        ...(zone !== null && {
          rateLimitGraceActive: true,
        }),
      };
      if (
        !import_sortedIndex_2(this.currentLimits, withGrace) ||
        zone?.extraUsageStatus !== this.lastEmittedGraceExtraUsageStatus
      )
        this.emitStatusChange(withGrace);
    }
    if (own.overageInUse === true) {
      let ignoreOverage = own.isUsingOverage === true && own.rateLimitType !== "seven_day_overage_included";
      let family = usageCreditsOnlyFamily(model);
      if (
        !ignoreOverage &&
        !longContext1m &&
        !isUsageBasedBilling() &&
        family !== undefined &&
        !usesPayAsYouGo() &&
        !isEnterpriseSubscriber() &&
        !hasUsageCreditsConsent(family)
      )
        setUsageCreditsRequired(true);
      this.overageInUse.emit(model, own.isUsingOverage === true, longContext1m);
    }
    return own;
  }
  resetGraceState() {
    this.wrapUp.leave();
  }
  resetNearLimitWrapUpState() {
    this.pendingNearLimitWrapUpHint = false;
    this.nearLimitWrapUpWindowKey = null;
  }
  extractGraceStatusFromHeaders(headers, active, now = Date.now(), epoch) {
    if (active && !this.isFromPreviousAccount(epoch)) this.wrapUp.applyResponse(headers, now);
  }
  consumePendingNearLimitWrapUpHint() {
    if (!this.pendingNearLimitWrapUpHint) return false;
    this.pendingNearLimitWrapUpHint = false;
    return !isLowPriorityActive();
  }
  beginUsageLimitWait(wait) {
    this.usageLimitWaits.add(wait);
    this.emitUsageLimitWaitsChanged();
    return () => {
      if (this.usageLimitWaits.delete(wait)) this.emitUsageLimitWaitsChanged();
    };
  }
  emitUsageLimitWaitsChanged() {
    try {
      this.usageLimitWaitsChanged.emit();
    } catch (error) {
      logError(error);
    }
  }
  extractQuotaStatusFromError(error, kind, now = Date.now(), epoch, storageV5) {
    let outOfCredits =
      error.status === undefined && isExtraUsageOutOfCredits(error) && isValiantFinchEnabled();
    if (
      this.isFromPreviousAccount(epoch) ||
      !isLimitsDisplayEnabled(isClaudeAISubscriber()) ||
      (error.status !== 429 && !outOfCredits)
    )
      return;
    if (getAPIProvider() === "gateway" && !error.headers?.get?.("anthropic-ratelimit-unified-status")) return;
    try {
      let stale = this.isStaleObservation(now);
      let status = this.currentLimits.status;
      let isUsingOverage = this.currentLimits.isUsingOverage;
      let utilization = this.rawUtilization.five_hour?.utilization;
      let utilization_2 = this.rawUtilization.seven_day?.utilization;
      let utilization_3 = this.rawUtilization.overage?.utilization;
      let next = {
        ...this.currentLimits,
      };
      if (error.headers) {
        let mockedHeaders = maybeMockRateLimitHeaders(error.headers);
        let newLimitsFromHeaders = computeNewLimitsFromHeaders(mockedHeaders, this.wrapUp.getZone() !== null);
        next = newLimitsFromHeaders.own;
        this.applyWindowReadings(newLimitsFromHeaders.readings, newLimitsFromHeaders.base, now, stale);
        if (!outOfCredits) cacheExtraUsageDisabledReason_2(mockedHeaders, storageV5);
        else if (getAPIProvider() !== "gateway") cacheExtraUsageDisabledReason("out_of_credits", storageV5);
        if (mockedHeaders.get("anthropic-ratelimit-unified-status") !== null) this.wrapUp.onRefused();
      }
      next = buildRejectedLimits(next, error);
      if (outOfCredits) {
        let { overageInUse, ...rest } = next;
        next = {
          ...rest,
          overageStatus: "rejected",
          overageDisabledReason: "out_of_credits",
          isUsingOverage: false,
        };
      }
      if (
        (status !== "rejected" || isUsingOverage) &&
        !(
          status === "allowed" &&
          !isUsingOverage &&
          utilization === undefined &&
          utilization_2 === undefined &&
          utilization_3 === undefined
        ) &&
        !outOfCredits
      ) {
        let priorUtilization =
          next.rateLimitType === "five_hour"
            ? utilization
            : next.rateLimitType?.startsWith("seven_day")
              ? utilization_2
              : next.rateLimitType === "overage"
                ? utilization_3
                : Math.max(utilization ?? 0, utilization_2 ?? 0, utilization_3 ?? 0);
        if (priorUtilization === undefined || priorUtilization < 0.8)
          logEvent("tengu_quota_mismatch", {
            priorStatus: fromEnum(status),
            priorIsUsingOverage: isUsingOverage,
            priorFiveHourUtilization: utilization,
            priorSevenDayUtilization: utilization_2,
            priorOverageUtilization: utilization_3,
            rateLimitType: fromEnumOpt(next.rateLimitType) ?? undefined,
            subscriptionType: fromEnumOpt(getSubscriptionType()) ?? undefined,
            hadPriorUtilizationData:
              utilization !== undefined || utilization_2 !== undefined || utilization_3 !== undefined,
          });
      }
      if (!stale)
        try {
          this.quotaRejected.emit(next, kind);
        } catch (error) {
          logError(error);
        }
      if (!stale && !import_sortedIndex_2(this.currentLimits, next)) this.emitStatusChange(next);
    } catch (error) {
      logError(error);
    }
  }
}
//@ chunk-w5ndchqs.js:47376-47389 placement
var claudeAiLimits; // deferred: uses ClaudeAiLimitsTracker of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-w5ndchqs.js:47376", () => {
  claudeAiLimits = new ClaudeAiLimitsTracker();
});
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
function hasSurpassedThreshold(rateLimitType) {
  return (
    claudeAiLimits.rawWindowLevels[rateLimitType]?.surpassedThreshold ??
    claudeAiLimits.currentWindows(Date.now())[rateLimitType]?.surpassedThreshold
  );
}
//@ chunk-w5ndchqs.js:47625-47776 placement
/**
 * 取当前各统一限额窗口的使用率与重置时间。
 */
function currentUsageWindows() {
  let windows = claudeAiLimits.currentWindows(Date.now());
  let live = {};
  for (let [key] of UNIFIED_WINDOW_HEADER_KEYS) {
    let entry = windows[key];
    if (entry)
      live[key] = {
        utilization: entry.utilization,
        resets_at: entry.resets_at,
      };
  }
  return live;
}
//@ chunk-w5ndchqs.js:47776-47879 placement
function liveWindowsOf(rawUtilization) {
  let now = Date.now();
  let live = {};
  for (let [key] of UNIFIED_WINDOW_HEADER_KEYS) {
    let entry = rawUtilization[key];
    if (entry !== undefined && isUtilizationEntryUsable(entry, now)) live[key] = entry;
  }
  return live;
}
//@ chunk-w5ndchqs.js:47879-47966 placement
/**
 * 判断一条使用率观测是否可用于当前窗口：resets_at 在 now 之后一年内。
 */
function isUtilizationEntryUsable(entry, nowMs) {
  let nowSeconds = nowMs / 1000;
  let maxSeconds = nowSeconds + 31536000;
  return isValidUtilization(entry) && entry.resets_at > nowSeconds && entry.resets_at < maxSeconds;
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
function onLimitsStatusChanged(listener) {
  return claudeAiLimits.statusChanged.subscribe(listener);
}
//@ chunk-w5ndchqs.js:48144-48195 placement
function onOverageInUse(listener) {
  return claudeAiLimits.overageInUse.subscribe(listener);
}
//@ chunk-w5ndchqs.js:48195-48247 placement
function onQuotaRejected(listener) {
  return claudeAiLimits.quotaRejected.subscribe(listener);
}
//@ chunk-w5ndchqs.js:48247-48295 placement
function beginUsageLimitWait(wait) {
  return claudeAiLimits.beginUsageLimitWait(wait);
}
//@ chunk-w5ndchqs.js:48295-48339 placement
function usageLimitWaits() {
  return [...claudeAiLimits.usageLimitWaits];
}
//@ chunk-w5ndchqs.js:48339-48400 placement
function onUsageLimitWaitsChanged(listener) {
  return claudeAiLimits.usageLimitWaitsChanged.subscribe(listener);
}
//@ chunk-w5ndchqs.js:48400-48438 placement
function resetCurrentLimits() {
  claudeAiLimits.resetCurrentLimits();
}
//@ chunk-w5ndchqs.js:48438-48477 placement
function forgetHeldWindows(windowKey) {
  claudeAiLimits.forgetHeldWindows(windowKey);
}
//@ chunk-w5ndchqs.js:48477-48515 placement
function emitLimitsStatusChange(limits) {
  claudeAiLimits.emitStatusChange(limits);
}
//@ chunk-w5ndchqs.js:48515-48554 placement
function restoreLimits(limits, limitsObserved) {
  claudeAiLimits.restoreLimits(limits, limitsObserved);
}
//@ chunk-w5ndchqs.js:48554-48614 placement
async function probeQuotaStatusAtStart(credentials, signal) {
  await claudeAiLimits.probeQuotaStatus(getBareCheckModel(), credentials, signal);
}
//@ chunk-w5ndchqs.js:48614-48667 placement
function probeQuotaStatus(mainLoopModel, credentials, storageV5) {
  return claudeAiLimits.probeQuotaStatus(mainLoopModel, credentials, storageV5);
}
//@ chunk-w5ndchqs.js:48667-48759 placement
function extractQuotaStatusFromHeaders(
  headers,
  model,
  unifiedFallback = false,
  nowMs = Date.now(),
  accountEpoch,
  storageV5,
) {
  return claudeAiLimits.extractQuotaStatusFromHeaders(
    headers,
    model,
    unifiedFallback,
    nowMs,
    accountEpoch,
    storageV5,
  );
}
//@ chunk-w5ndchqs.js:48759-48835 placement
function extractQuotaStatusFromError(
  error,
  requestRouteKind,
  nowMs = Date.now(),
  limitsAccountEpoch,
  storageV5,
) {
  claudeAiLimits.extractQuotaStatusFromError(error, requestRouteKind, nowMs, limitsAccountEpoch, storageV5);
}
//@ chunk-w5ndchqs.js:48918-48976 affinity = extractQuotaStatusFromError (1)
/**
 * 构造 rejected 额度状态（合并错误里的字段）。旧版名错配。
 */
function buildRejectedLimits(limits, error) {
  return {
    ...limits,
    status: "rejected",
    ...creditsRequiredDetails(error),
  };
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
function extractGraceStatusFromHeaders(headers, model, nowMs = Date.now(), accountEpoch) {
  claudeAiLimits.extractGraceStatusFromHeaders(headers, model, nowMs, accountEpoch);
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
/**
 * 宽限期结束后是否应继续（按 continueAfterWrapUpAt 判定）。
 */
function shouldContinueAfterWrapUp(limits = Date.now()) {
  return claudeAiLimits.wrapUp.continueAfterWrapUpAt(limits);
}
//@ chunk-w5ndchqs.js:49331-49498 placement
function emitStatusChange(limits = Date.now()) {
  let wrapUpLimit = shouldContinueAfterWrapUp(limits);
  return wrapUpLimit === null
    ? null
    : {
        status: "rejected",
        resetsAt: wrapUpLimit.resetsAt,
        rateLimitType: wrapUpLimit.rateLimitType,
        unifiedRateLimitFallbackAvailable: false,
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
function overageScopeHeader(headers) {
  let scope = headers?.get?.(OVERAGE_SCOPE_HEADER);
  if (scope === "service" || scope === "channel" || scope === "group_pool" || scope === "organization")
    return scope;
  return;
}
//@ chunk-0h4e7gnq.js:48384-48429 fingerprint = currentLimits (0.823)
/**
 * 默认额度状态 {status:"allowed", isUsingOverage:false}。
 */
var currentLimits = {
  status: "allowed",
  isUsingOverage: false,
};
//@ chunk-0h4e7gnq.js:48429-48567 fingerprint = extractQuotaStatusFromHeaders (0.677)
/**
 * 额度状态是否为"完全正常"（allowed、无重置时间、未用 overage、无宽限）。
 */
function extractQuotaStatusFromHeaders_2(headers) {
  return (
    headers.status === "allowed" &&
    headers.resetsAt === undefined &&
    headers.isUsingOverage !== true &&
    headers.overageInUse !== true &&
    headers.rateLimitGraceActive !== true
  );
}
//@ chunk-0h4e7gnq.js:48567-49100 affinity
/**
 * 额度状态的重置时间已过则清回默认（clear），overage 重置时间已过则剥离 overage 字段（overage_strip）。
 */
function expireStaleLimits(limits, nowSeconds = Date.now() / 1000) {
  let pruned = dropExpiredWindows(limits, nowSeconds);
  let mainExpired = limits.resetsAt !== undefined && limits.resetsAt <= nowSeconds;
  let overageExpired = limits.overageResetsAt !== undefined && limits.overageResetsAt <= nowSeconds;
  let fullyRejected = limits.status === "rejected" && limits.overageStatus === "rejected" && overageExpired;
  if (mainExpired || fullyRejected)
    return {
      info: {
        ...currentLimits,
        ...(pruned.unifiedWindows !== undefined && {
          unifiedWindows: pruned.unifiedWindows,
        }),
      },
      degradation: "clear",
    };
  if (overageExpired) {
    let { overageStatus, overageResetsAt, overageDisabledReason, limitScope, adminRequestOffer, ...rest } =
      pruned;
    return {
      info: {
        ...rest,
        isUsingOverage: rest.isUsingOverage ?? false,
      },
      degradation: "overage_strip",
    };
  }
  return {
    info: pruned,
    degradation: "none",
  };
}
//@ chunk-0h4e7gnq.js:49100-49182 affinity
/**
 * 取限额窗口列表最后一项的当前状态（Sd）。
 */
function getLatestLimitStatus(limitsList, nowSeconds = Date.now() / 1000) {
  let limits = limitsList.at(-1);
  return limits === undefined ? undefined : expireStaleLimits(limits, nowSeconds);
}
//@ chunk-0h4e7gnq.js:49444-49499 placement
/**
 * 对象非空时原样返回，空对象返回 undefined。
 */
function nonEmptyObjectOrUndefined(obj) {
  return Object.keys(obj).length > 0 ? obj : undefined;
}
//@ chunk-0h4e7gnq.js:49499-49711 placement
function dropExpiredWindows(limits, nowSeconds) {
  let { unifiedWindows, ...rest } = limits;
  if (unifiedWindows === undefined) return limits;
  let kept = pickByHelper(
    unifiedWindows,
    (unifiedWindow) => unifiedWindow !== undefined && unifiedWindow.resetsAt > nowSeconds,
  );
  let keptCount = Object.keys(kept).length;
  if (keptCount === 0) return rest;
  return keptCount === Object.keys(unifiedWindows).length
    ? limits
    : {
        ...rest,
        unifiedWindows: kept,
      };
}
export {
  getLimitsAccountEpoch,
  getLatestLimitStatus,
  extractQuotaStatusFromHeaders_2,
  getCurrentLimits,
  areLimitsObserved,
  emitLimitsStatusChange,
  nonEmptyObjectOrUndefined,
  HTTPS_CLAUDE_AI_ADMIN_SETTINGS_USAGE,
  USAGE_SETTINGS_URL,
  isValidUtilization,
  getWrapUpZone,
  getRawUtilization,
  getRawWindowLevels,
  onLimitsStatusChanged,
  getMockRateLimitState,
  MAX,
  currentLimits,
  getRateLimitDisplayName,
  lastLimitsObservationAt,
  EXTRA_USAGE_HELP_URL,
  EXTRA_USAGE_SUPPORT_URL,
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
  refreshLimitsFromHeaders,
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
  isLimitsDisplayEnabled,
  extractQuotaStatusFromErrorHeaders,
  creditsRequiredDetails,
  cacheExtraUsageDisabledReason,
  runQuotaProbe,
  restoreLimits,
  onUsageLimitWaitsChanged,
  usageLimitWaits,
  getDisabledMockRateLimitState,
  checkQuotaStatus,
  claudeAiLimits,
};
