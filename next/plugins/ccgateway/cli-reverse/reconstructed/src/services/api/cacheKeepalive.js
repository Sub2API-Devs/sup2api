/**
 * services/api/cacheKeepalive.ts
 *
 * 2.1.316 新增：提示缓存保活：调用 /v1/messages/cache_touch 并在恢复时续期
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (76)
 * attribution: placement 76
 */
import {
  CACHE_TTL_5M_MS,
  CACHE_TTL_1H_MS,
  touchPromptCache,
  MAIN as MAIN_2,
} from "./promptCacheBreakDetection.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  literal,
  numberSchema,
  booleanSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { HostScoped } from "../../utils/hostScoped.js";
import {
  getRootSession,
  getIsNonInteractiveSession,
  getMainChainReleaseCount,
  onSessionSwitch,
  getLastMainThreadRequestAt,
  adjustLastMainThreadCacheTtlMs,
  recordLastMainThreadCacheRenewal,
  getSessionId,
  getLastMainRequestId,
  forgetLastMainRequestId,
} from "../../bootstrap/state.js";
import { getLimitsAccountEpoch, getCurrentLimits } from "../claudeAiLimits.js";
import { env } from "../../utils/env.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import {
  isFirstPartyProvider,
  isActualFirstPartyAnthropicBaseUrl,
  getProviderForModel,
} from "../../utils/model/providers.js";
import {
  canSendFirstPartyBetas,
  BETA_CACHE_KEEPALIVE,
  betaHeaderValues,
  BETA_OAUTH_AUTH,
} from "../../utils/betas.js";
import { isClaudeAISubscriber } from "../../utils/auth.js";
import { isPolicyAllowed as isPolicyAllowed_3 } from "../policyLimits/policyEvidence.js";
import { isUsageBasedBilling } from "../../utils/planTiers.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import {
  forgetBeta,
  markBetaRejected,
  isBetaRejected as isBetaRejected_2,
  markBetaSent,
  isBetaSent,
} from "../../bootstrap/stateSlices.js";
import { isSessionsToken } from "../oauth/sessionsBearerHooks.js";
import { containsProviderId } from "./providerIds.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import { logError } from "../../utils/log.js";
import { APIError } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { isOAuthTokenRevokedError } from "./withRetry.js";
import { getAnthropicClient } from "./client.js";
import { mainAgentContext } from "../../utils/agentContext.js";
import { assertProviderAllowed } from "../../utils/model/allowedProviders.js";
import { parseRetryAfterMs } from "./retryAfter.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { stripAnyVersatileSuffix } from "../../utils/model/modelIds.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum, fromEnumOpt } from "../analytics/safeMetadata.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { gracefulShutdown_2 } from "../../utils/gracefulShutdown.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:227793-228288 placement
/**
 * 缓存保活（cache keepalive）的常量与开关 schema：touch 端点、10 s 超时、3 次失败上限、5 分钟 TTL 与提前续期余量、拒用窗口 1 小时、客户端最大复用 4 分钟、活动事件名，以及配置字段。
 */
var TENGU_SEQUENTIAL_CLOUD; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var ANTHROPIC_CACHE_KEEPALIVE;
var CACHE_TOUCH_PATH;
var TOUCH_TIMEOUT_MS;
var MAX_TOUCH_NOT_FOUND;
var MAX_FAILED_REQUESTS;
var MAX_MISSING_RECORDS;
var CACHE_TTL_MS;
var RENEW_BEFORE_EXPIRY_MS;
var REFUSAL_WINDOW_MS;
var MAX_CLIENT_AGE_MS;
var ACTIVITY_EVENT_NAMES;
var keepaliveConfigSchema;
deferInit("chunk-e6aww6q8.js:227793", () => {
  TENGU_SEQUENTIAL_CLOUD = "tengu_sequential_cloud";
  ANTHROPIC_CACHE_KEEPALIVE = "anthropic-cache-keepalive";
  CACHE_TOUCH_PATH = "/v1/messages/cache_touch";
  TOUCH_TIMEOUT_MS = 1e4;
  MAX_TOUCH_NOT_FOUND = 3;
  MAX_FAILED_REQUESTS = 3;
  MAX_MISSING_RECORDS = 3;
  CACHE_TTL_MS = CACHE_TTL_5M_MS;
  RENEW_BEFORE_EXPIRY_MS = CACHE_TTL_MS - TOUCH_TIMEOUT_MS;
  REFUSAL_WINDOW_MS = 3600000;
  MAX_CLIENT_AGE_MS = 240000;
  ACTIVITY_EVENT_NAMES = [
    "main_request",
    "user_input",
    "work_start",
    "work_end",
    "awaiting_user_start",
    "awaiting_user_end",
  ];
  keepaliveConfigSchema = DoctorLazy(() =>
    objectSchema({
      enabled: literal(true),
      touchIntervalSeconds: numberSchema().min(10).max(120).default(30),
      activityWindowMinutes: numberSchema().min(1).max(1440).default(60),
      inFlightWindowMinutes: numberSchema().min(1).max(1440).optional(),
      resumeTouches: booleanSchema().default(false).catch(false),
    }),
  );
});
//@ chunk-e6aww6q8.js:228288-228477 placement
class CacheKeepaliveState {
  armed = undefined;
  next = undefined;
  resumeStaged = undefined;
  resumeTimer = undefined;
  lapsedRequestIds = new Set();
  modelSwitchCount = 0;
  conversation = undefined;
  header = undefined;
  route = undefined;
  run = null;
  lastEventAt = {};
}
//@ chunk-e6aww6q8.js:228477-228504 placement
var cacheKeepaliveStateSlot; // deferred: uses CacheKeepaliveState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:228477", () => {
  cacheKeepaliveStateSlot = new HostScoped(() => new CacheKeepaliveState());
});
//@ chunk-e6aww6q8.js:228504-228542 placement
function keepaliveState() {
  return cacheKeepaliveStateSlot.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:228542-228797 placement
function getKeepaliveRoute(state) {
  let limitsAccountEpoch = getLimitsAccountEpoch();
  if (
    state.route?.accountEpoch !== limitsAccountEpoch ||
    (state.route.refusalEndsAt !== undefined && Date.now() >= state.route.refusalEndsAt)
  )
    state.route = {
      accountEpoch: limitsAccountEpoch,
      failedRequestCount: 0,
      missingRecordCount: 0,
      skipTouchesUntil: 0,
      refused: false,
      refusalEndsAt: undefined,
    };
  return state.route;
}
//@ chunk-e6aww6q8.js:228797-228878 placement
function hadActivityWithin(lastEventAt, now, withinMs) {
  return ACTIVITY_EVENT_NAMES.some((eventName) => {
    let at = lastEventAt[eventName];
    return at !== undefined && now - at <= withinMs;
  });
}
//@ chunk-e6aww6q8.js:228878-229025 placement
function isWorkRunning(run) {
  if (run === null || run.kind !== "work") return false;
  switch (run.work) {
    case "turn_running":
    case "subagent_running":
      return true;
    case "compacting":
      return false;
  }
}
//@ chunk-e6aww6q8.js:229025-229181 placement
/**
 * 缓存保活是否可用：未被拒绝、交互会话、第一方 Anthropic 地址与 beta、claude.ai 订阅、未禁用非必要流量，且策略允许 allow_cache_keepalive。
 */
function isCacheKeepaliveAllowed() {
  return (
    !getKeepaliveRoute(keepaliveState()).refused &&
    !getIsNonInteractiveSession() &&
    !env.CCR_SESSION_PROFILE &&
    !isEssentialTrafficOnly() &&
    isFirstPartyProvider() &&
    isActualFirstPartyAnthropicBaseUrl() &&
    !env.ANTHROPIC_UNIX_SOCKET &&
    canSendFirstPartyBetas() &&
    isClaudeAISubscriber() &&
    isPolicyAllowed_3("allow_cache_keepalive")
  );
}
//@ chunk-e6aww6q8.js:229181-229234 placement
function isRouteMissingRecords(state) {
  return getKeepaliveRoute(state).missingRecordCount >= MAX_MISSING_RECORDS;
}
//@ chunk-e6aww6q8.js:229234-229345 placement
function isSubscriberHourCache(cacheTtl, isNewChain) {
  return (
    cacheTtl?.ttl === "1h" &&
    cacheTtl.reason === "subscriber" &&
    isCacheKeepaliveAllowed() &&
    !(isNewChain && (isUsageBasedBilling() || getCurrentLimits().isUsingOverage === true))
  );
}
//@ chunk-e6aww6q8.js:229345-229479 placement
function getKeepaliveConfig() {
  {
    let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SEQUENTIAL_CLOUD, false);
    if (typeof featureValue_CACHED_MAY_BE_STALE !== "object" || featureValue_CACHED_MAY_BE_STALE === null)
      return;
    let parsed = keepaliveConfigSchema().safeParse(featureValue_CACHED_MAY_BE_STALE);
    return parsed.success ? parsed.data : undefined;
  }
  return;
}
//@ chunk-e6aww6q8.js:229479-229521 placement
/**
 * 导出函数 `isKeepaliveArmed`：返回 Fw().armed !== void 0。
 */
