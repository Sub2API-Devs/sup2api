/**
 * query/turnEndReasons.ts
 *
 * 2.1.316 新增：按终止原因分类回合结束（完成、中止、错误等）；回合结束后更新目标状态（达成、重试、暂停）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ha3km179.js (19)
 * attribution: placement 19
 */
import { isObserverAgentTask } from "../tasks/LocalAgentTask/LocalAgentTask.js";
import { isActiveAgentTask, isRunningShellTask } from "../tasks/taskStatus.js";
import { enqueueHookTaskNotification } from "../utils/hooks/hookMessages.js";
import { P4s, V3n } from "../utils/messageQueueManager.js";
import {
  getReplyGatePolicy,
  getSessionId,
  getSdkOAuthTokenRefreshCallback,
  getIsNonInteractiveSession,
} from "../bootstrap/state.js";
import { enqueueTaskNotification } from "../utils/task/taskNotifications.js";
import { logError } from "../utils/log.js";
import { logGoalCleared } from "../commands/goal/goal.js";
import { logFeatureBad, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { createAttachmentMessage as createAttachmentMessage_3 } from "../utils/attachments.js";
import {
  createInformationalSystemMessage,
  createUserInterruptionMessage,
  createSystemMessage,
  TURN_NOT_ENDED_NOTICE,
} from "../utils/messages.js";
import { truncate } from "../utils/format.js";
import { classifyQuerySource } from "../services/api/requestHeaders.js";
import { Pn, Is, Ca, clearPendingGoalReprompt } from "./goalCheckIn.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { Y8n, isAutoResumableLimit } from "../services/api/errors.js";
import { env } from "../utils/env.js";
import { isHostEntrypoint } from "../utils/entrypointKinds.js";
import { withoutHostManagedProviderVars } from "../utils/hostCredsFile.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum, fromEnumOpt } from "../services/analytics/safeMetadata.js";
import { isSilentAbortReason, shutdownInterruptStamp } from "../utils/abortController.js";
import { hzr } from "../services/compact/compact.js";
import { hfe } from "../services/compact/postCompactCleanup.js";
import { Zee } from "../commands/color/index.js";
import { MEDIA_TOO_LARGE_HINT, COULD_NOT_COMPACT } from "../services/compact/compactErrors.js";
import { vjo } from "../services/compact/reactiveCompact.js";
import { hasToolResultError } from "../services/tools/mcpResultMeta.js";
import { uniq } from "../utils/collections.js";

/**
 * 列出需要在后台面板显示的任务：活动代理类任务或运行中的 shell，排除观察者与 main-session。
 */
//@ chunk-ha3km179.js:99181-99315 placement = isPanelAgentTask (0.77)
function getVisibleBackgroundTasks(tasks) {
  return Object.values(tasks).filter(
    (n) =>
      !isObserverAgentTask(n) &&
      !(n.type === "local_agent" && n.agentType === "main-session") &&
      (isActiveAgentTask(n) || isRunningShellTask(n)),
  );
}
//@ chunk-ha3km179.js:99315-99418 placement
function createQueueDelivery(e) {
  return {
    deliver: (n) => {
      enqueueHookTaskNotification({ ...n, queue: e, origin: P4s });
    },
    hasQueued: (n) => e.peek(n) !== void 0,
  };
}
//@ chunk-ha3km179.js:99418-99445 placement
function wd() {
  return getReplyGatePolicy();
}
//@ chunk-ha3km179.js:99445-99474 placement
var STOP_HOOK_BLOCK_CAP = "stop-hook-block-cap";
//@ chunk-ha3km179.js:99474-99597 placement
function notifyStopHookCap(e) {
  try {
    enqueueTaskNotification({
      type: "system",
      subtype: "notification",
      key: STOP_HOOK_BLOCK_CAP,
      text: e,
      priority: "high",
      color: "warning",
    });
  } catch (error) {
    logError(error);
  }
}
/**
 * 目标因错误被清除的原因表（认证失败、磁盘满等）。
 */
//@ chunk-ha3km179.js:99597-100076 placement
var GOAL_CLEAR_REASONS = {
    auth: { label: "authentication failed", errorCode: "cleared_auth" },
    disk_full: { label: "disk full", errorCode: "cleared_disk_full" },
    verification_required: {
      label: "organization verification required",
      errorCode: "cleared_verification_required",
    },
    billing: { label: "credit balance too low", errorCode: "cleared_billing" },
    context_limit: { label: "context limit reached", errorCode: "cleared_context_limit" },
    model_unavailable: { label: "model unavailable", errorCode: "cleared_model_unavailable" },
  },
  Hf = 80;
/**
 * 因错误清除目标并移除 Stop hook。
 */
//@ chunk-ha3km179.js:100076-100468 placement
function* clearGoalOnError(e, n, r) {
  let { label: label, errorCode: errorCode } = GOAL_CLEAR_REASONS[r];
  (n.sessionHooksRegistry.remove(getSessionId(), "Stop", { type: "prompt", prompt: e.condition }),
    logGoalCleared(e, r === "context_limit" ? "context_limit" : "api_error"),
    logFeatureBad("goal_met", errorCode),
    yield { type: "active_goal", value: void 0 },
    yield createAttachmentMessage_3(!0, e.condition),
    yield createInformationalSystemMessage(
      `Goal cleared after an unrecoverable error (${label}): "${truncate(e.condition, Hf, !0)}". Run /goal again to continue.`,
      "warning",
    ));
}
/**
 * 目标重试延迟与原因说明。
 */
//@ chunk-ha3km179.js:100468-101739 placement
var GOAL_RETRY_DELAYS = [60000, 300000, 900000],
  Gf = 0.2,
  ui = GOAL_RETRY_DELAYS.length,
  Wf = {
    api_unavailable: "the API was unavailable or the connection dropped",
    unclassified: "the API returned an unexpected response",
    output_limit: "the response hit the output token limit",
    cloud_credentials: "cloud credentials did not load",
    host_auth: "sign-in was being refreshed",
    image: "an image could not be sent",
    unreadable_tool_call: "Claude's tool call could not be read",
    goal_check: "the goal check could not complete",
  },
  Kf = {
    request_rejected:
      "Goal paused \xB7 the API rejected the last request \xB7 send a message to continue, or run /goal clear",
    turn_error: "Goal paused \xB7 the last turn could not finish \xB7 send a message to continue",
    hook_stopped: "Goal paused \xB7 a hook ended the turn \xB7 send a message to continue",
    goal_check_timeout: "Goal paused \xB7 the goal check timed out \xB7 send a message to continue",
    goal_check_capped:
      "Goal paused \xB7 goal checks kept finding it unmet this turn \xB7 send a message to continue",
    rate_limited: "Goal paused \xB7 the request was rate limited \xB7 send a message to retry",
    usage_limit: "Goal paused \xB7 usage limit reached \xB7 send a message after it resets to continue",
    usage_limit_waiting: "Goal paused \xB7 usage limit reached \xB7 continues automatically when it resets",
  };
/**
 * 回合结束后更新目标状态（达成、重试、暂停）。
 */
//@ chunk-ha3km179.js:101739-103388 placement
function* updateGoalAfterTurn(e, n, r, s, h) {
  try {
    if (e.agentId || classifyQuerySource(r) !== "main") return;
    let { sessionScratch: sessionScratch } = e.session,
      activeGoal = n().activeGoal;
    if (activeGoal === void 0 || e.abortController.signal.aborted) {
      Pn(sessionScratch);
      return;
    }
    let M = classifyTurnEnd(s);
    if (M.kind === "none") {
      if (s.reason !== "completed" || s.goalPass !== void 0) Pn(sessionScratch);
      return;
    }
    if (M.kind === "stop") {
      if ((Pn(sessionScratch), !getFeatureValue_CACHED_MAY_BE_STALE("tengu_quartz_pipit", !0))) return;
      (logGoalInterruption(s, M, "cleared", 0), yield* clearGoalOnError(activeGoal, e, M.cause));
      return;
    }
    if (!Is() || e.options.isNonInteractiveSession) {
      Pn(sessionScratch);
      return;
    }
    let goalInterruptionStreak = sessionScratch.goalInterruptionStreak(),
      T = goalInterruptionStreak?.goalSetAt === activeGoal.setAt,
      w = T ? goalInterruptionStreak.retries : 0,
      P = T ? goalInterruptionStreak.announced : void 0;
    if (M.kind === "retry") {
      let L = h(e.messageQueue);
      if (T && (sessionScratch.pendingGoalReprompt() !== void 0 || L.hasQueued(V3n))) return;
      let z = Wf[M.cause];
      if (w >= ui) {
        if (P === "gave_up") return;
        (sessionScratch.replaceGoalInterruptionStreak({
          goalSetAt: activeGoal.setAt,
          retries: w,
          announced: "gave_up",
        }),
          logGoalInterruption(s, M, "gave_up", w),
          logFeatureSad("goal_interruption", "gave_up"),
          yield createInformationalSystemMessage(
            `Goal paused after ${ui} automatic retries \xB7 ${z} \xB7 send a message to continue`,
            "warning",
          ));
        return;
      }
      sessionScratch.replaceGoalInterruptionStreak({
        goalSetAt: activeGoal.setAt,
        retries: w + 1,
        announced: void 0,
      });
      let G = GOAL_RETRY_DELAYS[w] ?? GOAL_RETRY_DELAYS[0];
      (Ca(
        { goal: activeGoal, cause: z, sessionScratch: sessionScratch, getAppState: n, ...L },
        Math.round(G * (1 + Math.random() * Gf)),
      ),
        logGoalInterruption(s, M, "reprompt_armed", w + 1),
        yield createInformationalSystemMessage(
          `Goal still active \xB7 ${z} \xB7 retrying in ${Math.round(G / 60000)} min (${w + 1}/${ui}) \xB7 send a message to retry now`,
          "notice",
        ));
      return;
    }
    clearPendingGoalReprompt(sessionScratch);
    let Q = M.cause === "usage_limit" && Y8n.of(e.session.host).hasIntent(),
      D = Q ? "usage_limit_waiting" : M.cause;
    if (P === D) return;
    if (
      (sessionScratch.replaceGoalInterruptionStreak({
        goalSetAt: activeGoal.setAt,
        retries: w,
        announced: D,
      }),
      Q)
    )
      logGoalInterruption(s, M, "usage_limit_wait_owns", w);
    else (logGoalInterruption(s, M, "paused", w), logFeatureSad("goal_interruption", "paused"));
    yield createInformationalSystemMessage(Kf[D], "notice");
  } catch (error) {
    logError(error);
  }
}
/**
 * 按终止原因分类回合结束（完成、中止、错误等）。
 */
//@ chunk-ha3km179.js:103388-105125 placement
function classifyTurnEnd(e) {
  switch (e.reason) {
    case "completed":
      return goalCheckInterruption(e.goalPass);
    case "aborted_streaming":
    case "aborted_tools":
    case "max_turns":
    case "tool_deferred":
    case "background_requested":
      return { kind: "none" };
    case "stop_hook_prevented":
    case "hook_stopped":
      return { kind: "pause", cause: "hook_stopped" };
    case "blocking_limit":
    case "prompt_too_long":
    case "rapid_refill_breaker":
      return { kind: "stop", cause: "context_limit" };
    case "image_error":
      return { kind: "retry", cause: "image" };
    case "model_error":
      return { kind: "pause", cause: "turn_error" };
    case "malformed_tool_use_exhausted":
      return { kind: "retry", cause: "unreadable_tool_call" };
    case "api_error":
      if (e.errorKind === "rate_limit")
        return e.quotaLimits !== void 0 && isAutoResumableLimit(e.quotaLimits)
          ? { kind: "pause", cause: "usage_limit" }
          : { kind: "pause", cause: "rate_limited" };
      if (e.errorKind === "max_output_tokens") return { kind: "retry", cause: "output_limit" };
      if (e.errorKind === "cloud_credential_error") return { kind: "retry", cause: "cloud_credentials" };
      if (e.isTransient) return { kind: "retry", cause: "api_unavailable" };
      switch (e.oauthRefreshDiskFull ? "authentication_failed" : e.errorKind) {
        case "overloaded":
        case "server_error":
          return { kind: "retry", cause: "api_unavailable" };
        case "unknown":
        case void 0:
          return { kind: "retry", cause: "unclassified" };
        case "invalid_request":
          return { kind: "pause", cause: "request_rejected" };
        case "authentication_failed":
        case "oauth_org_not_allowed":
          return env.CLAUDE_CODE_REMOTE ||
            isHostEntrypoint() ||
            getSdkOAuthTokenRefreshCallback() !== null ||
            withoutHostManagedProviderVars()
            ? { kind: "retry", cause: "host_auth" }
            : { kind: "stop", cause: e.oauthRefreshDiskFull ? "disk_full" : "auth" };
        case "account_on_hold":
          return { kind: "stop", cause: "auth" };
        case "verification_required":
          return { kind: "stop", cause: "verification_required" };
        case "billing_error":
          return { kind: "stop", cause: "billing" };
        case "model_not_found":
          return { kind: "stop", cause: "model_unavailable" };
      }
  }
}
//@ chunk-ha3km179.js:105125-105402 placement
function goalCheckInterruption(e) {
  switch (e) {
    case "error":
      return { kind: "retry", cause: "goal_check" };
    case "cancelled":
      return { kind: "pause", cause: "goal_check_timeout" };
    case "not_met":
      return { kind: "pause", cause: "goal_check_capped" };
    case "met":
    case "impossible":
    case "deferred":
    case void 0:
      return { kind: "none" };
  }
}
//@ chunk-ha3km179.js:105402-105656 placement
function logGoalInterruption(e, n, r, s) {
  logEvent("tengu_goal_interruption", {
    interruption: fromEnum(n.kind),
    action: fromEnum(r),
    cause: fromEnum(n.cause),
    terminal_reason: fromEnum(e.reason),
    error_kind: fromEnumOpt(e.reason === "api_error" ? e.errorKind : void 0),
    goal_pass: fromEnumOpt(e.reason === "completed" ? e.goalPass : void 0),
    retries: s,
  });
}
/**
 * 中止回合的终止信息与提示行。
 */
//@ chunk-ha3km179.js:105656-106005 placement
function abortedTurnRows(e, n) {
  if (e !== "aborted") return { rows: [e], terminal: { reason: "api_error", isTransient: !1 } };
  let r = { reason: "aborted_streaming" };
  try {
    return {
      terminal: r,
      rows: isSilentAbortReason(n.signal.reason)
        ? []
        : [
            createUserInterruptionMessage({
              toolUse: !1,
              interruptedMessageId: n.interruptedMessageId(),
              interruptedByShutdown: shutdownInterruptStamp(n.signal),
              now: n.now,
              uuidFn: n.uuid,
            }),
          ],
    };
  } catch (error) {
    return (logError(error), { rows: [], terminal: r });
  }
}
/**
 * 连续压缩失败时通知用户。
 */
//@ chunk-ha3km179.js:106005-106407 placement
function notifyCompactFailure({
  outcome: outcome,
  querySource: querySource,
  agentId: agentId,
  isInterrupted: isInterrupted,
}) {
  try {
    if (
      outcome.kind !== "failed" ||
      outcome.consecutiveFailures !== hzr ||
      isInterrupted ||
      getIsNonInteractiveSession() ||
      !hfe(querySource, agentId) ||
      !Zee()
    )
      return;
    let compactFailure = outcome.compactFailure;
    switch (compactFailure?.reason) {
      case "aborted":
        return;
      case "exhausted":
      case "too_few_groups":
        return pi(zf);
      case "media_unstrippable":
        return pi(MEDIA_TOO_LARGE_HINT);
      case void 0:
      case "error":
        return pi(compactFailure?.detail ? truncate(compactFailure.detail, vjo, !0) : void 0);
    }
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-ha3km179.js:106407-106429 placement
var zf = "try /compact";
//@ chunk-ha3km179.js:106429-106490 placement
function pi(e) {
  return createSystemMessage(e ? `${COULD_NOT_COMPACT} \xB7 ${e}` : COULD_NOT_COMPACT, "warning");
}
/**
 * 工具请求结束回合但有失败兄弟调用时追加提示（tengu_cozy_fern）。
 */
//@ chunk-ha3km179.js:106490-106876 placement
function nudgeAfterToolEndTurn({
  requested: requested,
  batchResults: batchResults,
  spent: spent,
  lastIteration: lastIteration,
  queryChainId: queryChainId,
  queryDepth: queryDepth,
  deps: deps,
  makeUserMessage: makeUserMessage,
}) {
  try {
    if (
      requested === !1 ||
      requested === "tool" ||
      spent ||
      lastIteration ||
      !batchResults.some(hasToolResultError) ||
      !getFeatureValue_CACHED_MAY_BE_STALE("tengu_cozy_fern", !1)
    )
      return;
    let R = makeUserMessage({
      content: TURN_NOT_ENDED_NOTICE,
      isMeta: !0,
      turnCompanion: !0,
      now: deps.now,
      uuidFn: deps.uuid,
    });
    return (
      logEvent("tengu_mcp_end_turn_overridden_by_failed_sibling", {
        queryChainId: queryChainId,
        queryDepth: queryDepth,
      }),
      R
    );
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-ha3km179.js:106876-107170 placement
function applyDisallowedTools(e, n, r) {
  try {
    let flattened = e.flatMap((h) =>
      h.replacesDisallowedTools === !0 && h.disallowedTools !== void 0 ? [h.disallowedTools] : [],
    );
    if (flattened.length === 0 || n === void 0) return r.tools;
    return (n(uniq(flattened.flat())), r.refreshTools?.() ?? r.tools);
  } catch (error) {
    return (logError(error), logFeatureSad("headless_turn_deny", "joined_list_threw"), r.tools);
  }
}
//@ chunk-ha3km179.js:107170-107203 placement
var TENGU_MODULAR_SEAL = "tengu_modular_seal",
  Jf = 2;

export {
  updateGoalAfterTurn,
  createQueueDelivery,
  abortedTurnRows,
  notifyCompactFailure,
  notifyStopHookCap,
  nudgeAfterToolEndTurn,
  applyDisallowedTools,
  wd,
  getVisibleBackgroundTasks,
  Jf,
  TENGU_MODULAR_SEAL,
};
