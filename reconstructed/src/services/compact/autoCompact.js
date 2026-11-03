/**
 * services/compact/autoCompact.ts
 *
 * 自动压缩的阈值计算：有效上下文窗口（env/settings/服务端/实验/模型默认）、压缩阈值与警告/阻断等级、是否该自动压缩、快速回填熔断。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/compact/autoCompact.ts
 * pieces: chunk-9m4wzd68.js (5), chunk-e6aww6q8.js (35)
 * attribution: placement 26, fingerprint 3, callgraph-witnessed 1, sole-consumer 1, callgraph-fingerprint 1, layout 8
 */
import { Lg } from "../tokenEstimation.js";
import {
  getTokenCountFromUsage_2 as getTokenCountFromUsage_2_2,
  getTokenCountFromUsage as getTokenCountFromUsage_5,
  totalTokensOf,
} from "../../utils/messages/usageAndStopReason.js";
import { isCompactBoundaryMessage as isCompactBoundaryMessage_3 } from "../projects/threadRows.js";
import { getTokenUsage, getAssistantMessageApiId } from "../../utils/tokens.js";
import { normalizeMessagesForAPI, API_REQUEST_ABORTED_MESSAGE } from "../../utils/messages.js";
import { shouldEchoWireToolInputs } from "../../utils/wireToolInputEcho.js";
import { isStellarDriftEnabled } from "../../utils/api.js";
import { SYNTHETIC_MODEL } from "../../constants/messages.js";
import {
  getLastMainThreadRequestAt,
  getLastMainThreadCacheRenewedAt,
  getLastMainThreadCacheTtlMs,
  getSdkBetas,
} from "../../bootstrap/state.js";
import { getPromptCacheSummary } from "../api/promptCacheBreakDetection.js";
import { Stream } from "../../utils/stream.js";
import {
  $8n,
  envWindowTokens,
  resolveAutoCompactWindow,
  resolvePrecomputeFraction,
  autocompactThreshold,
  effectiveContextWindow,
  computeTokenWarning,
  gke,
  abe,
  J4e,
  usesLongContextWindow,
  fse,
  logWindowInForce,
  resolveWindowOrigin,
  a6e,
} from "./autoCompactWindow.js";
import { env } from "../../utils/env.js";
import {
  isAutoCompactEnabled,
  canCompactInRemote,
  nnr,
  isCompactCommand,
  isCompactQuerySource,
  MYr,
  vri,
  _ri,
} from "./compactSettings.js";
import { CK } from "../../utils/model/model.js";
import { isOver1mThreshold } from "../../utils/model/configs.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { parseIntLoose, isEnvTruthy } from "../../utils/envUtils.js";
import { getEffectiveContextWindow } from "../../entrypoints/sdk/coreSchemas.js";
import { stripInProgressAssistantMessage } from "../../commands/btw/btw.js";
import { logForDebugging } from "../../utils/debug.js";
import { logEvent } from "../analytics/index.js";
import { agentTypeForTelemetry } from "../analytics/metadata.js";
import { fromEnum, lit as lit_2 } from "../analytics/safeMetadata.js";
import { ye } from "../../utils/startupMarks.js";
import { getModelContextInfo } from "../../utils/model/modelContextInfo.js";
import { usageCreditsOnlyFamily } from "../../utils/model/modelDisplay.js";
import {
  D2,
  isEnterpriseSubscriber as isEnterpriseSubscriber_2,
  hasUsageCreditsConsent,
  hasExtraUsageProvisioned,
} from "../../utils/planTiers.js";
import { isModelAllowed } from "../../utils/model/modelAllowlist.js";
import { isAutoResumableLimit } from "../api/errors.js";
import { getCurrentLimits } from "../claudeAiLimits.js";
import { isMainQuerySource } from "../api/requestHeaders.js";
import { Oje } from "../../bootstrap/sessionSlices.js";
import { isNoModelFallbackEnabled } from "../../utils/model/modelFallback.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import {
  hzr,
  analyzeOversizedPrefix,
  gzr,
  autocompactFailure,
  tpr,
  compactConversation,
  COMPACTION_BLOCKED_BY_HOOK,
  ERROR_MESSAGE_NOT_ENOUGH_MESSAGES,
  Lln,
  ERROR_MESSAGE_PROMPT_TOO_LONG,
  createClassifierOverflowReminder,
} from "./compact.js";
import { hfe, cleanupAfterCompaction } from "./postCompactCleanup.js";
import { createChildAbortController, armRecoveryCeiling } from "../../utils/abortController.js";
import { triggerReactiveCompact } from "./reactiveCompact.js";
import { errorMessage, hasExactErrorMessage, withTelemetryMessage, toError } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { formatTokens } from "../../utils/format.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { syncCompactEligibility, markCompactRequestSpent } from "../../utils/permissions/permissions.js";
import { isAutoClassifierActive } from "../../utils/permissions/autoModeState.js";
import { uniq } from "../../utils/collections.js";

