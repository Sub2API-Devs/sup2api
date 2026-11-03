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
import { oX } from "../plugins/functionHooks/promptSubmit.js";
import { $f, V3n } from "../utils/messageQueueManager.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { env } from "../utils/env.js";
import { taskKindLabel } from "../tasks/taskKinds.js";
import { escapeXml_2 as escapeXml, bv } from "../utils/confusables.js";
import { truncateWithCount } from "../utils/stringUtils.js";
import { count } from "../utils/collections.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { logForDebugging } from "../utils/debug.js";
import { ec } from "../utils/timerDelayClamp.js";
import { getMainLoopBusy } from "../bootstrap/state.js";
import { stripIgnorables } from "../utils/sanitization.js";
import { mPn } from "../utils/messages.js";
import { getTaskRunState } from "../utils/task/taskNotifications.js";
import { isAbortError } from "../utils/errors.js";
import { isFrozenMarker } from "../utils/frozenMarkers.js";
import { kDi } from "../utils/systemReminder.js";
import { aO } from "../utils/historyFile.js";
import { ULTRATHINK_KEYWORD } from "../utils/ultraplan/keyword.js";

//@ chunk-ha3km179.js:8077-8257 placement
function isTextOrJsonDeltaEvent(e) {
  let n = e;
  if (n?.type !== "stream_event") return !1;
  let event = n.event;
  return (
    event?.type === "content_block_delta" &&
    (event.delta.type === "text_delta" || event.delta.type === "input_json_delta")
  );
}
//@ chunk-ha3km179.js:8257-8330 placement
function nSo(e, n) {
  try {
    (logError(n), logFeatureSad("headless_plain_delta_fast_path", e));
  } catch {}
}
//@ chunk-ha3km179.js:8330-8493 placement
function guardGoalCheck(e, n, r) {
  let s = !1;
  return (h) => {
    if (s) return !1;
    try {
      return n() && r(h);
    } catch (error) {
      return ((s = !0), nSo(e === "engine" ? "engine_check_threw" : "query_check_threw", error), !1);
    }
  };
}
/**
 * 某目标的空闲检查是否已暂停；以及检查节奏常量。
 */
//@ chunk-ha3km179.js:8493-8540 placement
var isGoalIdleCheckinPaused = (e) => e !== void 0 && oX.get()?.has(e) === !0;
//@ chunk-ha3km179.js:8540-8763 placement
var DEFAULT_GOAL_CHECKIN_MINUTES = 30,
  MIN_GOAL_CHECKIN_DELAY_MS = 60000,
  MAX_CHECKIN_BACKOFF_DOUBLINGS = 2,
  MAX_IDLE_CHECKINS = 3,
  MAX_TASK_LINE_CHARS = 120,
  IDLE_CHECKINS_PAUSED_SUMMARY = " \xB7 idle check-ins paused until your next message",
  IDLE_CHECKINS_PAUSED_BODY =
    " Claude Code won't wake this session for another check-in until the user sends a message, so say clearly where things stand.";
//@ chunk-ha3km179.js:8763-8837 placement
function yp(e) {
  return e.mode === "task-notification" && $f(e) && e.passive !== !0;
}
/**
 * 目标空闲检查的基础间隔（毫秒）：tengu_saffron_wren 关闭时为 0，否则取 CLAUDE_CODE_GOAL_CHECKIN_MINUTES（默认 30 分钟）。
 */
//@ chunk-ha3km179.js:8837-8944 placement
function getGoalCheckinIntervalMs() {
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_saffron_wren", !0)) return 0;
  return (env.CLAUDE_CODE_GOAL_CHECKIN_MINUTES ?? DEFAULT_GOAL_CHECKIN_MINUTES) * 60000;
}
//@ chunk-ha3km179.js:8944-9003 placement
function Is() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_pewter_avocet", !0) && getGoalCheckinIntervalMs() !== 0;
}
//@ chunk-ha3km179.js:9003-9047 placement
function _a(e, n) {
  return e * 2 ** Math.min(n, MAX_CHECKIN_BACKOFF_DOUBLINGS);
}
/**
 * 生成目标检查消息（后台工作仍在运行/已停止时的说明）。
 */
