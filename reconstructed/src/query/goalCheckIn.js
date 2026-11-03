/**
 * query/goalCheckIn.ts
 *
 * 2.1.316 新增：执行目标空闲检查：仍在推迟时投递检查消息；生成目标检查消息（后台工作仍在运行/已停止时的说明）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ha3km179.js (31)
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
import { count } from "../utils/collections.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { logForDebugging } from "../utils/debug.js";
import { MAX_TIMER_DELAY_MS } from "../utils/timerDelayClamp.js";
import { getMainLoopBusy } from "../bootstrap/state.js";
import { stripIgnorables } from "../utils/sanitization.js";
import { GOAL_CHECK_IN_PREFIX } from "../utils/messages.js";
import { getTaskRunState } from "../utils/task/taskNotifications.js";
import { isAbortError } from "../utils/errors.js";
import { isFrozenMarker } from "../utils/frozenMarkers.js";
import { plainTextFromReminder } from "../utils/systemReminder.js";
import { lastTextBlockText } from "../utils/historyFile.js";
import { ULTRATHINK_KEYWORD } from "../utils/ultraplan/keyword.js";

//@ chunk-ha3km179.js:8077-8257 placement
function isTextOrJsonDeltaEvent(e) {
  let n = e;
  if (n?.type !== "stream_event") return false;
  let event = n.event;
  return (
    event?.type === "content_block_delta" &&
    (event.delta.type === "text_delta" || event.delta.type === "input_json_delta")
  );
}
//@ chunk-ha3km179.js:8257-8330 placement
/**
 * 记录快速路径失败
 */
function logPlainDeltaFailure(e, error) {
  try {
    logError(error);
    logFeatureSad("headless_plain_delta_fast_path", e);
  } catch {}
}
//@ chunk-ha3km179.js:8330-8493 placement
function guardGoalCheck(e, n, takePlainDelta) {
  let s = false;
  return (h) => {
    if (s) return false;
    try {
      return n() && takePlainDelta(h);
    } catch (error) {
      s = true;
      logPlainDeltaFailure(e === "engine" ? "engine_check_threw" : "query_check_threw", error);
      return false;
    }
  };
}
//@ chunk-ha3km179.js:8493-8540 placement
/**
 * 某目标的空闲检查是否已暂停；以及检查节奏常量。
 */
var isGoalIdleCheckinPaused = (uuid) => uuid !== undefined && submitMarksSlot.get()?.has(uuid) === true;
//@ chunk-ha3km179.js:8540-8763 placement
var DEFAULT_GOAL_CHECKIN_MINUTES = 30;
var MIN_GOAL_CHECKIN_DELAY_MS = 60000;
var MAX_CHECKIN_BACKOFF_DOUBLINGS = 2;
var MAX_IDLE_CHECKINS = 3;
var MAX_TASK_LINE_CHARS = 120;
var IDLE_CHECKINS_PAUSED_SUMMARY = " \xB7 idle check-ins paused until your next message";
var IDLE_CHECKINS_PAUSED_BODY =
  " Claude Code won't wake this session for another check-in until the user sends a message, so say clearly where things stand.";
//@ chunk-ha3km179.js:8763-8837 placement
/**
 * 主动任务通知
 */
function isActiveTaskNotification(e) {
  return e.mode === "task-notification" && isMainAgentCommand(e) && e.passive !== true;
}
//@ chunk-ha3km179.js:8837-8944 placement
/**
 * 目标空闲检查的基础间隔（毫秒）：tengu_saffron_wren 关闭时为 0，否则取 CLAUDE_CODE_GOAL_CHECKIN_MINUTES（默认 30 分钟）。
 */
function getGoalCheckinIntervalMs() {
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_saffron_wren", true)) return 0;
  return (env.CLAUDE_CODE_GOAL_CHECKIN_MINUTES ?? DEFAULT_GOAL_CHECKIN_MINUTES) * 60000;
}
//@ chunk-ha3km179.js:8944-9003 placement
/**
 * 目标空闲检查开关
 */
function isGoalCheckinOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_pewter_avocet", true) && getGoalCheckinIntervalMs() !== 0;
}
//@ chunk-ha3km179.js:9003-9047 placement
/**
 * 指数退避的检查间隔
 */
function backoffCheckin(goalCheckinIntervalMs, n) {
  return goalCheckinIntervalMs * 2 ** Math.min(n, MAX_CHECKIN_BACKOFF_DOUBLINGS);
}
//@ chunk-ha3km179.js:9047-9995 placement
/**
 * 生成目标检查消息（后台工作仍在运行/已停止时的说明）。
 */
