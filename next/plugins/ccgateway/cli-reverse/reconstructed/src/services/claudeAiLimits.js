/**
 * services/claudeAiLimits.ts
 *
 * claude.ai 订阅额度状态：从 anthropic-ratelimit-unified-* 响应头计算当前额度（状态、重置时间、overage、各窗口利用率）、早期预警（按窗口利用率与时间进度）、过期状态清理，以及配额探测请求。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/claudeAiLimits.ts
 * pieces: chunk-7pwjpdkw.js (75), chunk-exfmq47h.js (9), chunk-frs14hy1.js (7)
 * attribution: placement 60, fingerprint 11, layout 16, file-local 2, callgraph-witnessed 1, sole-consumer 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { programUseCaseBody } from "../utils/programUseCase.js";
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
import { stripMemoryTagsFromBlocks } from "./orgMemory/promptIndex.js";
import { EXITPLANMODE_2 } from "../tools/ExitPlanModeTool/constants.js";
import { isDisklessSession, notePlanFileForgotten, getPlanFilePath, getPlan } from "../utils/plans.js";
import { pickByHelper } from "../utils/git/gitSafeEnv.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:288938-289030 placement
/**
 * 付费计划“额外用量”帮助文章链接。
 */
var EXTRA_USAGE_HELP_URL =
  "https://support.claude.com/en/articles/12429409-extra-usage-for-paid-claude-plans";
//@ chunk-exfmq47h.js:289030-289197 placement
/**
 * 支持文章（12429409）链接常量。
 */
var USAGE_SETTINGS_URL = "https://claude.ai/settings/usage?from=cc_cli_limit_message";
var HTTPS_CLAUDE_AI_ADMIN_SETTINGS_USAGE = "https://claude.ai/admin-settings/usage";
var EXTRA_USAGE_SUPPORT_URL = "https://support.claude.com/en/articles/12429409";
//@ chunk-exfmq47h.js:289197-289210 placement
var MAX = "max";
//@ chunk-exfmq47h.js:297906-297931 sole-consumer
/**
 * 按 host 存放的 MockRateLimitState 单例槽。
 */
var mockRateLimitStateSlot; // deferred: uses MockRateLimitState (./mockRateLimits.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:297906", () => {
  mockRateLimitStateSlot = new HostScoped(() => new MockRateLimitState());
});
//@ chunk-exfmq47h.js:297931-297968 placement
/**
 * 取当前宿主的限速模拟状态槽（mockRateLimitStateSlot）。
 */
function getMockRateLimitState() {
  return mockRateLimitStateSlot.of(getRootSession().host);
}
//@ chunk-exfmq47h.js:297968-297995 placement
/**
 * 限速模拟关闭时的占位实现，永远返回 null。
 */
function getDisabledMockRateLimitState() {
  return null;
}
//@ chunk-exfmq47h.js:297995-298060 placement
function checkQuotaStatus() {
  let mockRateLimitState = getMockRateLimitState();
  mockRateLimitState.enabled;
  return null;
  return mockRateLimitState.headers;
}
//@ chunk-exfmq47h.js:298060-298307 placement
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
//@ chunk-exfmq47h.js:298307-298331 placement
/**
 * 限额模拟（外部构建恒为 false）。
 */
function isRateLimitMockingEnabled() {
  return false;
}
//@ chunk-7pwjpdkw.js:6386-6483 placement
/**
 * 从响应头读使用率：转数字、夹到 0–1，非法值按 0。
 */
function readUtilizationHeader(headers, name) {
  let value = Number(headers.get(name) ?? 0);
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}
//@ chunk-7pwjpdkw.js:6483-6587 placement
function futureResetHeader(headers, name, nowMs) {
  let seconds = Number(headers.get(name) ?? NaN);
  return Number.isFinite(seconds) && seconds * 1000 > nowMs ? Math.round(seconds) : undefined;
}
//@ chunk-7pwjpdkw.js:6587-7217 placement
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
//@ chunk-7pwjpdkw.js:7217-8537 placement
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
//@ chunk-7pwjpdkw.js:8537-8585 placement
function maybeMockRateLimitHeaders(headers) {
  if (isRateLimitMockingEnabled()) return applyMockQuotaHeaders(headers);
  return headers;
}
//@ chunk-7pwjpdkw.js:8585-8635 placement
/**
 * 是否应展示限额相关界面：Claude.ai 订阅、网关提供方或限速模拟开启时成立。
 */