//@ chunk-ha3km179.js:9047-9995 placement
function goalCheckinMessage(e, n, r) {
  let max = Math.max(1, Math.round(n / 60000)),
    h = Ra(e);
  if (r.length === 0)
    return {
      summary: "Goal check-in: background work no longer running",
      body: `${h} is still active. Its evaluation was deferred for ${max} min while background work ran, and that work is no longer running (it finished or was stopped without reporting back). Continue toward the goal.`,
    };
  let mapped = r.map((S) => {
    let M = S.type === "local_bash" && S.kind === "monitor",
      R = M ? "monitor" : taskKindLabel(S.type),
      T = S.type === "local_bash" && !M ? S.command : S.description;
    return escapeXml(truncateWithCount(`- ${S.id} \xB7 ${R} \xB7 ${Ea(T)}`, MAX_TASK_LINE_CHARS));
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
function _p(e) {
  return { summary: e.summary + IDLE_CHECKINS_PAUSED_SUMMARY, body: e.body + IDLE_CHECKINS_PAUSED_BODY };
}
//@ chunk-ha3km179.js:10054-10103 placement
function Mr(e) {
  return (e.idleCheckinCount ?? 0) >= MAX_IDLE_CHECKINS;
}
/**
 * 上报 tengu_goal_checkin_injected。
 */
//@ chunk-ha3km179.js:10103-10494 placement
function reportGoalCheckin(e, n, r, s) {
  let h = count(s, (y) => y.type === "local_bash");
  if (
    (logEvent("tengu_goal_checkin_injected", {
      trigger: fromEnum(e),
      deferredMs: n,
      activeShells: h,
      activeAgents: s.length - h,
      checkinCount: r.checkinCount ?? 0,
      idleCheckinCount: r.idleCheckinCount ?? 0,
    }),
    e === "idle_timer" && Mr(r))
  )
    logFeatureSad("goal_checkin", "idle_cap_reached");
  else logFeatureOk("goal_checkin");
  logForDebugging(`[goal] check-in injected (${e}) after ${Math.round(n / 1000)}s deferred`);
}
/**
 * 计算目标评估推迟状态（是否新一轮、检查次数）。
 */
//@ chunk-ha3km179.js:10494-10866 placement
function nextGoalDeferral(e, n, r, s) {
  if (e.deferredSince === void 0) return { deferredSince: r, checkinCount: 0, isNewRun: !0 };
  let min = Math.min(...n.map((S) => S.startTime)),
    y =
      e.lastDeferralPassAt !== void 0 &&
      Number.isFinite(min) &&
      min > e.lastDeferralPassAt &&
      r - e.lastDeferralPassAt > s;
  return y
    ? { deferredSince: r, checkinCount: 0, isNewRun: y }
    : { deferredSince: e.deferredSince, checkinCount: e.checkinCount ?? 0, isNewRun: y };
}
/**
 * 决定是否需要注入目标检查文本，并更新目标状态。
 */
//@ chunk-ha3km179.js:10866-11291 placement
function planGoalCheckin(e, n, r) {
  let s = getGoalCheckinIntervalMs();
  if (s === 0) return { nextGoal: e, checkinText: void 0 };
  let h = nextGoalDeferral(e, n, r, s),
    y = r - h.deferredSince;
  if (y < _a(s, h.checkinCount))
    return {
      nextGoal: { ...e, deferredSince: h.deferredSince, checkinCount: h.checkinCount, lastDeferralPassAt: r },
      checkinText: void 0,
    };
  let S = { ...e, deferredSince: r, checkinCount: h.checkinCount + 1, lastDeferralPassAt: r },
    body = goalCheckinMessage(e.condition, y, n).body;
  return (reportGoalCheckin("turn_end", y, S, n), { nextGoal: S, checkinText: body });
}
//@ chunk-ha3km179.js:11291-11410 placement
function clearPendingGoalIdleCheckin(e) {
  let pendingGoalIdleCheckin = e.pendingGoalIdleCheckin();
  if (pendingGoalIdleCheckin !== void 0)
    (clearTimeout(pendingGoalIdleCheckin), e.replacePendingGoalIdleCheckin(void 0));
}
/**
 * 为当前目标安排下一次空闲检查：先清掉已排的定时器，检查间隔为 0 或目标未推迟时不排；否则按检查次数退避计算延迟（扣除已推迟时间，夹在最小值与上限间）后设置定时器。
 */
//@ chunk-ha3km179.js:11410-11622 placement
function scheduleGoalIdleCheckin(e) {
  clearPendingGoalIdleCheckin(e.sessionScratch);
  let n = getGoalCheckinIntervalMs();
  if (n === 0 || e.goal.deferredSince === void 0) return;
  let r = _a(n, e.goal.checkinCount ?? 0),
    s = Mr(e.goal) ? 0 : e.now - e.goal.deferredSince,
    min = Math.min(ec, Math.max(MIN_GOAL_CHECKIN_DELAY_MS, r - s));
  armGoalIdleCheckinTimer(e, min);
}
//@ chunk-ha3km179.js:11622-11724 placement
function armGoalIdleCheckinTimer(e, n) {
  let r = setTimeout(runGoalIdleCheckin, n, e);
  (r.unref(), e.sessionScratch.replacePendingGoalIdleCheckin(r));
}
/**
 * 执行目标空闲检查：仍在推迟时投递检查消息。
 */
//@ chunk-ha3km179.js:11724-12775 placement
function runGoalIdleCheckin(e) {
  e.sessionScratch.replacePendingGoalIdleCheckin(void 0);
  let {
      goal: goal,
      getAppState: getAppState,
      setAppState: setAppState,
      getDeferringTasks: getDeferringTasks,
      deliver: deliver,
      hasQueued: hasQueued,
    } = e,
    M = goal;
  try {
    let activeGoal = getAppState().activeGoal;
    if (!Aa(activeGoal, goal) || activeGoal.deferredSince === void 0) return;
    let T = getGoalCheckinIntervalMs();
    if (T === 0) return;
    if (Mr(activeGoal)) {
      (logForDebugging("[goal] idle check-in cap reached \u2014 tick re-armed only"),
        scheduleGoalIdleCheckin({ ...e, goal: activeGoal, now: Date.now() }));
      return;
    }
    if (getMainLoopBusy() || hasQueued(V3n)) {
      armGoalIdleCheckinTimer(e, MIN_GOAL_CHECKIN_DELAY_MS);
      return;
    }
    let w = getDeferringTasks();
    if (w.length === 0 && hasQueued(yp)) {
      armGoalIdleCheckinTimer(e, MIN_GOAL_CHECKIN_DELAY_MS);
      return;
    }
    let now = Date.now(),
      Q = nextGoalDeferral(activeGoal, w, now, T);
    if (Q.isNewRun) {
      let G = { ...activeGoal, deferredSince: now, checkinCount: 0, lastDeferralPassAt: now };
      (setAppState((ee) => (ee.activeGoal !== activeGoal ? ee : { ...ee, activeGoal: G })),
        (M = G),
        scheduleGoalIdleCheckin({ ...e, goal: G, now: now }));
      return;
    }
    let D = now - Q.deferredSince,
      L = {
        ...activeGoal,
        deferredSince: now,
        checkinCount: Q.checkinCount + 1,
        lastDeferralPassAt: now,
        idleCheckinCount: (activeGoal.idleCheckinCount ?? 0) + 1,
      };
    (setAppState((G) => (G.activeGoal !== activeGoal ? G : { ...G, activeGoal: L })), (M = L));
    let z = goalCheckinMessage(activeGoal.condition, D, w);
    (deliver(Mr(L) ? _p(z) : z),
      reportGoalCheckin("idle_timer", D, L, w),
      scheduleGoalIdleCheckin({ ...e, goal: L, now: now }));
  } catch (error) {
    logError(error);
    try {
      scheduleGoalIdleCheckin({ ...e, goal: M, now: Date.now() });
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
function clearPendingGoalReprompt(e) {
  let pendingGoalReprompt = e.pendingGoalReprompt();
  if (pendingGoalReprompt !== void 0)
    (clearTimeout(pendingGoalReprompt), e.replacePendingGoalReprompt(void 0));
}
//@ chunk-ha3km179.js:12888-12950 placement
function Pn(e) {
  (clearPendingGoalReprompt(e), e.replaceGoalInterruptionStreak(void 0));
}
//@ chunk-ha3km179.js:12950-12997 placement
function Ca(e, n) {
  (clearPendingGoalReprompt(e.sessionScratch), Ma(e, n));
}
//@ chunk-ha3km179.js:12997-13096 placement
function Ma(e, n) {
  let r = setTimeout(runGoalReprompt, n, e);
  (r.unref(), e.sessionScratch.replacePendingGoalReprompt(r));
}
/**
 * 目标未达成时投递"继续"提示（有排队消息时延后）。
 */
//@ chunk-ha3km179.js:13096-13656 placement
function runGoalReprompt(e) {
  let { sessionScratch: sessionScratch, getAppState: getAppState } = e;
  sessionScratch.replacePendingGoalReprompt(void 0);
  try {
    let activeGoal = getAppState().activeGoal;
    if (!Aa(activeGoal, e.goal) || !Is()) return;
    if (getMainLoopBusy() || e.hasQueued(V3n)) {
      Ma(e, MIN_GOAL_CHECKIN_DELAY_MS);
      return;
    }
    (e.deliver({
      summary: "Goal check-in: continuing after the last turn ended early",
      body: `${Ra(activeGoal.condition)} is still active. The last turn ended before the goal could be evaluated: ${e.cause}. Continue toward the goal.`,
    }),
      logFeatureOk("goal_interruption"),
      logForDebugging("[goal] re-prompt delivered after an unevaluated turn"));
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
function resetGoalIdleCheckinCount(e, n) {
  try {
    (Pn(n),
      e((r) => {
        if (r.activeGoal?.idleCheckinCount === void 0) return r;
        let { idleCheckinCount: idleCheckinCount, ...h } = r.activeGoal;
        return { ...r, activeGoal: h };
      }));
  } catch (error) {
    logError(error);
  }
}
//@ chunk-ha3km179.js:13829-13861 placement
function Ea(e) {
  return bv(stripIgnorables(e));
}
//@ chunk-ha3km179.js:13861-13907 placement
function Ra(e) {
  return `${mPn}${escapeXml(Ea(e))}\xBB`;
}
//@ chunk-ha3km179.js:13907-13988 placement
function Aa(e, n) {
  return e !== void 0 && e.setAt === n.setAt && e.condition === n.condition;
}
//@ chunk-ha3km179.js:13988-14102 placement
function notifyAutoReactHumanTurn(e) {
  try {
    getTaskRunState().autoReactHumanTurnObserver?.({ ownWords: e?.ownWords === !0 });
  } catch (error) {
    if (isAbortError(error)) return;
    logError(error);
  }
}
//@ chunk-ha3km179.js:14102-14249 placement
function hasUltrathinkKeyword({
  composerEnter: composerEnter,
  preExpansion: preExpansion,
  localStdinOrigin: localStdinOrigin,
  input: input,
}) {
  let h = isFrozenMarker(composerEnter) ? preExpansion : localStdinOrigin ? kDi(aO(input) ?? "") : void 0;
  return h !== void 0 && ULTRATHINK_KEYWORD(h).length > 0;
}
//@ chunk-ha3km179.js:14249-14540 placement
function hasFrustrationLanguage(e) {
  let lower = e.toLowerCase();
  return /\b(wtf|wth|ffs|omfg|shit(ty|tiest)?|dumbass|horrible|awful|piss(ed|ing)? off|piece of (shit|crap|junk)|what the (fuck|hell)|fucking? (broken|useless|terrible|awful|horrible)|fuck you|screw (this|you)|so frustrating|this sucks|damn it)\b/.test(
    lower,
  );
}

export {
  clearPendingGoalIdleCheckin,
  clearPendingGoalReprompt,
  nSo,
  isTextOrJsonDeltaEvent,
  isGoalIdleCheckinPaused,
  guardGoalCheck,
  notifyAutoReactHumanTurn,
  resetGoalIdleCheckinCount,
  hasUltrathinkKeyword,
  planGoalCheckin,
  scheduleGoalIdleCheckin,
  Pn,
  Is,
  Ca,
  hasFrustrationLanguage,
};