//@ chunk-e6aww6q8.js:1536673-1536771 placement
function Tp(e, n) {
  let r = findLastUsageAnchor(e);
  if (!r) return Lg(e, n);
  return r.tokens + Lg(e.slice(r.anchorIndex + 1), n);
}
//@ chunk-e6aww6q8.js:1536771-1536810 placement
function hasNoUsage(e) {
  return getTokenCountFromUsage_2_2(getTokenCountFromUsage_5(e)) === 0;
}
/**
 * 从尾部找最近一条带用量的助手消息（同一 API 回复的多条取最前），返回 token 数与位置；遇到压缩边界返回 0。
 */
//@ chunk-e6aww6q8.js:1537121-1537423 placement
function findLastUsageAnchor(e) {
  let n = e.length - 1;
  while (n >= 0) {
    let r = e[n];
    if (r && isCompactBoundaryMessage_3(r)) return { tokens: 0, anchorIndex: n };
    let s = r ? getTokenUsage(r) : void 0;
    if (r && s && !hasNoUsage(s)) {
      let h = getAssistantMessageApiId(r);
      if (h) {
        let y = n - 1;
        while (y >= 0) {
          let S = e[y],
            w = S ? getAssistantMessageApiId(S) : void 0;
          if (w === h) n = y;
          else if (w !== void 0) break;
          y--;
        }
      }
      return { tokens: totalTokensOf(s), anchorIndex: n };
    }
    n--;
  }
  return null;
}
//@ chunk-e6aww6q8.js:1537423-1537497 placement
function j4e(e) {
  let n = findLastUsageAnchor(e);
  return n && n.tokens > 0 ? e[n.anchorIndex] : void 0;
}
//@ chunk-e6aww6q8.js:1537497-1537536 placement
function OSt(e) {
  return j4e(e) !== void 0;
}
/**
 * 估算最近用量锚点之后的消息 token 数。
 */
//@ chunk-e6aww6q8.js:1537536-1537686 placement
function estimateTokensSinceAnchor(e, n) {
  let r = findLastUsageAnchor(e),
    s = r ? e.slice(r.anchorIndex + 1) : [...e];
  return Lg(
    normalizeMessagesForAPI(s, void 0, void 0, {
      echoWireToolInputs: shouldEchoWireToolInputs(e),
      echoApiBlockOrder: isStellarDriftEnabled(),
    }),
    n,
  );
}
//@ chunk-e6aww6q8.js:1542130-1542213 placement
function use(e) {
  return e.findLast((n) => n.type === "assistant" && n.message.model !== SYNTHETIC_MODEL);
}
/**
 * 主线程缓存最近一次变热的时间与 TTL。
 */
//@ chunk-e6aww6q8.js:1542213-1542378 placement
function lastCacheWarmth(e, n) {
  let r = use(e)?.timestamp,
    s = r !== void 0 ? Date.parse(r) : NaN;
  return {
    lastWarmAt: Math.max(
      Number.isFinite(s) ? s : -1 / 0,
      getLastMainThreadRequestAt() ?? -1 / 0,
      getLastMainThreadCacheRenewedAt() ?? -1 / 0,
    ),
    ttlMs: getLastMainThreadCacheTtlMs() ?? n,
  };
}
//@ chunk-e6aww6q8.js:1542378-1542459 placement
function tpn(e, n, r = Date.now()) {
  let { lastWarmAt: lastWarmAt, ttlMs: ttlMs } = lastCacheWarmth(e, n);
  return !(r - lastWarmAt < ttlMs);
}
//@ chunk-e6aww6q8.js:1542459-1542552 placement
function dke() {
  let e = getLastMainThreadCacheTtlMs();
  if (getLastMainThreadRequestAt() === null || e === null) return null;
  return lastCacheWarmth([], e).lastWarmAt + e;
}
/**
 * 主线程提示缓存的预计过期时间。
 */
//@ chunk-e6aww6q8.js:1542552-1542774 placement
function promptCacheExpiresAt(e) {
  let n = getLastMainThreadCacheTtlMs();
  if (getLastMainThreadRequestAt() === null || n === null) return null;
  let r = getPromptCacheSummary();
  if (r.lastRequest === null || r.lastActivityAt === null || r.expiresAt === null) return null;
  let { lastWarmAt: lastWarmAt } = lastCacheWarmth(e, n);
  return Math.max(lastWarmAt, r.lastActivityAt) + n;
}
/**
 * 把压缩函数的事件与通知转为异步生成器，结束时返回结果。
 */
//@ chunk-e6aww6q8.js:1542774-1543002 placement
async function* runCompactionAsStream(e, n) {
  let r = new Stream(),
    s = { ...n, onCompactEvent: (w) => r.enqueue(w) },
    h = (w) => {
      r.enqueue({ type: "notification", notification: w });
    },
    y = (w) => {
      r.enqueue(w);
    },
    S;
  return (
    e(s, h, y).then(
      (w) => {
        ((S = w), r.done());
      },
      (w) => r.error(w),
    ),
    yield* r,
    S
  );
}
/**
 * 计算自动压缩用的有效上下文窗口 {window, configured, source}：嵌套 ceiling 配置取上限；CLAUDE_CODE_AUTO_COMPACT_WINDOW（source=env）；settings 的 autoCompactWindow（可按模型 byModel）；否则走 bUo（clientdata/实验/模型默认/unknown-model/auto）。window 不超过模型上下文窗口。
 */
