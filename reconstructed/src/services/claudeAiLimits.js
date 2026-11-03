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
import { En } from "../../vendor/lodash-es/_inlinedHelpers.js";
import { logError } from "../utils/log.js";
import { logEvent } from "./analytics/index.js";
import { fromEnum, fromEnumOpt } from "./analytics/safeMetadata.js";
import { isEssentialTrafficOnly } from "../utils/privacyLevel.js";
import { isClaudeAISubscriber, getRateLimitTier, getSubscriptionType } from "../utils/auth.js";
import { getIsNonInteractiveSession, setUsageCreditsRequired, getRootSession } from "../bootstrap/state.js";
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
import { HostScoped } from "../utils/hostScoped.js";
import { MockRateLimitState } from "./mockRateLimits.js";
import { pickByHelper } from "../utils/git/gitSafeEnv.js";

//@ chunk-w5ndchqs.js:6185-6282 placement
/**
 * 从响应头读使用率：转数字、夹到 0–1，非法值按 0。
 */
function readUtilizationHeader(e, n) {
  let r = Number(e.get(n) ?? 0);
  return Number.isFinite(r) ? Math.max(0, Math.min(1, r)) : 0;
}
//@ chunk-w5ndchqs.js:6282-6386 placement
function futureResetHeader(e, n, r) {
  let s = Number(e.get(n) ?? NaN);
  return Number.isFinite(s) && s * 1000 > r ? Math.round(s) : undefined;
}
//@ chunk-w5ndchqs.js:6386-7016 placement
/**
 * 解析 anthropic-ratelimit-unified-* 响应头（status、5h/7d 利用率与重置时间、grace 窗口），得到限额快照。
 */