function isLimitsDisplayEnabled(flag) {
  return flag || getAPIProvider() === "gateway" || isRateLimitMockingEnabled();
}
//@ chunk-7pwjpdkw.js:20316-20506 fingerprint (2.1.88 match: RATE_LIMIT_DISPLAY_NAMES, 0.705)
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
//@ chunk-7pwjpdkw.js:28036-28293 fingerprint (2.1.88 match: EARLY_WARNING_CONFIGS, 1)
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
//@ chunk-7pwjpdkw.js:28293-28329 layout
/**
 * 限额类型显示名，未知类型原样返回。
 */
function getRateLimitDisplayName(type) {
  return getOwn(RATE_LIMIT_DISPLAY_NAMES, type) || type;
}
//@ chunk-7pwjpdkw.js:28329-28415 file-local
/**
 * 窗口已过时间占比（0–1）。
 */
function computeTimeProgress(resetsAt, windowSeconds) {
  let nowSeconds = Date.now() / 1000;
  let windowStart = resetsAt - windowSeconds;
  let elapsed = nowSeconds - windowStart;
  return Math.max(0, Math.min(1, elapsed / windowSeconds));
}
//@ chunk-7pwjpdkw.js:28415-28980 layout
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
//@ chunk-7pwjpdkw.js:28980-29165 layout
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
//@ chunk-7pwjpdkw.js:29165-29283 fingerprint (2.1.88 match: EARLY_WARNING_CLAIM_MAP, 0.608)
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
//@ chunk-7pwjpdkw.js:29283-29335 layout
/**
 * GrowthBook tengu_sharded_moonbeam（默认开）。
 */
function isShardedQuotaEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_sharded_moonbeam", true);
}
//@ chunk-7pwjpdkw.js:29335-29384 layout
/**
 * GrowthBook tengu_valiant_finch（默认关）。
 */
function isValiantFinchEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_valiant_finch", false);
}
//@ chunk-7pwjpdkw.js:29384-29477 layout
/**
 * 头值转数字（空/非数返回 undefined）。
 */
function parseHeaderNumber(raw) {
  if (raw === null || raw === "") return;
  let value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}
//@ chunk-7pwjpdkw.js:29477-30010 fingerprint (2.1.88 match: getHeaderBasedEarlyWarning, 0.678)
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
//@ chunk-7pwjpdkw.js:30010-30058 layout
/**
 * allowed/allowed_warning/rejected。
 */
var UNIFIED_STATUS_VALUES = ["allowed", "allowed_warning", "rejected"];
//@ chunk-7pwjpdkw.js:30058-30222 layout
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
//@ chunk-7pwjpdkw.js:30222-30332 layout
/**
 * 读数指纹 "利用率@重置:状态:阈值"，用于去重。
 */
function readingFingerprint(reading, limits) {
  return `${Math.round(reading.utilization * 100)}@${reading.resets_at}:${limits?.status}:${limits?.surpassedThreshold}`;
}
//@ chunk-7pwjpdkw.js:30332-30428 layout
/**
 * 读数的 utilization 与 resets_at 都是有限数。
 */
function isValidUtilization(reading) {
  return reading !== undefined && Number.isFinite(reading.utilization) && Number.isFinite(reading.resets_at);
}
//@ chunk-7pwjpdkw.js:30428-30526 layout
/**
 * 读数有阈值或完整利用率信息。
 */
function hasReadingSignal(reading) {
  return (
    reading.surpassedThreshold !== undefined ||
    (reading.utilization !== undefined && reading.resets_at !== undefined)
  );
}
//@ chunk-7pwjpdkw.js:30526-30814 fingerprint (2.1.88 match: makeTestQuery, 0.93)
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
        ...programUseCaseBody(betas),
      },
      {
        signal,
      },
    )
    .asResponse();
}
//@ chunk-7pwjpdkw.js:30814-30856 layout
/**
 * 执行一次配额探测请求。
 */
async function runQuotaProbe(model, credentials, signal) {
  await makeTestQuery(model, credentials, signal);
}
//@ chunk-7pwjpdkw.js:30856-31169 file-local
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
//@ chunk-7pwjpdkw.js:31169-31539 fingerprint (2.1.88 match: getTimeRelativeEarlyWarning, 0.723)
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
//@ chunk-7pwjpdkw.js:31539-31697 callgraph-witnessed (2.1.88 match: getEarlyWarningFromHeaders, 0)
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
//@ chunk-7pwjpdkw.js:31697-33112 fingerprint (2.1.88 match: computeNewLimitsFromHeaders, 0.721)
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
  if (overageScope === "group_pool") delete headerBasedEarlyWarning.overage;
  return {
    base: parsedLimits,
    own: withEarlyWarning(parsedLimits, headerBasedEarlyWarning),
    readings: headerBasedEarlyWarning,
  };
}
//@ chunk-7pwjpdkw.js:33112-33244 layout
/**
 * allowed 状态时叠加早期预警信息。
 */
