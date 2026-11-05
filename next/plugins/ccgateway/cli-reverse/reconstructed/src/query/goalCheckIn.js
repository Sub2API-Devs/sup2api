/**
 * query/goalCheckIn.ts
 *
 * 2.1.316 新增：执行目标空闲检查：仍在推迟时投递检查消息；生成目标检查消息（后台工作仍在运行/已停止时的说明）等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (3), chunk-w3ch4xq2.js (28)
 * attribution: placement 31
 */
import { logError } from "../utils/log.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { submitMarksSlot } from "../plugins/functionHooks/promptSubmit.js";
import { isMainAgentCommand, isGoalCheckinNotification } from "../utils/messageQueueManager.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { env } from "../utils/env.js";
import { taskKindLabel } from "../tasks/taskKinds.js";
import { escapeXml_2 as escapeXml, foldLookalikeChars } from "../utils/confusables.js";
import { truncateWithCount } from "../utils/stringUtils.js";
import { countWhere } from "../utils/collections.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { logForDebugging } from "../utils/debug.js";
import { MAX_TIMER_DELAY_MS } from "../utils/timerDelayClamp.js";
import { getMainLoopBusy } from "../bootstrap/state.js";
import { stripIgnorables } from "../utils/sanitization.js";
import { GOAL_CHECK_IN_PREFIX } from "../utils/messages.js";
import { setUnansweredWindowExpired } from "../tools/BashTool/bashPermissionFlags.js";
import { getTaskRunState } from "../utils/task/taskNotifications.js";
import { isAbortError } from "../utils/errors.js";
import { isFrozenMarker } from "../utils/frozenMarkers.js";
import { plainTextFromReminder } from "../utils/systemReminder.js";
import { lastTextBlockText } from "../utils/historyFile.js";
import { ULTRATHINK_KEYWORD } from "../utils/ultraplan/keyword.js";

//@ chunk-5xgkngpb.js:2575116-2575296 placement
function isTextOrJsonDeltaEvent(event) {
  let streamEvent = event;
  if (streamEvent?.type !== "stream_event") return false;
  let event_2 = streamEvent.event;
  return (
    event_2?.type === "content_block_delta" &&
    (event_2.delta.type === "text_delta" || event_2.delta.type === "input_json_delta")
  );
}
//@ chunk-5xgkngpb.js:2575296-2575369 placement
/**
 * 记录快速路径失败
 */
function logPlainDeltaFailure(reason, error) {
  try {
    logError(error);
    logFeatureSad("headless_plain_delta_fast_path", reason);
  } catch {}
}
//@ chunk-5xgkngpb.js:2575369-2575536 placement
function guardGoalCheck(source, canTakePlainDelta, takePlainDelta) {
  let failed = false;
  return (chunk, meta) => {
    if (failed) return false;
    try {
      return canTakePlainDelta() && takePlainDelta(chunk, meta);
    } catch (error) {
      failed = true;
      logPlainDeltaFailure(source === "engine" ? "engine_check_threw" : "query_check_threw", error);
      return false;
    }
  };
}
//@ chunk-w3ch4xq2.js:8567-8614 placement
/**
 * 某目标的空闲检查是否已暂停；以及检查节奏常量。
 */
var isGoalIdleCheckinPaused = (uuid) => uuid !== undefined && submitMarksSlot.get()?.has(uuid) === true;
//@ chunk-w3ch4xq2.js:8614-8837 placement
var DEFAULT_GOAL_CHECKIN_MINUTES = 30;
var MIN_GOAL_CHECKIN_DELAY_MS = 60000;
var MAX_CHECKIN_BACKOFF_DOUBLINGS = 2;
var MAX_IDLE_CHECKINS = 3;
var MAX_TASK_LINE_CHARS = 120;
var IDLE_CHECKINS_PAUSED_SUMMARY = " \xB7 idle check-ins paused until your next message";
var IDLE_CHECKINS_PAUSED_BODY =
  " Claude Code won't wake this session for another check-in until the user sends a message, so say clearly where things stand.";
//@ chunk-w3ch4xq2.js:8837-8911 placement
/**
 * 主动任务通知
 */