function isKeepaliveArmed() {
  return keepaliveState().armed !== undefined;
}
//@ chunk-e6aww6q8.js:229521-230419 placement
function releaseKeepaliveChain(conversation, { isMainLoopRequest, continuesPrefix, cacheTtl }) {
  {
    let isMainChain = isMainLoopRequest || continuesPrefix;
    let header = undefined;
    let shouldLog = false;
    try {
      if (isMainLoopRequest) {
        let state = keepaliveState();
        let mainChainReleaseCount = getMainChainReleaseCount();
        let header_2 = state.header;
        header =
          header_2?.chainReleaseCount === mainChainReleaseCount
            ? header_2
            : {
                chainReleaseCount: mainChainReleaseCount,
                isSent: false,
              };
        let chainChanged = header !== header_2;
        state.header = header;
        if (chainChanged) {
          forgetBeta(conversation, BETA_CACHE_KEEPALIVE);
          if (state.armed !== undefined) stopKeepalive(state, "chain_released");
        } else if (!header.isSent) markBetaRejected(conversation, BETA_CACHE_KEEPALIVE);
        if (!isBetaRejected_2(conversation, BETA_CACHE_KEEPALIVE)) {
          let hourCacheFlag = isSubscriberHourCache(cacheTtl, chainChanged);
          let usable = hourCacheFlag && getKeepaliveConfig() !== undefined;
          shouldLog = chainChanged && usable;
          if (!usable) {
            markBetaRejected(conversation, BETA_CACHE_KEEPALIVE);
            if (hourCacheFlag && !chainChanged) logKeepalive("off for this chain: flag off", "warn");
          } else if (chainChanged && isRouteMissingRecords(state)) {
            getKeepaliveRoute(state).missingRecordCount = 0;
            markBetaRejected(conversation, BETA_CACHE_KEEPALIVE);
            logKeepalive("off for this chain: no records", "warn");
            logKeepaliveFeature("bad", "records_missing");
          } else markBetaSent(conversation, BETA_CACHE_KEEPALIVE);
        }
        header.isSent = isBetaSent(conversation, BETA_CACHE_KEEPALIVE);
      }
    } catch (error) {
      if (header?.isSent ?? isBetaSent(conversation, BETA_CACHE_KEEPALIVE))
        markBetaSent(conversation, BETA_CACHE_KEEPALIVE);
      else markBetaRejected(conversation, BETA_CACHE_KEEPALIVE);
      logKeepaliveFailure("header_decision_failed", error);
    }
    let headerOn = false;
    if (isMainChain && isBetaSent(conversation, BETA_CACHE_KEEPALIVE)) {
      try {
        headerOn = !getKeepaliveRoute(keepaliveState()).refused && canSendFirstPartyBetas();
      } catch (error) {
        logKeepaliveFailure("header_gate_failed", error);
      }
      if (!headerOn && header !== undefined) {
        header.isSent = false;
        markBetaRejected(conversation, BETA_CACHE_KEEPALIVE);
      }
    }
    if (shouldLog) logKeepalive(`header ${headerOn ? "on" : "off"} for this chain`);
    if (headerOn && header !== undefined) renewMainCacheLifeNow(CACHE_TTL_MS);
    return headerOn;
  }
  return false;
}
//@ chunk-e6aww6q8.js:230419-230453 placement
/**
 * 导出函数 `withKeepaliveReset`：参数 e，返回 (Xg(e, DO), e)。
 */