//@ chunk-e6aww6q8.js:1548685-1549181 callgraph-witnessed = getEffectiveContextWindowSize (0.174)
function getAutoCompactWindow(e, n, r = getSdkBetas()) {
  let { contextWindow: contextWindow } = e;
  if ($8n(n)) {
    let S = getAutoCompactWindow(e, n.inner, r),
      { ceiling: ceiling } = n;
    if (S.window <= ceiling) return S;
    return { window: Math.min(contextWindow, ceiling), configured: ceiling, source: "settings" };
  }
  let h = envWindowTokens(env.CLAUDE_CODE_AUTO_COMPACT_WINDOW);
  if (h !== void 0) return { window: Math.min(contextWindow, h), configured: h, source: "env" };
  let settingsWindow =
    typeof n !== "object"
      ? n
      : Object.hasOwn(n.byModel, e.settingsKey)
        ? n.byModel[e.settingsKey]
        : n.default;
  if (settingsWindow !== void 0 && settingsWindow !== "auto")
    return {
      window: Math.min(contextWindow, settingsWindow),
      configured: settingsWindow,
      source: "settings",
    };
  return resolveAutoCompactWindow(e, r);
}
/**
 * 预计算压缩的缓冲比例：GrowthBook tengu_amber_moleskin 表（按窗口大小、repl/sdk）或标量 tengu_amber_rokovoko（默认 0.2）。
 */
//@ chunk-e6aww6q8.js:1552755-1552802 sole-consumer
function getPrecomputeBufferFraction(e, n, r) {
  return resolvePrecomputeFraction(e, n, r).fraction;
}
/**
 * 自动压缩阈值配置 {enabled, precomputeBufferFraction, testPctOverride, testBlockingOverride}：CLAUDE_AUTOCOMPACT_PCT_OVERRIDE（百分比）、CLAUDE_CODE_BLOCKING_LIMIT_OVERRIDE（阻断 token 数）；远程 200k 窗口下可被 tengu_peppy_gosling 抬高百分比。
 */
//@ chunk-e6aww6q8.js:1552802-1553297 callgraph-fingerprint = getAutoCompactThreshold (0.186)
function getAutoCompactThresholdConfig(e, n, r, s = !0) {
  let envPercent = process.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE,
    envClaudeCodeBlockingLimitOverride = process.env.CLAUDE_CODE_BLOCKING_LIMIT_OVERRIDE,
    S = isAutoCompactEnabled(),
    pctOverride = envPercent ? parseFloat(envPercent) : void 0;
  if (
    pctOverride !== void 0 &&
    pctOverride > 0 &&
    s &&
    S &&
    env.CLAUDE_CODE_REMOTE &&
    e.contextWindow <= CK &&
    !isOver1mThreshold(e.model, getSdkBetas())
  ) {
    let { window: L, source: source } = getAutoCompactWindow(e, n);
    if (L === CK && source !== "auto") {
      let q = getFeatureValue_CACHED_MAY_BE_STALE("tengu_peppy_gosling", 0);
      if (typeof q === "number" && q > pctOverride && q <= 100 && canCompactInRemote() && nnr())
        pctOverride = q;
    }
  }
  return {
    enabled: S,
    precomputeBufferFraction: getPrecomputeBufferFraction(e, n, r),
    testPctOverride: pctOverride,
    testBlockingOverride: envClaudeCodeBlockingLimitOverride
      ? parseIntLoose(envClaudeCodeBlockingLimitOverride)
      : void 0,
  };
}
/**
 * 自动压缩阈值 token 数 = 有效窗口(扣输出预留) − 13000，或按 PCT 覆盖取较小值。
 */
//@ chunk-e6aww6q8.js:1553297-1553342 layout
function getAutoCompactThresholdTokens(e, n) {
  return autocompactThreshold(effectiveContextWindow(e, n), getAutoCompactThresholdConfig(e, n));
}
/**
 * 同上但忽略 CLAUDE_AUTOCOMPACT_PCT_OVERRIDE（远程 fork 判断用）。
 */
//@ chunk-e6aww6q8.js:1553342-1553416 layout
function getAutoCompactThresholdWithoutPctOverride(e, n) {
  return autocompactThreshold(effectiveContextWindow(e, n), {
    ...getAutoCompactThresholdConfig(e, n),
    testPctOverride: void 0,
  });
}
/**
 * 旧版 calculateTokenWarningState：按 token 数返回 {level: ok/warn/compact/blocked, pctLeft}；warn=阈值−20000，blocked=窗口−3000（或 BLOCKING_LIMIT_OVERRIDE）。可传入固定阈值覆盖。
 */