function withEarlyWarning(previous, headers) {
  if (previous.status !== "allowed") return previous;
  let limits = getEarlyWarningFromHeaders(headers, previous.unifiedRateLimitFallbackAvailable);
  return limits ? carryOverageFields(limits, previous.upgradePaths, previous) : previous;
}
//@ chunk-7pwjpdkw.js:33244-33280 placement
/**
 * 用响应头重算限额并写回“自有”部分（宽限期结束前后合并超额字段）。
 */
function refreshLimitsFromHeaders(headers, model) {
  return computeNewLimitsFromHeaders(headers, model).own;
}
//@ chunk-7pwjpdkw.js:33280-33787 placement
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
//@ chunk-7pwjpdkw.js:33881-34015 placement
function toAllowedLimits(currentLimits) {
  let { resetsAt, rateLimitType, utilization, surpassedThreshold, upgradePaths, ...rest } = currentLimits;
  return {
    ...rest,
    status: "allowed",
  };
}
//@ chunk-7pwjpdkw.js:34015-34464 placement
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
//@ chunk-7pwjpdkw.js:34464-34578 placement
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
//@ chunk-7pwjpdkw.js:34578-34696 fingerprint (2.1.88 match: cacheExtraUsageDisabledReason, 0.61)
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
//@ chunk-7pwjpdkw.js:37843-37970 placement
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
//@ chunk-7pwjpdkw.js:37970-47619 placement
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
  async probeQuotaStatus(model, credentials, storageV5, limits) {
    if (isEssentialTrafficOnly()) return null;
    if (!isLimitsDisplayEnabled(isClaudeAISubscriber())) return null;
    if (getIsNonInteractiveSession() && !limits?.probeInNonInteractiveSession) return null;
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
//@ chunk-7pwjpdkw.js:47619-47632 placement
var claudeAiLimits; // deferred: uses ClaudeAiLimitsTracker of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7pwjpdkw.js:47619", () => {
  claudeAiLimits = new ClaudeAiLimitsTracker();
});
//@ chunk-7pwjpdkw.js:47632-47669 placement
function getCurrentLimits() {
  return claudeAiLimits.currentLimits;
}
//@ chunk-7pwjpdkw.js:47669-47711 placement
function getRawUtilization() {
  return liveWindowsOf(claudeAiLimits.rawUtilization);
}
//@ chunk-7pwjpdkw.js:47711-47751 placement
function getRawWindowLevels() {
  return claudeAiLimits.rawWindowLevels;
}
//@ chunk-7pwjpdkw.js:47751-47868 placement
function hasSurpassedThreshold(rateLimitType) {
  return (
    claudeAiLimits.rawWindowLevels[rateLimitType]?.surpassedThreshold ??
    claudeAiLimits.currentWindows(Date.now())[rateLimitType]?.surpassedThreshold
  );
}
//@ chunk-7pwjpdkw.js:47868-48019 placement
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
//@ chunk-7pwjpdkw.js:48019-48122 placement
function liveWindowsOf(rawUtilization) {
  let now = Date.now();
  let live = {};
  for (let [key] of UNIFIED_WINDOW_HEADER_KEYS) {
    let entry = rawUtilization[key];
    if (entry !== undefined && isUtilizationEntryUsable(entry, now)) live[key] = entry;
  }
  return live;
}
//@ chunk-7pwjpdkw.js:48122-48209 placement
/**
 * 判断一条使用率观测是否可用于当前窗口：resets_at 在 now 之后一年内。
 */