function goalCheckinMessage(condition, n, r) {
  let max = Math.max(1, Math.round(n / 60000));
  let h = wrapInGuillemets(condition);
  if (r.length === 0)
    return {
      summary: "Goal check-in: background work no longer running",
      body: `${h} is still active. Its evaluation was deferred for ${max} min while background work ran, and that work is no longer running (it finished or was stopped without reporting back). Continue toward the goal.`,
    };
  let mapped = r.map((S) => {
    let M = S.type === "local_bash" && S.kind === "monitor";
    let R = M ? "monitor" : taskKindLabel(S.type);
    let T = S.type === "local_bash" && !M ? S.command : S.description;
    return escapeXml(
      truncateWithCount(`- ${S.id} \xB7 ${R} \xB7 ${stripAndNormalize(T)}`, MAX_TASK_LINE_CHARS),
    );
  });
  return {
    summary: "Goal check-in: background work still running",
    body: `${h} is still active, and evaluation has been deferred for ${max} min because background work is still running:
${mapped.join(`
`)}
Check on their progress (e.g. read their output). If they are progressing, say so briefly and keep waiting; if they are stuck or no longer needed, fix or stop them and continue toward the goal.`,
  };
}
//@ chunk-ha3km179.js:9995-10054 placement
/**
 * 附“检查已暂停”说明
 */
function withPausedNote(e) {
  return {
    summary: e.summary + IDLE_CHECKINS_PAUSED_SUMMARY,
    body: e.body + IDLE_CHECKINS_PAUSED_BODY,
  };
}
//@ chunk-ha3km179.js:10054-10103 placement
/**
 * 达到最大空闲检查次数
 */
function hasMaxIdleCheckins(e) {
  return (e.idleCheckinCount ?? 0) >= MAX_IDLE_CHECKINS;
}
//@ chunk-ha3km179.js:10103-10494 placement
/**
 * 上报 tengu_goal_checkin_injected。
 */
function reportGoalCheckin(e, n, r, s) {
  let h = count(s, (y) => y.type === "local_bash");
  logEvent("tengu_goal_checkin_injected", {
    trigger: fromEnum(e),
    deferredMs: n,
    activeShells: h,
    activeAgents: s.length - h,
    checkinCount: r.checkinCount ?? 0,
    idleCheckinCount: r.idleCheckinCount ?? 0,
  });
  if (e === "idle_timer" && hasMaxIdleCheckins(r)) logFeatureSad("goal_checkin", "idle_cap_reached");
  else logFeatureOk("goal_checkin");
  logForDebugging(`[goal] check-in injected (${e}) after ${Math.round(n / 1000)}s deferred`);
}
//@ chunk-ha3km179.js:10494-10866 placement
/**
 * 计算目标评估推迟状态（是否新一轮、检查次数）。
 */
function nextGoalDeferral(e, n, r, goalCheckinIntervalMs) {
  if (e.deferredSince === undefined)
    return {
      deferredSince: r,
      checkinCount: 0,
      isNewRun: true,
    };
  let min = Math.min(...n.map((S) => S.startTime));
  let y =
    e.lastDeferralPassAt !== undefined &&
    Number.isFinite(min) &&
    min > e.lastDeferralPassAt &&
    r - e.lastDeferralPassAt > goalCheckinIntervalMs;
  return y
    ? {
        deferredSince: r,
        checkinCount: 0,
        isNewRun: y,
      }
    : {
        deferredSince: e.deferredSince,
        checkinCount: e.checkinCount ?? 0,
        isNewRun: y,
      };
}
//@ chunk-ha3km179.js:10866-11291 placement
/**
 * 决定是否需要注入目标检查文本，并更新目标状态。
 */
function planGoalCheckin(activeGoal, visibleBackgroundTasks, r) {
  let goalCheckinIntervalMs = getGoalCheckinIntervalMs();
  if (goalCheckinIntervalMs === 0)
    return {
      nextGoal: activeGoal,
      checkinText: undefined,
    };
  let h = nextGoalDeferral(activeGoal, visibleBackgroundTasks, r, goalCheckinIntervalMs);
  let y = r - h.deferredSince;
  if (y < backoffCheckin(goalCheckinIntervalMs, h.checkinCount))
    return {
      nextGoal: {
        ...activeGoal,
        deferredSince: h.deferredSince,
        checkinCount: h.checkinCount,
        lastDeferralPassAt: r,
      },
      checkinText: undefined,
    };
  let S = {
    ...activeGoal,
    deferredSince: r,
    checkinCount: h.checkinCount + 1,
    lastDeferralPassAt: r,
  };
  let checkinText = goalCheckinMessage(activeGoal.condition, y, visibleBackgroundTasks).body;
  reportGoalCheckin("turn_end", y, S, visibleBackgroundTasks);
  return {
    nextGoal: S,
    checkinText,
  };
}
//@ chunk-ha3km179.js:11291-11410 placement
function clearPendingGoalIdleCheckin(sessionScratch) {
  let n = sessionScratch.pendingGoalIdleCheckin();
  if (n !== undefined) {
    clearTimeout(n);
    sessionScratch.replacePendingGoalIdleCheckin(undefined);
  }
}
//@ chunk-ha3km179.js:11410-11622 placement
/**
 * 为当前目标安排下一次空闲检查：先清掉已排的定时器，检查间隔为 0 或目标未推迟时不排；否则按检查次数退避计算延迟（扣除已推迟时间，夹在最小值与上限间）后设置定时器。
 */
