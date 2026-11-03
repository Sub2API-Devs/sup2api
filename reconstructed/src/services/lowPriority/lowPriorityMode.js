/**
 * services/lowPriority/lowPriorityMode.ts
 *
 * 2.1.316 新增：低优先级模式开关与状态
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hwmsct5x.js (37)
 * attribution: placement 37
 */
import { createSignal } from "../../utils/signal.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { logError } from "../../utils/log.js";
import { fromEnumOpt, fromEnum } from "../analytics/safeMetadata.js";
import {
  vEn,
  getLowPriorityCooloffMs,
  N8r,
  $8r,
  getSlowBudgetUtilization,
  getSlowStatusHeader,
  OVERAGE_IN_USE_HEADER,
  hasUnifiedRateLimitHeaders,
  Hd,
} from "./headers.js";
import { logEvent } from "../analytics/index.js";
import { logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { Ot } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { classifyQuerySource, isMainOrAgentQuerySource } from "../api/requestHeaders.js";
import { is529Error } from "../api/withRetry.js";
import { env } from "../../utils/env.js";
import { isFirstPartyApiBackend, getAPIProvider } from "../../utils/model/providers.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";

/**
 * 低优先级等待（额度恢复）常量：默认重试间隔 20s、间隔夹在 5s–10min、默认最大等待 20min、最大等待夹在 1min–6h、抖动 ±30%、心跳 120s、重置判定余量 60s、重置后 60s。旧版名 clearMockEarlyWarning 为错配；应归低优先级等待模块。
 */
//@ chunk-hwmsct5x.js:187495-187674 placement = clearMockEarlyWarning (0.331)
var LOW_PRIORITY_DEFAULT_RETRY_AFTER_MS = 20000,
  LOW_PRIORITY_MIN_RETRY_AFTER_MS = 5000,
  LOW_PRIORITY_MAX_RETRY_AFTER_MS = 600000,
  LOW_PRIORITY_DEFAULT_MAX_WAIT_MS = 1200000,
  LOW_PRIORITY_MIN_MAX_WAIT_MS = 60000,
  LOW_PRIORITY_MAX_MAX_WAIT_MS = 21600000,
  LOW_PRIORITY_JITTER_RATIO = 0.3,
  LOW_PRIORITY_STALE_TICK_MS = 120000,
  RESET_ADVANCE_TOLERANCE_SECONDS = 60,
  UNIFIED_5H_RESET_HEADER = "anthropic-ratelimit-unified-5h-reset",
  UNIFIED_7D_RESET_HEADER = "anthropic-ratelimit-unified-7d-reset",
  POST_RESET_GRACE_MS = 60000;
/**
 * 创建低优先级模式的运行时状态：阶段、实验分组、重试间隔与最长等待、服务计数、累计等待、预算使用率、冷却截止、变化与事件信号。
 */
//@ chunk-hwmsct5x.js:187674-187996 placement
function createLowPriorityState() {
  return {
    state: { phase: "idle" },
    arm: void 0,
    retryAfterMs: LOW_PRIORITY_DEFAULT_RETRY_AFTER_MS,
    maxWaitMs: LOW_PRIORITY_DEFAULT_MAX_WAIT_MS,
    requestsServed: 0,
    requestsServedStandard: 0,
    totalWaitMs: 0,
    budgetUtilization: void 0,
    budgetUtilizationObservedAtMs: 0,
    budgetSpentUntilSeconds: void 0,
    stoppedWallResetsAtSeconds: void 0,
    coolingOffUntilMs: void 0,
    resumed: !1,
    changed: createSignal(),
    events: createSignal(),
  };
}
//@ chunk-hwmsct5x.js:187996-188013 placement
var w_ = new HostScoped(createLowPriorityState);
//@ chunk-hwmsct5x.js:188013-188050 placement
function We() {
  return w_.of(getRootSession().host);
}
//@ chunk-hwmsct5x.js:188050-188099 placement
function dD() {
  return We().state.phase === "active";
}
//@ chunk-hwmsct5x.js:188099-188197 placement
function _st(e = Date.now()) {
  try {
    return (endLowPriorityIfReset(e), We().state.phase === "active");
  } catch (error) {
    return (logError(error), !1);
  }
}
//@ chunk-hwmsct5x.js:188197-188270 placement
function U8r(e) {
  return e.phase === "active" ? e.resetsAtSeconds * 1000 + POST_RESET_GRACE_MS : null;
}
/**
 * 低优先级模式到达重置时间时结束它。
 */
//@ chunk-hwmsct5x.js:188270-188370 placement
function endLowPriorityIfReset(e = Date.now()) {
  let n = We(),
    r = U8r(n.state);
  if (r === null || e < r) return !1;
  return endLowPriority("reset", e);
}
//@ chunk-hwmsct5x.js:188370-188460 placement
function j8r(e = Date.now()) {
  let budgetSpentUntilSeconds = We().budgetSpentUntilSeconds;
  return budgetSpentUntilSeconds !== void 0 && e < budgetSpentUntilSeconds * 1000;
}
//@ chunk-hwmsct5x.js:188460-188511 placement
function Ydi() {
  We().budgetSpentUntilSeconds = void 0;
}
//@ chunk-hwmsct5x.js:188511-188599 placement
function K4e(e = Date.now()) {
  let coolingOffUntilMs = We().coolingOffUntilMs;
  return coolingOffUntilMs !== void 0 && e < coolingOffUntilMs ? coolingOffUntilMs : void 0;
}
//@ chunk-hwmsct5x.js:188599-188691 placement
function fir() {
  let e = We();
  if (e.state.phase !== "active") return;
  return Ka(e.budgetUtilization);
}
//@ chunk-hwmsct5x.js:188691-188779 placement
function Ka(e) {
  return e === void 0 ? void 0 : Math.min(100, Math.max(0, 100 - Math.round(e * 100)));
}
//@ chunk-hwmsct5x.js:188779-188812 placement
function aAt() {
  return We().state;
}
//@ chunk-hwmsct5x.js:188812-188861 placement
function pir(e) {
  return We().changed.subscribe(e);
}
//@ chunk-hwmsct5x.js:188861-188909 placement
function kEn(e) {
  return We().events.subscribe(e);
}
//@ chunk-hwmsct5x.js:188909-188953 placement
function Kd(e, n) {
  ((e.state = n), e.changed.emit());
}
//@ chunk-hwmsct5x.js:188953-189011 placement
function To(e) {
  return { arm: fromEnumOpt(e.arm), config_version: vEn() };
}
/**
 * 用户接受低优先级提议时进入 active：记录分组、按服务端建议设置重试/等待上限并开始计数；已在 active 时返回 false。
 */
//@ chunk-hwmsct5x.js:189011-189273 placement
function acceptLowPriorityOffer({
  resetsAtSeconds: resetsAtSeconds,
  arm: arm,
  entry: entry,
  retryAfterSeconds: retryAfterSeconds,
  maxWaitSeconds: maxWaitSeconds,
  now: now = Date.now(),
}) {
  let w = We();
  if (w.state.phase === "active") return !1;
  return (
    (w.arm = arm),
    (w.retryAfterMs = LOW_PRIORITY_DEFAULT_RETRY_AFTER_MS),
    (w.maxWaitMs = LOW_PRIORITY_DEFAULT_MAX_WAIT_MS),
    applyRetryLimits(w, retryAfterSeconds, maxWaitSeconds),
    enterLowPriorityActive(w, { resetsAtSeconds: resetsAtSeconds, entry: entry, resumed: !1, now: now }),
    !0
  );
}
//@ chunk-hwmsct5x.js:189273-189358 placement
function Jdi(e = Date.now()) {
  let n = We();
  return n.state.phase === "active" ? void 0 : Vd(n, e);
}
/**
 * 恢复低优先级模式（若当前未激活且有可用的重置时间）。
 */
//@ chunk-hwmsct5x.js:189358-189518 placement
function resumeLowPriority(e, n = Date.now()) {
  let r = We(),
    s = Vd(r, n);
  if (r.state.phase === "active" || s === void 0) return !1;
  return (enterLowPriorityActive(r, { resetsAtSeconds: s, entry: e, resumed: !0, now: n }), !0);
}
//@ chunk-hwmsct5x.js:189518-189607 placement
function Vd(e, n) {
  let stoppedWallResetsAtSeconds = e.stoppedWallResetsAtSeconds;
  return stoppedWallResetsAtSeconds !== void 0 && stoppedWallResetsAtSeconds * 1000 > n
    ? stoppedWallResetsAtSeconds
    : void 0;
}
/**
 * 进入 active 阶段：重置计数（非恢复时清空预算使用率），上报 tengu_lowpri_accepted 并发出 accepted 事件。
 */
//@ chunk-hwmsct5x.js:189607-189999 placement
function enterLowPriorityActive(
  e,
  { resetsAtSeconds: resetsAtSeconds, entry: entry, resumed: resumed, now: now },
) {
  if (
    ((e.stoppedWallResetsAtSeconds = void 0),
    (e.resumed = resumed),
    (e.requestsServed = 0),
    (e.requestsServedStandard = 0),
    (e.totalWaitMs = 0),
    !resumed)
  )
    ((e.budgetUtilization = void 0), (e.budgetUtilizationObservedAtMs = 0));
  (logEvent("tengu_lowpri_accepted", { ...To(e), entry: fromEnum(entry), resumed: resumed }),
    Kd(e, { phase: "active", resetsAtSeconds: resetsAtSeconds, acceptedAtMs: now }),
    e.events.emit({ type: "accepted", entry: entry }));
}
/**
 * 结束低优先级模式：max_wait 时进入冷却，上报 tengu_lowpri_ended（时长、服务数、等待、预算使用率），按原因记录成功/失败，user 结束时记住重置时间，发出 ended 事件。
 */
//@ chunk-hwmsct5x.js:189999-190743 placement
function endLowPriority(reason, now = Date.now()) {
  let state = We();
  if (state.state.phase !== "active") {
    if (reason !== "user") state.stoppedWallResetsAtSeconds = void 0;
    return !1;
  }
  if (reason === "max_wait") {
    let s = getLowPriorityCooloffMs();
    state.coolingOffUntilMs = s > 0 ? now + s : void 0;
  }
  if (
    (logEvent("tengu_lowpri_ended", {
      ...To(state),
      reason: fromEnum(reason),
      resumed: state.resumed,
      duration_ms: Math.max(0, now - state.state.acceptedAtMs),
      requests_served: state.requestsServed,
      requests_served_standard: state.requestsServedStandard,
      total_wait_ms: Math.max(0, state.totalWaitMs),
      ...(state.budgetUtilization !== void 0 && {
        budget_utilization_pct: Math.round(state.budgetUtilization * 100),
      }),
    }),
    isBenignEndReason(reason) || state.requestsServed > 0)
  )
    logFeatureOk("low_priority_mode");
  else logFeatureSad("low_priority_mode", reason);
  return (
    (state.stoppedWallResetsAtSeconds = reason === "user" ? state.state.resetsAtSeconds : void 0),
    Kd(state, { phase: "idle" }),
    state.events.emit({ type: "ended", reason: reason }),
    !0
  );
}
//@ chunk-hwmsct5x.js:190743-190953 placement
function isBenignEndReason(e) {
  switch (e) {
    case "reset":
    case "user":
    case "conversation_reset":
    case "account_switch":
    case "extra_usage":
      return !0;
    case "weekly":
    case "budget":
    case "off":
    case "ineligible":
    case "wall":
    case "max_wait":
      return !1;
  }
}
//@ chunk-hwmsct5x.js:190953-191017 placement
function Wd(e, n, r) {
  return Math.min(r, Math.max(n, Math.round(e)));
}
//@ chunk-hwmsct5x.js:191017-191165 placement
function applyRetryLimits(e, n, r) {
  if (n !== void 0 && Number.isFinite(n))
    e.retryAfterMs = Wd(n * 1000, LOW_PRIORITY_MIN_RETRY_AFTER_MS, LOW_PRIORITY_MAX_RETRY_AFTER_MS);
  if (r !== void 0 && Number.isFinite(r))
    e.maxWaitMs = Wd(r * 1000, LOW_PRIORITY_MIN_MAX_WAIT_MS, LOW_PRIORITY_MAX_MAX_WAIT_MS);
}
//@ chunk-hwmsct5x.js:191165-191384 placement
function observeLowPriorityHeaders(e, n, r) {
  applyRetryLimits(e, N8r(n), $8r(n));
  let s = getSlowBudgetUtilization(n);
  if (s !== void 0 && r >= e.budgetUtilizationObservedAtMs) {
    e.budgetUtilizationObservedAtMs = r;
    let h = Ka(s) !== Ka(e.budgetUtilization);
    if (((e.budgetUtilization = s), h)) e.changed.emit();
  }
}
/**
 * 根据响应头更新低优先级状态：5 小时重置时间前移则结束（reset），slow-status active/not_needed 时计数并读取预算，额外用量启用时以 extra_usage 结束。
 */
//@ chunk-hwmsct5x.js:191384-191832 placement
function handleLowPriorityResponseHeaders(e, n = Date.now()) {
  try {
    let r = We(),
      s = getSlowStatusHeader(e),
      h = s === "ineligible" && e.get(OVERAGE_IN_USE_HEADER) === "true";
    if (r.state.phase !== "active") {
      if (h && r.stoppedWallResetsAtSeconds !== void 0) endLowPriority("extra_usage", n);
      return;
    }
    let y = Number(e.get(UNIFIED_5H_RESET_HEADER) ?? NaN);
    if (Number.isFinite(y) && y >= r.state.resetsAtSeconds + RESET_ADVANCE_TOLERANCE_SECONDS) {
      endLowPriority("reset", n);
      return;
    }
    if (s === "active") (observeLowPriorityHeaders(r, e, n), r.requestsServed++);
    else if (s === "not_needed") (observeLowPriorityHeaders(r, e, n), r.requestsServedStandard++);
    else if (h) endLowPriority("extra_usage", n);
  } catch (error) {
    logError(error);
  }
}
/**
 * 请求成功时结算低优先级等待：计算本次等待（过期 tick 按计划时间截断），累加并上报 tengu_lowpri_request/tengu_lowpri_wait。
 */
//@ chunk-hwmsct5x.js:191832-192243 placement
function recordLowPriorityServed(e, n = Date.now()) {
  try {
    let r = e.current;
    e.current = null;
    let s = We();
    if (r === null || s.state.phase !== "active" || r.sinceMs < s.state.acceptedAtMs) return;
    let h = n - r.nextTryAtMs > LOW_PRIORITY_STALE_TICK_MS,
      max = Math.max(0, (h ? r.nextTryAtMs : n) - r.sinceMs);
    ((s.totalWaitMs += max),
      logEvent("tengu_lowpri_request", {
        ...To(s),
        outcome: fromEnum("served"),
        wait_ms: max,
        attempt: r.attempts + 1,
      }),
      logEvent("tengu_lowpri_wait", { ...To(s), total_wait_ms: max, attempts: r.attempts }));
  } catch (error) {
    logError(error);
  }
}
/**
 * 规划低优先级模式下的重试（出错时记录并返回 null）。
 */
//@ chunk-hwmsct5x.js:192243-192370 placement
function planLowPriorityRetry(
  e,
  { markedAtDispatch: markedAtDispatch, querySource: querySource, wait: wait, now: now = Date.now() },
) {
  try {
    return planLowPriorityRetryInner(e, markedAtDispatch, querySource, wait, now);
  } catch (error) {
    return (logError(error), null);
  }
}
/**
 * 对低优先级模式下的错误决定是否重试：429 根据 slow-status 判断结束原因；slot_busy 或 529 时对主/agent 请求按带抖动的间隔安排重试，超过最长等待则以 max_wait 结束。
 */
//@ chunk-hwmsct5x.js:192370-193305 placement
function planLowPriorityRetryInner(error, markedAtDispatch, querySource, wait, now) {
  let state = We();
  if (!markedAtDispatch) return null;
  let w = error instanceof Ot ? error.headers : void 0,
    S = getSlowStatusHeader(w),
    E = error instanceof Ot && error.status === 429,
    R = classifyQuerySource(querySource) === "main",
    L = E ? getLowPriorityEndReason(S, R, hasUnifiedRateLimitHeaders(error)) : null;
  if (state.state.phase !== "active") {
    if (L !== null && state.stoppedWallResetsAtSeconds !== void 0) zd(state, L, w, now);
    return null;
  }
  if ((observeLowPriorityHeaders(state, w, now), L !== null)) return (zd(state, L, w, now), null);
  let O = E && S === "slot_busy",
    M = is529Error(error) && (S === "active" || S === void 0);
  if (!O && !M) return null;
  if (!isMainOrAgentQuerySource(querySource)) return null;
  let P = wait.current,
    H =
      P !== null && P.sinceMs >= state.state.acceptedAtMs
        ? P
        : { sinceMs: now, attempts: 0, nextTryAtMs: now },
    max = Math.max(0, now - H.sinceMs);
  if (
    (logEvent("tengu_lowpri_request", {
      ...To(state),
      outcome: fromEnum(O ? "slot_busy" : "capacity_busy"),
      wait_ms: max,
      attempt: H.attempts + 1,
    }),
    max >= state.maxWaitMs)
  )
    return ((wait.current = null), endLowPriority("max_wait", now), null);
  let z = 1 + (Math.random() * 2 - 1) * LOW_PRIORITY_JITTER_RATIO,
    rounded = Math.round(state.retryAfterMs * z);
  return (
    (wait.current = { sinceMs: H.sinceMs, attempts: H.attempts + 1, nextTryAtMs: now + rounded }),
    { delayMs: rounded, attempt: wait.current.attempts, waitingSinceMs: wait.current.sinceMs }
  );
}
//@ chunk-hwmsct5x.js:193305-193360 placement
function zd(e, n, r, s) {
  if (n === "budget") recordBudgetSpentUntil(e, r, s);
  endLowPriority(n, s);
}
//@ chunk-hwmsct5x.js:193360-193374 placement
var v_ = 691200;
//@ chunk-hwmsct5x.js:193374-193535 placement
function recordBudgetSpentUntil(e, n, r) {
  let s = Number(n?.get(Hd) ?? NaN) || Number(n?.get(UNIFIED_7D_RESET_HEADER) ?? NaN);
  if (Number.isFinite(s) && s > 0) e.budgetSpentUntilSeconds = Math.round(Math.min(s, r / 1000 + v_));
}
//@ chunk-hwmsct5x.js:193535-193816 placement
function getLowPriorityEndReason(e, n, r) {
  switch (e) {
    case "weekly_limit":
      return "weekly";
    case "budget_exhausted":
      return "budget";
    case "off":
      return "off";
    case "ineligible":
      return n ? "ineligible" : null;
    case "slot_busy":
      return null;
    case void 0:
    case "unrecognized":
    case "active":
    case "not_needed":
      return n && r ? "wall" : null;
  }
}
/**
 * 判断是否发送网关提示请求头：环境变量优先，第一方后端为是，其他第一方由开关决定。
 */
//@ chunk-hwmsct5x.js:193816-193981 placement
function shouldSendGatewayHintHeaders() {
  let CLAUDE_CODE_GATEWAY_HINT_HEADERS = env.CLAUDE_CODE_GATEWAY_HINT_HEADERS;
  if (CLAUDE_CODE_GATEWAY_HINT_HEADERS !== void 0) return CLAUDE_CODE_GATEWAY_HINT_HEADERS;
  if (isFirstPartyApiBackend()) return !0;
  if (getAPIProvider() !== "firstParty") return !1;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_splendid_sutton", !1);
}

export {
  dD,
  handleLowPriorityResponseHeaders,
  kEn,
  pir,
  aAt,
  K4e,
  fir,
  U8r,
  endLowPriorityIfReset,
  shouldSendGatewayHintHeaders,
  _st,
  recordLowPriorityServed,
  planLowPriorityRetry,
  endLowPriority,
  j8r,
  Jdi,
  acceptLowPriorityOffer,
  resumeLowPriority,
  Ydi,
};