function withKeepaliveReset(conversation) {
  markBetaRejected(conversation, BETA_CACHE_KEEPALIVE);
  return conversation;
}
//@ chunk-e6aww6q8.js:230453-230581 placement
function onKeepaliveHeaderRejected(conversation, accountEpoch, isFirstPartyRequest) {
  markBetaRejected(conversation, BETA_CACHE_KEEPALIVE);
  try {
    if (isFirstPartyRequest) renewMainCacheLifeNow(CACHE_TTL_1H_MS);
    if (accountEpoch === getLimitsAccountEpoch()) refuseKeepalive(keepaliveState(), "header_rejected");
  } catch (error) {
    logKeepaliveFailure("header_rejection_failed", error);
  }
}
//@ chunk-e6aww6q8.js:230581-231750 placement
/**
 * 根据响应头判断提示缓存保活是否生效，以及是否继续保活。
 */
function evaluateCacheKeepalive({
  conversation,
  headerSent,
  requestId,
  headers,
  isWhole,
  chainReleaseCount,
  accountEpoch,
  modelSwitchCount,
  now,
  clientOptions,
}) {
  try {
    let state = keepaliveState();
    state.lastEventAt.main_request = now;
    let sameConversation = state.conversation === conversation;
    state.conversation = conversation;
    state.next = undefined;
    if (!headerSent) {
      stopKeepalive(state, "request_without_header");
      return;
    }
    let responseActive = headers?.get(ANTHROPIC_CACHE_KEEPALIVE) === "active";
    if (chainReleaseCount === getMainChainReleaseCount())
      renewMainCacheLifeNow(responseActive ? CACHE_TTL_MS : CACHE_TTL_1H_MS);
    if (!isBetaSent(conversation, BETA_CACHE_KEEPALIVE)) {
      stopKeepalive(state, "conversation_header_off");
      return;
    }
    if (!responseActive) {
      stopKeepalive(state, "response_not_active");
      logKeepalive(`response not active ${requestId}`);
      return;
    }
    let invalidReason = keepaliveInvalidReason({
      chainReleaseCount,
      accountEpoch,
      modelSwitchCount,
      isResumed: false,
    });
    if (invalidReason !== undefined) {
      stopKeepalive(state, invalidReason);
      return;
    }
    let keepaliveConfig = getKeepaliveConfig();
    if (keepaliveConfig === undefined) {
      stopKeepalive(state, "flag_off");
      return;
    }
    if (!isSessionsToken(requestId)) {
      refuseKeepalive(state, "response_without_request_id");
      return;
    }
    let entry = {
      requestId,
      chainReleaseCount,
      accountEpoch,
      modelSwitchCount,
      isResumed: false,
      clientOptions,
      touchIntervalMs: keepaliveConfig.touchIntervalSeconds * 1000,
      touch: undefined,
      client: undefined,
    };
    let { armed } = state;
    if (armed?.stream === "open") {
      armed.stream = "cut";
      armed.recordRenewedAt = now;
    }
    if (
      !isWhole &&
      armed !== undefined &&
      sameConversation &&
      armed.chainReleaseCount === chainReleaseCount &&
      armed.accountEpoch === accountEpoch &&
      isArmedForModel(armed, clientOptions.model) &&
      (armed.stream === "complete" || armed.lastTouch === "ok")
    ) {
      state.next = entry;
      return;
    }
    armKeepalive(state, entry, isWhole ? "complete" : "open", now);
  } catch (error) {
    logKeepaliveFailure("sender_start_failed", error);
  }
}
//@ chunk-e6aww6q8.js:231750-232114 placement
/**
 * 主请求响应结束时更新缓存保活状态：记录时间，待接管的请求按完成或中断转为已武装，已武装的则更新流状态与续期时间。
 */
function onMainResponseEnd(requestId, complete, now) {
  try {
    let state = keepaliveState();
    state.lastEventAt.main_request = now;
    let { armed, next: pending } = state;
    if (pending !== undefined && pending.requestId === requestId) {
      state.next = undefined;
      if (
        (complete || armed === undefined || armed.lastTouch === "touch_not_found") &&
        isKeepaliveUsable(pending)
      )
        armKeepalive(state, pending, complete ? "complete" : "cut", now);
      return;
    }
    if (armed !== undefined && armed.requestId === requestId && armed.stream === "open") {
      armed.stream = complete ? "complete" : "cut";
      armed.recordRenewedAt = now;
    }
  } catch (error) {
    logKeepaliveFailure("response_end_failed", error);
  }
}
//@ chunk-e6aww6q8.js:232114-232458 placement
/**
 * 恢复会话时登记上次回复的缓存保活：记录 reply 并在会话切换时取消，再尝试立即启动续期。
 */
function stageResumeKeepalive(getReply) {
  try {
    let state = keepaliveState();
    stopResumeStaged(state);
    let reply = getReply();
    if (reply === undefined) return;
    let { sessionId, requestId, ...replyRest } = reply;
    if (
      sessionId === undefined ||
      !isSessionsToken(requestId) ||
      containsProviderId(requestId) ||
      typeof replyRest.clientOptions.model !== "string"
    )
      return;
    let stagedReply = {
      sessionId,
      requestId,
      ...replyRest,
    };
    if (resumeKeepaliveConfig(state, stagedReply) === undefined) return;
    state.resumeStaged = {
      reply: stagedReply,
      stopListening: onSessionSwitch(() => tryStartResumeKeepalive(state)),
    };
    tryStartResumeKeepalive(state);
  } catch (error) {
    logKeepaliveFailure("resume_failed", error, true);
  }
}
//@ chunk-e6aww6q8.js:232458-232813 placement
/**
 * 模型切换时更新缓存保活状态：累计切换次数，仍是同一模型的保留并同步计数，否则丢弃待接管请求或解除武装。
 */