//@ chunk-e6aww6q8.js:1553416-1553684 layout
function calculateTokenWarningState(e, modelFacts, r, fixedThreshold, h = !0) {
  if (fixedThreshold !== void 0)
    return computeTokenWarning(
      e,
      fixedThreshold.effectiveWindow,
      {
        enabled: fixedThreshold.enabled,
        precomputeBufferFraction: gke,
        testPctOverride: void 0,
        testBlockingOverride: void 0,
      },
      getEffectiveContextWindow(modelFacts),
      fixedThreshold.threshold,
    );
  let y = getAutoCompactThresholdConfig(modelFacts, r, void 0, h),
    S = y.enabled ? r : void 0;
  return computeTokenWarning(
    e,
    effectiveContextWindow(modelFacts, S),
    y,
    getEffectiveContextWindow(modelFacts),
  );
}
/**
 * 是否达到“预计算压缩”阈值（阈值减去缓冲比例）；非 auto 窗口来源时 200k 以下窗口不预计算。queryLoop 用它启动后台预压缩。
 */
//@ chunk-e6aww6q8.js:1553684-1553850 layout
function isAtPrecomputeThreshold(e, n, r, s, h = 0) {
  let y = getAutoCompactThresholdConfig(n, r, s),
    S = y.enabled ? r : void 0,
    w = effectiveContextWindow(n, S);
  if (!abe(n, r)) return e >= J4e(w, y);
  let { window: L } = getAutoCompactWindow(n, S);
  if (L < CK) return !1;
  return e + h >= J4e(w, y);
}
/**
 * 3：压缩后 3 轮内又需要压缩算一次“快速回填”。
 */
//@ chunk-e6aww6q8.js:1553850-1553860 layout
var RAPID_REFILL_TURN_WINDOW = 3;
/**
 * 上次压缩后不到 3 轮又触发时连续计数 +1，否则归零。
 */
//@ chunk-e6aww6q8.js:1553860-1553954 layout
function countConsecutiveRapidRefills(e) {
  return e?.compacted === !0 && e.turnCounter < 3 ? (e?.consecutiveRapidRefills ?? 0) + 1 : 0;
}
/**
 * 连续快速回填 ≥3 次返回 action:"trip"（autocompact 返回 rapid_refill_breaker_tripped，queryLoop 停止本轮），否则 proceed。
 */
//@ chunk-e6aww6q8.js:1553954-1554046 layout
function checkRapidRefillBreaker(e) {
  let n = countConsecutiveRapidRefills(e);
  return { action: n >= 3 ? "trip" : "proceed", consecutiveRapidRefills: n };
}
/**
 * 压缩成功后的跟踪状态 {compacted:true, turnId, turnCounter:0, consecutiveFailures:0, consecutiveRapidRefills}。旧版名 autoCompactIfNeeded 为错配。
 */
//@ chunk-e6aww6q8.js:1554046-1554156 fingerprint = autoCompactIfNeeded (0.387)
function createCompactTracking(e, n) {
  return { compacted: !0, turnId: e, turnCounter: 0, consecutiveFailures: 0, consecutiveRapidRefills: n };
}
/**
 * 自动压缩反复触发（3 回合内重新填满，连续 3 次）的提示。
 */
//@ chunk-e6aww6q8.js:1554156-1554437 placement
var AUTOCOMPACT_THRASHING_TEXT =
    "Autocompact is thrashing: the context refilled to the limit within 3 turns of the previous compact, 3 times in a row.",
  AUTOCOMPACT_THRASHING_NOTICE = `${AUTOCOMPACT_THRASHING_TEXT} A file being read or a tool output is likely too large for the context window. Try reading in smaller chunks, or use /clear to start fresh.`;
/**
 * 是否需要自动压缩：compact 自身/特定来源/自动压缩关闭时为 false；token = 估算上下文 − snip 节省 + 服务端已清理量，calculateTokenWarningState 为 compact 或 blocked 时为 true；远程 fork 忽略 PCT 覆盖再判一次。
 */
//@ chunk-e6aww6q8.js:2443672-2444540 fingerprint = shouldAutoCompact (0.312)
async function shouldAutoCompact(messages, modelFacts, autoCompactWindow, querySource, h = 0, y, S = !1) {
  if (isCompactCommand(querySource)) return !1;
  if (isCompactQuerySource(querySource)) return !1;
  if (usesLongContextWindow(querySource, modelFacts, autoCompactWindow)) return !1;
  if (!isAutoCompactEnabled()) return !1;
  if (canCompactInRemote() && !abe(modelFacts, autoCompactWindow) && !S) return !1;
  let serverClearedTokens = stripInProgressAssistantMessage(messages),
    tokenCount = Tp(messages, modelFacts.bytesPerToken) - h + serverClearedTokens,
    threshold = j4e(messages),
    warningState = calculateTokenWarningState(
      tokenCount,
      modelFacts,
      autoCompactWindow,
      void 0,
      threshold?.type === "assistant" && !threshold.handedOff,
    );
  if (
    (logForDebugging(
      `autocompact: tokens=${tokenCount} level=${warningState.level} effectiveWindow=${effectiveContextWindow(modelFacts, autoCompactWindow)}${serverClearedTokens > 0 ? ` serverCleared=${serverClearedTokens}` : ""}`,
    ),
    warningState.level === "compact" && env.CLAUDE_CODE_REMOTE && MYr(querySource))
  ) {
    let thresholdWithoutOverride = getAutoCompactThresholdWithoutPctOverride(modelFacts, autoCompactWindow);
    if (tokenCount < thresholdWithoutOverride) {
      let Se = vri();
      if (
        (logEvent("tengu_fork_early_compact", {
          skipped: Se,
          querySource: agentTypeForTelemetry(querySource),
          tokenCount: tokenCount,
          overrideThreshold: getAutoCompactThresholdTokens(modelFacts, autoCompactWindow),
          thresholdWithoutOverride: thresholdWithoutOverride,
          thresholdSource: fromEnum(fse(modelFacts, autoCompactWindow)),
          queryChainId: ye(y?.chainId),
          queryDepth: y?.depth,
        }),
        Se)
      )
        return (
          logForDebugging(
            `autocompact: not compacting the ${querySource} fork: it ignores CLAUDE_AUTOCOMPACT_PCT_OVERRIDE, and ${tokenCount} tokens is under the threshold without it (${thresholdWithoutOverride})`,
          ),
          !1
        );
    }
  }
  return warningState.level === "compact" || warningState.level === "blocked";
}
/**
 * 为 /compact 报告生成阈值快照（阈值、窗口、当前 token、压缩前 token、摘要与计量函数）；窗口来源为 auto 时返回 undefined。
 */