function isUtilizationEntryUsable(entry, nowMs) {
  let nowSeconds = nowMs / 1000;
  let maxSeconds = nowSeconds + 31536000;
  return isValidUtilization(entry) && entry.resets_at > nowSeconds && entry.resets_at < maxSeconds;
}
//@ chunk-7pwjpdkw.js:48209-48245 placement
function getLimitsAccountEpoch() {
  return claudeAiLimits.accountEpoch;
}
//@ chunk-7pwjpdkw.js:48245-48284 placement
function areLimitsObserved() {
  return claudeAiLimits.limitsObserved;
}
//@ chunk-7pwjpdkw.js:48284-48335 placement
function lastLimitsObservationAt() {
  return claudeAiLimits.lastAppliedObservationAtMs;
}
//@ chunk-7pwjpdkw.js:48335-48387 placement
function onLimitsStatusChanged(listener) {
  return claudeAiLimits.statusChanged.subscribe(listener);
}
//@ chunk-7pwjpdkw.js:48387-48438 placement
function onOverageInUse(listener) {
  return claudeAiLimits.overageInUse.subscribe(listener);
}
//@ chunk-7pwjpdkw.js:48438-48490 placement
function onQuotaRejected(listener) {
  return claudeAiLimits.quotaRejected.subscribe(listener);
}
//@ chunk-7pwjpdkw.js:48490-48538 placement
function beginUsageLimitWait(wait) {
  return claudeAiLimits.beginUsageLimitWait(wait);
}
//@ chunk-7pwjpdkw.js:48538-48582 placement
function usageLimitWaits() {
  return [...claudeAiLimits.usageLimitWaits];
}
//@ chunk-7pwjpdkw.js:48582-48643 placement
function onUsageLimitWaitsChanged(listener) {
  return claudeAiLimits.usageLimitWaitsChanged.subscribe(listener);
}
//@ chunk-7pwjpdkw.js:48643-48681 placement
function resetCurrentLimits() {
  claudeAiLimits.resetCurrentLimits();
}
//@ chunk-7pwjpdkw.js:48681-48720 placement
function forgetHeldWindows(windowKey) {
  claudeAiLimits.forgetHeldWindows(windowKey);
}
//@ chunk-7pwjpdkw.js:48720-48758 placement
function emitLimitsStatusChange(limits) {
  claudeAiLimits.emitStatusChange(limits);
}
//@ chunk-7pwjpdkw.js:48758-48797 placement
function restoreLimits(limits, limitsObserved) {
  claudeAiLimits.restoreLimits(limits, limitsObserved);
}
//@ chunk-7pwjpdkw.js:48797-48857 placement
async function probeQuotaStatusAtStart(credentials, signal) {
  await claudeAiLimits.probeQuotaStatus(getBareCheckModel(), credentials, signal);
}
//@ chunk-7pwjpdkw.js:48857-48914 placement
function probeQuotaStatus(source, force, storageV5, options) {
  return claudeAiLimits.probeQuotaStatus(source, force, storageV5, options);
}
//@ chunk-7pwjpdkw.js:48914-49006 placement
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
//@ chunk-7pwjpdkw.js:49006-49082 placement
function extractQuotaStatusFromError(
  error,
  requestRouteKind,
  nowMs = Date.now(),
  limitsAccountEpoch,
  storageV5,
) {
  claudeAiLimits.extractQuotaStatusFromError(error, requestRouteKind, nowMs, limitsAccountEpoch, storageV5);
}
//@ chunk-7pwjpdkw.js:49165-49223 fingerprint (2.1.88 match: extractQuotaStatusFromError, 1)
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
//@ chunk-7pwjpdkw.js:49223-49258 placement
function resetGraceState() {
  claudeAiLimits.resetGraceState();
}
//@ chunk-7pwjpdkw.js:49258-49303 placement
function resetNearLimitWrapUpState() {
  claudeAiLimits.resetNearLimitWrapUpState();
}
//@ chunk-7pwjpdkw.js:49303-49377 placement
function extractGraceStatusFromHeaders(headers, model, nowMs = Date.now(), accountEpoch) {
  claudeAiLimits.extractGraceStatusFromHeaders(headers, model, nowMs, accountEpoch);
}
//@ chunk-7pwjpdkw.js:49377-49419 placement
function wrapUpOnMainTurnStart() {
  claudeAiLimits.wrapUp.onMainTurnStart();
}
//@ chunk-7pwjpdkw.js:49419-49465 placement
function takeWrapUpTurnNote() {
  return claudeAiLimits.wrapUp.takeTurnNote();
}
//@ chunk-7pwjpdkw.js:49465-49511 placement
function markWrapUpStartNotePlaced() {
  claudeAiLimits.wrapUp.markStartNotePlaced();
}
//@ chunk-7pwjpdkw.js:49511-49578 placement
/**
 * 宽限期结束后是否应继续（按 continueAfterWrapUpAt 判定）。
 */