function onKeepaliveModelSwitch(host, prevModel, nextModel) {
  try {
    if (isSameModelIdentityKeepalive(prevModel, nextModel)) return;
    let state = cacheKeepaliveStateSlot.of(host);
    state.modelSwitchCount += 1;
    let { armed, next: pending } = state;
    if (pending !== undefined)
      if (isSameModelIdentityKeepalive(pending.clientOptions.model, nextModel))
        pending.modelSwitchCount = state.modelSwitchCount;
      else state.next = undefined;
    if (armed !== undefined)
      if (isSameModelIdentityKeepalive(armed.clientOptions.model, nextModel))
        armed.modelSwitchCount = state.modelSwitchCount;
      else stopKeepalive(state, "model_changed");
  } catch (error) {
    logKeepaliveFailure("model_switch_failed", error);
  }
}
//@ chunk-e6aww6q8.js:232813-232913 placement
function getModelSwitchCount() {
  try {
    return keepaliveState().modelSwitchCount;
  } catch (error) {
    logKeepaliveFailure("model_switch_count_failed", error);
  }
  return 0;
}
//@ chunk-e6aww6q8.js:232913-232953 placement
function recordActivityEvent(eventName, at) {
  keepaliveState().lastEventAt[eventName] = at;
}
//@ chunk-e6aww6q8.js:232953-233179 placement
function recordRunState(nextRun, now) {
  {
    let state = keepaliveState();
    if (sameRunState(state.run, nextRun)) return;
    if (state.run !== null)
      state.lastEventAt[state.run.kind === "work" ? "work_end" : "awaiting_user_end"] = now;
    if (nextRun !== null)
      state.lastEventAt[nextRun.kind === "work" ? "work_start" : "awaiting_user_start"] = now;
    state.run = nextRun;
  }
}
//@ chunk-e6aww6q8.js:233179-233338 placement
function sameRunState(previousRun, nextRun) {
  if (previousRun === null || nextRun === null) return previousRun === nextRun;
  return previousRun.kind === "work"
    ? nextRun.kind === "work" && previousRun.work === nextRun.work
    : nextRun.kind === "awaiting_user" && previousRun.awaiting === nextRun.awaiting;
}
//@ chunk-e6aww6q8.js:233338-233662 placement
/**
 * 武装缓存保活发送器：停掉旧的、按 touchIntervalMs 定时发送 cache_touch，记录流状态与续期时间。
 */
function armKeepalive(state, entry, stream, now) {
  let hadArmed = state.armed !== undefined;
  stopKeepalive(state, "next_response");
  if (getKeepaliveRoute(state).refused) return;
  let interval = setInterval(resumeTouchLoop, entry.touchIntervalMs, state);
  interval.unref();
  state.armed = {
    ...entry,
    timer: interval,
    stream,
    recordRenewedAt: now,
    notFoundCount: 0,
    lastTouch: undefined,
    wasRateLimited: false,
    touch: undefined,
    client: entry.touch === undefined ? entry.client : undefined,
  };
  if (!hadArmed) logKeepalive("sender started");
}
//@ chunk-e6aww6q8.js:233662-233715 placement
function isKeepaliveUsable(entry) {
  return keepaliveInvalidReason(entry) === undefined && getKeepaliveConfig() !== undefined;
}
//@ chunk-e6aww6q8.js:233715-233799 placement
function isArmedForModel(entry, model) {
  return entry.clientOptions.model === model && entry.lastTouch !== "touch_not_found";
}
//@ chunk-e6aww6q8.js:233799-233902 placement
function armPendingKeepalive(state, now) {
  let { next: pending } = state;
  if (state.armed === undefined && pending !== undefined && isKeepaliveUsable(pending)) {
    state.next = undefined;
    armKeepalive(state, pending, "open", now);
  }
}
//@ chunk-e6aww6q8.js:233902-234161 placement
function disarmKeepalive(state, reason) {
  let { armed } = state;
  if (reason !== "next_response") state.run = null;
  if (armed === undefined) return;
  state.armed = undefined;
  clearInterval(armed.timer);
  clearTimeout(armed.touch?.timeout);
  armed.touch?.controller.abort();
  armed.touch = undefined;
  if (reason !== "next_response") logKeepalive(`sender stopped: ${reason}`);
  return armed;
}
//@ chunk-e6aww6q8.js:234161-234747 placement
/**
 * 停止保活并按最后一次 touch 结果记遥测；连续失败达到上限时整体关闭一段时间。
 */
function stopKeepalive(state, reason) {
  let entry = disarmKeepalive(state, reason);
  if (entry === undefined || entry.accountEpoch !== getLimitsAccountEpoch()) return;
  if (entry.lastTouch === undefined || entry.lastTouch === "ok") {
    if (entry.lastTouch === undefined && entry.wasRateLimited)
      logKeepaliveFeature("sad", "touch_rate_limited");
    else if (
      reason === "entry_lapsed" ||
      reason === "flag_off" ||
      reason === "resume_touches_off" ||
      reason === "not_allowed" ||
      reason === "model_changed"
    )
      logKeepaliveFeature("sad", reason);
    else if (entry.lastTouch === "ok") logKeepaliveOk();
    return;
  }
  let keepaliveRoute = getKeepaliveRoute(state);
  if (entry.lastTouch === "touch_not_found") {
    keepaliveRoute.failedRequestCount = 0;
    if (entry.stream === "complete") keepaliveRoute.missingRecordCount += 1;
  } else {
    keepaliveRoute.failedRequestCount += 1;
    if (keepaliveRoute.failedRequestCount >= MAX_FAILED_REQUESTS) {
      refuseKeepalive(state, entry.lastTouch, REFUSAL_WINDOW_MS);
      return;
    }
  }
  logKeepaliveFeature("sad", entry.lastTouch);
}
//@ chunk-e6aww6q8.js:234747-235071 placement
/**
 * 拒绝缓存保活：解除当前武装、清除头部发送标记，并按时长（或本次登录）记录拒绝与遥测。
 */
function refuseKeepalive(state, reason, durationMs) {
  disarmKeepalive(state, reason);
  if (state.conversation !== undefined) markBetaRejected(state.conversation, BETA_CACHE_KEEPALIVE);
  if (state.header !== undefined) state.header.isSent = false;
  let keepaliveRoute = getKeepaliveRoute(state);
  if (keepaliveRoute.refused) {
    if (durationMs === undefined) keepaliveRoute.refusalEndsAt = undefined;
    return;
  }
  keepaliveRoute.refused = true;
  keepaliveRoute.refusalEndsAt = durationMs === undefined ? undefined : Date.now() + durationMs;
  logKeepalive(`off for ${durationMs === undefined ? "this login" : "a while"}: ${reason}`, "warn");
  logKeepaliveFeature("bad", reason);
}
//@ chunk-e6aww6q8.js:235071-235146 placement
function logKeepalive(message, level = "debug") {
  try {
    logForDebugging(`[cache-keepalive] ${message}`, {
      level,
    });
  } catch {}
}
//@ chunk-e6aww6q8.js:235146-235233 placement
function logKeepaliveOk(isResume = false) {
  try {
    logFeatureOk(isResume ? "api_cache_keepalive_resume" : "api_cache_keepalive");
  } catch {}
}
//@ chunk-e6aww6q8.js:235233-235401 placement
function logKeepaliveFeature(severity, reason, isResume = false) {
  try {
    if (severity === "sad")
      logFeatureSad(isResume ? "api_cache_keepalive_resume" : "api_cache_keepalive", reason);
    else logFeatureBad(isResume ? "api_cache_keepalive_resume" : "api_cache_keepalive", reason);
  } catch {}
}
//@ chunk-e6aww6q8.js:235401-235433 placement
function logSwallowedError(error) {
  try {
    logError(error);
  } catch {}
}
//@ chunk-e6aww6q8.js:235433-235475 placement
function logKeepaliveFailure(reason, error, isResume = false) {
  logSwallowedError(error);
  logKeepaliveFeature("bad", reason, isResume);
}
//@ chunk-e6aww6q8.js:235475-235519 placement
function resumeTouchLoop(state) {
  touchCacheOnResume(state, Date.now()).catch(logSwallowedError);
}
//@ chunk-e6aww6q8.js:235519-235552 placement
function abortWithTouchTimeout(abortController) {
  abortController.abort(new CacheTouchTimeoutError());
}
//@ chunk-e6aww6q8.js:235552-235940 placement
/**
 * 把缓存续期（touch）请求的错误归类为超时、网络、404、未授权、限流、服务器或客户端错误等。
 */