//@ chunk-e6aww6q8.js:2444540-2444827 layout
function getCompactThresholdSnapshot(e, n, r, s) {
  let h = getModelContextInfo(r),
    y = isAutoCompactEnabled() ? s : void 0,
    { window: S, source: source } = getAutoCompactWindow(h, y);
  if (source === "auto") return;
  return {
    thresholdTokens: getAutoCompactThresholdTokens(h, y),
    windowTokens: S,
    liveTokens: Tp(n, h.bytesPerToken) + stripInProgressAssistantMessage(n),
    madeFromTokens: e.preCompactTokens,
    summary: e.result.summaryMessages,
    sizeOf: (L) => Lg(L, h.bytesPerToken),
  };
}
//@ chunk-e6aww6q8.js:2444827-2444918 placement
function xjo(e) {
  return (
    !isEnvTruthy(process.env.DISABLE_COMPACT) &&
    isAutoCompactEnabled() &&
    e !== void 0 &&
    !isCompactCommand(e) &&
    !isCompactQuerySource(e)
  );
}
//@ chunk-e6aww6q8.js:2444918-2444992 placement
function opr(e) {
  let n = usageCreditsOnlyFamily(e);
  return (
    n === void 0 ||
    D2() ||
    isEnterpriseSubscriber_2() ||
    (hasUsageCreditsConsent(n) && hasExtraUsageProvisioned())
  );
}
/**
 * 上下文将被阻断且请求的模型窗口更大时，返回可切换的模型。
 */
//@ chunk-e6aww6q8.js:2444992-2445326 placement
function findLargerWindowModel(e, n, r, s = 0) {
  let last = e.findLast((w) => getTokenUsage(w) !== void 0),
    y = last?.type === "assistant" ? last.requestedModel : void 0;
  if (typeof y !== "string" || !OSt(e)) return;
  let S = getModelContextInfo(y);
  return S.recognized &&
    S.contextWindow > r.contextWindow &&
    calculateTokenWarningState(
      Tp(e, r.bytesPerToken) - s + stripInProgressAssistantMessage(e),
      r,
      n.options.autoCompactWindow,
    ).level === "blocked" &&
    isModelAllowed(y) &&
    opr(y) &&
    !isAutoResumableLimit(getCurrentLimits())
    ? y
    : void 0;
}
/**
 * 需要时执行自动压缩，返回已压缩、被钩子阻止、不需要或失败等结果。
 */
