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
import { GOAL_CHECKIN_ORIGIN, isGoalCheckinNotification } from "../utils/messageQueueManager.js";
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
import {
  clearGoalRepromptState,
  isGoalCheckinOn,
  scheduleGoalReprompt,
  clearPendingGoalReprompt,
} from "./goalCheckIn.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { intentProviderSlot, isAutoResumableLimit } from "../services/api/errors.js";
import { env } from "../utils/env.js";
import { isHostEntrypoint } from "../utils/entrypointKinds.js";
import { withoutHostManagedProviderVars } from "../utils/hostCredsFile.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum, fromEnumOpt } from "../services/analytics/safeMetadata.js";
import { isSilentAbortReason, shutdownInterruptStamp } from "../utils/abortController.js";
import { MAX_CONSECUTIVE_COMPACT_FAILURES } from "../services/compact/compact.js";
import { isMainQueryCompaction } from "../services/compact/postCompactCleanup.js";
import { isColorCommandForceHidden } from "../commands/color/index.js";
import { MEDIA_TOO_LARGE_HINT, COULD_NOT_COMPACT } from "../services/compact/compactErrors.js";
import { MAX_FAILURE_DETAIL_CHARS } from "../services/compact/reactiveCompact.js";
import { hasToolResultError } from "../services/tools/mcpResultMeta.js";
import { uniq } from "../utils/collections.js";

//@ chunk-ha3km179.js:99181-99315 placement = isPanelAgentTask (0.77)
/**
 * 列出需要在后台面板显示的任务：活动代理类任务或运行中的 shell，排除观察者与 main-session。
 */
function getVisibleBackgroundTasks(tasks) {
  return Object.values(tasks).filter(
    (task) =>
      !isObserverAgentTask(task) &&
      !(task.type === "local_agent" && task.agentType === "main-session") &&
      (isActiveAgentTask(task) || isRunningShellTask(task)),
  );
}
//@ chunk-ha3km179.js:99315-99418 placement
function createQueueDelivery(messageQueue) {
  return {
    deliver: (message) => {
      enqueueHookTaskNotification({
        ...message,
        queue: messageQueue,
        origin: GOAL_CHECKIN_ORIGIN,
      });
    },
    hasQueued: (predicate) => messageQueue.peek(predicate) !== undefined,
  };
}
//@ chunk-ha3km179.js:99418-99445 placement
/**
 * 取回复闸门策略
 */
