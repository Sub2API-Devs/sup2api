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
import { u, literal, E, M } from "../../../vendor/zod/v4/classic/schemas.js";
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

//@ chunk-e6aww6q8.js:227793-228288 placement
/**
 * 缓存保活（cache keepalive）的常量与开关 schema：touch 端点、10 s 超时、3 次失败上限、5 分钟 TTL 与提前续期余量、拒用窗口 1 小时、客户端最大复用 4 分钟、活动事件名，以及配置字段。
 */
var TENGU_SEQUENTIAL_CLOUD = "tengu_sequential_cloud";
var ANTHROPIC_CACHE_KEEPALIVE = "anthropic-cache-keepalive";
var CACHE_TOUCH_PATH = "/v1/messages/cache_touch";
var TOUCH_TIMEOUT_MS = 1e4;
var MAX_TOUCH_NOT_FOUND = 3;
var MAX_FAILED_REQUESTS = 3;
var MAX_MISSING_RECORDS = 3;
var CACHE_TTL_MS = CACHE_TTL_5M_MS;
var RENEW_BEFORE_EXPIRY_MS = CACHE_TTL_MS - TOUCH_TIMEOUT_MS;
var REFUSAL_WINDOW_MS = 3600000;
var MAX_CLIENT_AGE_MS = 240000;
var ACTIVITY_EVENT_NAMES = [
  "main_request",
  "user_input",
  "work_start",
  "work_end",
  "awaiting_user_start",
  "awaiting_user_end",
];
var keepaliveConfigSchema = DoctorLazy(() =>
  u({
    enabled: literal(true),
    touchIntervalSeconds: E().min(10).max(120).default(30),
    activityWindowMinutes: E().min(1).max(1440).default(60),
    inFlightWindowMinutes: E().min(1).max(1440).optional(),
    resumeTouches: M().default(false).catch(false),
  }),
);
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
var cacheKeepaliveStateSlot = new HostScoped(() => new CacheKeepaliveState());
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
function hadActivityWithin(e, n, r) {
  return ACTIVITY_EVENT_NAMES.some((s) => {
    let h = e[s];
    return h !== undefined && n - h <= r;
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
function isRouteMissingRecords(e) {
  return getKeepaliveRoute(e).missingRecordCount >= MAX_MISSING_RECORDS;
}
//@ chunk-e6aww6q8.js:229234-229345 placement
function isSubscriberHourCache(e, n) {
  return (
    e?.ttl === "1h" &&
    e.reason === "subscriber" &&
    isCacheKeepaliveAllowed() &&
    !(n && (isUsageBasedBilling() || getCurrentLimits().isUsingOverage === true))
  );
}
//@ chunk-e6aww6q8.js:229345-229479 placement
function getKeepaliveConfig() {
  {
    let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SEQUENTIAL_CLOUD, false);
    if (typeof featureValue_CACHED_MAY_BE_STALE !== "object" || featureValue_CACHED_MAY_BE_STALE === null)
      return;
    let n = keepaliveConfigSchema().safeParse(featureValue_CACHED_MAY_BE_STALE);
    return n.success ? n.data : undefined;
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
    let h = isMainLoopRequest || continuesPrefix;
    let y = undefined;
    let S = false;
    try {
      if (isMainLoopRequest) {
        let L = keepaliveState();
        let mainChainReleaseCount = getMainChainReleaseCount();
        let header = L.header;
        y =
          header?.chainReleaseCount === mainChainReleaseCount
            ? header
            : {
                chainReleaseCount: mainChainReleaseCount,
                isSent: false,
              };
        let Z = y !== header;
        L.header = y;
        if (Z) {
          forgetBeta(conversation, BETA_CACHE_KEEPALIVE);
          if (L.armed !== undefined) stopKeepalive(L, "chain_released");
        } else if (!y.isSent) markBetaRejected(conversation, BETA_CACHE_KEEPALIVE);
        if (!isBetaRejected_2(conversation, BETA_CACHE_KEEPALIVE)) {
          let Se = isSubscriberHourCache(cacheTtl, Z);
          let ke = Se && getKeepaliveConfig() !== undefined;
          S = Z && ke;
          if (!ke) {
            markBetaRejected(conversation, BETA_CACHE_KEEPALIVE);
            if (Se && !Z) logKeepalive("off for this chain: flag off", "warn");
          } else if (Z && isRouteMissingRecords(L)) {
            getKeepaliveRoute(L).missingRecordCount = 0;
            markBetaRejected(conversation, BETA_CACHE_KEEPALIVE);
            logKeepalive("off for this chain: no records", "warn");
            logKeepaliveFeature("bad", "records_missing");
          } else markBetaSent(conversation, BETA_CACHE_KEEPALIVE);
        }
        y.isSent = isBetaSent(conversation, BETA_CACHE_KEEPALIVE);
      }
    } catch (error) {
      if (y?.isSent ?? isBetaSent(conversation, BETA_CACHE_KEEPALIVE))
        markBetaSent(conversation, BETA_CACHE_KEEPALIVE);
      else markBetaRejected(conversation, BETA_CACHE_KEEPALIVE);
      logKeepaliveFailure("header_decision_failed", error);
    }
    let w = false;
    if (h && isBetaSent(conversation, BETA_CACHE_KEEPALIVE)) {
      try {
        w = !getKeepaliveRoute(keepaliveState()).refused && canSendFirstPartyBetas();
      } catch (error) {
        logKeepaliveFailure("header_gate_failed", error);
      }
      if (!w && y !== undefined) {
        y.isSent = false;
        markBetaRejected(conversation, BETA_CACHE_KEEPALIVE);
      }
    }
    if (S) logKeepalive(`header ${w ? "on" : "off"} for this chain`);
    if (w && y !== undefined) renewMainCacheLifeNow(CACHE_TTL_MS);
    return w;
  }
  return false;
}
//@ chunk-e6aww6q8.js:230419-230453 placement
/**
 * 导出函数 `withKeepaliveReset`：参数 e，返回 (Xg(e, DO), e)。
 */
function withKeepaliveReset(e) {
  markBetaRejected(e, BETA_CACHE_KEEPALIVE);
  return e;
}
//@ chunk-e6aww6q8.js:230453-230581 placement
function onKeepaliveHeaderRejected(conversation, limitsAccountEpoch, r) {
  markBetaRejected(conversation, BETA_CACHE_KEEPALIVE);
  try {
    if (r) renewMainCacheLifeNow(CACHE_TTL_1H_MS);
    if (limitsAccountEpoch === getLimitsAccountEpoch()) refuseKeepalive(keepaliveState(), "header_rejected");
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
    let q = keepaliveState();
    q.lastEventAt.main_request = now;
    let Z = q.conversation === conversation;
    q.conversation = conversation;
    q.next = undefined;
    if (!headerSent) {
      stopKeepalive(q, "request_without_header");
      return;
    }
    let Se = headers?.get(ANTHROPIC_CACHE_KEEPALIVE) === "active";
    if (chainReleaseCount === getMainChainReleaseCount())
      renewMainCacheLifeNow(Se ? CACHE_TTL_MS : CACHE_TTL_1H_MS);
    if (!isBetaSent(conversation, BETA_CACHE_KEEPALIVE)) {
      stopKeepalive(q, "conversation_header_off");
      return;
    }
    if (!Se) {
      stopKeepalive(q, "response_not_active");
      logKeepalive(`response not active ${requestId}`);
      return;
    }
    let ke = keepaliveInvalidReason({
      chainReleaseCount,
      accountEpoch,
      modelSwitchCount,
      isResumed: false,
    });
    if (ke !== undefined) {
      stopKeepalive(q, ke);
      return;
    }
    let keepaliveConfig = getKeepaliveConfig();
    if (keepaliveConfig === undefined) {
      stopKeepalive(q, "flag_off");
      return;
    }
    if (!isSessionsToken(requestId)) {
      refuseKeepalive(q, "response_without_request_id");
      return;
    }
    let Ee = {
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
    let { armed } = q;
    if (armed?.stream === "open") {
      armed.stream = "cut";
      armed.recordRenewedAt = now;
    }
    if (
      !isWhole &&
      armed !== undefined &&
      Z &&
      armed.chainReleaseCount === chainReleaseCount &&
      armed.accountEpoch === accountEpoch &&
      isArmedForModel(armed, clientOptions.model) &&
      (armed.stream === "complete" || armed.lastTouch === "ok")
    ) {
      q.next = Ee;
      return;
    }
    armKeepalive(q, Ee, isWhole ? "complete" : "open", now);
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
    let s = keepaliveState();
    s.lastEventAt.main_request = now;
    let { armed, next: y } = s;
    if (y !== undefined && y.requestId === requestId) {
      s.next = undefined;
      if ((complete || armed === undefined || armed.lastTouch === "touch_not_found") && isKeepaliveUsable(y))
        armKeepalive(s, y, complete ? "complete" : "cut", now);
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
    let { sessionId, requestId, ...y } = reply;
    if (
      sessionId === undefined ||
      !isSessionsToken(requestId) ||
      containsProviderId(requestId) ||
      typeof y.clientOptions.model !== "string"
    )
      return;
    let S = {
      sessionId,
      requestId,
      ...y,
    };
    if (resumeKeepaliveConfig(state, S) === undefined) return;
    state.resumeStaged = {
      reply: S,
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
function onKeepaliveModelSwitch(host, n, r) {
  try {
    if (isSameModelIdentityKeepalive(n, r)) return;
    let s = cacheKeepaliveStateSlot.of(host);
    s.modelSwitchCount += 1;
    let { armed, next: y } = s;
    if (y !== undefined)
      if (isSameModelIdentityKeepalive(y.clientOptions.model, r)) y.modelSwitchCount = s.modelSwitchCount;
      else s.next = undefined;
    if (armed !== undefined)
      if (isSameModelIdentityKeepalive(armed.clientOptions.model, r))
        armed.modelSwitchCount = s.modelSwitchCount;
      else stopKeepalive(s, "model_changed");
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
function recordActivityEvent(e, n) {
  keepaliveState().lastEventAt[e] = n;
}
//@ chunk-e6aww6q8.js:232953-233179 placement
function recordRunState(e, n) {
  {
    let r = keepaliveState();
    if (sameRunState(r.run, e)) return;
    if (r.run !== null) r.lastEventAt[r.run.kind === "work" ? "work_end" : "awaiting_user_end"] = n;
    if (e !== null) r.lastEventAt[e.kind === "work" ? "work_start" : "awaiting_user_start"] = n;
    r.run = e;
  }
}
//@ chunk-e6aww6q8.js:233179-233338 placement
function sameRunState(e, n) {
  if (e === null || n === null) return e === n;
  return e.kind === "work"
    ? n.kind === "work" && e.work === n.work
    : n.kind === "awaiting_user" && e.awaiting === n.awaiting;
}
//@ chunk-e6aww6q8.js:233338-233662 placement
/**
 * 武装缓存保活发送器：停掉旧的、按 touchIntervalMs 定时发送 cache_touch，记录流状态与续期时间。
 */
function armKeepalive(state, entry, stream, now) {
  let h = state.armed !== undefined;
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
  if (!h) logKeepalive("sender started");
}
//@ chunk-e6aww6q8.js:233662-233715 placement
function isKeepaliveUsable(e) {
  return keepaliveInvalidReason(e) === undefined && getKeepaliveConfig() !== undefined;
}
//@ chunk-e6aww6q8.js:233715-233799 placement
function isArmedForModel(e, n) {
  return e.clientOptions.model === n && e.lastTouch !== "touch_not_found";
}
//@ chunk-e6aww6q8.js:233799-233902 placement
function armPendingKeepalive(e, n) {
  let { next: r } = e;
  if (e.armed === undefined && r !== undefined && isKeepaliveUsable(r)) {
    e.next = undefined;
    armKeepalive(e, r, "open", n);
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
  let r = disarmKeepalive(state, reason);
  if (r === undefined || r.accountEpoch !== getLimitsAccountEpoch()) return;
  if (r.lastTouch === undefined || r.lastTouch === "ok") {
    if (r.lastTouch === undefined && r.wasRateLimited) logKeepaliveFeature("sad", "touch_rate_limited");
    else if (
      reason === "entry_lapsed" ||
      reason === "flag_off" ||
      reason === "resume_touches_off" ||
      reason === "not_allowed" ||
      reason === "model_changed"
    )
      logKeepaliveFeature("sad", reason);
    else if (r.lastTouch === "ok") logKeepaliveOk();
    return;
  }
  let keepaliveRoute = getKeepaliveRoute(state);
  if (r.lastTouch === "touch_not_found") {
    keepaliveRoute.failedRequestCount = 0;
    if (r.stream === "complete") keepaliveRoute.missingRecordCount += 1;
  } else {
    keepaliveRoute.failedRequestCount += 1;
    if (keepaliveRoute.failedRequestCount >= MAX_FAILED_REQUESTS) {
      refuseKeepalive(state, r.lastTouch, REFUSAL_WINDOW_MS);
      return;
    }
  }
  logKeepaliveFeature("sad", r.lastTouch);
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
function logKeepalive(e, level = "debug") {
  try {
    logForDebugging(`[cache-keepalive] ${e}`, {
      level,
    });
  } catch {}
}
//@ chunk-e6aww6q8.js:235146-235233 placement
function logKeepaliveOk(e = false) {
  try {
    logFeatureOk(e ? "api_cache_keepalive_resume" : "api_cache_keepalive");
  } catch {}
}
//@ chunk-e6aww6q8.js:235233-235401 placement
function logKeepaliveFeature(e, n, r = false) {
  try {
    if (e === "sad") logFeatureSad(r ? "api_cache_keepalive_resume" : "api_cache_keepalive", n);
    else logFeatureBad(r ? "api_cache_keepalive_resume" : "api_cache_keepalive", n);
  } catch {}
}
//@ chunk-e6aww6q8.js:235401-235433 placement
function logSwallowedError(error) {
  try {
    logError(error);
  } catch {}
}
//@ chunk-e6aww6q8.js:235433-235475 placement
function logKeepaliveFailure(e, error, r = false) {
  logSwallowedError(error);
  logKeepaliveFeature("bad", e, r);
}
//@ chunk-e6aww6q8.js:235475-235519 placement
function resumeTouchLoop(e) {
  touchCacheOnResume(e, Date.now()).catch(logSwallowedError);
}
//@ chunk-e6aww6q8.js:235519-235552 placement
function abortWithTouchTimeout(e) {
  e.abort(new CacheTouchTimeoutError());
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
  let h = {
    controller: abortController,
    timeout: timer,
  };
  entry.touch = h;
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
    if (entry.touch === h) {
      clearTimeout(timer);
      entry.touch = undefined;
    }
  }
}
//@ chunk-e6aww6q8.js:237101-237426 placement
/**
 * 缓存续期成功后更新记录（续期时间、清零失败计数），满足条件时安排下一次续期。
 */
function onTouchOk(e, armed, r) {
  armed.recordRenewedAt = Math.max(armed.recordRenewedAt, r);
  armed.notFoundCount = 0;
  armed.lastTouch = "ok";
  if (armed.accountEpoch === getLimitsAccountEpoch()) {
    let keepaliveRoute = getKeepaliveRoute(e);
    keepaliveRoute.failedRequestCount = 0;
    keepaliveRoute.missingRecordCount = 0;
  }
  if (
    !armed.isResumed &&
    e.header?.isSent === true &&
    armed.chainReleaseCount === getMainChainReleaseCount() &&
    getCurrentLimits().isUsingOverage !== true
  )
    renewMainCacheLife(undefined, r);
  logKeepalive(`touch ok ${armed.requestId}`);
}
//@ chunk-e6aww6q8.js:237426-237456 placement
function renewMainCacheLifeNow(e) {
  renewMainCacheLife(e, undefined);
}
//@ chunk-e6aww6q8.js:237456-237588 placement
function renewMainCacheLife(e, n) {
  try {
    if (getLastMainThreadRequestAt() === null) return;
    if (e !== undefined) adjustLastMainThreadCacheTtlMs(e);
    if (n !== undefined) {
      recordLastMainThreadCacheRenewal(n);
      touchPromptCache(MAIN_2, n);
    }
  } catch (error) {
    logKeepaliveFailure("cache_life_failed", error);
  }
}
//@ chunk-e6aww6q8.js:237588-237799 placement
function backoffAfterTouchError(e, error, r, touchIntervalMs, now) {
  if (error instanceof APIError && (r === "touch_rate_limited" || r === "touch_server_error")) {
    let y = error.headers && parseRetryAfterMs(error.headers, now);
    getKeepaliveRoute(e).skipTouchesUntil =
      now + Math.min(y !== undefined && y > 0 ? y : Math.min(touchIntervalMs * 1.5, 60000), CACHE_TTL_MS);
  }
}
//@ chunk-e6aww6q8.js:237799-238120 placement
/**
 * 恢复会话后先续期一次再武装保活；失败时按错误分类处理，成功后转为已武装并更新记录。
 */
async function touchThenArm(e, entry, r) {
  try {
    if (!(await sendTouchWithTimeout(entry, 1 / 0))) return;
  } catch (error) {
    if (e.next === entry && entry.accountEpoch === getLimitsAccountEpoch()) {
      let h = classifyTouchError(error);
      logKeepalive(`touch failed: ${h} ${entry.requestId}`);
      backoffAfterTouchError(e, error, h, entry.touchIntervalMs, r);
    }
    return;
  }
  if (e.next !== entry || !isKeepaliveUsable(entry)) return;
  e.next = undefined;
  getKeepaliveRoute(e).failedRequestCount = 0;
  armKeepalive(e, entry, "open", r);
  if (e.armed !== undefined) onTouchOk(e, e.armed, r);
}
//@ chunk-e6aww6q8.js:238120-238190 placement
function stopResumeStaged(e) {
  e.resumeStaged?.stopListening();
  e.resumeStaged = undefined;
}
//@ chunk-e6aww6q8.js:238190-238300 placement
function resumeKeepaliveConfig(e, n) {
  let r = isSubscriberHourCache(n.cacheTtlOf(getMainLoopModel()), true) ? getKeepaliveConfig() : undefined;
  return r?.resumeTouches === true && !isRouteMissingRecords(e) ? r : undefined;
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
function scheduleResumeTouch(state, reply, r) {
  state.resumeTimer = setTimeout(resumeTouchTimerFired, r.touchIntervalMs, state, reply, r);
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
function isSameModelIdentityKeepalive(model, n) {
  return (
    getCanonicalName(stripAnyVersatileSuffix(model), {
      identity: true,
    }) ===
    getCanonicalName(stripAnyVersatileSuffix(n), {
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
    let h = canTakeUpResumedReply(state, reply, entry);
    if (
      h === undefined ||
      reply.repliedAt > now ||
      !hadActivityWithin(
        {
          main_request: reply.repliedAt,
        },
        now,
        h.activityWindowMinutes * 60000,
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
      let S = classifyTouchError(error);
      logKeepalive(`resumed touch failed: ${S} ${entry.requestId}`);
      if (S === "touch_error") logSwallowedError(error);
      if (entry.accountEpoch === getLimitsAccountEpoch())
        backoffAfterTouchError(state, error, S, entry.touchIntervalMs, now);
      logKeepaliveFeature("sad", S, true);
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
async function touchCacheOnResume(e, n) {
  let { armed } = e;
  if (armed === undefined) return;
  let s = armed.stream === "open";
  try {
    let h = keepaliveInvalidReason(armed);
    if (h !== undefined) {
      stopKeepalive(e, h);
      return;
    }
    let keepaliveConfig = getKeepaliveConfig();
    if (keepaliveConfig === undefined) {
      stopKeepalive(e, "flag_off");
      return;
    }
    if (armed.isResumed && !keepaliveConfig.resumeTouches) {
      stopKeepalive(e, "resume_touches_off");
      return;
    }
    let S =
      keepaliveConfig.inFlightWindowMinutes !== undefined && isWorkRunning(e.run)
        ? Math.max(keepaliveConfig.activityWindowMinutes, keepaliveConfig.inFlightWindowMinutes)
        : keepaliveConfig.activityWindowMinutes;
    let w = hadActivityWithin(e.lastEventAt, n, S * 60000);
    if (armed.stream !== "open" && n - armed.recordRenewedAt >= RENEW_BEFORE_EXPIRY_MS) {
      e.lapsedRequestIds.add(armed.requestId);
      stopKeepalive(e, w ? "entry_lapsed" : "record_expired");
      armPendingKeepalive(e, n);
      return;
    }
    if (!w || armed.touch !== undefined || n < getKeepaliveRoute(e).skipTouchesUntil) return;
    let deadline = armed.stream === "open" ? 1 / 0 : Date.now() + CACHE_TTL_MS - (n - armed.recordRenewedAt);
    let { next: G } = e;
    if (
      G !== undefined &&
      G.touch === undefined &&
      n + TOUCH_TIMEOUT_MS - armed.recordRenewedAt < RENEW_BEFORE_EXPIRY_MS
    ) {
      await touchThenArm(e, G, n);
      if (e.armed !== armed || armed.touch !== undefined || n < getKeepaliveRoute(e).skipTouchesUntil) return;
    }
    if (!(await sendTouchWithTimeout(armed, deadline)) || e.armed !== armed) return;
    onTouchOk(e, armed, n);
  } catch (error) {
    if (error instanceof KeepaliveAbortError || e.armed !== armed) return;
    if (armed.accountEpoch !== getLimitsAccountEpoch()) {
      stopKeepalive(e, "account_changed");
      return;
    }
    if (
      error instanceof APIError &&
      (error.status === 400 || error.status === 403) &&
      !isOAuthTokenRevokedError(error)
    ) {
      refuseKeepalive(e, error.status === 400 ? "touch_bad_request" : "touch_refused");
      return;
    }
    let y = classifyTouchError(error);
    logKeepalive(`touch failed: ${y} ${armed.requestId}`);
    if (y === "touch_not_found" && s) return;
    backoffAfterTouchError(e, error, y, armed.touchIntervalMs, n);
    if (y === "touch_rate_limited") {
      armed.wasRateLimited = true;
      return;
    }
    if (y === "touch_error" && armed.lastTouch !== y) logSwallowedError(error);
    armed.lastTouch = y;
    if (y === "touch_not_found" || y === "touch_route_not_found") {
      armed.notFoundCount += 1;
      if (armed.notFoundCount >= MAX_TOUCH_NOT_FOUND) {
        stopKeepalive(e, y);
        armPendingKeepalive(e, n);
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
    let { next: n, armed } = keepaliveState();
    return [n, armed].flatMap((s) =>
      s !== undefined && isArmedForModel(s, model) && isKeepaliveUsable(s) ? [s.requestId] : [],
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
var heartbeatShadowSlot = new HostScoped(() => new HeartbeatShadowState());
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
function resetHeartbeatShadow(e) {
  e.lastMainRequestAt = 0;
  e.lastEventAt = 0;
  e.lastUserInputMonotonic = null;
  e.run = null;
  e.interactiveLogged = false;
}
//@ chunk-e6aww6q8.js:242365-242912 placement
/**
 * 记录 tengu_cache_heartbeat_shadow 影子事件（运行状态、距上次事件/主请求的时间、是否交互），用于评估缓存心跳策略。
 */
function logHeartbeatShadow(kind, { now, run, mainRequestAt }) {
  let h = heartbeatShadow();
  if (h.lastMainRequestAt === 0) return false;
  let lastMainRequestId = getLastMainRequestId();
  if (lastMainRequestId === undefined) {
    resetHeartbeatShadow(h);
    return false;
  }
  let S = mainRequestAt ?? h.lastMainRequestAt;
  logEvent("tengu_cache_heartbeat_shadow", {
    kind: fromEnum(kind),
    work: fromEnumOpt(run?.kind === "work" ? run.work : undefined),
    awaiting: fromEnumOpt(run?.kind === "awaiting_user" ? run.awaiting : undefined),
    sinceLastEventMs: h.lastEventAt === 0 ? undefined : Math.max(0, now - h.lastEventAt),
    sinceLastMainRequestMs: S === 0 ? undefined : Math.max(0, now - S),
    requestId: sanitizeMarkName(lastMainRequestId),
    interactive: h.interactiveLogged ? undefined : h.interactive,
  });
  h.interactiveLogged = true;
  h.lastEventAt = now;
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
function logRunStateChange(run, n, now) {
  logHeartbeatShadow(RUN_EVENT_NAMES[run.kind][n], {
    now,
    run,
  });
}
//@ chunk-e6aww6q8.js:243085-243270 placement
/**
 * 切换交互状态：离开交互时结束当前运行计时并记录。
 */
function setInteractive(e, n) {
  try {
    if (!e) recordRunState(null, n?.now ?? Date.now());
    let r = heartbeatShadow();
    r.interactive = e;
    if (!e && r.run !== null) {
      let run = r.run;
      r.run = null;
      if (isDapperDawnEnabled()) logRunStateChange(run, "end", n?.now ?? Date.now());
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
    let r = heartbeatShadow();
    let lastMainRequestAt = r.lastMainRequestAt;
    r.lastMainRequestAt = now;
    if (
      logHeartbeatShadow("main_request", {
        now,
        mainRequestAt: lastMainRequestAt,
      }) &&
      lastMainRequestAt === 0 &&
      r.run !== null
    )
      logRunStateChange(r.run, "start", now);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:243513-243794 placement
/**
 * 记录用户输入事件（限频），用于空闲与活跃统计。
 */
function onUserInput(e) {
  try {
    recordActivityEvent("user_input", e?.now ?? Date.now());
    if (!isDapperDawnEnabled()) return;
    let n = heartbeatShadow();
    let r = e?.monotonic ?? performance.now();
    if (n.lastUserInputMonotonic !== null && r - n.lastUserInputMonotonic < USER_INPUT_HEARTBEAT_DEBOUNCE_MS)
      return;
    if (
      logHeartbeatShadow("user_input", {
        now: e?.now ?? Date.now(),
      })
    )
      n.lastUserInputMonotonic = r;
  } catch (error) {
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:243794-244022 placement
/**
 * 加载动画状态变化时切换运行计时：结束旧的运行、开始新的运行。
 */
function onSpinnerStateChange(e, n) {
  try {
    let r = runStateFromSpinner(e);
    recordRunState(r, n?.now ?? Date.now());
    if (!isDapperDawnEnabled()) return;
    let s = heartbeatShadow();
    if (sameRunState(r, s.run)) return;
    let run = s.run;
    s.run = r;
    let y = n?.now ?? Date.now();
    if (run !== null) logRunStateChange(run, "end", y);
    if (r !== null) logRunStateChange(r, "start", y);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:244022-244110 placement
function endHeartbeatShadow(kind, n) {
  try {
    if (isDapperDawnEnabled())
      logHeartbeatShadow(kind, {
        now: n?.now ?? Date.now(),
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
function endMaintenanceAtSubagentEnd(requestId) {
  gracefulShutdown_2("subagent_end", requestId);
}
//@ chunk-e6aww6q8.js:244245-244286 placement
/**
 * 导出函数 `endMaintenanceAndForget`：参数 e。
 */
function endMaintenanceAndForget(e) {
  gracefulShutdown_2(e, getLastMainRequestId());
  endHeartbeatShadow(e);
  forgetLastMainRequestId();
}
//@ chunk-e6aww6q8.js:244286-244366 placement
function onLastMainRequestReplaced(e) {
  if (getLastMainRequestId() !== e) return;
  if (e === undefined) {
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
