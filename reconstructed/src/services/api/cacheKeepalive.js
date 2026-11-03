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
import { CACHE_TTL_5M_MS, oR, touchPromptCache, MAIN as MAIN_2 } from "./promptCacheBreakDetection.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, T, E, M } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { canSendFirstPartyBetas, DO, betaHeaderValues, UEe } from "../../utils/betas.js";
import { isClaudeAISubscriber } from "../../utils/auth.js";
import { isPolicyAllowed as isPolicyAllowed_3 } from "../policyLimits/policyEvidence.js";
import { lD } from "../../utils/planTiers.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { IDt, Xg, Lp, eB, lT } from "../../bootstrap/stateSlices.js";
import { isSessionsToken } from "../oauth/sessionsBearerHooks.js";
import { Uue } from "./providerIds.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import { logError } from "../../utils/log.js";
import { Ot } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { isOAuthTokenRevokedError } from "./withRetry.js";
import { getAnthropicClient } from "./client.js";
import { mainAgentContext } from "../../utils/agentContext.js";
import { assertProviderAllowed } from "../../utils/model/allowedProviders.js";
import { parseRetryAfterMs } from "./retryAfter.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { Bn } from "../../utils/model/modelIds.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum, fromEnumOpt } from "../analytics/safeMetadata.js";
import { ye } from "../../utils/startupMarks.js";
import { gracefulShutdown_2 } from "../../utils/gracefulShutdown.js";

//@ chunk-e6aww6q8.js:227793-228288 placement
var TENGU_SEQUENTIAL_CLOUD = "tengu_sequential_cloud",
  ANTHROPIC_CACHE_KEEPALIVE = "anthropic-cache-keepalive",
  puo = "/v1/messages/cache_touch",
  j$e = 1e4,
  muo = 3,
  yuo = 3,
  kuo = 3,
  R9 = CACHE_TTL_5M_MS,
  GRt = R9 - j$e,
  buo = 3600000,
  Ruo = 240000,
  Cuo = ["main_request", "user_input", "work_start", "work_end", "awaiting_user_start", "awaiting_user_end"],
  Auo = DoctorLazy(() =>
    u({
      enabled: T(!0),
      touchIntervalSeconds: E().min(10).max(120).default(30),
      activityWindowMinutes: E().min(1).max(1440).default(60),
      inFlightWindowMinutes: E().min(1).max(1440).optional(),
      resumeTouches: M().default(!1).catch(!1),
    }),
  );