function replyGatePolicy() {
  return getReplyGatePolicy();
}
//@ chunk-ha3km179.js:99445-99474 placement
var STOP_HOOK_BLOCK_CAP = "stop-hook-block-cap";
//@ chunk-ha3km179.js:99474-99597 placement
function notifyStopHookCap(text) {
  try {
    enqueueTaskNotification({
      type: "system",
      subtype: "notification",
      key: STOP_HOOK_BLOCK_CAP,
      text,
      priority: "high",
      color: "warning",
    });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-ha3km179.js:99597-100076 placement
/**
 * 因错误清空目标时的原因分类：认证失败、磁盘满、需要组织验证、余额不足、上下文超限、模型不可用，各自带 label 与 cleared_* 错误码；同组 Hf 是提示文本上限 80。
 */
var GOAL_CLEAR_REASONS_2 = {
  auth: {
    label: "authentication failed",
    errorCode: "cleared_auth",
  },
  disk_full: {
    label: "disk full",
    errorCode: "cleared_disk_full",
  },
  verification_required: {
    label: "organization verification required",
    errorCode: "cleared_verification_required",
  },
  billing: {
    label: "credit balance too low",
    errorCode: "cleared_billing",
  },
  context_limit: {
    label: "context limit reached",
    errorCode: "cleared_context_limit",
  },
  model_unavailable: {
    label: "model unavailable",
    errorCode: "cleared_model_unavailable",
  },
};
var GOAL_CLEAR_REASONS = 80;
//@ chunk-ha3km179.js:100076-100468 placement
/**
 * 因错误清除目标并移除 Stop hook。
 */
function* clearGoalOnError(activeGoal, toolUseContext, cause) {
  let { label, errorCode } = GOAL_CLEAR_REASONS_2[cause];
  toolUseContext.sessionHooksRegistry.remove(getSessionId(), "Stop", {
    type: "prompt",
    prompt: activeGoal.condition,
  });
  logGoalCleared(activeGoal, cause === "context_limit" ? "context_limit" : "api_error");
  logFeatureBad("goal_met", errorCode);
  yield {
    type: "active_goal",
    value: undefined,
  };
  yield createAttachmentMessage_3(true, activeGoal.condition);
  yield createInformationalSystemMessage(
    `Goal cleared after an unrecoverable error (${label}): "${truncate(activeGoal.condition, GOAL_CLEAR_REASONS, true)}". Run /goal again to continue.`,
    "warning",
  );
}
//@ chunk-ha3km179.js:100468-101739 placement
/**
 * 目标检查失败后的重试退避 1/5/15 分钟与抖动比例 0.2；同一声明还包括失败原因到提示文案的映射和最多重试次数。
 */
var GOAL_RETRY_DELAYS_2 = [60000, 300000, 900000];
var GOAL_RETRY_DELAYS = 0.2;
var MAX_GOAL_RETRIES = GOAL_RETRY_DELAYS_2.length;
var GOAL_RETRY_REASON_TEXT = {
  api_unavailable: "the API was unavailable or the connection dropped",
  unclassified: "the API returned an unexpected response",
  output_limit: "the response hit the output token limit",
  cloud_credentials: "cloud credentials did not load",
  host_auth: "sign-in was being refreshed",
  image: "an image could not be sent",
  unreadable_tool_call: "Claude's tool call could not be read",
  goal_check: "the goal check could not complete",
};
var GOAL_ERROR_TEXT = {
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
//@ chunk-ha3km179.js:101739-103388 placement
/**
 * 回合结束后更新目标状态（达成、重试、暂停）。
 */
function* updateGoalAfterTurn(toolUseContext, getAppState, querySource, terminal, createQueueDelivery) {
  try {
    if (toolUseContext.agentId || classifyQuerySource(querySource) !== "main") return;
    let { sessionScratch } = toolUseContext.session;
    let activeGoal = getAppState().activeGoal;
    if (activeGoal === undefined || toolUseContext.abortController.signal.aborted) {
      clearGoalRepromptState(sessionScratch);
      return;
    }
    let turnEnd = classifyTurnEnd(terminal);
    if (turnEnd.kind === "none") {
      if (terminal.reason !== "completed" || terminal.goalPass !== undefined)
        clearGoalRepromptState(sessionScratch);
      return;
    }
    if (turnEnd.kind === "stop") {
      clearGoalRepromptState(sessionScratch);
      if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_quartz_pipit", true)) return;
      logGoalInterruption(terminal, turnEnd, "cleared", 0);
      yield* clearGoalOnError(activeGoal, toolUseContext, turnEnd.cause);
      return;
    }
    if (!isGoalCheckinOn() || toolUseContext.options.isNonInteractiveSession) {
      clearGoalRepromptState(sessionScratch);
      return;
    }
    let streak = sessionScratch.goalInterruptionStreak();
    let sameGoal = streak?.goalSetAt === activeGoal.setAt;
    let retries = sameGoal ? streak.retries : 0;
    let announced = sameGoal ? streak.announced : undefined;
    if (turnEnd.kind === "retry") {
      let delivery = createQueueDelivery(toolUseContext.messageQueue);
      if (
        sameGoal &&
        (sessionScratch.pendingGoalReprompt() !== undefined || delivery.hasQueued(isGoalCheckinNotification))
      )
        return;
      let causeText = GOAL_RETRY_REASON_TEXT[turnEnd.cause];
      if (retries >= MAX_GOAL_RETRIES) {
        if (announced === "gave_up") return;
        sessionScratch.replaceGoalInterruptionStreak({
          goalSetAt: activeGoal.setAt,
          retries,
          announced: "gave_up",
        });
        logGoalInterruption(terminal, turnEnd, "gave_up", retries);
        logFeatureSad("goal_interruption", "gave_up");
        yield createInformationalSystemMessage(
          `Goal paused after ${MAX_GOAL_RETRIES} automatic retries \xB7 ${causeText} \xB7 send a message to continue`,
          "warning",
        );
        return;
      }
      sessionScratch.replaceGoalInterruptionStreak({
        goalSetAt: activeGoal.setAt,
        retries: retries + 1,
        announced: undefined,
      });
      let baseDelayMs = GOAL_RETRY_DELAYS_2[retries] ?? GOAL_RETRY_DELAYS_2[0];
      scheduleGoalReprompt(
        {
          goal: activeGoal,
          cause: causeText,
          sessionScratch,
          getAppState,
          ...delivery,
        },
        Math.round(baseDelayMs * (1 + Math.random() * GOAL_RETRY_DELAYS)),
      );
      logGoalInterruption(terminal, turnEnd, "reprompt_armed", retries + 1);
      yield createInformationalSystemMessage(
        `Goal still active \xB7 ${causeText} \xB7 retrying in ${Math.round(baseDelayMs / 60000)} min (${retries + 1}/${MAX_GOAL_RETRIES}) \xB7 send a message to retry now`,
        "notice",
      );
      return;
    }
    clearPendingGoalReprompt(sessionScratch);
    let waitingOnUsage =
      turnEnd.cause === "usage_limit" && intentProviderSlot.of(toolUseContext.session.host).hasIntent();
    let cause = waitingOnUsage ? "usage_limit_waiting" : turnEnd.cause;
    if (announced === cause) return;
    sessionScratch.replaceGoalInterruptionStreak({
      goalSetAt: activeGoal.setAt,
      retries,
      announced: cause,
    });
    if (waitingOnUsage) logGoalInterruption(terminal, turnEnd, "usage_limit_wait_owns", retries);
    else {
      logGoalInterruption(terminal, turnEnd, "paused", retries);
      logFeatureSad("goal_interruption", "paused");
    }
    yield createInformationalSystemMessage(GOAL_ERROR_TEXT[cause], "notice");
  } catch (error) {
    logError(error);
  }
}
//@ chunk-ha3km179.js:103388-105125 placement
/**
 * 按终止原因分类回合结束（完成、中止、错误等）。
 */
function classifyTurnEnd(terminal) {
  switch (terminal.reason) {
    case "completed":
      return goalCheckInterruption(terminal.goalPass);
    case "aborted_streaming":
    case "aborted_tools":
    case "max_turns":
    case "tool_deferred":
    case "background_requested":
      return {
        kind: "none",
      };
    case "stop_hook_prevented":
    case "hook_stopped":
      return {
        kind: "pause",
        cause: "hook_stopped",
      };
    case "blocking_limit":
    case "prompt_too_long":
    case "rapid_refill_breaker":
      return {
        kind: "stop",
        cause: "context_limit",
      };
    case "image_error":
      return {
        kind: "retry",
        cause: "image",
      };
    case "model_error":
      return {
        kind: "pause",
        cause: "turn_error",
      };
    case "malformed_tool_use_exhausted":
      return {
        kind: "retry",
        cause: "unreadable_tool_call",
      };
    case "api_error":
      if (terminal.errorKind === "rate_limit")
        return terminal.quotaLimits !== undefined && isAutoResumableLimit(terminal.quotaLimits)
          ? {
              kind: "pause",
              cause: "usage_limit",
            }
          : {
              kind: "pause",
              cause: "rate_limited",
            };
      if (terminal.errorKind === "max_output_tokens")
        return {
          kind: "retry",
          cause: "output_limit",
        };
      if (terminal.errorKind === "cloud_credential_error")
        return {
          kind: "retry",
          cause: "cloud_credentials",
        };
      if (terminal.isTransient)
        return {
          kind: "retry",
          cause: "api_unavailable",
        };
      switch (terminal.oauthRefreshDiskFull ? "authentication_failed" : terminal.errorKind) {
        case "overloaded":
        case "server_error":
          return {
            kind: "retry",
            cause: "api_unavailable",
          };
        case "unknown":
        case undefined:
          return {
            kind: "retry",
            cause: "unclassified",
          };
        case "invalid_request":
          return {
            kind: "pause",
            cause: "request_rejected",
          };
        case "authentication_failed":
        case "oauth_org_not_allowed":
          return env.CLAUDE_CODE_REMOTE ||
            isHostEntrypoint() ||
            getSdkOAuthTokenRefreshCallback() !== null ||
            withoutHostManagedProviderVars()
            ? {
                kind: "retry",
                cause: "host_auth",
              }
            : {
                kind: "stop",
                cause: terminal.oauthRefreshDiskFull ? "disk_full" : "auth",
              };
        case "account_on_hold":
          return {
            kind: "stop",
            cause: "auth",
          };
        case "verification_required":
          return {
            kind: "stop",
            cause: "verification_required",
          };
        case "billing_error":
          return {
            kind: "stop",
            cause: "billing",
          };
        case "model_not_found":
          return {
            kind: "stop",
            cause: "model_unavailable",
          };
      }
  }
}
//@ chunk-ha3km179.js:105125-105402 placement
function goalCheckInterruption(goalPass) {
  switch (goalPass) {
    case "error":
      return {
        kind: "retry",
        cause: "goal_check",
      };
    case "cancelled":
      return {
        kind: "pause",
        cause: "goal_check_timeout",
      };
    case "not_met":
      return {
        kind: "pause",
        cause: "goal_check_capped",
      };
    case "met":
    case "impossible":
    case "deferred":
    case undefined:
      return {
        kind: "none",
      };
  }
}
//@ chunk-ha3km179.js:105402-105656 placement
function logGoalInterruption(terminal, turnEnd, action, retries) {
  logEvent("tengu_goal_interruption", {
    interruption: fromEnum(turnEnd.kind),
    action: fromEnum(action),
    cause: fromEnum(turnEnd.cause),
    terminal_reason: fromEnum(terminal.reason),
    error_kind: fromEnumOpt(terminal.reason === "api_error" ? terminal.errorKind : undefined),
    goal_pass: fromEnumOpt(terminal.reason === "completed" ? terminal.goalPass : undefined),
    retries,
  });
}
//@ chunk-ha3km179.js:105656-106005 placement
/**
 * 中止回合的终止信息与提示行。
 */
function abortedTurnRows(inPlaceOfFirstRequest, options) {
  if (inPlaceOfFirstRequest !== "aborted")
    return {
      rows: [inPlaceOfFirstRequest],
      terminal: {
        reason: "api_error",
        isTransient: false,
      },
    };
  let terminal = {
    reason: "aborted_streaming",
  };
  try {
    return {
      terminal,
      rows: isSilentAbortReason(options.signal.reason)
        ? []
        : [
            createUserInterruptionMessage({
              toolUse: false,
              interruptedMessageId: options.interruptedMessageId(),
              interruptedByShutdown: shutdownInterruptStamp(options.signal),
              now: options.now,
              uuidFn: options.uuid,
            }),
          ],
    };
  } catch (error) {
    logError(error);
    return {
      rows: [],
      terminal,
    };
  }
}
//@ chunk-ha3km179.js:106005-106407 placement
/**
 * 连续压缩失败时通知用户。
 */
function notifyCompactFailure_2({ outcome, querySource, agentId, isInterrupted }) {
  try {
    if (
      outcome.kind !== "failed" ||
      outcome.consecutiveFailures !== MAX_CONSECUTIVE_COMPACT_FAILURES ||
      isInterrupted ||
      getIsNonInteractiveSession() ||
      !isMainQueryCompaction(querySource, agentId) ||
      !isColorCommandForceHidden()
    )
      return;
    let compactFailure = outcome.compactFailure;
    switch (compactFailure?.reason) {
      case "aborted":
        return;
      case "exhausted":
      case "too_few_groups":
        return notifyCompactFailure(COMPACT_HINT);
      case "media_unstrippable":
        return notifyCompactFailure(MEDIA_TOO_LARGE_HINT);
      case undefined:
      case "error":
        return notifyCompactFailure(
          compactFailure?.detail
            ? truncate(compactFailure.detail, MAX_FAILURE_DETAIL_CHARS, true)
            : undefined,
        );
    }
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-ha3km179.js:106407-106429 placement
/**
 * "try /compact"
 */
var COMPACT_HINT = "try /compact";
//@ chunk-ha3km179.js:106429-106490 placement
/**
 * 压缩失败的系统提示
 */
function notifyCompactFailure(compactFailure) {
  return createSystemMessage(
    compactFailure ? `${COULD_NOT_COMPACT} \xB7 ${compactFailure}` : COULD_NOT_COMPACT,
    "warning",
  );
}
//@ chunk-ha3km179.js:106490-106876 placement
/**
 * 工具请求结束回合但有失败兄弟调用时追加提示（tengu_cozy_fern）。
 */
function nudgeAfterToolEndTurn({
  requested,
  batchResults,
  spent,
  lastIteration,
  queryChainId,
  queryDepth,
  deps,
  makeUserMessage,
}) {
  try {
    if (
      requested === false ||
      requested === "tool" ||
      spent ||
      lastIteration ||
      !batchResults.some(hasToolResultError) ||
      !getFeatureValue_CACHED_MAY_BE_STALE("tengu_cozy_fern", false)
    )
      return;
    let userMessage = makeUserMessage({
      content: TURN_NOT_ENDED_NOTICE,
      isMeta: true,
      turnCompanion: true,
      now: deps.now,
      uuidFn: deps.uuid,
    });
    logEvent("tengu_mcp_end_turn_overridden_by_failed_sibling", {
      queryChainId,
      queryDepth,
    });
    return userMessage;
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-ha3km179.js:106876-107170 placement
function applyDisallowedTools(commands, joinedDisallowedTools, options) {
  try {
    let flattened = commands.flatMap((command) =>
      command.replacesDisallowedTools === true && command.disallowedTools !== undefined
        ? [command.disallowedTools]
        : [],
    );
    if (flattened.length === 0 || joinedDisallowedTools === undefined) return options.tools;
    joinedDisallowedTools(uniq(flattened.flat()));
    return options.refreshTools?.() ?? options.tools;
  } catch (error) {
    logError(error);
    logFeatureSad("headless_turn_deny", "joined_list_threw");
    return options.tools;
  }
}
//@ chunk-ha3km179.js:107170-107203 placement
/**
 * 开关名
 */
var TENGU_MODULAR_SEAL_2 = "tengu_modular_seal";
var TENGU_MODULAR_SEAL = 2;
export {
  updateGoalAfterTurn,
  createQueueDelivery,
  abortedTurnRows,
  notifyCompactFailure_2,
  notifyStopHookCap,
  nudgeAfterToolEndTurn,
  applyDisallowedTools,
  replyGatePolicy,
  getVisibleBackgroundTasks,
  TENGU_MODULAR_SEAL,
  TENGU_MODULAR_SEAL_2,
};