//@ chunk-e6aww6q8.js:2445326-2450031 placement
async function* runAutoCompactIfNeeded(e, n, r, s, h, y, S, w, L = !1) {
  let { model: model } = r,
    autoCompactWindow = n.options.autoCompactWindow;
  if (
    w !== void 0 &&
    h !== void 0 &&
    isMainQuerySource(h) &&
    n.session.precompute.get(Oje(n.agentId))?.armTrigger === "idle"
  ) {
    let At = yield* runIdleCompaction(e, n, r, s, h, y, w);
    if (At !== void 0) return At;
  }
  let Z = s.model !== void 0,
    Se = (y?.consecutiveFailures ?? 0) > 0,
    ke = Z || Se || isNoModelFallbackEnabled() ? void 0 : findLargerWindowModel(e, n, r, S),
    we;
  if (ke !== void 0) {
    let At = yield* runAutoCompactIfNeeded(
      e,
      { ...n, compactionApiAttemptsLeft: { count: 1 } },
      r,
      { ...s, model: ke },
      h,
      y,
      S,
      w,
      L,
    );
    if (At.kind === "compacted") logFeatureOk("compact_larger_model");
    else if (At.kind === "failed")
      (logFeatureSad("compact_larger_model", At.compactFailure?.reason ?? "failed"),
        (we = At.consecutiveFailures));
    if (At.kind === "compacted" || At.kind === "hook_blocked" || n.abortController.signal.aborted) return At;
  }
  let Ee = isEnvTruthy(process.env.DISABLE_COMPACT),
    Ae = xjo(h),
    Ie = L && !canCompactInRemote(),
    Me = Ie ? void 0 : pendingClassifierOverflow(n, e, Ae && !usesLongContextWindow(h, r, autoCompactWindow));
  if (Ee) return { kind: "not_needed" };
  if (Me === void 0 && y?.consecutiveFailures !== void 0 && y.consecutiveFailures >= hzr)
    return { kind: "failure_breaker_open" };
  let We =
    Me !== void 0 ||
    (Ie && Ae) ||
    (await shouldAutoCompact(e, r, autoCompactWindow, h, S, n.queryTracking, Z));
  if (Ae && hfe(h, n.agentId)) logWindowInForce(n.session, r, autoCompactWindow);
  if (!We) return { kind: "not_needed", consecutiveFailures: we };
  let ze = analyzeOversizedPrefix(e, r, autoCompactWindow, S);
  if (ze)
    (logForDebugging(
      `autocompact: fixed prefix ~${ze.prefixTokens} > threshold ${ze.thresholdTokens} \u2014 compaction cannot help`,
      { level: "warn" },
    ),
      logFeatureSad("compact_auto", "compact_auto_prefix_overflow"),
      logEvent("tengu_auto_compact_prefix_overflow", { ...ze, wouldHaveBlocked: !0 }));
  let lt = checkRapidRefillBreaker(y),
    { consecutiveRapidRefills: consecutiveRapidRefills } = lt;
  if (lt.action === "trip") {
    if (
      (logForDebugging(
        `autocompact: rapid-refill breaker tripped \u2014 ${consecutiveRapidRefills} consecutive refills within <${RAPID_REFILL_TURN_WINDOW} turns each (last was ${y?.turnCounter} turns)`,
        { level: "warn" },
      ),
      logFeatureSad("compact_auto", "compact_auto_rapid_refill_breaker"),
      Me)
    )
      reportClassifierOverflowCompact(n, Me, { kind: "skipped", reason: "rapid_refill" });
    return { kind: "rapid_refill_breaker_tripped" };
  }
  let nt = fse(r, autoCompactWindow),
    pt = resolveWindowOrigin(r, autoCompactWindow),
    Et = autoWindowNotice(r, autoCompactWindow);
  if (h !== void 0 && (nt !== "auto" || Me !== void 0 || Z) && canCompactInRemote()) {
    (logForDebugging(
      `autocompact: routing through reactive (thresholdSource=${nt}${Me ? ", classifier overflow" : ""})`,
    ),
      logEvent("tengu_auto_compact_routed_reactive", {
        thresholdSource: fromEnum(nt),
        autoCompactWindow: pt.window,
        autoCompactWindowOrigin: fromEnum(pt.origin),
        classifierOverflow: Me !== void 0,
      }));
    let startTime = performance.now(),
      It = h,
      {
        result: Yt,
        hookBlocked: hookBlocked,
        failure: failure,
      } = yield* runCompactionAsStream(async (rn, pn, no) => {
        let hn;
        if (w) {
          let fo = createChildAbortController(rn.abortController),
            To = armRecoveryCeiling(fo, gzr(e), rn.session.host.clock);
          try {
            hn = await w({
              toolUseContext: { ...rn, abortController: fo },
              messages: e,
              querySource: It,
              sizingModel: model,
              trigger: "threshold",
              detectedAt: startTime,
              onResponseLength: no,
            });
          } finally {
            To.clear();
          }
        }
        let ho = getModelContextInfo(model),
          yn =
            calculateTokenWarningState(Tp(e, ho.bytesPerToken) - (S ?? 0), ho, autoCompactWindow).level ===
            "blocked",
          Kn = consecutiveRapidRefills > 0 && !yn && _ri(),
          Xn = await triggerReactiveCompact({
            hasAttempted: !1,
            querySource: It,
            aborted: rn.abortController.signal.aborted,
            messages: e,
            cacheSafeParams: { ...s, toolUseContext: rn },
            precomputed: hn?.swap,
            precomputeOutcome: hn?.outcome,
            userWaitStartedAt: startTime,
            thresholdSource: nt,
            thresholdWindow: pt,
            allowLastResort: yn || Me !== void 0,
            keepNoRound: Kn,
            spinnerHintText: Et,
            onNotification: pn,
            onResponseLength: no,
          });
        if (Xn.result === null && hn?.emittedEarlyCompactStart)
          (rn.onCompactEvent?.({ type: "compact_progress", event: { type: "compact_end" } }),
            rn.onCompactEvent?.({ type: "sdk_status", status: null }));
        return Xn;
      }, n);
    if (Yt)
      return {
        kind: "compacted",
        result: Me ? compactAfterClassifierOverflow(n, Me, Yt) : Yt,
        consecutiveRapidRefills: consecutiveRapidRefills,
        thresholdSource: nt,
        thresholdWindow: pt,
        routedThroughReactive: !0,
      };
    if (Me)
      reportClassifierOverflowCompact(
        n,
        Me,
        hookBlocked
          ? { kind: "skipped", reason: "hook_blocked" }
          : failure
            ? { kind: "failed", reason: failure.reason }
            : n.abortController.signal.aborted
              ? { kind: "skipped", reason: "aborted" }
              : { kind: "skipped", reason: "unavailable" },
      );
    if (hookBlocked) return { kind: "hook_blocked", thresholdSource: nt, routedThroughReactive: !0 };
    return autocompactFailure(y, !0, nt, failure);
  }
  let yt = {
      isRecompactionInChain: y?.compacted === !0,
      turnsSincePreviousCompact: y?.turnCounter ?? -1,
      previousCompactTurnId: y?.turnId,
      autoCompactThreshold: getAutoCompactThresholdTokens(r, autoCompactWindow),
      querySource: h,
    },
    gt = tpr();
  try {
    let At = yield* runCompactionAsStream(
      (It, Yt, qt) =>
        compactConversation(e, It, s, !0, {
          isAutoCompact: !0,
          recompactionInfo: yt,
          stripNonEssential: gt,
          spinnerHintText: Et,
          onNotification: Yt,
          onResponseLength: qt,
        }),
      n,
    );
    return (
      cleanupAfterCompaction(n.session, h, n.setAppState, n.agentId, s.stickyBetas, n.storageV5),
      {
        kind: "compacted",
        result: Me ? compactAfterClassifierOverflow(n, Me, At) : At,
        consecutiveRapidRefills: consecutiveRapidRefills,
        thresholdSource: nt,
        thresholdWindow: pt,
        routedThroughReactive: !1,
      }
    );
  } catch (error) {
    if (errorMessage(error).startsWith(COMPACTION_BLOCKED_BY_HOOK)) {
      if (Me) reportClassifierOverflowCompact(n, Me, { kind: "skipped", reason: "hook_blocked" });
      return { kind: "hook_blocked", routedThroughReactive: !1 };
    }
    let It = hasExactErrorMessage(error, API_REQUEST_ABORTED_MESSAGE),
      Yt = Me !== void 0 && hasExactErrorMessage(error, ERROR_MESSAGE_NOT_ENOUGH_MESSAGES);
    if (Me)
      reportClassifierOverflowCompact(n, Me, {
        kind: "failed",
        reason: It ? "aborted" : Yt ? "too_few_groups" : "error",
      });
    if (!It)
      if (Lln(error) || Yt) logForDebugging(`autocompact failed: ${errorMessage(error)}`, { level: "error" });
      else
        logError(withTelemetryMessage(toError(error), "autocompact: unexpected compactConversation failure"));
    return autocompactFailure(
      y,
      !1,
      void 0,
      !Ie
        ? void 0
        : It
          ? { reason: "aborted" }
          : hasExactErrorMessage(error, ERROR_MESSAGE_PROMPT_TOO_LONG)
            ? { reason: "exhausted" }
            : hasExactErrorMessage(error, ERROR_MESSAGE_NOT_ENOUGH_MESSAGES)
              ? { reason: "too_few_groups" }
              : { reason: "error", detail: Lln(error) ? errorMessage(error) : "an internal error" },
    );
  }
}
/**
 * 空闲时执行一次自动压缩。
 */