//@ chunk-e6aww6q8.js:228288-228477 placement
class CacheKeepaliveState {
  armed = void 0;
  next = void 0;
  resumeStaged = void 0;
  resumeTimer = void 0;
  lapsedRequestIds = new Set();
  modelSwitchCount = 0;
  conversation = void 0;
  header = void 0;
  route = void 0;
  run = null;
  lastEventAt = {};
}
//@ chunk-e6aww6q8.js:228477-228504 placement
var JRt = new HostScoped(() => new CacheKeepaliveState());
//@ chunk-e6aww6q8.js:228504-228542 placement
function Fw() {
  return JRt.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:228542-228797 placement
function getKeepaliveRoute(state) {
  let n = getLimitsAccountEpoch();
  if (
    state.route?.accountEpoch !== n ||
    (state.route.refusalEndsAt !== void 0 && Date.now() >= state.route.refusalEndsAt)
  )
    state.route = {
      accountEpoch: n,
      failedRequestCount: 0,
      missingRecordCount: 0,
      skipTouchesUntil: 0,
      refused: !1,
      refusalEndsAt: void 0,
    };
  return state.route;
}
//@ chunk-e6aww6q8.js:228797-228878 placement
function ZRt(e, n, r) {
  return Cuo.some((s) => {
    let h = e[s];
    return h !== void 0 && n - h <= r;
  });
}
//@ chunk-e6aww6q8.js:228878-229025 placement
function isWorkRunning(e) {
  if (e === null || e.kind !== "work") return !1;
  switch (e.work) {
    case "turn_running":
    case "subagent_running":
      return !0;
    case "compacting":
      return !1;
  }
}
/**
 * 缓存保活是否可用：未被拒绝、交互会话、第一方 Anthropic 地址与 beta、claude.ai 订阅、未禁用非必要流量，且策略允许 allow_cache_keepalive。
 */
//@ chunk-e6aww6q8.js:229025-229181 placement
function isCacheKeepaliveAllowed() {
  return (
    !getKeepaliveRoute(Fw()).refused &&
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
function aCt(e) {
  return getKeepaliveRoute(e).missingRecordCount >= kuo;
}
//@ chunk-e6aww6q8.js:229234-229345 placement
function isSubscriberHourCache(e, n) {
  return (
    e?.ttl === "1h" &&
    e.reason === "subscriber" &&
    isCacheKeepaliveAllowed() &&
    !(n && (lD() || getCurrentLimits().isUsingOverage === !0))
  );
}
//@ chunk-e6aww6q8.js:229345-229479 placement
function getKeepaliveConfig() {
  {
    let e = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SEQUENTIAL_CLOUD, !1);
    if (typeof e !== "object" || e === null) return;
    let safeParse = Auo().safeParse(e);
    return safeParse.success ? safeParse.data : void 0;
  }
  return;
}
//@ chunk-e6aww6q8.js:229479-229521 placement
function LVs() {
  return Fw().armed !== void 0;
}
//@ chunk-e6aww6q8.js:229521-230419 placement
function releaseKeepaliveChain(
  e,
  { isMainLoopRequest: isMainLoopRequest, continuesPrefix: continuesPrefix, cacheTtl: cacheTtl },
) {
  {
    let h = isMainLoopRequest || continuesPrefix,
      y = void 0,
      S = !1;
    try {
      if (isMainLoopRequest) {
        let L = Fw(),
          G = getMainChainReleaseCount(),
          header = L.header;
        y = header?.chainReleaseCount === G ? header : { chainReleaseCount: G, isSent: !1 };
        let Z = y !== header;
        if (((L.header = y), Z)) {
          if ((IDt(e, DO), L.armed !== void 0)) stopKeepalive(L, "chain_released");
        } else if (!y.isSent) Xg(e, DO);
        if (!Lp(e, DO)) {
          let Se = isSubscriberHourCache(cacheTtl, Z),
            ke = Se && getKeepaliveConfig() !== void 0;
          if (((S = Z && ke), !ke)) {
            if ((Xg(e, DO), Se && !Z)) bb("off for this chain: flag off", "warn");
          } else if (Z && aCt(L))
            ((getKeepaliveRoute(L).missingRecordCount = 0),
              Xg(e, DO),
              bb("off for this chain: no records", "warn"),
              logKeepaliveFeature("bad", "records_missing"));
          else eB(e, DO);
        }
        y.isSent = lT(e, DO);
      }
    } catch (error) {
      if (y?.isSent ?? lT(e, DO)) eB(e, DO);
      else Xg(e, DO);
      ZE("header_decision_failed", error);
    }
    let w = !1;
    if (h && lT(e, DO)) {
      try {
        w = !getKeepaliveRoute(Fw()).refused && canSendFirstPartyBetas();
      } catch (error) {
        ZE("header_gate_failed", error);
      }
      if (!w && y !== void 0) ((y.isSent = !1), Xg(e, DO));
    }
    if (S) bb(`header ${w ? "on" : "off"} for this chain`);
    if (w && y !== void 0) Y$e(R9);
    return w;
  }
  return !1;
}
//@ chunk-e6aww6q8.js:230419-230453 placement
function Qun(e) {
  return (Xg(e, DO), e);
}
//@ chunk-e6aww6q8.js:230453-230581 placement
function onKeepaliveHeaderRejected(e, n, r) {
  Xg(e, DO);
  try {
    if (r) Y$e(oR);
    if (n === getLimitsAccountEpoch()) refuseKeepalive(Fw(), "header_rejected");
  } catch (error) {
    ZE("header_rejection_failed", error);
  }
}
/**
 * 根据响应头判断提示缓存保活是否生效，以及是否继续保活。
 */
//@ chunk-e6aww6q8.js:230581-231750 placement
function evaluateCacheKeepalive({
  conversation: conversation,
  headerSent: headerSent,
  requestId: requestId,
  headers: headers,
  isWhole: isWhole,
  chainReleaseCount: chainReleaseCount,
  accountEpoch: accountEpoch,
  modelSwitchCount: modelSwitchCount,
  now: now,
  clientOptions: clientOptions,
}) {
  try {
    let q = Fw();
    q.lastEventAt.main_request = now;
    let Z = q.conversation === conversation;
    if (((q.conversation = conversation), (q.next = void 0), !headerSent)) {
      stopKeepalive(q, "request_without_header");
      return;
    }
    let Se = headers?.get(ANTHROPIC_CACHE_KEEPALIVE) === "active";
    if (chainReleaseCount === getMainChainReleaseCount()) Y$e(Se ? R9 : oR);
    if (!lT(conversation, DO)) {
      stopKeepalive(q, "conversation_header_off");
      return;
    }
    if (!Se) {
      (stopKeepalive(q, "response_not_active"), bb(`response not active ${requestId}`));
      return;
    }
    let ke = keepaliveInvalidReason({
      chainReleaseCount: chainReleaseCount,
      accountEpoch: accountEpoch,
      modelSwitchCount: modelSwitchCount,
      isResumed: !1,
    });
    if (ke !== void 0) {
      stopKeepalive(q, ke);
      return;
    }
    let we = getKeepaliveConfig();
    if (we === void 0) {
      stopKeepalive(q, "flag_off");
      return;
    }
    if (!isSessionsToken(requestId)) {
      refuseKeepalive(q, "response_without_request_id");
      return;
    }
    let Ee = {
        requestId: requestId,
        chainReleaseCount: chainReleaseCount,
        accountEpoch: accountEpoch,
        modelSwitchCount: modelSwitchCount,
        isResumed: !1,
        clientOptions: clientOptions,
        touchIntervalMs: we.touchIntervalSeconds * 1000,
        touch: void 0,
        client: void 0,
      },
      { armed: armed } = q;
    if (armed?.stream === "open") ((armed.stream = "cut"), (armed.recordRenewedAt = now));
    if (
      !isWhole &&
      armed !== void 0 &&
      Z &&
      armed.chainReleaseCount === chainReleaseCount &&
      armed.accountEpoch === accountEpoch &&
      kCt(armed, clientOptions.model) &&
      (armed.stream === "complete" || armed.lastTouch === "ok")
    ) {
      q.next = Ee;
      return;
    }
    armKeepalive(q, Ee, isWhole ? "complete" : "open", now);
  } catch (error) {
    ZE("sender_start_failed", error);
  }
}
/**
 * 主请求响应结束时更新缓存保活状态：记录时间，待接管的请求按完成或中断转为已武装，已武装的则更新流状态与续期时间。
 */
//@ chunk-e6aww6q8.js:231750-232114 placement
function onMainResponseEnd(requestId, complete, now) {
  try {
    let s = Fw();
    s.lastEventAt.main_request = now;
    let { armed: armed, next: y } = s;
    if (y !== void 0 && y.requestId === requestId) {
      if (
        ((s.next = void 0), (complete || armed === void 0 || armed.lastTouch === "touch_not_found") && Aue(y))
      )
        armKeepalive(s, y, complete ? "complete" : "cut", now);
      return;
    }
    if (armed !== void 0 && armed.requestId === requestId && armed.stream === "open")
      ((armed.stream = complete ? "complete" : "cut"), (armed.recordRenewedAt = now));
  } catch (error) {
    ZE("response_end_failed", error);
  }
}
/**
 * 恢复会话时登记上次回复的缓存保活：记录 reply 并在会话切换时取消，再尝试立即启动续期。
 */
//@ chunk-e6aww6q8.js:232114-232458 placement
function stageResumeKeepalive(getReply) {
  try {
    let n = Fw();
    ACt(n);
    let r = getReply();
    if (r === void 0) return;
    let { sessionId: sessionId, requestId: requestId, ...y } = r;
    if (
      sessionId === void 0 ||
      !isSessionsToken(requestId) ||
      Uue(requestId) ||
      typeof y.clientOptions.model !== "string"
    )
      return;
    let S = { sessionId: sessionId, requestId: requestId, ...y };
    if (resumeKeepaliveConfig(n, S) === void 0) return;
    ((n.resumeStaged = { reply: S, stopListening: onSessionSwitch(() => tryStartResumeKeepalive(n)) }),
      tryStartResumeKeepalive(n));
  } catch (error) {
    ZE("resume_failed", error, !0);
  }
}
/**
 * 模型切换时更新缓存保活状态：累计切换次数，仍是同一模型的保留并同步计数，否则丢弃待接管请求或解除武装。
 */
//@ chunk-e6aww6q8.js:232458-232813 placement
function onKeepaliveModelSwitch(e, n, r) {
  try {
    if (Cue(n, r)) return;
    let of = JRt.of(e);
    of.modelSwitchCount += 1;
    let { armed: armed, next: y } = of;
    if (y !== void 0)
      if (Cue(y.clientOptions.model, r)) y.modelSwitchCount = of.modelSwitchCount;
      else of.next = void 0;
    if (armed !== void 0)
      if (Cue(armed.clientOptions.model, r)) armed.modelSwitchCount = of.modelSwitchCount;
      else stopKeepalive(of, "model_changed");
  } catch (error) {
    ZE("model_switch_failed", error);
  }
}
//@ chunk-e6aww6q8.js:232813-232913 placement
function getModelSwitchCount() {
  try {
    return Fw().modelSwitchCount;
  } catch (error) {
    ZE("model_switch_count_failed", error);
  }
  return 0;
}
//@ chunk-e6aww6q8.js:232913-232953 placement
function SCt(e, n) {
  Fw().lastEventAt[e] = n;
}
//@ chunk-e6aww6q8.js:232953-233179 placement
function recordRunState(e, n) {
  {
    let r = Fw();
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
/**
 * 武装缓存保活发送器：停掉旧的、按 touchIntervalMs 定时发送 cache_touch，记录流状态与续期时间。
 */
//@ chunk-e6aww6q8.js:233338-233662 placement
function armKeepalive(state, entry, stream, now) {
  let h = state.armed !== void 0;
  if ((stopKeepalive(state, "next_response"), getKeepaliveRoute(state).refused)) return;
  let y = setInterval(Ouo, entry.touchIntervalMs, state);
  if (
    (y.unref(),
    (state.armed = {
      ...entry,
      timer: y,
      stream: stream,
      recordRenewedAt: now,
      notFoundCount: 0,
      lastTouch: void 0,
      wasRateLimited: !1,
      touch: void 0,
      client: entry.touch === void 0 ? entry.client : void 0,
    }),
    !h)
  )
    bb("sender started");
}
//@ chunk-e6aww6q8.js:233662-233715 placement
function Aue(e) {
  return keepaliveInvalidReason(e) === void 0 && getKeepaliveConfig() !== void 0;
}
//@ chunk-e6aww6q8.js:233715-233799 placement
function kCt(e, n) {
  return e.clientOptions.model === n && e.lastTouch !== "touch_not_found";
}
//@ chunk-e6aww6q8.js:233799-233902 placement
function armPendingKeepalive(e, n) {
  let { next: r } = e;
  if (e.armed === void 0 && r !== void 0 && Aue(r)) ((e.next = void 0), armKeepalive(e, r, "open", n));
}
//@ chunk-e6aww6q8.js:233902-234161 placement
function disarmKeepalive(e, n) {
  let { armed: armed } = e;
  if (n !== "next_response") e.run = null;
  if (armed === void 0) return;
  if (
    ((e.armed = void 0),
    clearInterval(armed.timer),
    clearTimeout(armed.touch?.timeout),
    armed.touch?.controller.abort(),
    (armed.touch = void 0),
    n !== "next_response")
  )
    bb(`sender stopped: ${n}`);
  return armed;
}
/**
 * 停止保活并按最后一次 touch 结果记遥测；连续失败达到上限时整体关闭一段时间。
 */
//@ chunk-e6aww6q8.js:234161-234747 placement
function stopKeepalive(state, reason) {
  let r = disarmKeepalive(state, reason);
  if (r === void 0 || r.accountEpoch !== getLimitsAccountEpoch()) return;
  if (r.lastTouch === void 0 || r.lastTouch === "ok") {
    if (r.lastTouch === void 0 && r.wasRateLimited) logKeepaliveFeature("sad", "touch_rate_limited");
    else if (
      reason === "entry_lapsed" ||
      reason === "flag_off" ||
      reason === "resume_touches_off" ||
      reason === "not_allowed" ||
      reason === "model_changed"
    )
      logKeepaliveFeature("sad", reason);
    else if (r.lastTouch === "ok") TCt();
    return;
  }
  let s = getKeepaliveRoute(state);
  if (r.lastTouch === "touch_not_found") {
    if (((s.failedRequestCount = 0), r.stream === "complete")) s.missingRecordCount += 1;
  } else if (((s.failedRequestCount += 1), s.failedRequestCount >= yuo)) {
    refuseKeepalive(state, r.lastTouch, buo);
    return;
  }
  logKeepaliveFeature("sad", r.lastTouch);
}
/**
 * 拒绝缓存保活：解除当前武装、清除头部发送标记，并按时长（或本次登录）记录拒绝与遥测。
 */
//@ chunk-e6aww6q8.js:234747-235071 placement
function refuseKeepalive(state, reason, durationMs) {
  if ((disarmKeepalive(state, reason), state.conversation !== void 0)) Xg(state.conversation, DO);
  if (state.header !== void 0) state.header.isSent = !1;
  let s = getKeepaliveRoute(state);
  if (s.refused) {
    if (durationMs === void 0) s.refusalEndsAt = void 0;
    return;
  }
  ((s.refused = !0),
    (s.refusalEndsAt = durationMs === void 0 ? void 0 : Date.now() + durationMs),
    bb(`off for ${durationMs === void 0 ? "this login" : "a while"}: ${reason}`, "warn"),
    logKeepaliveFeature("bad", reason));
}
//@ chunk-e6aww6q8.js:235071-235146 placement
function bb(e, n = "debug") {
  try {
    logForDebugging(`[cache-keepalive] ${e}`, { level: n });
  } catch {}
}
//@ chunk-e6aww6q8.js:235146-235233 placement
function TCt(e = !1) {
  try {
    logFeatureOk(e ? "api_cache_keepalive_resume" : "api_cache_keepalive");
  } catch {}
}
//@ chunk-e6aww6q8.js:235233-235401 placement
function logKeepaliveFeature(e, n, r = !1) {
  try {
    if (e === "sad") logFeatureSad(r ? "api_cache_keepalive_resume" : "api_cache_keepalive", n);
    else logFeatureBad(r ? "api_cache_keepalive_resume" : "api_cache_keepalive", n);
  } catch {}
}
//@ chunk-e6aww6q8.js:235401-235433 placement
function x9(e) {
  try {
    logError(e);
  } catch {}
}
//@ chunk-e6aww6q8.js:235433-235475 placement
function ZE(e, n, r = !1) {
  (x9(n), logKeepaliveFeature("bad", e, r));
}
//@ chunk-e6aww6q8.js:235475-235519 placement
function Ouo(e) {
  touchCacheOnResume(e, Date.now()).catch(x9);
}
//@ chunk-e6aww6q8.js:235519-235552 placement
function Iuo(e) {
  e.abort(new Pue());
}
/**
 * 把缓存续期（touch）请求的错误归类为超时、网络、404、未授权、限流、服务器或客户端错误等。
 */
//@ chunk-e6aww6q8.js:235552-235940 placement
function classifyTouchError(e) {
  if (e instanceof Pue) return "touch_timeout";
  if (!(e instanceof Ot)) return "touch_error";
  if (e.status === void 0) return "touch_network_error";
  if (e.status === 404) return e.requestID ? "touch_not_found" : "touch_route_not_found";
  if (e.status === 401 || isOAuthTokenRevokedError(e)) return "touch_unauthorized";
  if (e.status === 429) return "touch_rate_limited";
  return e.status >= 500 ? "touch_server_error" : "touch_client_error";
}
//@ chunk-e6aww6q8.js:235940-236182 placement
function keepaliveInvalidReason({
  chainReleaseCount: chainReleaseCount,
  accountEpoch: accountEpoch,
  modelSwitchCount: modelSwitchCount,
  isResumed: isResumed,
}) {
  if (chainReleaseCount !== getMainChainReleaseCount()) return "chain_released";
  if (!isResumed && modelSwitchCount !== Fw().modelSwitchCount) return "model_changed";
  if (accountEpoch !== getLimitsAccountEpoch()) return "account_changed";
  return isCacheKeepaliveAllowed() ? void 0 : "not_allowed";
}
/**
 * 发送 cache_touch 请求，续期提示缓存。
 */
//@ chunk-e6aww6q8.js:236182-236741 placement
async function sendCacheTouch(e, n, r) {
  let { client: client } = e,
    now = Date.now();
  if (client === void 0 || now - client.builtAt >= Ruo) {
    if (
      ((client = {
        value: await getAnthropicClient({
          maxRetries: 0,
          model: e.clientOptions.model,
          source: "cache_touch",
          agentContext: mainAgentContext(),
          credentials: e.clientOptions.credentials,
          storageV5: e.clientOptions.storageV5,
        }),
        builtAt: now,
      }),
      !n.aborted)
    )
      e.client = client;
  }
  if (n.aborted || Date.now() >= r || keepaliveInvalidReason(e) !== void 0) return !1;
  assertProviderAllowed(getProviderForModel(e.clientOptions.model));
  try {
    await client.value.post(puo, {
      body: { request_id: e.requestId },
      headers: { "anthropic-beta": betaHeaderValues([UEe, DO]).join(",") },
      signal: n,
      maxRetries: 0,
    });
  } catch (error) {
    throw ((e.client = void 0), error);
  }
  return !0;
}
/**
 * 带超时发送一次缓存续期请求，期间把控制器挂到状态上，结束后清理。
 */
//@ chunk-e6aww6q8.js:236741-237101 placement
async function sendTouchWithTimeout(entry, deadline) {
  let abortController = new AbortController(),
    s = setTimeout(Iuo, j$e, abortController);
  s.unref();
  let h = { controller: abortController, timeout: s };
  entry.touch = h;
  try {
    return await Promise.race([
      sendCacheTouch(entry, abortController.signal, deadline),
      new Promise((y, S) => {
        abortController.signal.addEventListener(
          "abort",
          () => S(abortController.signal.reason instanceof Pue ? abortController.signal.reason : new eHe()),
          { once: !0 },
        );
      }),
    ]);
  } finally {
    if (entry.touch === h) (clearTimeout(s), (entry.touch = void 0));
  }
}
/**
 * 缓存续期成功后更新记录（续期时间、清零失败计数），满足条件时安排下一次续期。
 */
//@ chunk-e6aww6q8.js:237101-237426 placement
function onTouchOk(e, n, r) {
  if (
    ((n.recordRenewedAt = Math.max(n.recordRenewedAt, r)),
    (n.notFoundCount = 0),
    (n.lastTouch = "ok"),
    n.accountEpoch === getLimitsAccountEpoch())
  ) {
    let s = getKeepaliveRoute(e);
    ((s.failedRequestCount = 0), (s.missingRecordCount = 0));
  }
  if (
    !n.isResumed &&
    e.header?.isSent === !0 &&
    n.chainReleaseCount === getMainChainReleaseCount() &&
    getCurrentLimits().isUsingOverage !== !0
  )
    renewMainCacheLife(void 0, r);
  bb(`touch ok ${n.requestId}`);
}
//@ chunk-e6aww6q8.js:237426-237456 placement
function Y$e(e) {
  renewMainCacheLife(e, void 0);
}
//@ chunk-e6aww6q8.js:237456-237588 placement
function renewMainCacheLife(e, n) {
  try {
    if (getLastMainThreadRequestAt() === null) return;
    if (e !== void 0) adjustLastMainThreadCacheTtlMs(e);
    if (n !== void 0) (recordLastMainThreadCacheRenewal(n), touchPromptCache(MAIN_2, n));
  } catch (error) {
    ZE("cache_life_failed", error);
  }
}
//@ chunk-e6aww6q8.js:237588-237799 placement
function backoffAfterTouchError(e, n, r, s, h) {
  if (n instanceof Ot && (r === "touch_rate_limited" || r === "touch_server_error")) {
    let y = n.headers && parseRetryAfterMs(n.headers, h);
    getKeepaliveRoute(e).skipTouchesUntil =
      h + Math.min(y !== void 0 && y > 0 ? y : Math.min(s * 1.5, 60000), R9);
  }
}
/**
 * 恢复会话后先续期一次再武装保活；失败时按错误分类处理，成功后转为已武装并更新记录。
 */
//@ chunk-e6aww6q8.js:237799-238120 placement
async function touchThenArm(e, n, r) {
  try {
    if (!(await sendTouchWithTimeout(n, 1 / 0))) return;
  } catch (error) {
    if (e.next === n && n.accountEpoch === getLimitsAccountEpoch()) {
      let h = classifyTouchError(error);
      (bb(`touch failed: ${h} ${n.requestId}`), backoffAfterTouchError(e, error, h, n.touchIntervalMs, r));
    }
    return;
  }
  if (e.next !== n || !Aue(n)) return;
  if (
    ((e.next = void 0),
    (getKeepaliveRoute(e).failedRequestCount = 0),
    armKeepalive(e, n, "open", r),
    e.armed !== void 0)
  )
    onTouchOk(e, e.armed, r);
}
//@ chunk-e6aww6q8.js:238120-238190 placement
function ACt(e) {
  (e.resumeStaged?.stopListening(), (e.resumeStaged = void 0));
}
//@ chunk-e6aww6q8.js:238190-238300 placement
function resumeKeepaliveConfig(e, n) {
  let r = isSubscriberHourCache(n.cacheTtlOf(getMainLoopModel()), !0) ? getKeepaliveConfig() : void 0;
  return r?.resumeTouches === !0 && !aCt(e) ? r : void 0;
}
/**
 * 恢复会话时，若暂存的回复属于当前会话且是最近一次主线程请求，按其参数开始保活等待。
 */
//@ chunk-e6aww6q8.js:238300-238801 placement
function tryStartResumeKeepalive(state) {
  try {
    let reply = state.resumeStaged?.reply;
    if (
      reply === void 0 ||
      getSessionId() !== reply.sessionId ||
      getLastMainThreadRequestAt() !== reply.repliedAt
    )
      return;
    (ACt(state), clearTimeout(state.resumeTimer), (state.resumeTimer = void 0));
    let keepalive = resumeKeepaliveConfig(state, reply);
    if (keepalive === void 0) return;
    (PCt(state, reply, {
      requestId: reply.requestId,
      chainReleaseCount: getMainChainReleaseCount(),
      accountEpoch: getLimitsAccountEpoch(),
      modelSwitchCount: state.modelSwitchCount,
      isResumed: !0,
      clientOptions: reply.clientOptions,
      touchIntervalMs: keepalive.touchIntervalSeconds * 1000,
      touch: void 0,
      client: void 0,
    }),
      bb(`resumed reply waits ${reply.requestId}`));
  } catch (error) {
    ZE("resume_failed", error, !0);
  }
}
//@ chunk-e6aww6q8.js:238801-238897 placement
function PCt(e, n, r) {
  ((e.resumeTimer = setTimeout(Fuo, r.touchIntervalMs, e, n, r)), e.resumeTimer.unref());
}
//@ chunk-e6aww6q8.js:238897-238970 placement
function Fuo(e, n, r) {
  ((e.resumeTimer = void 0), touchResumedReply(e, n, r, Date.now()).catch(x9));
}
//@ chunk-e6aww6q8.js:238970-239256 placement
function canTakeUpResumedReply(e, n, r) {
  return getLastMainThreadRequestAt() === n.repliedAt &&
    e.header?.chainReleaseCount !== r.chainReleaseCount &&
    !(e.armed?.requestId === r.requestId && e.armed.chainReleaseCount === r.chainReleaseCount) &&
    !e.lapsedRequestIds.has(r.requestId) &&
    keepaliveInvalidReason(r) === void 0 &&
    Cue(n.clientOptions.model, getMainLoopModel())
    ? resumeKeepaliveConfig(e, n)
    : void 0;
}
//@ chunk-e6aww6q8.js:239256-239331 placement
function Cue(e, n) {
  return getCanonicalName(Bn(e), { identity: !0 }) === getCanonicalName(Bn(n), { identity: !0 });
}
/**
 * 对恢复的回复做一次 cache_touch：仍符合条件且在活动窗口内才发；失败记录原因并退避；成功则武装保活。
 */
//@ chunk-e6aww6q8.js:239331-240097 placement
async function touchResumedReply(state, reply, entry, now) {
  try {
    let h = canTakeUpResumedReply(state, reply, entry);
    if (
      h === void 0 ||
      reply.repliedAt > now ||
      !ZRt({ main_request: reply.repliedAt }, now, h.activityWindowMinutes * 60000)
    ) {
      bb(`resumed reply left alone ${entry.requestId}`);
      return;
    }
    if (now < getKeepaliveRoute(state).skipTouchesUntil) {
      PCt(state, reply, entry);
      return;
    }
    try {
      if (!(await sendTouchWithTimeout(entry, 1 / 0))) {
        bb(`resumed reply left alone ${entry.requestId}`);
        return;
      }
    } catch (error) {
      let S = classifyTouchError(error);
      if ((bb(`resumed touch failed: ${S} ${entry.requestId}`), S === "touch_error")) x9(error);
      if (entry.accountEpoch === getLimitsAccountEpoch())
        backoffAfterTouchError(state, error, S, entry.touchIntervalMs, now);
      logKeepaliveFeature("sad", S, !0);
      return;
    }
    if (canTakeUpResumedReply(state, reply, entry) !== void 0) {
      if (
        ((state.lastEventAt.main_request = Math.max(
          state.lastEventAt.main_request ?? -1 / 0,
          reply.repliedAt,
        )),
        (getKeepaliveRoute(state).failedRequestCount = 0),
        armKeepalive(state, entry, "cut", now),
        state.armed !== void 0)
      ) {
        (onTouchOk(state, state.armed, now), TCt(!0));
        return;
      }
    }
    logKeepaliveFeature("sad", "not_taken_up", !0);
  } catch (error) {
    ZE("resume_failed", error, !0);
  }
}
/**
 * 会话恢复时续期提示缓存，按开关、记录过期、账号变化等条件决定是否发送 cache_touch。
 */
//@ chunk-e6aww6q8.js:240097-241559 placement
async function touchCacheOnResume(e, n) {
  let { armed: armed } = e;
  if (armed === void 0) return;
  let s = armed.stream === "open";
  try {
    let h = keepaliveInvalidReason(armed);
    if (h !== void 0) {
      stopKeepalive(e, h);
      return;
    }
    let y = getKeepaliveConfig();
    if (y === void 0) {
      stopKeepalive(e, "flag_off");
      return;
    }
    if (armed.isResumed && !y.resumeTouches) {
      stopKeepalive(e, "resume_touches_off");
      return;
    }
    let S =
        y.inFlightWindowMinutes !== void 0 && isWorkRunning(e.run)
          ? Math.max(y.activityWindowMinutes, y.inFlightWindowMinutes)
          : y.activityWindowMinutes,
      w = ZRt(e.lastEventAt, n, S * 60000);
    if (armed.stream !== "open" && n - armed.recordRenewedAt >= GRt) {
      (e.lapsedRequestIds.add(armed.requestId),
        stopKeepalive(e, w ? "entry_lapsed" : "record_expired"),
        armPendingKeepalive(e, n));
      return;
    }
    if (!w || armed.touch !== void 0 || n < getKeepaliveRoute(e).skipTouchesUntil) return;
    let L = armed.stream === "open" ? 1 / 0 : Date.now() + R9 - (n - armed.recordRenewedAt),
      { next: G } = e;
    if (G !== void 0 && G.touch === void 0 && n + j$e - armed.recordRenewedAt < GRt) {
      if (
        (await touchThenArm(e, G, n),
        e.armed !== armed || armed.touch !== void 0 || n < getKeepaliveRoute(e).skipTouchesUntil)
      )
        return;
    }
    if (!(await sendTouchWithTimeout(armed, L)) || e.armed !== armed) return;
    onTouchOk(e, armed, n);
  } catch (error) {
    if (error instanceof eHe || e.armed !== armed) return;
    if (armed.accountEpoch !== getLimitsAccountEpoch()) {
      stopKeepalive(e, "account_changed");
      return;
    }
    if (
      error instanceof Ot &&
      (error.status === 400 || error.status === 403) &&
      !isOAuthTokenRevokedError(error)
    ) {
      refuseKeepalive(e, error.status === 400 ? "touch_bad_request" : "touch_refused");
      return;
    }
    let y = classifyTouchError(error);
    if ((bb(`touch failed: ${y} ${armed.requestId}`), y === "touch_not_found" && s)) return;
    if ((backoffAfterTouchError(e, error, y, armed.touchIntervalMs, n), y === "touch_rate_limited")) {
      armed.wasRateLimited = !0;
      return;
    }
    if (y === "touch_error" && armed.lastTouch !== y) x9(error);
    if (((armed.lastTouch = y), y === "touch_not_found" || y === "touch_route_not_found")) {
      if (((armed.notFoundCount += 1), armed.notFoundCount >= muo))
        (stopKeepalive(e, y), armPendingKeepalive(e, n));
    }
  }
}
//@ chunk-e6aww6q8.js:241559-241584 placement
class eHe extends Error {}
//@ chunk-e6aww6q8.js:241584-241609 placement
class Pue extends Error {}
//@ chunk-e6aww6q8.js:241609-241732 placement
function keepaliveRequestIds(e) {
  {
    let { next: n, armed: armed } = Fw();
    return [n, armed].flatMap((s) => (s !== void 0 && kCt(s, e) && Aue(s) ? [s.requestId] : []));
  }
  return [];
}
//@ chunk-e6aww6q8.js:241732-241744 placement
var Buo = 1e4;
//@ chunk-e6aww6q8.js:241744-242017 placement
function runStateFromSpinner({
  working: working,
  spinnerMode: spinnerMode,
  isCompacting: isCompacting,
  delegatedWorkRunning: delegatedWorkRunning,
  waitingFor: waitingFor,
}) {
  if (isCompacting) return { kind: "work", work: "compacting" };
  if (working)
    return {
      kind: "work",
      work: spinnerMode === "tool-use" && delegatedWorkRunning ? "subagent_running" : "turn_running",
    };
  return waitingFor === void 0 ? null : { kind: "awaiting_user", awaiting: waitingFor };
}
//@ chunk-e6aww6q8.js:242017-242134 placement
class HeartbeatShadowState {
  lastMainRequestAt = 0;
  lastEventAt = 0;
  lastUserInputMonotonic = null;
  run = null;
  interactive = !1;
  interactiveLogged = !1;
}
//@ chunk-e6aww6q8.js:242134-242161 placement
var Wuo = new HostScoped(() => new HeartbeatShadowState());
//@ chunk-e6aww6q8.js:242161-242199 placement
function hG() {
  return Wuo.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:242199-242247 placement
function njt() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_dapper_dawn", !1);
}
//@ chunk-e6aww6q8.js:242247-242365 placement
function resetHeartbeatShadow(e) {
  ((e.lastMainRequestAt = 0),
    (e.lastEventAt = 0),
    (e.lastUserInputMonotonic = null),
    (e.run = null),
    (e.interactiveLogged = !1));
}
/**
 * 记录 tengu_cache_heartbeat_shadow 影子事件（运行状态、距上次事件/主请求的时间、是否交互），用于评估缓存心跳策略。
 */
//@ chunk-e6aww6q8.js:242365-242912 placement
function logHeartbeatShadow(kind, { now: now, run: run, mainRequestAt: mainRequestAt }) {
  let h = hG();
  if (h.lastMainRequestAt === 0) return !1;
  let y = getLastMainRequestId();
  if (y === void 0) return (resetHeartbeatShadow(h), !1);
  let S = mainRequestAt ?? h.lastMainRequestAt;
  return (
    logEvent("tengu_cache_heartbeat_shadow", {
      kind: fromEnum(kind),
      work: fromEnumOpt(run?.kind === "work" ? run.work : void 0),
      awaiting: fromEnumOpt(run?.kind === "awaiting_user" ? run.awaiting : void 0),
      sinceLastEventMs: h.lastEventAt === 0 ? void 0 : Math.max(0, now - h.lastEventAt),
      sinceLastMainRequestMs: S === 0 ? void 0 : Math.max(0, now - S),
      requestId: ye(y),
      interactive: h.interactiveLogged ? void 0 : h.interactive,
    }),
    (h.interactiveLogged = !0),
    (h.lastEventAt = now),
    !0
  );
}
//@ chunk-e6aww6q8.js:242912-243031 placement
var RUN_EVENT_NAMES = {
  work: { start: "work_start", end: "work_end" },
  awaiting_user: { start: "awaiting_user_start", end: "awaiting_user_end" },
};
//@ chunk-e6aww6q8.js:243031-243085 placement
function Mue(e, n, r) {
  logHeartbeatShadow(RUN_EVENT_NAMES[e.kind][n], { now: r, run: e });
}
/**
 * 切换交互状态：离开交互时结束当前运行计时并记录。
 */
//@ chunk-e6aww6q8.js:243085-243270 placement
function setInteractive(e, n) {
  try {
    if (!e) recordRunState(null, n?.now ?? Date.now());
    let r = hG();
    if (((r.interactive = e), !e && r.run !== null)) {
      let run = r.run;
      if (((r.run = null), njt())) Mue(run, "end", n?.now ?? Date.now());
    }
  } catch (error) {
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:243270-243513 placement
function onMainRequestLogged({ isMainLoop: isMainLoop, now: now }) {
  try {
    if (!isMainLoop || !njt()) return;
    if (getLastMainRequestId() === void 0) return;
    let r = hG(),
      lastMainRequestAt = r.lastMainRequestAt;
    if (
      ((r.lastMainRequestAt = now),
      logHeartbeatShadow("main_request", { now: now, mainRequestAt: lastMainRequestAt }) &&
        lastMainRequestAt === 0 &&
        r.run !== null)
    )
      Mue(r.run, "start", now);
  } catch (error) {
    logError(error);
  }
}
/**
 * 记录用户输入事件（限频），用于空闲与活跃统计。
 */
//@ chunk-e6aww6q8.js:243513-243794 placement
function onUserInput(e) {
  try {
    if ((SCt("user_input", e?.now ?? Date.now()), !njt())) return;
    let n = hG(),
      r = e?.monotonic ?? performance.now();
    if (n.lastUserInputMonotonic !== null && r - n.lastUserInputMonotonic < Buo) return;
    if (logHeartbeatShadow("user_input", { now: e?.now ?? Date.now() })) n.lastUserInputMonotonic = r;
  } catch (error) {
    logError(error);
  }
}
/**
 * 加载动画状态变化时切换运行计时：结束旧的运行、开始新的运行。
 */
//@ chunk-e6aww6q8.js:243794-244022 placement
function onSpinnerStateChange(e, n) {
  try {
    let r = runStateFromSpinner(e);
    if ((recordRunState(r, n?.now ?? Date.now()), !njt())) return;
    let s = hG();
    if (sameRunState(r, s.run)) return;
    let run = s.run;
    s.run = r;
    let y = n?.now ?? Date.now();
    if (run !== null) Mue(run, "end", y);
    if (r !== null) Mue(r, "start", y);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:244022-244110 placement
function UCt(e, n) {
  try {
    if (njt()) logHeartbeatShadow(e, { now: n?.now ?? Date.now() });
    resetHeartbeatShadow(hG());
  } catch (error) {
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:244207-244245 placement
function $Vs(e) {
  gracefulShutdown_2("subagent_end", e);
}
//@ chunk-e6aww6q8.js:244245-244286 placement
function u3n(e) {
  (gracefulShutdown_2(e, getLastMainRequestId()), UCt(e), forgetLastMainRequestId());
}
//@ chunk-e6aww6q8.js:244286-244366 placement
function M9(e) {
  if (getLastMainRequestId() !== e) return;
  if (e === void 0) {
    forgetLastMainRequestId();
    return;
  }
  u3n("compaction");
}

export {
  $Vs,
  Qun,
  onUserInput,
  njt,
  LVs,
  onSpinnerStateChange,
  setInteractive,
  keepaliveRequestIds,
  releaseKeepaliveChain,
  getModelSwitchCount,
  evaluateCacheKeepalive,
  onKeepaliveHeaderRejected,
  onMainResponseEnd,
  u3n,
  onKeepaliveModelSwitch,
  M9,
  onMainRequestLogged,
  stageResumeKeepalive,
};
