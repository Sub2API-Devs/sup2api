/**
 * services/lowPriority/lowPriorityMode.ts
 *
 * 2.1.316 新增：低优先级模式开关与状态
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-gxp74sjc.js (1), chunk-vn3g7zt8.js (37)
 * attribution: placement 38
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createSignal } from "../../utils/signal.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { logError } from "../../utils/log.js";
import { fromEnumOpt, fromEnum } from "../analytics/safeMetadata.js";
import {
  getLowPriorityConfigVersion,
  getLowPriorityCooloffMs,
  getSlowRetryAfter,
  getSlowMaxWait,
  getSlowBudgetUtilization,
  getSlowStatusHeader,
  OVERAGE_IN_USE_HEADER,
  hasUnifiedRateLimitHeaders,
  SLOW_BUDGET_RESET_HEADER,
} from "./headers.js";
import { logEvent } from "../analytics/index.js";
import { logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { APIError } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { classifyQuerySource, isMainOrAgentQuerySource } from "../api/requestHeaders.js";
import { is529Error } from "../api/withRetry.js";
import { env } from "../../utils/env.js";
import { isFirstPartyApiBackend, getAPIProvider } from "../../utils/model/providers.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { LOW_PRIORITY_STATE } from "../lowPriorityMode.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-vn3g7zt8.js:187883-188062 placement (2.1.88 match: clearMockEarlyWarning, 0.331)
/**
 * 低优先级等待（额度恢复）常量：默认重试间隔 20s、间隔夹在 5s–10min、默认最大等待 20min、最大等待夹在 1min–6h、抖动 ±30%、心跳 120s、重置判定余量 60s、重置后 60s。旧版名 clearMockEarlyWarning 为错配；应归低优先级等待模块。
 */
var LOW_PRIORITY_DEFAULT_RETRY_AFTER_MS = 20000;
var LOW_PRIORITY_MIN_RETRY_AFTER_MS = 5000;
var LOW_PRIORITY_MAX_RETRY_AFTER_MS = 600000;
var LOW_PRIORITY_DEFAULT_MAX_WAIT_MS = 1200000;
var LOW_PRIORITY_MIN_MAX_WAIT_MS = 60000;
var LOW_PRIORITY_MAX_MAX_WAIT_MS = 21600000;
var LOW_PRIORITY_JITTER_RATIO = 0.3;
var LOW_PRIORITY_STALE_TICK_MS = 120000;
var RESET_ADVANCE_TOLERANCE_SECONDS = 60;
var UNIFIED_5H_RESET_HEADER = "anthropic-ratelimit-unified-5h-reset";
var UNIFIED_7D_RESET_HEADER = "anthropic-ratelimit-unified-7d-reset";
var POST_RESET_GRACE_MS = 60000;
//@ chunk-vn3g7zt8.js:188062-188384 placement
/**
 * 创建低优先级模式的运行时状态：阶段、实验分组、重试间隔与最长等待、服务计数、累计等待、预算使用率、冷却截止、变化与事件信号。
 */
function createLowPriorityState() {
  return {
    state: {
      phase: "idle",
    },
    arm: undefined,
    retryAfterMs: LOW_PRIORITY_DEFAULT_RETRY_AFTER_MS,
    maxWaitMs: LOW_PRIORITY_DEFAULT_MAX_WAIT_MS,
    requestsServed: 0,
    requestsServedStandard: 0,
    totalWaitMs: 0,
    budgetUtilization: undefined,
    budgetUtilizationObservedAtMs: 0,
    budgetSpentUntilSeconds: undefined,
    stoppedWallResetsAtSeconds: undefined,
    coolingOffUntilMs: undefined,
    resumed: false,
    changed: createSignal(),
    events: createSignal(),
  };
}
//@ chunk-vn3g7zt8.js:188384-188401 placement
/**
 * 按宿主保存的低优先级模式状态。
 */
var lowPriorityStateSlot; // deferred: uses createLowPriorityState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-vn3g7zt8.js:188384", () => {
  lowPriorityStateSlot = new HostScoped(createLowPriorityState);
});
//@ chunk-vn3g7zt8.js:188401-188438 placement
/**
 * 取当前宿主的低优先级模式状态。
 */