//@ chunk-e6aww6q8.js:2450031-2451102 placement
async function* runIdleCompaction(e, n, r, s, h, y, S) {
  let startTime = performance.now(),
    L = fse(r, n.options.autoCompactWindow),
    G = resolveWindowOrigin(r, n.options.autoCompactWindow),
    { result: q, hookBlocked: hookBlocked } = yield* runCompactionAsStream(async (Se, ke, we) => {
      try {
        let { swap: swap, outcome: outcome } = await S({
          toolUseContext: Se,
          messages: e,
          querySource: h,
          sizingModel: r.model,
          trigger: "idle",
          detectedAt: startTime,
        });
        if (swap === void 0) return { result: null, hookBlocked: !1 };
        return await triggerReactiveCompact({
          hasAttempted: !1,
          querySource: h,
          aborted: Se.abortController.signal.aborted,
          messages: e,
          cacheSafeParams: { ...s, toolUseContext: Se },
          precomputed: swap,
          precomputedOnly: !0,
          precomputeOutcome: outcome,
          userWaitStartedAt: startTime,
          thresholdSource: L,
          thresholdWindow: G,
          onNotification: ke,
          onResponseLength: we,
        });
      } catch (error) {
        return (logError(error), { result: null, hookBlocked: !1 });
      }
    }, n);
  if (q !== null) {
    let { boundaryMarker: boundaryMarker } = q;
    return {
      kind: "compacted",
      result: q,
      consecutiveRapidRefills: y?.consecutiveRapidRefills ?? 0,
      thresholdSource: L,
      thresholdWindow: G,
      routedThroughReactive: !0,
      ...(boundaryMarker.subtype === "compact_boundary" &&
        boundaryMarker.compactMetadata.precomputed === !0 && { afterIdle: !0 }),
    };
  }
  return hookBlocked ? { kind: "hook_blocked", thresholdSource: L, routedThroughReactive: !0 } : void 0;
}
/**
 * 按实验/服务端窗口压缩时的提示文本。
 */