function parseUnifiedRateLimitHeaders(e, n) {
  if (e.get("anthropic-ratelimit-unified-status") === null)
    return {
      limiterRan: false,
    };
  let utilizationHeader = readUtilizationHeader(e, "anthropic-ratelimit-unified-grace-5h-utilization");
  let utilizationHeader_2 = readUtilizationHeader(e, "anthropic-ratelimit-unified-grace-7d-utilization");
  if (utilizationHeader === 0 && utilizationHeader_2 === 0)
    return {
      limiterRan: true,
      zone: null,
    };
  let d = futureResetHeader(e, "anthropic-ratelimit-unified-5h-reset", n);
  let m = futureResetHeader(e, "anthropic-ratelimit-unified-7d-reset", n);
  let h = utilizationHeader > 0 && d !== undefined && (m === undefined || d > m);
  let y = utilizationHeader_2 > 0 && !h ? "seven_day" : "five_hour";
  let w = e.get(OVERAGE_STATUS_HEADER);
  let L = w === "allowed" || w === "allowed_warning" ? w : undefined;
  return {
    limiterRan: true,
    zone: {
      rateLimitType: y,
      resetsAt: y === "seven_day" ? m : d,
      extraUsageStatus: L,
    },
    covered: L !== undefined || e.get(OVERAGE_IN_USE_HEADER) === "true",
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
  getZone(e = Date.now()) {
    let zone = this.zone;
    return zone !== null && zone.resetsAt !== undefined && e / 1000 >= zone.resetsAt ? null : zone;
  }
  applyResponse(e, n) {
    let unifiedRateLimitHeaders = parseUnifiedRateLimitHeaders(e, n);
    if (!unifiedRateLimitHeaders.limiterRan || n < this.fenceMs) return;
    this.fenceMs = n;
    if (unifiedRateLimitHeaders.zone === null || unifiedRateLimitHeaders.zone.resetsAt !== undefined)
      this.dropEndedZone(n);
    this.zone = unifiedRateLimitHeaders.zone;
    this.covered = unifiedRateLimitHeaders.zone !== null && unifiedRateLimitHeaders.covered;
    if (unifiedRateLimitHeaders.zone === null || unifiedRateLimitHeaders.covered) this.turnNote = "none";
    else if (this.turnNote === "none") this.turnNote = "owed";
  }
  dropEndedZone(e) {
    if (this.zone !== null && this.getZone(e) === null) {
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
  leave(e = Date.now()) {
    this.zone = null;
    this.covered = false;
    this.turnNote = "none";
    this.fenceMs = Math.max(this.fenceMs, e);
  }
  onMainTurnStart() {
    this.turnNote = "none";
  }
  takeTurnNote(e = Date.now()) {
    this.dropEndedZone(e);
    if (this.turnNote !== "owed") return false;
    this.turnNote = "taken";
    return true;
  }
  markStartNotePlaced() {
    if (this.turnNote === "taken") this.turnNote = "placed";
  }
  continueAfterWrapUpAt(e = Date.now()) {
    let zone = this.getZone(e);
    return this.turnNote === "placed" && zone !== null && !this.covered && zone.resetsAt !== undefined
      ? {
          resetsAt: zone.resetsAt,
          rateLimitType: zone.rateLimitType,
        }
      : null;
  }
  subagentNoteDue(e = Date.now()) {
    return this.getZone(e) !== null && !this.covered;
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
function isLimitsDisplayEnabled(e) {
  return e || getAPIProvider() === "gateway" || isRateLimitMockingEnabled();
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
  let n = error.headers?.get?.(REPRESENTATIVE_CLAIM_HEADER);
  let r = error.headers?.get?.(OVERAGE_STATUS_HEADER);
  if (!n && !r) return null;
  let s = {
    status: "rejected",
    unifiedRateLimitFallbackAvailable: false,
    isUsingOverage: false,
  };
  let d = error.headers?.get?.("anthropic-ratelimit-unified-reset");
  if (d) s.resetsAt = Math.round(Number(d));
  if (n) s.rateLimitType = n;
  if (r) s.overageStatus = r;
  let m = error.headers?.get?.("anthropic-ratelimit-unified-overage-reset");
  if (m) s.overageResetsAt = Math.round(Number(m));
  let h = error.headers?.get?.(OVERAGE_DISABLED_REASON_HEADER);
  if (h) s.overageDisabledReason = h;
  let y = overageScopeHeader(error.headers);
  if (y) s.overageScope = y;
  Object.assign(s, parseLowPriorityOffer(error.headers));
  return s;
}
//@ chunk-w5ndchqs.js:28821-29006 layout
/**
 * 低优先级（等待额度恢复）提议头：offer、retry-after 秒、最大等待秒。
 */
function parseLowPriorityOffer(e) {
  let slowOfferArm = getSlowOfferArm(e);
  if (!slowOfferArm) return {};
  let slowRetryAfter = getSlowRetryAfter(e);
  let slowMaxWait = getSlowMaxWait(e);
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
function parseHeaderNumber(e) {
  if (e === null || e === "") return;
  let n = Number(e);
  return Number.isFinite(n) ? n : undefined;
}
//@ chunk-w5ndchqs.js:29318-29851 fingerprint = getHeaderBasedEarlyWarning (0.678)
/**
 * 解析各窗口 anthropic-ratelimit-unified-{5h,7d,7d_oi,overage}-{utilization,reset,surpassed-threshold,status} 头为读数表。
 */
function getHeaderBasedEarlyWarning(headers) {
  let n = {};
  for (let [r, s] of UNIFIED_WINDOW_HEADER_KEYS) {
    let headerNumber = parseHeaderNumber(headers.get(`anthropic-ratelimit-unified-${s}-utilization`));
    let headerNumber_2 = parseHeaderNumber(headers.get(`anthropic-ratelimit-unified-${s}-reset`));
    let headerNumber_3 = parseHeaderNumber(
      headers.get(`anthropic-ratelimit-unified-${s}-surpassed-threshold`),
    );
    let surpassedThreshold = headers.get(`anthropic-ratelimit-unified-${s}-status`);
    let w = r === "overage" ? undefined : UNIFIED_STATUS_VALUES.find((L) => L === surpassedThreshold);
    if (
      headerNumber === undefined &&
      headerNumber_2 === undefined &&
      headerNumber_3 === undefined &&
      w === undefined
    )
      continue;
    n[r] = {
      ...(headerNumber !== undefined && {
        utilization: headerNumber,
      }),
      ...(headerNumber_2 !== undefined && {
        resets_at: Math.round(headerNumber_2),
      }),
      ...(headerNumber_3 !== undefined && {
        surpassedThreshold: headerNumber_3,
      }),
      ...(w !== undefined && {
        status: w,
      }),
    };
  }
  return n;
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
function pickWindowReadings(e) {
  let result = {};
  for (let [r] of UNIFIED_WINDOW_HEADER_KEYS) {
    let s = e[r];
    if (s?.utilization !== undefined && s.resets_at !== undefined)
      result[r] = {
        utilization: s.utilization,
        resets_at: s.resets_at,
      };
  }
  return result;
}
//@ chunk-w5ndchqs.js:30063-30173 layout
/**
 * 读数指纹 "利用率@重置:状态:阈值"，用于去重。
 */
function readingFingerprint(e, n) {
  return `${Math.round(e.utilization * 100)}@${e.resets_at}:${n?.status}:${n?.surpassedThreshold}`;
}
//@ chunk-w5ndchqs.js:30173-30269 layout
/**
 * 读数的 utilization 与 resets_at 都是有限数。
 */
function isValidUtilization(e) {
  return e !== undefined && Number.isFinite(e.utilization) && Number.isFinite(e.resets_at);
}
//@ chunk-w5ndchqs.js:30269-30367 layout
/**
 * 读数有阈值或完整利用率信息。
 */
function hasReadingSignal(e) {
  return e.surpassedThreshold !== undefined || (e.utilization !== undefined && e.resets_at !== undefined);
}
//@ chunk-w5ndchqs.js:30367-30645 fingerprint = makeTestQuery (0.93)
/**
 * 配额探测：发一次 max_tokens=1 的 "quota" 请求以获取限额响应头。
 */
async function makeTestQuery(e, credentials, signal) {
  let anthropic = await getAnthropicClient({
    maxRetries: 0,
    model: e,
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
  let betas = getModelBetas(e);
  return anthropic.beta.messages
    .create(
      {
        model: toProviderWireModelId(e),
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
async function runQuotaProbe(e, credentials, signal) {
  await makeTestQuery(e, credentials, signal);
}
//@ chunk-w5ndchqs.js:30687-31000 file-local
/**
 * 响应头里有 surpassed-threshold 的窗口直接作为预警（allowed_warning）。
 */
function extractRawUtilization(headers, unifiedRateLimitFallbackAvailable, r) {
  for (let [s] of UNIFIED_WINDOW_HEADER_KEYS) {
    if (r && s === "five_hour") continue;
    let d = headers[s];
    if (d?.surpassedThreshold !== undefined)
      return {
        status: "allowed_warning",
        resetsAt: d.resets_at,
        rateLimitType: s,
        utilization: d.utilization,
        unifiedRateLimitFallbackAvailable,
        isUsingOverage: false,
        surpassedThreshold: d.surpassedThreshold,
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
  let h = headers[rateLimitType];
  if (h?.utilization === undefined || h.resets_at === undefined) return null;
  let { utilization, resets_at: resetsAt } = h;
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
  let r = isLowPriorityActive();
  let rawUtilization = extractRawUtilization(headers, unifiedRateLimitFallbackAvailable, r);
  if (rawUtilization) return rawUtilization;
  for (let config of EARLY_WARNING_CONFIGS) {
    if (r && config.rateLimitType === "five_hour") continue;
    let timeRelativeWarning = getTimeRelativeEarlyWarning(headers, config, unifiedRateLimitFallbackAvailable);
    if (timeRelativeWarning) return timeRelativeWarning;
  }
  return null;
}
//@ chunk-w5ndchqs.js:31528-32905 fingerprint = computeNewLimitsFromHeaders (0.744)
/**
 * 从 anthropic-ratelimit-unified-* 头计算额度：status、reset、fallback、representative-claim、overage-status/reset/disabled-reason/scope、upgrade-paths、月度/频道利用率、宽限；附带早期预警与各窗口读数。
 */
function computeNewLimitsFromHeaders(headers, n) {
  let r = headers.get("anthropic-ratelimit-unified-status") || "allowed";
  let resetsAtHeader = headers.get("anthropic-ratelimit-unified-reset");
  let resetsAt = resetsAtHeader ? Math.round(Number(resetsAtHeader)) : undefined;
  let unifiedRateLimitFallbackAvailable = headers.get("anthropic-ratelimit-unified-fallback") === "available";
  let rateLimitType = headers.get("anthropic-ratelimit-unified-representative-claim");
  let overageStatus = headers.get("anthropic-ratelimit-unified-overage-status");
  let overageResetsAtHeader = headers.get("anthropic-ratelimit-unified-overage-reset");
  let overageResetsAt = overageResetsAtHeader ? Math.round(Number(overageResetsAtHeader)) : undefined;
  let overageDisabledReason = headers.get("anthropic-ratelimit-unified-overage-disabled-reason");
  let R = overageScopeHeader(headers);
  let U = headers.get(OVERAGE_IN_USE_HEADER) === "true";
  let lowPriorityOffer = parseLowPriorityOffer(headers);
  let E = headers.get("anthropic-ratelimit-unified-upgrade-paths");
  let C = E ? E.split(",").map((lt) => lt.trim()) : undefined;
  let P = headers.get("anthropic-ratelimit-unified-overage-period-monthly-utilization");
  let O = P ? Number(P) : NaN;
  let I = Number.isFinite(O)
    ? {
        utilization: O,
      }
    : undefined;
  let z = headers.get("anthropic-ratelimit-unified-overage-period-channel-utilization");
  let k = z ? Number(z) : NaN;
  let Q = Number.isFinite(k)
    ? {
        utilization: k,
      }
    : undefined;
  let Ee = {
    status: r === "allowed_warning" ? "allowed" : r,
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
    ...(R && {
      overageScope: R,
    }),
    ...(C && {
      upgradePaths: C,
    }),
    isUsingOverage: r === "rejected" && (overageStatus === "allowed" || overageStatus === "allowed_warning"),
    ...(U && {
      overageInUse: U,
    }),
    ...(I && {
      overagePeriodMonthly: I,
    }),
    ...(Q && {
      overagePeriodChannel: Q,
    }),
    ...(n && {
      rateLimitGraceActive: true,
    }),
    ...lowPriorityOffer,
  };
  let headerBasedEarlyWarning = getHeaderBasedEarlyWarning(headers);
  return {
    base: Ee,
    own: withEarlyWarning(Ee, headerBasedEarlyWarning),
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
function refreshLimitsFromHeaders(e, n) {
  return computeNewLimitsFromHeaders(e, n).own;
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
  let { resetsAt, rateLimitType, utilization, surpassedThreshold, upgradePaths, ...h } = currentLimits;
  return {
    ...h,
    status: "allowed",
  };
}
//@ chunk-w5ndchqs.js:33808-34257 placement
function creditsRequiredDetails(e) {
  let details = e.error?.error?.details;
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
function cacheExtraUsageDisabledReason(e, storage) {
  if (getGlobalConfig().cachedExtraUsageDisabledReason !== e)
    saveGlobalConfig(
      (r) => ({
        ...r,
        cachedExtraUsageDisabledReason: e,
      }),
      storage,
    );
}
//@ chunk-w5ndchqs.js:34371-34489 fingerprint = cacheExtraUsageDisabledReason (0.61)
/**
 * 缓存 overage-disabled-reason（网关模式除外）。
 */
function cacheExtraUsageDisabledReason_2(e, n) {
  if (getAPIProvider() === "gateway") return;
  cacheExtraUsageDisabledReason(e.get("anthropic-ratelimit-unified-overage-disabled-reason") ?? null, n);
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
  isFromPreviousAccount(e) {
    return e !== undefined && e !== this.accountEpoch;
  }
  isStaleObservation(e) {
    if (e < this.lastAppliedObservationAtMs) return true;
    this.lastAppliedObservationAtMs = e;
    this.limitsObserved = true;
    return false;
  }
  applyWindowReadings(e, n, r, s) {
    let { overageDisabledReason } = n;
    if (
      overageDisabledReason !== undefined &&
      overageDisabledReason !== "fetch_error" &&
      overageDisabledReason !== "unknown"
    )
      this.retireWindows(["overage"], r);
    if (!s) {
      this.rawUtilization = pickWindowReadings(e);
      this.rawWindowLevels = {};
      for (let [m] of UNIFIED_WINDOW_HEADER_KEYS) {
        let { status, surpassedThreshold } = e[m] ?? {};
        if (status !== undefined || surpassedThreshold !== undefined)
          this.rawWindowLevels[m] = {
            ...(status !== undefined && {
              status,
            }),
            ...(surpassedThreshold !== undefined && {
              surpassedThreshold,
            }),
          };
      }
    }
    this.recordSeenWindows(e, n, r);
  }
  recordSeenWindows(e, { upgradePaths, unifiedRateLimitFallbackAvailable }, s) {
    let d = pickWindowReadings(e);
    for (let [m] of UNIFIED_WINDOW_HEADER_KEYS) {
      if (this.isRetiredReading(m, s)) continue;
      let h = d[m];
      let y = this.lastSeenWindows[m];
      if (isValidUtilization(h) && (y === undefined || s >= y.observedAtMs)) {
        let surpassedThreshold = e[m]?.surpassedThreshold;
        this.lastSeenWindows[m] = {
          ...h,
          observedAtMs: s,
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
  currentWindows(e) {
    let n = this.lastAppliedObservationAtMs - EARLY_WARNING_COOLDOWN_MS;
    let r = {};
    for (let [s] of UNIFIED_WINDOW_HEADER_KEYS) {
      let d = this.lastSeenWindows[s];
      if (d !== undefined && d.observedAtMs >= n && isUtilizationEntryUsable(d, e)) r[s] = d;
    }
    return r;
  }
  deriveTrackedLimits(previous, n, r, s) {
    if (previous.status !== "allowed") return previous;
    let d = isShardedQuotaEnabled();
    let m = d ? this.currentWindows(s) : {};
    let h = {};
    let headers = {};
    for (let [L] of UNIFIED_WINDOW_HEADER_KEYS) {
      let x = m[L];
      if (
        x !== undefined &&
        x.utilization < 1 &&
        (x.surpassedThreshold === undefined || x.surpassedThreshold < 1)
      )
        headers[L] = x;
      let R = n[L];
      if (R !== undefined && hasReadingSignal(R) && !(d && this.isRetiredReading(L, r))) {
        h[L] = R;
        headers[L] = R;
      }
    }
    let limits = getEarlyWarningFromHeaders(headers, previous.unifiedRateLimitFallbackAvailable);
    if (!limits) return previous;
    for (let [L] of UNIFIED_WINDOW_HEADER_KEYS) {
      let x = m[L];
      if (L === limits.rateLimitType && h[L] === undefined && x !== undefined)
        return carryOverageFields(
          {
            ...limits,
            unifiedRateLimitFallbackAvailable: x.unifiedRateLimitFallbackAvailable,
          },
          x.upgradePaths,
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
  forgetHeldWindows(e) {
    let now = Date.now();
    this.retireWindows(e, now);
    for (let [d] of UNIFIED_WINDOW_HEADER_KEYS)
      if (e === undefined || e.includes(d)) delete this.rawWindowLevels[d];
    let { status, rateLimitType } = this.currentLimits;
    if (
      isShardedQuotaEnabled() &&
      status === "allowed_warning" &&
      rateLimitType !== undefined &&
      (e === undefined || e.includes(rateLimitType))
    ) {
      let d = this.deriveTrackedLimits(toAllowedLimits(this.currentLimits), {}, now, now);
      if (!En(this.currentLimits, d))
        try {
          this.emitStatusChange(d);
        } catch (error) {
          logError(error);
        }
    }
  }
  isRetiredReading(e, n) {
    let r = this.retiredAtMs[e];
    return r !== undefined && n <= r;
  }
  retireWindows(e, n) {
    for (let [r] of UNIFIED_WINDOW_HEADER_KEYS) {
      if (e !== undefined && !e.includes(r)) continue;
      let s = this.retiredAtMs[r];
      if (s === undefined || n > s) this.retiredAtMs[r] = n;
      let d = this.lastSeenWindows[r];
      if (d !== undefined && d.observedAtMs <= n) delete this.lastSeenWindows[r];
    }
  }
  emitStatusChange(e) {
    let currentLimits = this.currentLimits;
    this.currentLimits = e;
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
    this.statusChanged.emit(e);
    if (currentLimits.status === e.status && currentLimits.isUsingOverage === e.isUsingOverage) return;
    let hoursTillReset = Math.round(((e.resetsAt ? e.resetsAt - Date.now() / 1000 : 0) / 3600) * 10) / 10;
    logEvent("tengu_claudeai_limits_status_changed", {
      status: fromEnum(e.status),
      previousStatus: fromEnum(currentLimits.status),
      rateLimitType: fromEnumOpt(e.rateLimitType),
      isUsingOverage: e.isUsingOverage,
      unifiedRateLimitFallbackAvailable: e.unifiedRateLimitFallbackAvailable,
      hoursTillReset,
    });
  }
  restoreLimits(e, limitsObserved) {
    this.currentLimits = e;
    this.limitsObserved = limitsObserved;
    this.statusChanged.emit(e);
  }
  async probeQuotaStatus(e, credentials, r) {
    if (isEssentialTrafficOnly()) return null;
    if (!isLimitsDisplayEnabled(isClaudeAISubscriber())) return null;
    if (getIsNonInteractiveSession()) return null;
    let accountEpoch = this.accountEpoch;
    try {
      let testQuery = await makeTestQuery(e, credentials);
      let m = this.extractQuotaStatusFromHeaders(testQuery.headers, e, false, Date.now(), accountEpoch, r);
      if (this.isFromPreviousAccount(accountEpoch)) return null;
      return (
        m ??
        refreshLimitsFromHeaders(maybeMockRateLimitHeaders(testQuery.headers), this.wrapUp.getZone() !== null)
      );
    } catch (error) {
      if (error instanceof APIError)
        this.extractQuotaStatusFromError(error, "other", Date.now(), accountEpoch, r);
      return null;
    }
  }
  extractQuotaStatusFromHeaders(e, n, r = false, s = Date.now(), d, m) {
    if (this.isFromPreviousAccount(d)) return null;
    let h = isClaudeAISubscriber();
    if (!isLimitsDisplayEnabled(h)) {
      this.rawUtilization = {};
      this.rawWindowLevels = {};
      this.lastSeenWindows = {};
      if (
        this.currentLimits.status !== "allowed" ||
        this.currentLimits.resetsAt ||
        this.currentLimits.rateLimitGraceActive
      ) {
        let S = {
          status: "allowed",
          unifiedRateLimitFallbackAvailable: false,
          isUsingOverage: false,
        };
        this.emitStatusChange(S);
      }
      return null;
    }
    let y = maybeMockRateLimitHeaders(e);
    let zone = this.wrapUp.getZone();
    let { base, own, readings } = computeNewLimitsFromHeaders(y, zone !== null);
    cacheExtraUsageDisabledReason_2(y, m);
    handleLowPriorityResponseHeaders(y, s);
    if (r && !this.longContext1mOkLogged) {
      this.longContext1mOkLogged = true;
      logFeatureOk("context_1m_entitlement");
    }
    let U = this.isStaleObservation(s);
    this.applyWindowReadings(readings, base, s, U);
    if (!U) {
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
        let C = earlyWarningThresholdFor(getRateLimitTier());
        if (fiveHour.utilization >= C && !isLowPriorityActive()) {
          if (base.overageStatus === "allowed" || base.overageStatus === "allowed_warning")
            this.pendingNearLimitWrapUpHint = false;
          else if (this.nearLimitWrapUpWindowKey !== fiveHour.resets_at) {
            this.pendingNearLimitWrapUpHint = true;
            this.nearLimitWrapUpWindowKey = fiveHour.resets_at;
          }
        }
      }
      let E = this.deriveTrackedLimits(base, readings, s, Date.now());
      if (!En(this.currentLimits, E)) this.emitStatusChange(E);
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
          this.emitStatusChange(E);
      }
    } else {
      let { rateLimitGraceActive, ...limits } = this.currentLimits;
      let C = {
        ...(zone !== null && limits.status === "allowed_warning" ? toSDKRateLimitInfo(limits) : limits),
        ...(zone !== null && {
          rateLimitGraceActive: true,
        }),
      };
      if (!En(this.currentLimits, C) || zone?.extraUsageStatus !== this.lastEmittedGraceExtraUsageStatus)
        this.emitStatusChange(C);
    }
    if (own.overageInUse === true) {
      let S = own.isUsingOverage === true && own.rateLimitType !== "seven_day_overage_included";
      let E = usageCreditsOnlyFamily(n);
      if (
        !S &&
        !r &&
        !isUsageBasedBilling() &&
        E !== undefined &&
        !usesPayAsYouGo() &&
        !isEnterpriseSubscriber() &&
        !hasUsageCreditsConsent(E)
      )
        setUsageCreditsRequired(true);
      this.overageInUse.emit(n, own.isUsingOverage === true, r);
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
  extractGraceStatusFromHeaders(e, n, r = Date.now(), s) {
    if (n && !this.isFromPreviousAccount(s)) this.wrapUp.applyResponse(e, r);
  }
  consumePendingNearLimitWrapUpHint() {
    if (!this.pendingNearLimitWrapUpHint) return false;
    this.pendingNearLimitWrapUpHint = false;
    return !isLowPriorityActive();
  }
  beginUsageLimitWait(e) {
    this.usageLimitWaits.add(e);
    this.emitUsageLimitWaitsChanged();
    return () => {
      if (this.usageLimitWaits.delete(e)) this.emitUsageLimitWaitsChanged();
    };
  }
  emitUsageLimitWaitsChanged() {
    try {
      this.usageLimitWaitsChanged.emit();
    } catch (error) {
      logError(error);
    }
  }
  extractQuotaStatusFromError(e, n, r = Date.now(), s, d) {
    let m = e.status === undefined && isExtraUsageOutOfCredits(e) && isValiantFinchEnabled();
    if (
      this.isFromPreviousAccount(s) ||
      !isLimitsDisplayEnabled(isClaudeAISubscriber()) ||
      (e.status !== 429 && !m)
    )
      return;
    if (getAPIProvider() === "gateway" && !e.headers?.get?.("anthropic-ratelimit-unified-status")) return;
    try {
      let h = this.isStaleObservation(r);
      let status = this.currentLimits.status;
      let isUsingOverage = this.currentLimits.isUsingOverage;
      let utilization = this.rawUtilization.five_hour?.utilization;
      let utilization_2 = this.rawUtilization.seven_day?.utilization;
      let utilization_3 = this.rawUtilization.overage?.utilization;
      let U = {
        ...this.currentLimits,
      };
      if (e.headers) {
        let E = maybeMockRateLimitHeaders(e.headers);
        let newLimitsFromHeaders = computeNewLimitsFromHeaders(E, this.wrapUp.getZone() !== null);
        U = newLimitsFromHeaders.own;
        this.applyWindowReadings(newLimitsFromHeaders.readings, newLimitsFromHeaders.base, r, h);
        if (!m) cacheExtraUsageDisabledReason_2(E, d);
        else if (getAPIProvider() !== "gateway") cacheExtraUsageDisabledReason("out_of_credits", d);
        if (E.get("anthropic-ratelimit-unified-status") !== null) this.wrapUp.onRefused();
      }
      U = buildRejectedLimits(U, e);
      if (m) {
        let { overageInUse, ...C } = U;
        U = {
          ...C,
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
        !m
      ) {
        let E =
          U.rateLimitType === "five_hour"
            ? utilization
            : U.rateLimitType?.startsWith("seven_day")
              ? utilization_2
              : U.rateLimitType === "overage"
                ? utilization_3
                : Math.max(utilization ?? 0, utilization_2 ?? 0, utilization_3 ?? 0);
        if (E === undefined || E < 0.8)
          logEvent("tengu_quota_mismatch", {
            priorStatus: fromEnum(status),
            priorIsUsingOverage: isUsingOverage,
            priorFiveHourUtilization: utilization,
            priorSevenDayUtilization: utilization_2,
            priorOverageUtilization: utilization_3,
            rateLimitType: fromEnumOpt(U.rateLimitType) ?? undefined,
            subscriptionType: fromEnumOpt(getSubscriptionType()) ?? undefined,
            hadPriorUtilizationData:
              utilization !== undefined || utilization_2 !== undefined || utilization_3 !== undefined,
          });
      }
      if (!h)
        try {
          this.quotaRejected.emit(U, n);
        } catch (error) {
          logError(error);
        }
      if (!h && !En(this.currentLimits, U)) this.emitStatusChange(U);
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
//@ chunk-w5ndchqs.js:47625-47776 placement
/**
 * 取当前各统一限额窗口的使用率与重置时间。
 */
function currentUsageWindows() {
  let e = claudeAiLimits.currentWindows(Date.now());
  let n = {};
  for (let [r] of UNIFIED_WINDOW_HEADER_KEYS) {
    let s = e[r];
    if (s)
      n[r] = {
        utilization: s.utilization,
        resets_at: s.resets_at,
      };
  }
  return n;
}
//@ chunk-w5ndchqs.js:47776-47879 placement
function liveWindowsOf(rawUtilization) {
  let now = Date.now();
  let r = {};
  for (let [s] of UNIFIED_WINDOW_HEADER_KEYS) {
    let d = rawUtilization[s];
    if (d !== undefined && isUtilizationEntryUsable(d, now)) r[s] = d;
  }
  return r;
}
//@ chunk-w5ndchqs.js:47879-47966 placement
/**
 * 判断一条使用率观测是否可用于当前窗口：resets_at 在 now 之后一年内。
 */
function isUtilizationEntryUsable(e, n) {
  let r = n / 1000;
  let s = r + 31536000;
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
function restoreLimits(limits, limitsObserved) {
  claudeAiLimits.restoreLimits(limits, limitsObserved);
}
//@ chunk-w5ndchqs.js:48554-48614 placement
async function probeQuotaStatusAtStart(e, n) {
  await claudeAiLimits.probeQuotaStatus(getBareCheckModel(), e, n);
}
//@ chunk-w5ndchqs.js:48614-48667 placement
function probeQuotaStatus(mainLoopModel, n, storageV5) {
  return claudeAiLimits.probeQuotaStatus(mainLoopModel, n, storageV5);
}
//@ chunk-w5ndchqs.js:48667-48759 placement
function extractQuotaStatusFromHeaders(
  headers,
  model,
  r = false,
  s = Date.now(),
  limitsAccountEpoch,
  storageV5,
) {
  return claudeAiLimits.extractQuotaStatusFromHeaders(headers, model, r, s, limitsAccountEpoch, storageV5);
}
//@ chunk-w5ndchqs.js:48759-48835 placement
function extractQuotaStatusFromError(e, requestRouteKind, r = Date.now(), s, storageV5) {
  claudeAiLimits.extractQuotaStatusFromError(e, requestRouteKind, r, s, storageV5);
}
//@ chunk-w5ndchqs.js:48918-48976 affinity = extractQuotaStatusFromError (1)
/**
 * 构造 rejected 额度状态（合并错误里的字段）。旧版名错配。
 */
function buildRejectedLimits(e, n) {
  return {
    ...e,
    status: "rejected",
    ...creditsRequiredDetails(n),
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
function extractGraceStatusFromHeaders(headers, n, r = Date.now(), limitsAccountEpoch) {
  claudeAiLimits.extractGraceStatusFromHeaders(headers, n, r, limitsAccountEpoch);
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
  let n = shouldContinueAfterWrapUp(limits);
  return n === null
    ? null
    : {
        status: "rejected",
        resetsAt: n.resetsAt,
        rateLimitType: n.rateLimitType,
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
function overageScopeHeader(e) {
  let n = e?.get?.(OVERAGE_SCOPE_HEADER);
  if (n === "service" || n === "channel" || n === "group_pool" || n === "organization") return n;
  return;
}
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
var mockRateLimitStateSlot = new HostScoped(() => new MockRateLimitState());
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
function applyMockQuotaHeaders(e) {
  let n = checkQuotaStatus();
  if (!n) return e;
  let r = new globalThis.Headers(e);
  r.delete("anthropic-ratelimit-unified-5h-status");
  r.delete("anthropic-ratelimit-unified-7d-status");
  Object.entries(n).forEach(([key, value]) => {
    if (value !== undefined) r.set(key, value);
  });
  return r;
}
//@ chunk-aepeg2w5.js:288684-288708 placement
/**
 * 限额模拟（外部构建恒为 false）。
 */
function isRateLimitMockingEnabled() {
  return false;
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
function expireStaleLimits(e, n = Date.now() / 1000) {
  let s = dropExpiredWindows(e, n);
  let y = e.resetsAt !== undefined && e.resetsAt <= n;
  let r = e.overageResetsAt !== undefined && e.overageResetsAt <= n;
  let S = e.status === "rejected" && e.overageStatus === "rejected" && r;
  if (y || S)
    return {
      info: {
        ...currentLimits,
        ...(s.unifiedWindows !== undefined && {
          unifiedWindows: s.unifiedWindows,
        }),
      },
      degradation: "clear",
    };
  if (r) {
    let { overageStatus, overageResetsAt, overageDisabledReason, limitScope, adminRequestOffer, ...I } = s;
    return {
      info: {
        ...I,
        isUsingOverage: I.isUsingOverage ?? false,
      },
      degradation: "overage_strip",
    };
  }
  return {
    info: s,
    degradation: "none",
  };
}
//@ chunk-0h4e7gnq.js:49100-49182 affinity
/**
 * 取限额窗口列表最后一项的当前状态（Sd）。
 */
function getLatestLimitStatus(e, n = Date.now() / 1000) {
  let last = e.at(-1);
  return last === undefined ? undefined : expireStaleLimits(last, n);
}
//@ chunk-0h4e7gnq.js:49444-49499 placement
/**
 * 对象非空时原样返回，空对象返回 undefined。
 */
function nonEmptyObjectOrUndefined(e) {
  return Object.keys(e).length > 0 ? e : undefined;
}
//@ chunk-0h4e7gnq.js:49499-49711 placement
function dropExpiredWindows(e, n) {
  let { unifiedWindows, ...y } = e;
  if (unifiedWindows === undefined) return e;
  let r = pickByHelper(unifiedWindows, (h) => h !== undefined && h.resetsAt > n);
  let S = Object.keys(r).length;
  if (S === 0) return y;
  return S === Object.keys(unifiedWindows).length
    ? e
    : {
        ...y,
        unifiedWindows: r,
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