function classifyTouchError(error) {
  if (error instanceof CacheTouchTimeoutError) return "touch_timeout";
  if (!(error instanceof APIError)) return "touch_error";
  if (error.status === undefined) return "touch_network_error";
  if (error.status === 404) return error.requestID ? "touch_not_found" : "touch_route_not_found";
  if (error.status === 401 || isOAuthTokenRevokedError(error)) return "touch_unauthorized";
  if (error.status === 429) return "touch_rate_limited";
  return error.status >= 500 ? "touch_server_error" : "touch_client_error";
}
//@ chunk-e6aww6q8.js:235940-236182 placement
function keepaliveInvalidReason({ chainReleaseCount, accountEpoch, modelSwitchCount, isResumed }) {
  if (chainReleaseCount !== getMainChainReleaseCount()) return "chain_released";
  if (!isResumed && modelSwitchCount !== keepaliveState().modelSwitchCount) return "model_changed";
  if (accountEpoch !== getLimitsAccountEpoch()) return "account_changed";
  return isCacheKeepaliveAllowed() ? undefined : "not_allowed";
}
//@ chunk-e6aww6q8.js:236182-236741 placement
/**
 * 发送 cache_touch 请求，续期提示缓存。
 */
async function sendCacheTouch(entry, signal, deadline) {
  let { client } = entry;
  let now = Date.now();
  if (client === undefined || now - client.builtAt >= MAX_CLIENT_AGE_MS) {
    client = {
      value: await getAnthropicClient({
        maxRetries: 0,
        model: entry.clientOptions.model,
        source: "cache_touch",
        agentContext: mainAgentContext(),
        credentials: entry.clientOptions.credentials,
        storageV5: entry.clientOptions.storageV5,
      }),
      builtAt: now,
    };
    if (!signal.aborted) entry.client = client;
  }
  if (signal.aborted || Date.now() >= deadline || keepaliveInvalidReason(entry) !== undefined) return false;
  assertProviderAllowed(getProviderForModel(entry.clientOptions.model));
  try {
    await client.value.post(CACHE_TOUCH_PATH, {
      body: {
        request_id: entry.requestId,
      },
      headers: {
        "anthropic-beta": betaHeaderValues([BETA_OAUTH_AUTH, BETA_CACHE_KEEPALIVE]).join(","),
      },
      signal,
      maxRetries: 0,
    });
  } catch (error) {
    entry.client = undefined;
    throw error;
  }
  return true;
}
//@ chunk-e6aww6q8.js:236741-237101 placement
/**
 * 带超时发送一次缓存续期请求，期间把控制器挂到状态上，结束后清理。
 */
async function sendTouchWithTimeout(entry, deadline) {
  let abortController = new AbortController();
  let timer = setTimeout(abortWithTouchTimeout, TOUCH_TIMEOUT_MS, abortController);
  timer.unref();
  let touchHandle = {
    controller: abortController,
    timeout: timer,
  };
  entry.touch = touchHandle;
  try {
    return await Promise.race([
      sendCacheTouch(entry, abortController.signal, deadline),
      new Promise((resolve, reject) => {
        abortController.signal.addEventListener(
          "abort",
          () =>
            reject(
              abortController.signal.reason instanceof CacheTouchTimeoutError
                ? abortController.signal.reason
                : new KeepaliveAbortError(),
            ),
          {
            once: true,
          },
        );
      }),
    ]);
  } finally {
    if (entry.touch === touchHandle) {
      clearTimeout(timer);
      entry.touch = undefined;
    }
  }
}
//@ chunk-e6aww6q8.js:237101-237426 placement
/**
 * 缓存续期成功后更新记录（续期时间、清零失败计数），满足条件时安排下一次续期。
 */
function onTouchOk(state, armed, now) {
  armed.recordRenewedAt = Math.max(armed.recordRenewedAt, now);
  armed.notFoundCount = 0;
  armed.lastTouch = "ok";
  if (armed.accountEpoch === getLimitsAccountEpoch()) {
    let keepaliveRoute = getKeepaliveRoute(state);
    keepaliveRoute.failedRequestCount = 0;
    keepaliveRoute.missingRecordCount = 0;
  }
  if (
    !armed.isResumed &&
    state.header?.isSent === true &&
    armed.chainReleaseCount === getMainChainReleaseCount() &&
    getCurrentLimits().isUsingOverage !== true
  )
    renewMainCacheLife(undefined, now);
  logKeepalive(`touch ok ${armed.requestId}`);
}
//@ chunk-e6aww6q8.js:237426-237456 placement
function renewMainCacheLifeNow(ttlMs) {
  renewMainCacheLife(ttlMs, undefined);
}
//@ chunk-e6aww6q8.js:237456-237588 placement
function renewMainCacheLife(ttlMs, renewAt) {
  try {
    if (getLastMainThreadRequestAt() === null) return;
    if (ttlMs !== undefined) adjustLastMainThreadCacheTtlMs(ttlMs);
    if (renewAt !== undefined) {
      recordLastMainThreadCacheRenewal(renewAt);
      touchPromptCache(MAIN_2, renewAt);
    }
  } catch (error) {
    logKeepaliveFailure("cache_life_failed", error);
  }
}
//@ chunk-e6aww6q8.js:237588-237799 placement
function backoffAfterTouchError(state, error, reason, touchIntervalMs, now) {
  if (error instanceof APIError && (reason === "touch_rate_limited" || reason === "touch_server_error")) {
    let retryAfterMs = error.headers && parseRetryAfterMs(error.headers, now);
    getKeepaliveRoute(state).skipTouchesUntil =
      now +
      Math.min(
        retryAfterMs !== undefined && retryAfterMs > 0
          ? retryAfterMs
          : Math.min(touchIntervalMs * 1.5, 60000),
        CACHE_TTL_MS,
      );
  }
}
//@ chunk-e6aww6q8.js:237799-238120 placement
/**
 * 恢复会话后先续期一次再武装保活；失败时按错误分类处理，成功后转为已武装并更新记录。
 */