function isActiveTaskNotification(command) {
  return command.mode === "task-notification" && isMainAgentCommand(command) && command.passive !== true;
}
//@ chunk-w3ch4xq2.js:8911-9018 placement
/**
 * 目标空闲检查的基础间隔（毫秒）：tengu_saffron_wren 关闭时为 0，否则取 CLAUDE_CODE_GOAL_CHECKIN_MINUTES（默认 30 分钟）。
 */
function getGoalCheckinIntervalMs() {
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_saffron_wren", true)) return 0;
  return (env.CLAUDE_CODE_GOAL_CHECKIN_MINUTES ?? DEFAULT_GOAL_CHECKIN_MINUTES) * 60000;
}
//@ chunk-w3ch4xq2.js:9018-9077 placement
/**
 * 目标空闲检查开关
 */
function isGoalCheckinOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_pewter_avocet", true) && getGoalCheckinIntervalMs() !== 0;
}
//@ chunk-w3ch4xq2.js:9077-9121 placement
/**
 * 指数退避的检查间隔
 */
function backoffCheckin(goalCheckinIntervalMs, checkinCount) {
  return goalCheckinIntervalMs * 2 ** Math.min(checkinCount, MAX_CHECKIN_BACKOFF_DOUBLINGS);
}
//@ chunk-w3ch4xq2.js:9121-10069 placement
/**
 * 生成目标检查消息（后台工作仍在运行/已停止时的说明）。
 */
function goalCheckinMessage(condition, deferredMs, tasks) {
  let max = Math.max(1, Math.round(deferredMs / 60000));
  let quotedCondition = wrapInGuillemets(condition);
  if (tasks.length === 0)
    return {
      summary: "Goal check-in: background work no longer running",
      body: `${quotedCondition} is still active. Its evaluation was deferred for ${max} min while background work ran, and that work is no longer running (it finished or was stopped without reporting back). Continue toward the goal.`,
    };
  let mapped = tasks.map((task) => {
    let isMonitor = task.type === "local_bash" && task.kind === "monitor";
    let kindLabel = isMonitor ? "monitor" : taskKindLabel(task.type);
    let labelSource = task.type === "local_bash" && !isMonitor ? task.command : task.description;
    return escapeXml(
      truncateWithCount(
        `- ${task.id} \xB7 ${kindLabel} \xB7 ${stripAndNormalize(labelSource)}`,
        MAX_TASK_LINE_CHARS,
      ),
    );
  });
  return {
    summary: "Goal check-in: background work still running",
    body: `${quotedCondition} is still active, and evaluation has been deferred for ${max} min because background work is still running:
${mapped.join(`
`)}
Check on their progress (e.g. read their output). If they are progressing, say so briefly and keep waiting; if they are stuck or no longer needed, fix or stop them and continue toward the goal.`,
  };
}
//@ chunk-w3ch4xq2.js:10069-10128 placement
/**
 * 附“检查已暂停”说明
 */
function withPausedNote(message) {
  return {
    summary: message.summary + IDLE_CHECKINS_PAUSED_SUMMARY,
    body: message.body + IDLE_CHECKINS_PAUSED_BODY,
  };
}
//@ chunk-w3ch4xq2.js:10128-10177 placement
/**
 * 达到最大空闲检查次数
 */
function hasMaxIdleCheckins(goal) {
  return (goal.idleCheckinCount ?? 0) >= MAX_IDLE_CHECKINS;
}
//@ chunk-w3ch4xq2.js:10177-10568 placement
/**
 * 上报 tengu_goal_checkin_injected。
 */
function reportGoalCheckin(trigger, deferredMs, goal, tasks) {
  let shellCount = countWhere(tasks, (task) => task.type === "local_bash");
  logEvent("tengu_goal_checkin_injected", {
    trigger: fromEnum(trigger),
    deferredMs,
    activeShells: shellCount,
    activeAgents: tasks.length - shellCount,
    checkinCount: goal.checkinCount ?? 0,
    idleCheckinCount: goal.idleCheckinCount ?? 0,
  });
  if (trigger === "idle_timer" && hasMaxIdleCheckins(goal)) logFeatureSad("goal_checkin", "idle_cap_reached");
  else logFeatureOk("goal_checkin");
  logForDebugging(`[goal] check-in injected (${trigger}) after ${Math.round(deferredMs / 1000)}s deferred`);
}
//@ chunk-w3ch4xq2.js:10568-10940 placement
/**
 * 计算目标评估推迟状态（是否新一轮、检查次数）。
 */