//@ chunk-e6aww6q8.js:2451102-2451339 placement
function autoWindowNotice(e, n) {
  if (a6e(e) === void 0) return null;
  let { source: source, configured: configured } = getAutoCompactWindow(e, n);
  if ((source !== "experiment" && source !== "clientdata") || configured >= e.contextWindow) return null;
  return `Compacting at auto window (${formatTokens(configured)} tokens) \xB7 /autocompact to configure`;
}
/**
 * 取出自动模式分类器溢出触发的压缩请求（过期或离开 auto 模式时丢弃并记录）。
 */
//@ chunk-e6aww6q8.js:2451339-2451777 placement
function pendingClassifierOverflow(e, n, r) {
  let { mode: mode, servedCall: servedCall } = getToolPermissionContext(e),
    { pending: pending, stale: stale } = syncCompactEligibility(e, n, mode, r);
  if (pending === void 0) return;
  let w = stale === "mode" && !isAutoClassifierActive(mode, servedCall === !0) && mode !== "dontAsk";
  if (stale === "epoch" || w) {
    let L = stale === "epoch" ? "stale" : "left_auto_mode";
    (logEvent("tengu_auto_mode_classifier_overflow_compact", {
      stage: lit_2("dropped"),
      reason: fromEnum(L),
      isSubagent: e.agentId !== void 0,
    }),
      logFeatureSad("compact_classifier_overflow", L));
    return;
  }
  if (!r) {
    reportClassifierOverflowCompact(e, pending, { kind: "skipped", reason: "unavailable" });
    return;
  }
  return pending;
}
/**
 * 自动模式分类器上下文溢出时触发压缩。
 */
//@ chunk-e6aww6q8.js:2451777-2452279 placement
function compactAfterClassifierOverflow(e, n, r) {
  return (
    logForDebugging("autocompact: compacted after the auto mode classifier overflowed"),
    logEvent("tengu_auto_mode_classifier_overflow_compact", {
      stage: lit_2("compacted"),
      deniedCalls: n.deniedToolNames.length,
      isSubagent: e.agentId !== void 0,
      preCompactTokenCount: r.preCompactTokenCount,
      postCompactTokenCount: r.postCompactTokenCount,
      truePostCompactTokenCount: r.truePostCompactTokenCount,
    }),
    logFeatureOk("compact_classifier_overflow"),
    {
      ...r,
      attachments: [
        ...r.attachments,
        createClassifierOverflowReminder(n.deniedToolNames.length, uniq(n.deniedToolNames)),
      ],
    }
  );
}
/**
 * 记录分类器溢出触发的压缩结果遥测。
 */
//@ chunk-e6aww6q8.js:2452279-2452733 placement
function reportClassifierOverflowCompact(e, n, r) {
  let s = r.reason === "aborted";
  if (!s) markCompactRequestSpent(e, n);
  if (
    (logForDebugging(
      `autocompact: compaction after the auto mode classifier overflowed ${r.kind} (${r.reason})`,
      { level: "warn" },
    ),
    logEvent("tengu_auto_mode_classifier_overflow_compact", {
      stage: s ? lit_2("skipped") : fromEnum(r.kind),
      reason: fromEnum(r.reason),
      deniedCalls: n.deniedToolNames.length,
      isSubagent: e.agentId !== void 0,
    }),
    r.kind === "failed" && !s)
  )
    logFeatureBad("compact_classifier_overflow", r.reason);
  else logFeatureSad("compact_classifier_overflow", r.reason);
}
//@ chunk-9m4wzd68.js:369-395 placement
var CLAUDE_OPUS_4_8 = "claude-opus-4-8";
//@ chunk-9m4wzd68.js:395-476 placement
function mri() {
  return (
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_redwood2", "") ||
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_redwood3", "")
  );
}
//@ chunk-9m4wzd68.js:476-506 placement
var TENGU_GOOFY_JELLYFISH = "tengu_goofy_jellyfish";
//@ chunk-9m4wzd68.js:506-536 placement
function gri() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_GOOFY_JELLYFISH, "");
}
/**
 * DISABLE_COMPACT 或 DISABLE_AUTO_COMPACT 为真时返回 true（是“被环境变量禁用”，不是“已启用”；真正的启用判断是同 chunk 的 kf：未被 env 禁用且设置 autoCompactEnabled 默认 true）。旧版名 isAutoCompactEnabled 语义相反。
 */
//@ chunk-9m4wzd68.js:536-621 fingerprint = isAutoCompactEnabled (0.807)
function isAutoCompactDisabledByEnv() {
  return Boolean(isEnvTruthy(process.env.DISABLE_COMPACT) || env.DISABLE_AUTO_COMPACT);
}

export {
  getAutoCompactWindow,
  Tp,
  use,
  tpn,
  promptCacheExpiresAt,
  calculateTokenWarningState,
  getAutoCompactThresholdTokens,
  createCompactTracking,
  checkRapidRefillBreaker,
  runCompactionAsStream,
  hasNoUsage,
  isAutoCompactDisabledByEnv,
  OSt,
  CLAUDE_OPUS_4_8,
  mri,
  gri,
  dke,
  estimateTokensSinceAnchor,
  getCompactThresholdSnapshot,
  isAtPrecomputeThreshold,
  xjo,
  runAutoCompactIfNeeded,
  AUTOCOMPACT_THRASHING_NOTICE,
  AUTOCOMPACT_THRASHING_TEXT,
};