async function touchThenArm(state, entry, now) {
  try {
    if (!(await sendTouchWithTimeout(entry, 1 / 0))) return;
  } catch (error) {
    if (state.next === entry && entry.accountEpoch === getLimitsAccountEpoch()) {
      let reason = classifyTouchError(error);
      logKeepalive(`touch failed: ${reason} ${entry.requestId}`);
      backoffAfterTouchError(state, error, reason, entry.touchIntervalMs, now);
    }
    return;
  }
  if (state.next !== entry || !isKeepaliveUsable(entry)) return;
  state.next = undefined;
  getKeepaliveRoute(state).failedRequestCount = 0;
  armKeepalive(state, entry, "open", now);
  if (state.armed !== undefined) onTouchOk(state, state.armed, now);
}
//@ chunk-e6aww6q8.js:238120-238190 placement
function stopResumeStaged(state) {
  state.resumeStaged?.stopListening();
  state.resumeStaged = undefined;
}
//@ chunk-e6aww6q8.js:238190-238300 placement
function resumeKeepaliveConfig(state, reply) {
  let config = isSubscriberHourCache(reply.cacheTtlOf(getMainLoopModel()), true)
    ? getKeepaliveConfig()
    : undefined;
  return config?.resumeTouches === true && !isRouteMissingRecords(state) ? config : undefined;
}
//@ chunk-e6aww6q8.js:238300-238801 placement
/**
 * 恢复会话时，若暂存的回复属于当前会话且是最近一次主线程请求，按其参数开始保活等待。
 */
function tryStartResumeKeepalive(state) {
  try {
    let reply = state.resumeStaged?.reply;
    if (
      reply === undefined ||
      getSessionId() !== reply.sessionId ||
      getLastMainThreadRequestAt() !== reply.repliedAt
    )
      return;
    stopResumeStaged(state);
    clearTimeout(state.resumeTimer);
    state.resumeTimer = undefined;
    let keepalive = resumeKeepaliveConfig(state, reply);
    if (keepalive === undefined) return;
    scheduleResumeTouch(state, reply, {
      requestId: reply.requestId,
      chainReleaseCount: getMainChainReleaseCount(),
      accountEpoch: getLimitsAccountEpoch(),
      modelSwitchCount: state.modelSwitchCount,
      isResumed: true,
      clientOptions: reply.clientOptions,
      touchIntervalMs: keepalive.touchIntervalSeconds * 1000,
      touch: undefined,
      client: undefined,
    });
    logKeepalive(`resumed reply waits ${reply.requestId}`);
  } catch (error) {
    logKeepaliveFailure("resume_failed", error, true);
  }
}
//@ chunk-e6aww6q8.js:238801-238897 placement
function scheduleResumeTouch(state, reply, entry) {
  state.resumeTimer = setTimeout(resumeTouchTimerFired, entry.touchIntervalMs, state, reply, entry);
  state.resumeTimer.unref();
}
//@ chunk-e6aww6q8.js:238897-238970 placement
function resumeTouchTimerFired(state, reply, entry) {
  state.resumeTimer = undefined;
  touchResumedReply(state, reply, entry, Date.now()).catch(logSwallowedError);
}
//@ chunk-e6aww6q8.js:238970-239256 placement
function canTakeUpResumedReply(state, reply, entry) {
  return getLastMainThreadRequestAt() === reply.repliedAt &&
    state.header?.chainReleaseCount !== entry.chainReleaseCount &&
    !(
      state.armed?.requestId === entry.requestId && state.armed.chainReleaseCount === entry.chainReleaseCount
    ) &&
    !state.lapsedRequestIds.has(entry.requestId) &&
    keepaliveInvalidReason(entry) === undefined &&
    isSameModelIdentityKeepalive(reply.clientOptions.model, getMainLoopModel())
    ? resumeKeepaliveConfig(state, reply)
    : undefined;
}
//@ chunk-e6aww6q8.js:239256-239331 placement
function isSameModelIdentityKeepalive(model, otherModel) {
  return (
    getCanonicalName(stripAnyVersatileSuffix(model), {
      identity: true,
    }) ===
    getCanonicalName(stripAnyVersatileSuffix(otherModel), {
      identity: true,
    })
  );
}
//@ chunk-e6aww6q8.js:239331-240097 placement
/**
 * 对恢复的回复做一次 cache_touch：仍符合条件且在活动窗口内才发；失败记录原因并退避；成功则武装保活。
 */
async function touchResumedReply(state, reply, entry, now) {
  try {
    let policy = canTakeUpResumedReply(state, reply, entry);
    if (
      policy === undefined ||
      reply.repliedAt > now ||
      !hadActivityWithin(
        {
          main_request: reply.repliedAt,
        },
        now,
        policy.activityWindowMinutes * 60000,
      )
    ) {
      logKeepalive(`resumed reply left alone ${entry.requestId}`);
      return;
    }
    if (now < getKeepaliveRoute(state).skipTouchesUntil) {
      scheduleResumeTouch(state, reply, entry);
      return;
    }
    try {
      if (!(await sendTouchWithTimeout(entry, 1 / 0))) {
        logKeepalive(`resumed reply left alone ${entry.requestId}`);
        return;
      }
    } catch (error) {
      let reason = classifyTouchError(error);
      logKeepalive(`resumed touch failed: ${reason} ${entry.requestId}`);
      if (reason === "touch_error") logSwallowedError(error);
      if (entry.accountEpoch === getLimitsAccountEpoch())
        backoffAfterTouchError(state, error, reason, entry.touchIntervalMs, now);
      logKeepaliveFeature("sad", reason, true);
      return;
    }
    if (canTakeUpResumedReply(state, reply, entry) !== undefined) {
      state.lastEventAt.main_request = Math.max(state.lastEventAt.main_request ?? -1 / 0, reply.repliedAt);
      getKeepaliveRoute(state).failedRequestCount = 0;
      armKeepalive(state, entry, "cut", now);
      if (state.armed !== undefined) {
        onTouchOk(state, state.armed, now);
        logKeepaliveOk(true);
        return;
      }
    }
    logKeepaliveFeature("sad", "not_taken_up", true);
  } catch (error) {
    logKeepaliveFailure("resume_failed", error, true);
  }
}
//@ chunk-e6aww6q8.js:240097-241559 placement
/**
 * 会话恢复时续期提示缓存，按开关、记录过期、账号变化等条件决定是否发送 cache_touch。
 */