function nextGoalDeferral(goal, tasks, now, goalCheckinIntervalMs) {
  if (goal.deferredSince === undefined)
    return {
      deferredSince: now,
      checkinCount: 0,
      isNewRun: true,
    };
  let min = Math.min(...tasks.map((task) => task.startTime));
  let isNewRun =
    goal.lastDeferralPassAt !== undefined &&
    Number.isFinite(min) &&
    min > goal.lastDeferralPassAt &&
    now - goal.lastDeferralPassAt > goalCheckinIntervalMs;
  return isNewRun
    ? {
        deferredSince: now,
        checkinCount: 0,
        isNewRun,
      }
    : {
        deferredSince: goal.deferredSince,
        checkinCount: goal.checkinCount ?? 0,
        isNewRun,
      };
}
//@ chunk-w3ch4xq2.js:10940-11365 placement
/**
 * 决定是否需要注入目标检查文本，并更新目标状态。
 */
function planGoalCheckin(goal, tasks, now) {
  let goalCheckinIntervalMs = getGoalCheckinIntervalMs();
  if (goalCheckinIntervalMs === 0)
    return {
      nextGoal: goal,
      checkinText: undefined,
    };
  let deferral = nextGoalDeferral(goal, tasks, now, goalCheckinIntervalMs);
  let elapsedMs = now - deferral.deferredSince;
  if (elapsedMs < backoffCheckin(goalCheckinIntervalMs, deferral.checkinCount))
    return {
      nextGoal: {
        ...goal,
        deferredSince: deferral.deferredSince,
        checkinCount: deferral.checkinCount,
        lastDeferralPassAt: now,
      },
      checkinText: undefined,
    };
  let nextGoal = {
    ...goal,
    deferredSince: now,
    checkinCount: deferral.checkinCount + 1,
    lastDeferralPassAt: now,
  };
  let checkinText = goalCheckinMessage(goal.condition, elapsedMs, tasks).body;
  reportGoalCheckin("turn_end", elapsedMs, nextGoal, tasks);
  return {
    nextGoal,
    checkinText,
  };
}
//@ chunk-w3ch4xq2.js:11365-11484 placement
function clearPendingGoalIdleCheckin(sessionScratch) {
  let timer = sessionScratch.pendingGoalIdleCheckin();
  if (timer !== undefined) {
    clearTimeout(timer);
    sessionScratch.replacePendingGoalIdleCheckin(undefined);
  }
}
//@ chunk-w3ch4xq2.js:11484-11696 placement
/**
 * 为当前目标安排下一次空闲检查：先清掉已排的定时器，检查间隔为 0 或目标未推迟时不排；否则按检查次数退避计算延迟（扣除已推迟时间，夹在最小值与上限间）后设置定时器。
 */
function scheduleGoalIdleCheckin(state) {
  clearPendingGoalIdleCheckin(state.sessionScratch);
  let goalCheckinIntervalMs = getGoalCheckinIntervalMs();
  if (goalCheckinIntervalMs === 0 || state.goal.deferredSince === undefined) return;
  let intervalMs = backoffCheckin(goalCheckinIntervalMs, state.goal.checkinCount ?? 0);
  let elapsedMs = hasMaxIdleCheckins(state.goal) ? 0 : state.now - state.goal.deferredSince;
  let min = Math.min(MAX_TIMER_DELAY_MS, Math.max(MIN_GOAL_CHECKIN_DELAY_MS, intervalMs - elapsedMs));
  armGoalIdleCheckinTimer(state, min);
}
//@ chunk-w3ch4xq2.js:11696-11798 placement
function armGoalIdleCheckinTimer(state, delayMs) {
  let timer = setTimeout(runGoalIdleCheckin, delayMs, state);
  timer.unref();
  state.sessionScratch.replacePendingGoalIdleCheckin(timer);
}
//@ chunk-w3ch4xq2.js:11798-12849 placement
/**
 * 执行目标空闲检查：仍在推迟时投递检查消息。
 */