function getLowPriorityState() {
  return lowPriorityStateSlot.of(getRootSession().host);
}
//@ chunk-vn3g7zt8.js:188438-188487 placement
/**
 * 低优先级模式是否处于 active。
 */
function isLowPriorityActive() {
  return getLowPriorityState().state.phase === "active";
}
//@ chunk-vn3g7zt8.js:188487-188585 placement
/**
 * 安全版 active 判断：先处理重置，出错返回 false。
 */
function isLowPriorityActiveSafe(now = Date.now()) {
  try {
    endLowPriorityIfReset(now);
    return getLowPriorityState().state.phase === "active";
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-vn3g7zt8.js:188585-188658 placement
/**
 * 低优先级模式的重置截止时间（active 时）。
 */
function resetDeadlineMs(state) {
  return state.phase === "active" ? state.resetsAtSeconds * 1000 + POST_RESET_GRACE_MS : null;
}
//@ chunk-vn3g7zt8.js:188658-188758 placement
/**
 * 低优先级模式到达重置时间时结束它。
 */
function endLowPriorityIfReset(now = Date.now()) {
  let lowPriorityState = getLowPriorityState();
  let deadline = resetDeadlineMs(lowPriorityState.state);
  if (deadline === null || now < deadline) return false;
  return endLowPriority("reset", now);
}
//@ chunk-vn3g7zt8.js:188758-188848 placement
/**
 * 预算是否已花到某时间点。
 */
function isBudgetSpent(now = Date.now()) {
  let budgetSpentUntilSeconds = getLowPriorityState().budgetSpentUntilSeconds;
  return budgetSpentUntilSeconds !== undefined && now < budgetSpentUntilSeconds * 1000;
}
//@ chunk-vn3g7zt8.js:188848-188899 placement
/**
 * 清除预算花费记录。
 */
function clearBudgetSpent() {
  getLowPriorityState().budgetSpentUntilSeconds = undefined;
}
//@ chunk-vn3g7zt8.js:188899-188987 placement
/**
 * 冷却截止时间（未在冷却返回 undefined）。
 */
function getCooloffUntil(now = Date.now()) {
  let coolingOffUntilMs = getLowPriorityState().coolingOffUntilMs;
  return coolingOffUntilMs !== undefined && now < coolingOffUntilMs ? coolingOffUntilMs : undefined;
}
//@ chunk-vn3g7zt8.js:188987-189079 placement
/**
 * 剩余额度百分比（非 active 时 undefined）。
 */
function allowanceLeftPercent() {
  let lowPriorityState = getLowPriorityState();
  if (lowPriorityState.state.phase !== "active") return;
  return remainingPercent(lowPriorityState.budgetUtilization);
}
//@ chunk-vn3g7zt8.js:189079-189167 placement
/**
 * 把使用率换算成剩余百分比（0–100）。
 */
function remainingPercent(budgetUtilization) {
  return budgetUtilization === undefined
    ? undefined
    : Math.min(100, Math.max(0, 100 - Math.round(budgetUtilization * 100)));
}
//@ chunk-vn3g7zt8.js:189167-189200 placement
/**
 * 当前低优先级状态对象。
 */
function getLowPriorityStateValue() {
  return getLowPriorityState().state;
}
//@ chunk-vn3g7zt8.js:189200-189249 placement
/**
 * 订阅低优先级状态变化。
 */
function onLowPriorityChanged(listener) {
  return getLowPriorityState().changed.subscribe(listener);
}
//@ chunk-vn3g7zt8.js:189249-189297 placement
/**
 * 订阅低优先级事件。
 */
function onLowPriorityEvent(listener) {
  return getLowPriorityState().events.subscribe(listener);
}
//@ chunk-vn3g7zt8.js:189297-189341 placement
/**
 * 设置状态并发出变更事件。
 */
function setLowPriorityState(holder, state) {
  holder.state = state;
  holder.changed.emit();
}
//@ chunk-vn3g7zt8.js:189341-189399 placement
/**
 * 生成低优先级遥测字段（arm、配置版本）。
 */
function telemetryFields(state) {
  return {
    arm: fromEnumOpt(state.arm),
    config_version: getLowPriorityConfigVersion(),
  };
}
//@ chunk-vn3g7zt8.js:189399-189661 placement
/**
 * 用户接受低优先级提议时进入 active：记录分组、按服务端建议设置重试/等待上限并开始计数；已在 active 时返回 false。
 */
function acceptLowPriorityOffer({
  resetsAtSeconds,
  arm,
  entry,
  retryAfterSeconds,
  maxWaitSeconds,
  now = Date.now(),
}) {
  let state = getLowPriorityState();
  if (state.state.phase === "active") return false;
  state.arm = arm;
  state.retryAfterMs = LOW_PRIORITY_DEFAULT_RETRY_AFTER_MS;
  state.maxWaitMs = LOW_PRIORITY_DEFAULT_MAX_WAIT_MS;
  applyRetryLimits(state, retryAfterSeconds, maxWaitSeconds);
  enterLowPriorityActive(state, {
    resetsAtSeconds,
    entry,
    resumed: false,
    now,
  });
  return true;
}
//@ chunk-vn3g7zt8.js:189661-189746 placement
/**
 * 可恢复的重置时间（未 active 且有停止记录时）。
 */
function resumableResetAt(now = Date.now()) {
  let lowPriorityState = getLowPriorityState();
  return lowPriorityState.state.phase === "active" ? undefined : stoppedResetAt(lowPriorityState, now);
}
//@ chunk-vn3g7zt8.js:189746-189906 placement
/**
 * 恢复低优先级模式（若当前未激活且有可用的重置时间）。
 */
function resumeLowPriority(entry, nowMs = Date.now()) {
  let lowPriorityState = getLowPriorityState();
  let resetsAt = stoppedResetAt(lowPriorityState, nowMs);
  if (lowPriorityState.state.phase === "active" || resetsAt === undefined) return false;
  enterLowPriorityActive(lowPriorityState, {
    resetsAtSeconds: resetsAt,
    entry,
    resumed: true,
    now: nowMs,
  });
  return true;
}
//@ chunk-vn3g7zt8.js:189906-189995 placement
/**
 * 已停止状态的重置时间（仍有效时）。
 */
function stoppedResetAt(lowPriorityState, nowMs) {
  let stoppedWallResetsAtSeconds = lowPriorityState.stoppedWallResetsAtSeconds;
  return stoppedWallResetsAtSeconds !== undefined && stoppedWallResetsAtSeconds * 1000 > nowMs
    ? stoppedWallResetsAtSeconds
    : undefined;
}
//@ chunk-vn3g7zt8.js:189995-190387 placement
/**
 * 进入 active 阶段：重置计数（非恢复时清空预算使用率），上报 tengu_lowpri_accepted 并发出 accepted 事件。
 */
function enterLowPriorityActive(holder, { resetsAtSeconds, entry, resumed, now }) {
  holder.stoppedWallResetsAtSeconds = undefined;
  holder.resumed = resumed;
  holder.requestsServed = 0;
  holder.requestsServedStandard = 0;
  holder.totalWaitMs = 0;
  if (!resumed) {
    holder.budgetUtilization = undefined;
    holder.budgetUtilizationObservedAtMs = 0;
  }
  logEvent("tengu_lowpri_accepted", {
    ...telemetryFields(holder),
    entry: fromEnum(entry),
    resumed,
  });
  setLowPriorityState(holder, {
    phase: "active",
    resetsAtSeconds,
    acceptedAtMs: now,
  });
  holder.events.emit({
    type: "accepted",
    entry,
  });
}
//@ chunk-vn3g7zt8.js:190387-191131 placement
/**
 * 结束低优先级模式：max_wait 时进入冷却，上报 tengu_lowpri_ended（时长、服务数、等待、预算使用率），按原因记录成功/失败，user 结束时记住重置时间，发出 ended 事件。
 */
function endLowPriority(reason, now = Date.now()) {
  let state = getLowPriorityState();
  if (state.state.phase !== "active") {
    if (reason !== "user") state.stoppedWallResetsAtSeconds = undefined;
    return false;
  }
  if (reason === "max_wait") {
    let lowPriorityCooloffMs = getLowPriorityCooloffMs();
    state.coolingOffUntilMs = lowPriorityCooloffMs > 0 ? now + lowPriorityCooloffMs : undefined;
  }
  logEvent("tengu_lowpri_ended", {
    ...telemetryFields(state),
    reason: fromEnum(reason),
    resumed: state.resumed,
    duration_ms: Math.max(0, now - state.state.acceptedAtMs),
    requests_served: state.requestsServed,
    requests_served_standard: state.requestsServedStandard,
    total_wait_ms: Math.max(0, state.totalWaitMs),
    ...(state.budgetUtilization !== undefined && {
      budget_utilization_pct: Math.round(state.budgetUtilization * 100),
    }),
  });
  if (isBenignEndReason(reason) || state.requestsServed > 0) logFeatureOk("low_priority_mode");
  else logFeatureSad("low_priority_mode", reason);
  state.stoppedWallResetsAtSeconds = reason === "user" ? state.state.resetsAtSeconds : undefined;
  setLowPriorityState(state, {
    phase: "idle",
  });
  state.events.emit({
    type: "ended",
    reason,
  });
  return true;
}
//@ chunk-vn3g7zt8.js:191131-191341 placement
function isBenignEndReason(reason) {
  switch (reason) {
    case "reset":
    case "user":
    case "conversation_reset":
    case "account_switch":
    case "extra_usage":
      return true;
    case "weekly":
    case "budget":
    case "off":
    case "ineligible":
    case "wall":
    case "max_wait":
      return false;
  }
}
//@ chunk-vn3g7zt8.js:191341-191405 placement
/**
 * 四舍五入并夹在 [min, max] 之间。
 */
function clampRound(value, min, max) {
  return Math.min(max, Math.max(min, Math.round(value)));
}
//@ chunk-vn3g7zt8.js:191405-191553 placement
function applyRetryLimits(state, retryAfterSeconds, maxWaitSeconds) {
  if (retryAfterSeconds !== undefined && Number.isFinite(retryAfterSeconds))
    state.retryAfterMs = clampRound(
      retryAfterSeconds * 1000,
      LOW_PRIORITY_MIN_RETRY_AFTER_MS,
      LOW_PRIORITY_MAX_RETRY_AFTER_MS,
    );
  if (maxWaitSeconds !== undefined && Number.isFinite(maxWaitSeconds))
    state.maxWaitMs = clampRound(
      maxWaitSeconds * 1000,
      LOW_PRIORITY_MIN_MAX_WAIT_MS,
      LOW_PRIORITY_MAX_MAX_WAIT_MS,
    );
}
//@ chunk-vn3g7zt8.js:191553-191772 placement
function observeLowPriorityHeaders(state, headers, observedAtMs) {
  applyRetryLimits(state, getSlowRetryAfter(headers), getSlowMaxWait(headers));
  let slowBudgetUtilization = getSlowBudgetUtilization(headers);
  if (slowBudgetUtilization !== undefined && observedAtMs >= state.budgetUtilizationObservedAtMs) {
    state.budgetUtilizationObservedAtMs = observedAtMs;
    let changed = remainingPercent(slowBudgetUtilization) !== remainingPercent(state.budgetUtilization);
    state.budgetUtilization = slowBudgetUtilization;
    if (changed) state.changed.emit();
  }
}
//@ chunk-vn3g7zt8.js:191772-192220 placement
/**
 * 根据响应头更新低优先级状态：5 小时重置时间前移则结束（reset），slow-status active/not_needed 时计数并读取预算，额外用量启用时以 extra_usage 结束。
 */
function handleLowPriorityResponseHeaders(headers, nowMs = Date.now()) {
  try {
    let state = getLowPriorityState();
    let slowStatusHeader = getSlowStatusHeader(headers);
    let overageInUse = slowStatusHeader === "ineligible" && headers.get(OVERAGE_IN_USE_HEADER) === "true";
    if (state.state.phase !== "active") {
      if (overageInUse && state.stoppedWallResetsAtSeconds !== undefined)
        endLowPriority("extra_usage", nowMs);
      return;
    }
    let fiveHourReset = Number(headers.get(UNIFIED_5H_RESET_HEADER) ?? NaN);
    if (
      Number.isFinite(fiveHourReset) &&
      fiveHourReset >= state.state.resetsAtSeconds + RESET_ADVANCE_TOLERANCE_SECONDS
    ) {
      endLowPriority("reset", nowMs);
      return;
    }
    if (slowStatusHeader === "active") {
      observeLowPriorityHeaders(state, headers, nowMs);
      state.requestsServed++;
    } else if (slowStatusHeader === "not_needed") {
      observeLowPriorityHeaders(state, headers, nowMs);
      state.requestsServedStandard++;
    } else if (overageInUse) endLowPriority("extra_usage", nowMs);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-vn3g7zt8.js:192220-192631 placement
/**
 * 请求成功时结算低优先级等待：计算本次等待（过期 tick 按计划时间截断），累加并上报 tengu_lowpri_request/tengu_lowpri_wait。
 */
function recordLowPriorityServed(lowPriorityWait, nowMs = Date.now()) {
  try {
    let wait = lowPriorityWait.current;
    lowPriorityWait.current = null;
    let lowPriorityState = getLowPriorityState();
    if (
      wait === null ||
      lowPriorityState.state.phase !== "active" ||
      wait.sinceMs < lowPriorityState.state.acceptedAtMs
    )
      return;
    let isStale = nowMs - wait.nextTryAtMs > LOW_PRIORITY_STALE_TICK_MS;
    let max = Math.max(0, (isStale ? wait.nextTryAtMs : nowMs) - wait.sinceMs);
    lowPriorityState.totalWaitMs += max;
    logEvent("tengu_lowpri_request", {
      ...telemetryFields(lowPriorityState),
      outcome: fromEnum("served"),
      wait_ms: max,
      attempt: wait.attempts + 1,
    });
    logEvent("tengu_lowpri_wait", {
      ...telemetryFields(lowPriorityState),
      total_wait_ms: max,
      attempts: wait.attempts,
    });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-vn3g7zt8.js:192631-192758 placement
/**
 * 规划低优先级模式下的重试（出错时记录并返回 null）。
 */
function planLowPriorityRetry(error, { markedAtDispatch, querySource, wait, now = Date.now() }) {
  try {
    return planLowPriorityRetryInner(error, markedAtDispatch, querySource, wait, now);
  } catch (error) {
    logError(error);
    return null;
  }
}
//@ chunk-vn3g7zt8.js:192758-193693 placement
/**
 * 对低优先级模式下的错误决定是否重试：429 根据 slow-status 判断结束原因；slot_busy 或 529 时对主/agent 请求按带抖动的间隔安排重试，超过最长等待则以 max_wait 结束。
 */
function planLowPriorityRetryInner(error, markedAtDispatch, querySource, wait, now) {
  let state = getLowPriorityState();
  if (!markedAtDispatch) return null;
  let headers = error instanceof APIError ? error.headers : undefined;
  let slowStatusHeader = getSlowStatusHeader(headers);
  let rateLimited = error instanceof APIError && error.status === 429;
  let isMainSource = classifyQuerySource(querySource) === "main";
  let endReason = rateLimited
    ? getLowPriorityEndReason(slowStatusHeader, isMainSource, hasUnifiedRateLimitHeaders(error))
    : null;
  if (state.state.phase !== "active") {
    if (endReason !== null && state.stoppedWallResetsAtSeconds !== undefined)
      endLowPriorityWithBudget(state, endReason, headers, now);
    return null;
  }
  observeLowPriorityHeaders(state, headers, now);
  if (endReason !== null) {
    endLowPriorityWithBudget(state, endReason, headers, now);
    return null;
  }
  let slotBusy = rateLimited && slowStatusHeader === "slot_busy";
  let capacityBusy = is529Error(error) && (slowStatusHeader === "active" || slowStatusHeader === undefined);
  if (!slotBusy && !capacityBusy) return null;
  if (!isMainOrAgentQuerySource(querySource)) return null;
  let existing = wait.current;
  let current =
    existing !== null && existing.sinceMs >= state.state.acceptedAtMs
      ? existing
      : {
          sinceMs: now,
          attempts: 0,
          nextTryAtMs: now,
        };
  let max = Math.max(0, now - current.sinceMs);
  logEvent("tengu_lowpri_request", {
    ...telemetryFields(state),
    outcome: fromEnum(slotBusy ? "slot_busy" : "capacity_busy"),
    wait_ms: max,
    attempt: current.attempts + 1,
  });
  if (max >= state.maxWaitMs) {
    wait.current = null;
    endLowPriority("max_wait", now);
    return null;
  }
  let jitter = 1 + (Math.random() * 2 - 1) * LOW_PRIORITY_JITTER_RATIO;
  let rounded = Math.round(state.retryAfterMs * jitter);
  wait.current = {
    sinceMs: current.sinceMs,
    attempts: current.attempts + 1,
    nextTryAtMs: now + rounded,
  };
  return {
    delayMs: rounded,
    attempt: wait.current.attempts,
    waitingSinceMs: wait.current.sinceMs,
  };
}
//@ chunk-vn3g7zt8.js:193693-193748 placement
/**
 * 按终态记录预算并结束低优先级。
 */
function endLowPriorityWithBudget(state, reason, headers, nowMs) {
  if (reason === "budget") recordBudgetSpentUntil(state, headers, nowMs);
  endLowPriority(reason, nowMs);
}
//@ chunk-vn3g7zt8.js:193748-193762 placement
/**
 * 预算花费记录的额外保留秒数（8 天）。
 */
var MAX_BUDGET_SPEND_S = 691200;
//@ chunk-vn3g7zt8.js:193762-193923 placement
function recordBudgetSpentUntil(state, headers, nowMs) {
  let resetSeconds =
    Number(headers?.get(SLOW_BUDGET_RESET_HEADER) ?? NaN) ||
    Number(headers?.get(UNIFIED_7D_RESET_HEADER) ?? NaN);
  if (Number.isFinite(resetSeconds) && resetSeconds > 0)
    state.budgetSpentUntilSeconds = Math.round(Math.min(resetSeconds, nowMs / 1000 + MAX_BUDGET_SPEND_S));
}
//@ chunk-vn3g7zt8.js:193923-194204 placement
function getLowPriorityEndReason(slowStatusHeader, isMainSource, hasUnifiedHeaders) {
  switch (slowStatusHeader) {
    case "weekly_limit":
      return "weekly";
    case "budget_exhausted":
      return "budget";
    case "off":
      return "off";
    case "ineligible":
      return isMainSource ? "ineligible" : null;
    case "slot_busy":
      return null;
    case undefined:
    case "unrecognized":
    case "active":
    case "not_needed":
      return isMainSource && hasUnifiedHeaders ? "wall" : null;
  }
}
//@ chunk-vn3g7zt8.js:194204-194369 placement
/**
 * 判断是否发送网关提示请求头：环境变量优先，第一方后端为是，其他第一方由开关决定。
 */
function shouldSendGatewayHintHeaders() {
  let CLAUDE_CODE_GATEWAY_HINT_HEADERS = env.CLAUDE_CODE_GATEWAY_HINT_HEADERS;
  if (CLAUDE_CODE_GATEWAY_HINT_HEADERS !== undefined) return CLAUDE_CODE_GATEWAY_HINT_HEADERS;
  if (isFirstPartyApiBackend()) return true;
  if (getAPIProvider() !== "firstParty") return false;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_splendid_sutton", false);
}
//@ chunk-gxp74sjc.js:704-739 placement
/**
 * 取当前宿主的低优先级状态。
 */
function getLowPrioritySessionState() {
  return LOW_PRIORITY_STATE.of(getRootSession().host);
}
export {
  shouldSendGatewayHintHeaders,
  isLowPriorityActiveSafe,
  recordLowPriorityServed,
  planLowPriorityRetry,
  isLowPriorityActive,
  handleLowPriorityResponseHeaders,
  endLowPriority,
  clearBudgetSpent,
  onLowPriorityEvent,
  onLowPriorityChanged,
  getLowPriorityStateValue,
  getCooloffUntil,
  allowanceLeftPercent,
  resetDeadlineMs,
  endLowPriorityIfReset,
  isBudgetSpent,
  resumableResetAt,
  getLowPrioritySessionState,
  acceptLowPriorityOffer,
  resumeLowPriority,
};