async function touchCacheOnResume(state, now) {
  let { armed } = state;
  if (armed === undefined) return;
  let isOpenStream = armed.stream === "open";
  try {
    let invalidReason = keepaliveInvalidReason(armed);
    if (invalidReason !== undefined) {
      stopKeepalive(state, invalidReason);
      return;
    }
    let keepaliveConfig = getKeepaliveConfig();
    if (keepaliveConfig === undefined) {
      stopKeepalive(state, "flag_off");
      return;
    }
    if (armed.isResumed && !keepaliveConfig.resumeTouches) {
      stopKeepalive(state, "resume_touches_off");
      return;
    }
    let windowMinutes =
      keepaliveConfig.inFlightWindowMinutes !== undefined && isWorkRunning(state.run)
        ? Math.max(keepaliveConfig.activityWindowMinutes, keepaliveConfig.inFlightWindowMinutes)
        : keepaliveConfig.activityWindowMinutes;
    let hadActivity = hadActivityWithin(state.lastEventAt, now, windowMinutes * 60000);
    if (armed.stream !== "open" && now - armed.recordRenewedAt >= RENEW_BEFORE_EXPIRY_MS) {
      state.lapsedRequestIds.add(armed.requestId);
      stopKeepalive(state, hadActivity ? "entry_lapsed" : "record_expired");
      armPendingKeepalive(state, now);
      return;
    }
    if (!hadActivity || armed.touch !== undefined || now < getKeepaliveRoute(state).skipTouchesUntil) return;
    let deadline =
      armed.stream === "open" ? 1 / 0 : Date.now() + CACHE_TTL_MS - (now - armed.recordRenewedAt);
    let { next: pending } = state;
    if (
      pending !== undefined &&
      pending.touch === undefined &&
      now + TOUCH_TIMEOUT_MS - armed.recordRenewedAt < RENEW_BEFORE_EXPIRY_MS
    ) {
      await touchThenArm(state, pending, now);
      if (
        state.armed !== armed ||
        armed.touch !== undefined ||
        now < getKeepaliveRoute(state).skipTouchesUntil
      )
        return;
    }
    if (!(await sendTouchWithTimeout(armed, deadline)) || state.armed !== armed) return;
    onTouchOk(state, armed, now);
  } catch (error) {
    if (error instanceof KeepaliveAbortError || state.armed !== armed) return;
    if (armed.accountEpoch !== getLimitsAccountEpoch()) {
      stopKeepalive(state, "account_changed");
      return;
    }
    if (
      error instanceof APIError &&
      (error.status === 400 || error.status === 403) &&
      !isOAuthTokenRevokedError(error)
    ) {
      refuseKeepalive(state, error.status === 400 ? "touch_bad_request" : "touch_refused");
      return;
    }
    let reason = classifyTouchError(error);
    logKeepalive(`touch failed: ${reason} ${armed.requestId}`);
    if (reason === "touch_not_found" && isOpenStream) return;
    backoffAfterTouchError(state, error, reason, armed.touchIntervalMs, now);
    if (reason === "touch_rate_limited") {
      armed.wasRateLimited = true;
      return;
    }
    if (reason === "touch_error" && armed.lastTouch !== reason) logSwallowedError(error);
    armed.lastTouch = reason;
    if (reason === "touch_not_found" || reason === "touch_route_not_found") {
      armed.notFoundCount += 1;
      if (armed.notFoundCount >= MAX_TOUCH_NOT_FOUND) {
        stopKeepalive(state, reason);
        armPendingKeepalive(state, now);
      }
    }
  }
}
//@ chunk-e6aww6q8.js:241559-241584 placement
class KeepaliveAbortError extends Error {}
//@ chunk-e6aww6q8.js:241584-241609 placement
class CacheTouchTimeoutError extends Error {}
//@ chunk-e6aww6q8.js:241609-241732 placement
function keepaliveRequestIds(model) {
  {
    let { next: pending, armed } = keepaliveState();
    return [pending, armed].flatMap((entry) =>
      entry !== undefined && isArmedForModel(entry, model) && isKeepaliveUsable(entry)
        ? [entry.requestId]
        : [],
    );
  }
  return [];
}
//@ chunk-e6aww6q8.js:241732-241744 placement
var USER_INPUT_HEARTBEAT_DEBOUNCE_MS = 1e4;
//@ chunk-e6aww6q8.js:241744-242017 placement
function runStateFromSpinner({ working, spinnerMode, isCompacting, delegatedWorkRunning, waitingFor }) {
  if (isCompacting)
    return {
      kind: "work",
      work: "compacting",
    };
  if (working)
    return {
      kind: "work",
      work: spinnerMode === "tool-use" && delegatedWorkRunning ? "subagent_running" : "turn_running",
    };
  return waitingFor === undefined
    ? null
    : {
        kind: "awaiting_user",
        awaiting: waitingFor,
      };
}
//@ chunk-e6aww6q8.js:242017-242134 placement
class HeartbeatShadowState {
  lastMainRequestAt = 0;
  lastEventAt = 0;
  lastUserInputMonotonic = null;
  run = null;
  interactive = false;
  interactiveLogged = false;
}
//@ chunk-e6aww6q8.js:242134-242161 placement
var heartbeatShadowSlot; // deferred: uses HeartbeatShadowState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:242134", () => {
  heartbeatShadowSlot = new HostScoped(() => new HeartbeatShadowState());
});
//@ chunk-e6aww6q8.js:242161-242199 placement
function heartbeatShadow() {
  return heartbeatShadowSlot.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:242199-242247 placement
/**
 * 导出函数 `isDapperDawnEnabled`：返回 getFeatureValue_CACHED_MAY_BE_STALE("tengu_dapper_dawn", !1)。
 */
function isDapperDawnEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_dapper_dawn", false);
}
//@ chunk-e6aww6q8.js:242247-242365 placement
function resetHeartbeatShadow(shadow) {
  shadow.lastMainRequestAt = 0;
  shadow.lastEventAt = 0;
  shadow.lastUserInputMonotonic = null;
  shadow.run = null;
  shadow.interactiveLogged = false;
}
//@ chunk-e6aww6q8.js:242365-242912 placement
/**
 * 记录 tengu_cache_heartbeat_shadow 影子事件（运行状态、距上次事件/主请求的时间、是否交互），用于评估缓存心跳策略。
 */