function runGoalIdleCheckin(state) {
  state.sessionScratch.replacePendingGoalIdleCheckin(undefined);
  let { goal, getAppState, setAppState, getDeferringTasks, deliver, hasQueued } = state;
  let goalForRearm = goal;
  try {
    let activeGoal = getAppState().activeGoal;
    if (!isSameGoal(activeGoal, goal) || activeGoal.deferredSince === undefined) return;
    let goalCheckinIntervalMs = getGoalCheckinIntervalMs();
    if (goalCheckinIntervalMs === 0) return;
    if (hasMaxIdleCheckins(activeGoal)) {
      logForDebugging("[goal] idle check-in cap reached \u2014 tick re-armed only");
      scheduleGoalIdleCheckin({
        ...state,
        goal: activeGoal,
        now: Date.now(),
      });
      return;
    }
    if (getMainLoopBusy() || hasQueued(isGoalCheckinNotification)) {
      armGoalIdleCheckinTimer(state, MIN_GOAL_CHECKIN_DELAY_MS);
      return;
    }
    let tasks = getDeferringTasks();
    if (tasks.length === 0 && hasQueued(isActiveTaskNotification)) {
      armGoalIdleCheckinTimer(state, MIN_GOAL_CHECKIN_DELAY_MS);
      return;
    }
    let now = Date.now();
    let deferral = nextGoalDeferral(activeGoal, tasks, now, goalCheckinIntervalMs);
    if (deferral.isNewRun) {
      let restartedGoal = {
        ...activeGoal,
        deferredSince: now,
        checkinCount: 0,
        lastDeferralPassAt: now,
      };
      setAppState((appState) =>
        appState.activeGoal !== activeGoal
          ? appState
          : {
              ...appState,
              activeGoal: restartedGoal,
            },
      );
      goalForRearm = restartedGoal;
      scheduleGoalIdleCheckin({
        ...state,
        goal: restartedGoal,
        now,
      });
      return;
    }
    let elapsedMs = now - deferral.deferredSince;
    let updatedGoal = {
      ...activeGoal,
      deferredSince: now,
      checkinCount: deferral.checkinCount + 1,
      lastDeferralPassAt: now,
      idleCheckinCount: (activeGoal.idleCheckinCount ?? 0) + 1,
    };
    setAppState((appStateForGoal) =>
      appStateForGoal.activeGoal !== activeGoal
        ? appStateForGoal
        : {
            ...appStateForGoal,
            activeGoal: updatedGoal,
          },
    );
    goalForRearm = updatedGoal;
    let checkin = goalCheckinMessage(activeGoal.condition, elapsedMs, tasks);
    deliver(hasMaxIdleCheckins(updatedGoal) ? withPausedNote(checkin) : checkin);
    reportGoalCheckin("idle_timer", elapsedMs, updatedGoal, tasks);
    scheduleGoalIdleCheckin({
      ...state,
      goal: updatedGoal,
      now,
    });
  } catch (error) {
    logError(error);
    try {
      scheduleGoalIdleCheckin({
        ...state,
        goal: goalForRearm,
        now: Date.now(),
      });
    } catch (error) {
      logError(error);
    }
    try {
      logFeatureBad("goal_checkin", "fire_failed");
    } catch (error) {
      logError(error);
    }
  }
}
//@ chunk-w3ch4xq2.js:12849-12962 placement
function clearPendingGoalReprompt(sessionScratch) {
  let timer = sessionScratch.pendingGoalReprompt();
  if (timer !== undefined) {
    clearTimeout(timer);
    sessionScratch.replacePendingGoalReprompt(undefined);
  }
}
//@ chunk-w3ch4xq2.js:12962-13024 placement
/**
 * 清目标重提示状态
 */
function clearGoalRepromptState(sessionScratch) {
  clearPendingGoalReprompt(sessionScratch);
  sessionScratch.replaceGoalInterruptionStreak(undefined);
}
//@ chunk-w3ch4xq2.js:13024-13071 placement
/**
 * 清并重排目标重提示
 */
function scheduleGoalReprompt(state, delayMs) {
  clearPendingGoalReprompt(state.sessionScratch);
  setGoalRepromptTimer(state, delayMs);
}
//@ chunk-w3ch4xq2.js:13071-13170 placement
/**
 * 设定重提示定时器
 */
function setGoalRepromptTimer(state, delayMs) {
  let timer = setTimeout(runGoalReprompt, delayMs, state);
  timer.unref();
  state.sessionScratch.replacePendingGoalReprompt(timer);
}
//@ chunk-w3ch4xq2.js:13170-13730 placement
/**
 * 目标未达成时投递"继续"提示（有排队消息时延后）。
 */