function scheduleGoalIdleCheckin(e) {
  clearPendingGoalIdleCheckin(e.sessionScratch);
  let goalCheckinIntervalMs = getGoalCheckinIntervalMs();
  if (goalCheckinIntervalMs === 0 || e.goal.deferredSince === undefined) return;
  let r = backoffCheckin(goalCheckinIntervalMs, e.goal.checkinCount ?? 0);
  let s = hasMaxIdleCheckins(e.goal) ? 0 : e.now - e.goal.deferredSince;
  let min = Math.min(MAX_TIMER_DELAY_MS, Math.max(MIN_GOAL_CHECKIN_DELAY_MS, r - s));
  armGoalIdleCheckinTimer(e, min);
}
//@ chunk-ha3km179.js:11622-11724 placement
function armGoalIdleCheckinTimer(e, n) {
  let timer = setTimeout(runGoalIdleCheckin, n, e);
  timer.unref();
  e.sessionScratch.replacePendingGoalIdleCheckin(timer);
}
//@ chunk-ha3km179.js:11724-12775 placement
/**
 * 执行目标空闲检查：仍在推迟时投递检查消息。
 */
function runGoalIdleCheckin(e) {
  e.sessionScratch.replacePendingGoalIdleCheckin(undefined);
  let { goal, getAppState, setAppState, getDeferringTasks, deliver, hasQueued } = e;
  let M = goal;
  try {
    let activeGoal = getAppState().activeGoal;
    if (!isSameGoal(activeGoal, goal) || activeGoal.deferredSince === undefined) return;
    let goalCheckinIntervalMs = getGoalCheckinIntervalMs();
    if (goalCheckinIntervalMs === 0) return;
    if (hasMaxIdleCheckins(activeGoal)) {
      logForDebugging("[goal] idle check-in cap reached \u2014 tick re-armed only");
      scheduleGoalIdleCheckin({
        ...e,
        goal: activeGoal,
        now: Date.now(),
      });
      return;
    }
    if (getMainLoopBusy() || hasQueued(isGoalCheckinNotification)) {
      armGoalIdleCheckinTimer(e, MIN_GOAL_CHECKIN_DELAY_MS);
      return;
    }
    let deferringTasks = getDeferringTasks();
    if (deferringTasks.length === 0 && hasQueued(isActiveTaskNotification)) {
      armGoalIdleCheckinTimer(e, MIN_GOAL_CHECKIN_DELAY_MS);
      return;
    }
    let now = Date.now();
    let Q = nextGoalDeferral(activeGoal, deferringTasks, now, goalCheckinIntervalMs);
    if (Q.isNewRun) {
      let G = {
        ...activeGoal,
        deferredSince: now,
        checkinCount: 0,
        lastDeferralPassAt: now,
      };
      setAppState((ee) =>
        ee.activeGoal !== activeGoal
          ? ee
          : {
              ...ee,
              activeGoal: G,
            },
      );
      M = G;
      scheduleGoalIdleCheckin({
        ...e,
        goal: G,
        now,
      });
      return;
    }
    let D = now - Q.deferredSince;
    let L = {
      ...activeGoal,
      deferredSince: now,
      checkinCount: Q.checkinCount + 1,
      lastDeferralPassAt: now,
      idleCheckinCount: (activeGoal.idleCheckinCount ?? 0) + 1,
    };
    setAppState((G) =>
      G.activeGoal !== activeGoal
        ? G
        : {
            ...G,
            activeGoal: L,
          },
    );
    M = L;
    let z = goalCheckinMessage(activeGoal.condition, D, deferringTasks);
    deliver(hasMaxIdleCheckins(L) ? withPausedNote(z) : z);
    reportGoalCheckin("idle_timer", D, L, deferringTasks);
    scheduleGoalIdleCheckin({
      ...e,
      goal: L,
      now,
    });
  } catch (error) {
    logError(error);
    try {
      scheduleGoalIdleCheckin({
        ...e,
        goal: M,
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
//@ chunk-ha3km179.js:12775-12888 placement
function clearPendingGoalReprompt(sessionScratch) {
  let n = sessionScratch.pendingGoalReprompt();
  if (n !== undefined) {
    clearTimeout(n);
    sessionScratch.replacePendingGoalReprompt(undefined);
  }
}
//@ chunk-ha3km179.js:12888-12950 placement
/**
 * 清目标重提示状态
 */
function clearGoalRepromptState(sessionScratch) {
  clearPendingGoalReprompt(sessionScratch);
  sessionScratch.replaceGoalInterruptionStreak(undefined);
}
//@ chunk-ha3km179.js:12950-12997 placement
/**
 * 清并重排目标重提示
 */
function scheduleGoalReprompt(e, n) {
  clearPendingGoalReprompt(e.sessionScratch);
  setGoalRepromptTimer(e, n);
}
//@ chunk-ha3km179.js:12997-13096 placement
/**
 * 设定重提示定时器
 */
function setGoalRepromptTimer(e, n) {
  let timer = setTimeout(runGoalReprompt, n, e);
  timer.unref();
  e.sessionScratch.replacePendingGoalReprompt(timer);
}
//@ chunk-ha3km179.js:13096-13656 placement
/**
 * 目标未达成时投递"继续"提示（有排队消息时延后）。
 */
function runGoalReprompt(e) {
  let { sessionScratch, getAppState } = e;
  sessionScratch.replacePendingGoalReprompt(undefined);
  try {
    let activeGoal = getAppState().activeGoal;
    if (!isSameGoal(activeGoal, e.goal) || !isGoalCheckinOn()) return;
    if (getMainLoopBusy() || e.hasQueued(isGoalCheckinNotification)) {
      setGoalRepromptTimer(e, MIN_GOAL_CHECKIN_DELAY_MS);
      return;
    }
    e.deliver({
      summary: "Goal check-in: continuing after the last turn ended early",
      body: `${wrapInGuillemets(activeGoal.condition)} is still active. The last turn ended before the goal could be evaluated: ${e.cause}. Continue toward the goal.`,
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
//@ chunk-ha3km179.js:13656-13829 placement
function resetGoalIdleCheckinCount(setAppState, sessionScratch) {
  try {
    clearGoalRepromptState(sessionScratch);
    setAppState((r) => {
      if (r.activeGoal?.idleCheckinCount === undefined) return r;
      let { idleCheckinCount, ...h } = r.activeGoal;
      return {
        ...r,
        activeGoal: h,
      };
    });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-ha3km179.js:13829-13861 placement
/**
 * 去掉可忽略字符
 */
function stripAndNormalize(e) {
  return foldLookalikeChars(stripIgnorables(e));
}
//@ chunk-ha3km179.js:13861-13907 placement
/**
 * 用 «» 包裹
 */
function wrapInGuillemets(e) {
  return `${GOAL_CHECK_IN_PREFIX}${escapeXml(stripAndNormalize(e))}\xBB`;
}
//@ chunk-ha3km179.js:13907-13988 placement
/**
 * 目标是否相同
 */
function isSameGoal(activeGoal, goal) {
  return (
    activeGoal !== undefined && activeGoal.setAt === goal.setAt && activeGoal.condition === goal.condition
  );
}
//@ chunk-ha3km179.js:13988-14102 placement
function notifyAutoReactHumanTurn(e) {
  try {
    getTaskRunState().autoReactHumanTurnObserver?.({
      ownWords: e?.ownWords === true,
    });
  } catch (error) {
    if (isAbortError(error)) return;
    logError(error);
  }
}
//@ chunk-ha3km179.js:14102-14249 placement
function hasUltrathinkKeyword({ composerEnter, preExpansion, localStdinOrigin, input }) {
  let h = isFrozenMarker(composerEnter)
    ? preExpansion
    : localStdinOrigin
      ? plainTextFromReminder(lastTextBlockText(input) ?? "")
      : undefined;
  return h !== undefined && ULTRATHINK_KEYWORD(h).length > 0;
}
//@ chunk-ha3km179.js:14249-14540 placement
function hasFrustrationLanguage(userPromptText) {
  let lower = userPromptText.toLowerCase();
  return /\b(wtf|wth|ffs|omfg|shit(ty|tiest)?|dumbass|horrible|awful|piss(ed|ing)? off|piece of (shit|crap|junk)|what the (fuck|hell)|fucking? (broken|useless|terrible|awful|horrible)|fuck you|screw (this|you)|so frustrating|this sucks|damn it)\b/.test(
    lower,
  );
}
export {
  clearPendingGoalIdleCheckin,
  clearPendingGoalReprompt,
  logPlainDeltaFailure,
  isTextOrJsonDeltaEvent,
  isGoalIdleCheckinPaused,
  guardGoalCheck,
  notifyAutoReactHumanTurn,
  resetGoalIdleCheckinCount,
  hasUltrathinkKeyword,
  planGoalCheckin,
  scheduleGoalIdleCheckin,
  clearGoalRepromptState,
  isGoalCheckinOn,
  scheduleGoalReprompt,
  hasFrustrationLanguage,
};