function logHeartbeatShadow(kind, { now, run, mainRequestAt }) {
  let shadow = heartbeatShadow();
  if (shadow.lastMainRequestAt === 0) return false;
  let lastMainRequestId = getLastMainRequestId();
  if (lastMainRequestId === undefined) {
    resetHeartbeatShadow(shadow);
    return false;
  }
  let mainRequestAtFallback = mainRequestAt ?? shadow.lastMainRequestAt;
  logEvent("tengu_cache_heartbeat_shadow", {
    kind: fromEnum(kind),
    work: fromEnumOpt(run?.kind === "work" ? run.work : undefined),
    awaiting: fromEnumOpt(run?.kind === "awaiting_user" ? run.awaiting : undefined),
    sinceLastEventMs: shadow.lastEventAt === 0 ? undefined : Math.max(0, now - shadow.lastEventAt),
    sinceLastMainRequestMs:
      mainRequestAtFallback === 0 ? undefined : Math.max(0, now - mainRequestAtFallback),
    requestId: sanitizeMarkName(lastMainRequestId),
    interactive: shadow.interactiveLogged ? undefined : shadow.interactive,
  });
  shadow.interactiveLogged = true;
  shadow.lastEventAt = now;
  return true;
}
//@ chunk-e6aww6q8.js:242912-243031 placement
var RUN_EVENT_NAMES = {
  work: {
    start: "work_start",
    end: "work_end",
  },
  awaiting_user: {
    start: "awaiting_user_start",
    end: "awaiting_user_end",
  },
};
//@ chunk-e6aww6q8.js:243031-243085 placement
function logRunStateChange(run, phase, now) {
  logHeartbeatShadow(RUN_EVENT_NAMES[run.kind][phase], {
    now,
    run,
  });
}
//@ chunk-e6aww6q8.js:243085-243270 placement
/**
 * 切换交互状态：离开交互时结束当前运行计时并记录。
 */
function setInteractive(isInteractive, options) {
  try {
    if (!isInteractive) recordRunState(null, options?.now ?? Date.now());
    let shadow = heartbeatShadow();
    shadow.interactive = isInteractive;
    if (!isInteractive && shadow.run !== null) {
      let run = shadow.run;
      shadow.run = null;
      if (isDapperDawnEnabled()) logRunStateChange(run, "end", options?.now ?? Date.now());
    }
  } catch (error) {
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:243270-243513 placement
function onMainRequestLogged({ isMainLoop, now }) {
  try {
    if (!isMainLoop || !isDapperDawnEnabled()) return;
    if (getLastMainRequestId() === undefined) return;
    let shadow = heartbeatShadow();
    let lastMainRequestAt = shadow.lastMainRequestAt;
    shadow.lastMainRequestAt = now;
    if (
      logHeartbeatShadow("main_request", {
        now,
        mainRequestAt: lastMainRequestAt,
      }) &&
      lastMainRequestAt === 0 &&
      shadow.run !== null
    )
      logRunStateChange(shadow.run, "start", now);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:243513-243794 placement
/**
 * 记录用户输入事件（限频），用于空闲与活跃统计。
 */
function onUserInput(options) {
  try {
    recordActivityEvent("user_input", options?.now ?? Date.now());
    if (!isDapperDawnEnabled()) return;
    let shadow = heartbeatShadow();
    let monotonic = options?.monotonic ?? performance.now();
    if (
      shadow.lastUserInputMonotonic !== null &&
      monotonic - shadow.lastUserInputMonotonic < USER_INPUT_HEARTBEAT_DEBOUNCE_MS
    )
      return;
    if (
      logHeartbeatShadow("user_input", {
        now: options?.now ?? Date.now(),
      })
    )
      shadow.lastUserInputMonotonic = monotonic;
  } catch (error) {
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:243794-244022 placement
/**
 * 加载动画状态变化时切换运行计时：结束旧的运行、开始新的运行。
 */
function onSpinnerStateChange(spinnerState, options) {
  try {
    let nextRun = runStateFromSpinner(spinnerState);
    recordRunState(nextRun, options?.now ?? Date.now());
    if (!isDapperDawnEnabled()) return;
    let shadow = heartbeatShadow();
    if (sameRunState(nextRun, shadow.run)) return;
    let run = shadow.run;
    shadow.run = nextRun;
    let now = options?.now ?? Date.now();
    if (run !== null) logRunStateChange(run, "end", now);
    if (nextRun !== null) logRunStateChange(nextRun, "start", now);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:244022-244110 placement
function endHeartbeatShadow(kind, options) {
  try {
    if (isDapperDawnEnabled())
      logHeartbeatShadow(kind, {
        now: options?.now ?? Date.now(),
      });
    resetHeartbeatShadow(heartbeatShadow());
  } catch (error) {
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:244207-244245 placement
/**
 * 导出函数 `endMaintenanceAtSubagentEnd`：参数 e。
 */
function endMaintenanceAtSubagentEnd(lastRequestId) {
  gracefulShutdown_2("subagent_end", lastRequestId);
}
//@ chunk-e6aww6q8.js:244245-244286 placement
/**
 * 导出函数 `endMaintenanceAndForget`：参数 e。
 */
function endMaintenanceAndForget(reason) {
  gracefulShutdown_2(reason, getLastMainRequestId());
  endHeartbeatShadow(reason);
  forgetLastMainRequestId();
}
//@ chunk-e6aww6q8.js:244286-244366 placement
function onLastMainRequestReplaced(requestId) {
  if (getLastMainRequestId() !== requestId) return;
  if (requestId === undefined) {
    forgetLastMainRequestId();
    return;
  }
  endMaintenanceAndForget("compaction");
}
export {
  endMaintenanceAtSubagentEnd,
  withKeepaliveReset,
  onUserInput,
  isDapperDawnEnabled,
  isKeepaliveArmed,
  onSpinnerStateChange,
  setInteractive,
  keepaliveRequestIds,
  releaseKeepaliveChain,
  getModelSwitchCount,
  evaluateCacheKeepalive,
  onKeepaliveHeaderRejected,
  onMainResponseEnd,
  endMaintenanceAndForget,
  onKeepaliveModelSwitch,
  onLastMainRequestReplaced,
  onMainRequestLogged,
  stageResumeKeepalive,
};