function shouldContinueAfterWrapUp(limits = Date.now()) {
  return claudeAiLimits.wrapUp.continueAfterWrapUpAt(limits);
}
//@ chunk-7pwjpdkw.js:49578-49745 placement
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
//@ chunk-7pwjpdkw.js:49745-49794 placement
function isSubagentWrapUpNoteDue() {
  return claudeAiLimits.wrapUp.subagentNoteDue();
}
//@ chunk-7pwjpdkw.js:49794-49835 placement
function getWrapUpZone() {
  return claudeAiLimits.wrapUp.getZone();
}
//@ chunk-7pwjpdkw.js:49835-49895 placement
function consumeNearLimitWrapUpHint() {
  return claudeAiLimits.consumePendingNearLimitWrapUpHint();
}
//@ chunk-7pwjpdkw.js:49895-50016 placement
function overageScopeHeader(headers) {
  let scope = headers?.get?.(OVERAGE_SCOPE_HEADER);
  if (scope === "service" || scope === "channel" || scope === "group_pool" || scope === "organization")
    return scope;
  return;
}
//@ chunk-frs14hy1.js:54357-54402 fingerprint (2.1.88 match: currentLimits, 0.822)
/**
 * 默认额度状态 {status:"allowed", isUsingOverage:false}。
 */
var currentLimits = {
  status: "allowed",
  isUsingOverage: false,
};
//@ chunk-frs14hy1.js:54402-54540 fingerprint (2.1.88 match: extractQuotaStatusFromHeaders, 0.676)
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
//@ chunk-frs14hy1.js:54540-55073 layout
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
//@ chunk-frs14hy1.js:55073-55155 layout
/**
 * 取限额窗口列表最后一项的当前状态（Sd）。
 */
function getLatestLimitStatus(limitsList, nowSeconds = Date.now() / 1000) {
  let limits = limitsList.at(-1);
  return limits === undefined ? undefined : expireStaleLimits(limits, nowSeconds);
}
//@ chunk-frs14hy1.js:55155-55417 layout
/**
 * 给 SDK 的 assistant message：去内部块，ExitPlanMode 的 tool_use 输入补上计划文本。
 */
function latestUsageAt(message) {
  let content = message.message.content;
  if (!Array.isArray(content)) return message.message;
  let content_2 = stripMemoryTagsFromBlocks(content).map((content) => {
    if (content.type !== "tool_use") return content;
    if (content.name === EXITPLANMODE_2 && !isDisklessSession()) {
      notePlanFileForgotten(getPlanFilePath());
      let plan = getPlan();
      if (plan)
        return {
          ...content,
          input: {
            ...content.input,
            plan,
          },
        };
    }
    return content;
  });
  return {
    ...message.message,
    content: content_2,
  };
}
//@ chunk-frs14hy1.js:55417-55472 placement
/**
 * 对象非空时原样返回，空对象返回 undefined。
 */
function nonEmptyObjectOrUndefined(obj) {
  return Object.keys(obj).length > 0 ? obj : undefined;
}
//@ chunk-frs14hy1.js:55472-55684 placement
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
  getCurrentLimits,
  getLimitsAccountEpoch,
  extractQuotaStatusFromHeaders,
  extractQuotaStatusFromError,
  beginUsageLimitWait,
  extractGraceStatusFromHeaders,
  maybeMockRateLimitHeaders,
  buildRejectedLimits,
  refreshLimitsFromHeaders,
  HTTPS_CLAUDE_AI_ADMIN_SETTINGS_USAGE,
  USAGE_SETTINGS_URL,
  getLatestLimitStatus,
  extractQuotaStatusFromHeaders_2,
  areLimitsObserved,
  emitLimitsStatusChange,
  onLimitsStatusChanged,
  onQuotaRejected,
  probeQuotaStatus,
  onUsageLimitWaitsChanged,
  usageLimitWaits,
  forgetHeldWindows,
  emitStatusChange,
  getRateLimitDisplayName,
  getMockRateLimitState,
  MAX,
  isLimitsDisplayEnabled,
  extractQuotaStatusFromErrorHeaders,
  creditsRequiredDetails,
  getRawUtilization,
  cacheExtraUsageDisabledReason,
  runQuotaProbe,
  lastLimitsObservationAt,
  RATE_LIMIT_DISPLAY_NAMES,
  isSubagentWrapUpNoteDue,
  wrapUpOnMainTurnStart,
  takeWrapUpTurnNote,
  markWrapUpStartNotePlaced,
  getWrapUpZone,
  consumeNearLimitWrapUpHint,
  isRateLimitMockingEnabled,
  getDisabledMockRateLimitState,
  checkQuotaStatus,
  currentUsageWindows,
  nonEmptyObjectOrUndefined,
  latestUsageAt,
  claudeAiLimits,
  resetGraceState,
  resetNearLimitWrapUpState,
  resetCurrentLimits,
  probeQuotaStatusAtStart,
  currentLimits,
  EXTRA_USAGE_HELP_URL,
  EXTRA_USAGE_SUPPORT_URL,
  onOverageInUse,
  hasSurpassedThreshold,
  isValidUtilization,
  getRawWindowLevels,
  restoreLimits,
};