function runGoalReprompt(state) {
  let { sessionScratch, getAppState } = state;
  sessionScratch.replacePendingGoalReprompt(undefined);
  try {
    let activeGoal = getAppState().activeGoal;
    if (!isSameGoal(activeGoal, state.goal) || !isGoalCheckinOn()) return;
    if (getMainLoopBusy() || state.hasQueued(isGoalCheckinNotification)) {
      setGoalRepromptTimer(state, MIN_GOAL_CHECKIN_DELAY_MS);
      return;
    }
    state.deliver({
      summary: "Goal check-in: continuing after the last turn ended early",
      body: `${wrapInGuillemets(activeGoal.condition)} is still active. The last turn ended before the goal could be evaluated: ${state.cause}. Continue toward the goal.`,
    });
    logFeatureOk("goal_interruption");
    logForDebugging("[goal] re-prompt delivered after an unevaluated turn");
  } catch (error) {
    logError(error);
    try {
      logFeatureBad("goal_interruption", "fire_failed");
    } catch (error) {
      logError(error);
    }
  }
}
//@ chunk-w3ch4xq2.js:13730-13903 placement
function resetGoalIdleCheckinCount(setAppState, sessionScratch) {
  try {
    clearGoalRepromptState(sessionScratch);
    setAppState((appState) => {
      if (appState.activeGoal?.idleCheckinCount === undefined) return appState;
      let { idleCheckinCount, ...goalWithoutIdleCount } = appState.activeGoal;
      return {
        ...appState,
        activeGoal: goalWithoutIdleCount,
      };
    });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-w3ch4xq2.js:13903-13935 placement
/**
 * 去掉可忽略字符
 */
function stripAndNormalize(text) {
  return foldLookalikeChars(stripIgnorables(text));
}
//@ chunk-w3ch4xq2.js:13935-13981 placement
/**
 * 用 «» 包裹
 */
function wrapInGuillemets(condition) {
  return `${GOAL_CHECK_IN_PREFIX}${escapeXml(stripAndNormalize(condition))}\xBB`;
}
//@ chunk-w3ch4xq2.js:13981-14062 placement
/**
 * 目标是否相同
 */
function isSameGoal(activeGoal, goal) {
  return (
    activeGoal !== undefined && activeGoal.setAt === goal.setAt && activeGoal.condition === goal.condition
  );
}
//@ chunk-w3ch4xq2.js:14062-14194 placement
function notifyAutoReactHumanTurn(turnInfo) {
  setUnansweredWindowExpired({
    expired: false,
  });
  try {
    getTaskRunState().autoReactHumanTurnObserver?.({
      ownWords: turnInfo?.ownWords === true,
    });
  } catch (error) {
    if (isAbortError(error)) return;
    logError(error);
  }
}
//@ chunk-w3ch4xq2.js:14194-14341 placement
function hasUltrathinkKeyword({ composerEnter, preExpansion, localStdinOrigin, input }) {
  let keywordText = isFrozenMarker(composerEnter)
    ? preExpansion
    : localStdinOrigin
      ? plainTextFromReminder(lastTextBlockText(input) ?? "")
      : undefined;
  return keywordText !== undefined && ULTRATHINK_KEYWORD(keywordText).length > 0;
}
//@ chunk-w3ch4xq2.js:14341-14632 placement
function hasFrustrationLanguage(userPromptText) {
  let lower = userPromptText.toLowerCase();
  return /\b(wtf|wth|ffs|omfg|shit(ty|tiest)?|dumbass|horrible|awful|piss(ed|ing)? off|piece of (shit|crap|junk)|what the (fuck|hell)|fucking? (broken|useless|terrible|awful|horrible)|fuck you|screw (this|you)|so frustrating|this sucks|damn it)\b/.test(
    lower,
  );
}
export {
  isTextOrJsonDeltaEvent,
  isGoalIdleCheckinPaused,
  logPlainDeltaFailure,
  guardGoalCheck,
  hasUltrathinkKeyword,
  clearGoalRepromptState,
  isGoalCheckinOn,
  scheduleGoalReprompt,
  clearPendingGoalReprompt,
  clearPendingGoalIdleCheckin,
  notifyAutoReactHumanTurn,
  resetGoalIdleCheckinCount,
  hasFrustrationLanguage,
  planGoalCheckin,
  scheduleGoalIdleCheckin,
};
