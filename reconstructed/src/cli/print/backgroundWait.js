/**
 * cli/print/backgroundWait.ts
 *
 * 2.1.316 新增：等待后台任务与队列空闲（等待器、心跳、排队提示计数）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (14)
 * attribution: placement 14
 */
import { isDiskless } from "../../bootstrap/state.js";
import { env } from "../../utils/env.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { sendSessionActivitySignal_2, hasActiveWork } from "../../utils/sessionActivity.js";
import { logError } from "../../utils/log.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import {
  WIND_DOWN_LOG_INTERVAL_MS,
  WIND_DOWN_GRACE_MS,
  stopAgentsOverBudget,
  collectOwedTaskNotifications,
  hasShellBeforeDeadline,
  decideBackgroundWait,
  killBackgroundTasksForWindDown,
  shouldStayRunningForInput,
  isAwaitedBackgroundTask,
} from "./backgroundWindDown.js";
import { fromEnumArr } from "../../services/analytics/safeMetadata.js";
import { Aa, sleep } from "../../utils/sleep.js";
import { taskKindLabel, isParkedMcpTask, isHoldCappedMcpTask, isHeldMcpTask } from "../../tasks/taskKinds.js";
import { bV } from "../../utils/stringUtils.js";
import { getRunningTasks, createTaskFramework } from "../../utils/task/framework.js";
import { waitForTaskCompletion } from "../../tools/TaskOutputTool/TaskOutputTool.js";
import { im } from "../../utils/messageQueueManager.js";
import { uN } from "../../cost-tracker.js";
import { Usi, isTidySlothGateOn } from "../../tasks/LocalShellTask/backgroundNotices.js";
import {
  hasActiveInProcessTeammates,
  hasNonLeadTeammate,
  hasWorkingInProcessTeammates,
} from "../../utils/teammate.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { formatDuration } from "../../utils/format.js";
import { maybeStartCcrRecap } from "../../services/awaySummary.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { logForDebugging } from "../../utils/debug.js";
import { isProjectsRelay, isHumanOrAutoContinuation } from "../../utils/messageProvenance.js";
import { chatOriginField } from "./transcriptLeaves.js";
import { isHumanOrigin } from "../../utils/turnOrigin.js";

//@ chunk-tyg7f3ek.js:104475-104732 placement
var BACKGROUND_WAIT_PRIORITY_KINDS = [
    "queued_command",
    "task_notification",
    "owed_detached_result",
    "eval_tool",
    "schedule_wakeup",
  ],
  XB = {
    local_bash: "shell",
    monitor_mcp: "monitor",
    monitor_ws: "monitor",
    local_agent: "agent",
    local_workflow: "agent",
    remote_agent: "remote_agent",
    mcp_task: "mcp_task",
  };
//@ chunk-tyg7f3ek.js:104732-104835 placement
function readProcessCpuMs() {
  try {
    if (isDiskless()) return;
    let { user: user, system: system } = process.cpuUsage();
    return (user + system) / 1000;
  } catch {
    return;
  }
}
/**
 * print 模式结束后等待后台任务时的心跳/CPU/空闲统计与 keepalive 帧节流。
 */
//@ chunk-tyg7f3ek.js:104835-107324 placement
class BackgroundWaitPulse {
  pulse;
  readCpuMs;
  waitStartedAt = null;
  lastPassAt = 0;
  cpuMsAtStart;
  cpuMsAtLastPass;
  lastFrameAt = 0;
  passes = 0;
  longSleeps = 0;
  framesSent = 0;
  framesDueBackgroundOnly = 0;
  idleMs = 0;
  idleStretchMs = 0;
  longestIdleMs = 0;
  forWorkOnly = !1;
  holds = new Set();
  exitCleanup;
  broken = !1;
  constructor(e, n = Date.now(), r = readProcessCpuMs) {
    this.pulse = e;
    this.readCpuMs = r;
    this.lastFrameAt = n;
  }
  pass({ backgroundTasks: e, otherWork: n, ownedWorkPending: r, now: s }) {
    let h = r.schedule_wakeup || r.eval_tool,
      any = BACKGROUND_WAIT_PRIORITY_KINDS.some((P) => n[P]),
      S = e.length > 0 || any;
    if (this.broken || !env.CLAUDE_CODE_REMOTE) return S && this.pulse();
    let R = S && !any && !h,
      w = !1;
    try {
      if (((this.cpuMsAtLastPass = this.readCpuMs()), this.waitStartedAt === null))
        ((this.waitStartedAt = s),
          (this.lastPassAt = s),
          (this.cpuMsAtStart = this.cpuMsAtLastPass),
          (this.exitCleanup = registerCleanup(async () => this.end())));
      let P = s - this.lastPassAt;
      ((this.lastPassAt = s), this.passes++);
      for (let L of e)
        this.holds.add(
          L.type === "local_bash" && L.kind === "monitor" ? "monitor" : (XB[L.type] ?? "other_task"),
        );
      for (let L of BACKGROUND_WAIT_PRIORITY_KINDS) if (n[L]) this.holds.add(L);
      if (S && r.schedule_wakeup) this.holds.add("schedule_wakeup");
      if (S && r.eval_tool) this.holds.add("eval_tool");
      if (S) this.forWorkOnly = sendSessionActivitySignal_2();
      if (((w = R && !hasActiveWork()), w))
        ((this.idleMs += P),
          (this.idleStretchMs += P),
          (this.longestIdleMs = Math.max(this.longestIdleMs, this.idleStretchMs)));
      else this.idleStretchMs = 0;
    } catch (error) {
      ((this.broken = !0), logError(error), logFeatureSad("ccr_keepalive_post_turn_wait", "pass_throw"));
    }
    if (!S) return !1;
    if (R && this.forWorkOnly && !this.broken) {
      if (s - this.lastFrameAt >= WIND_DOWN_LOG_INTERVAL_MS)
        (this.framesDueBackgroundOnly++, (this.lastFrameAt = s));
      return !1;
    }
    if (!this.pulse()) return !1;
    if ((this.framesSent++, (this.lastFrameAt = s), R)) this.framesDueBackgroundOnly++;
    return !0;
  }
  countLongSleep() {
    if (this.waitStartedAt !== null && !this.broken) this.longSleeps++;
  }
  end() {
    if (this.waitStartedAt === null) return;
    try {
      if ((this.exitCleanup?.(), this.holds.size > 0))
        logFeatureOk("ccr_keepalive_post_turn_wait", {
          keepalive_for_work_only: this.forWorkOnly,
          frames_sent: this.framesSent,
          frames_due_background_only: this.framesDueBackgroundOnly,
          wait_ms: this.lastPassAt - this.waitStartedAt,
          ...(this.cpuMsAtStart !== void 0 &&
            this.cpuMsAtLastPass !== void 0 && {
              cli_cpu_ms: Math.round(this.cpuMsAtLastPass - this.cpuMsAtStart),
            }),
          passes: this.passes,
          long_sleeps: this.longSleeps,
          idle_background_only_ms: this.idleMs,
          longest_idle_background_only_ms: this.longestIdleMs,
          held_by: fromEnumArr([...this.holds]),
        });
    } catch (error) {
      (logError(error), logFeatureSad("ccr_keepalive_post_turn_wait", "end_throw"));
    }
    ((this.waitStartedAt = null),
      (this.exitCleanup = void 0),
      (this.broken = !1),
      (this.passes = 0),
      (this.longSleeps = 0),
      (this.framesSent = 0),
      (this.framesDueBackgroundOnly = 0),
      (this.idleMs = 0),
      (this.idleStretchMs = 0),
      (this.longestIdleMs = 0),
      this.holds.clear());
  }
}
//@ chunk-tyg7f3ek.js:107324-107343 placement
var BACKGROUND_POLL_MS = 100,
  eH = 1000;
//@ chunk-tyg7f3ek.js:107343-107846 placement
function waitForQueueOrIdle({
  messageQueue: messageQueue,
  store: store,
  sessionState: sessionState,
  spendRecorded: spendRecorded,
  turnSignal: turnSignal,
  sessionSignal: sessionSignal,
  clock: clock = Aa,
}) {
  return new Promise((R) => {
    let monotonicNow = clock.monotonicNow(),
      P,
      L = () => {
        (x(), P?.());
        for (let Z of G) Z();
        (turnSignal?.removeEventListener("abort", L), sessionSignal.removeEventListener("abort", L), R());
      },
      q = () => {
        P ??= clock.setTimeout(
          L,
          BACKGROUND_POLL_MS - ((clock.monotonicNow() - monotonicNow) % BACKGROUND_POLL_MS),
        );
      },
      x = clock.setTimeout(L, eH),
      G = [
        messageQueue.subscribe(q),
        store.subscribe(q),
        sessionState.stateChanged.subscribe(q),
        spendRecorded.subscribe(q),
      ];
    (turnSignal?.addEventListener("abort", L, { once: !0 }),
      sessionSignal.addEventListener("abort", L, { once: !0 }));
  });
}
//@ chunk-tyg7f3ek.js:107846-107856 placement
var backgroundWaitClock = WIND_DOWN_GRACE_MS;
//@ chunk-tyg7f3ek.js:107856-107972 placement
function shouldShowBackgroundWaitStatus({
  outputFormat: outputFormat,
  stderrIsTerminal: stderrIsTerminal,
  stdoutIsTerminal: stdoutIsTerminal,
}) {
  return (
    stderrIsTerminal && !((outputFormat === "json" || outputFormat === "stream-json") && stdoutIsTerminal)
  );
}
//@ chunk-tyg7f3ek.js:107972-108137 placement
function describeRunningBackgroundTasks(e) {
  return e
    .map((n) => {
      let r = n.type === "local_bash" && n.kind === "monitor" ? "monitor" : taskKindLabel(n.type),
        s = bV(n.description, 60);
      return s ? `${r} "${s}"` : r;
    })
    .join(", ");
}
/**
 * print 模式最后一轮后等待后台任务（shell、monitor、agent、MCP 任务等）完成；支持等待上限 CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS、预算与 keepalive。
 */
//@ chunk-tyg7f3ek.js:108137-114105 placement
class BackgroundTaskWaiter {
  drain;
  messageQueue;
  io;
  store;
  toolState;
  detachedToolCalls;
  pendingNotificationWaits;
  ccrRecap;
  maxBudgetUsd;
  storageV5;
  turnAbortedForShutdown;
  stopping;
  sessionSignal;
  spendRecorded;
  keepAlive;
  startStopRetirementDue;
  onIdleReported;
  hasPendingSessionWakeup;
  pendingSessionWakeupIds;
  hasLiveSessionWakeup;
  waitNoticeOnStderr;
  announcedWork = new Set();
  waitNoticeBroken = !1;
  windDownDeadline = null;
  windDownSwept = !1;
  bgWaitFirstIdle = null;
  bgWaitCeilingWarned = !1;
  bgWaitCeilingExceeded = !1;
  constructor({
    drain: e,
    messageQueue: n,
    io: r,
    store: s,
    toolState: h,
    detachedToolCalls: y,
    pendingNotificationWaits: S,
    ccrRecap: R,
    maxBudgetUsd: w,
    storageV5: P,
    turnAbortedForShutdown: L,
    stopping: q,
    sessionSignal: x,
    spendRecorded: G,
    pulseKeepAlive: Z,
    startStopRetirementDue: re,
    onIdleReported: Ae,
    hasPendingSessionWakeup: Ue,
    pendingSessionWakeupIds: ce,
    hasLiveSessionWakeup: nt,
    waitNoticeOnStderr: ie,
  }) {
    ((this.drain = e),
      (this.messageQueue = n),
      (this.io = r),
      (this.store = s),
      (this.toolState = h),
      (this.detachedToolCalls = y),
      (this.pendingNotificationWaits = S),
      (this.ccrRecap = R),
      (this.maxBudgetUsd = w),
      (this.storageV5 = P),
      (this.turnAbortedForShutdown = L),
      (this.stopping = q),
      (this.sessionSignal = x),
      (this.spendRecorded = G),
      (this.keepAlive = new BackgroundWaitPulse(Z)),
      (this.startStopRetirementDue = re),
      (this.onIdleReported = Ae),
      (this.hasPendingSessionWakeup = Ue),
      (this.pendingSessionWakeupIds = ce),
      (this.hasLiveSessionWakeup = nt),
      (this.waitNoticeOnStderr = ie));
  }
  park({ drainedThisIteration: e }) {
    if (e) this.keepAlive.end();
    let n = !1,
      state = this.store.getState(),
      filtered = getRunningTasks(state).filter(
        (He) =>
          waitForTaskCompletion(He) &&
          He.type !== "in_process_teammate" &&
          !(He.type === "monitor_ws" && He.ambient) &&
          He.type !== "post_turn_memory",
      );
    stopAgentsOverBudget({
      maxBudgetUsd: this.maxBudgetUsd,
      abortedForShutdown: this.turnAbortedForShutdown(),
      turnAborted: this.drain.abortController?.signal.aborted ?? !1,
      getAppState: this.store.getState,
      setAppState: this.store.setState,
      storageV5: this.storageV5,
    });
    let h = this.messageQueue.peek(im) !== void 0,
      y = h && !this.holdsEvalSettles(),
      now = Date.now(),
      R = collectOwedTaskNotifications({
        tasks: Object.values(state.tasks ?? {}),
        waits: this.pendingNotificationWaits,
        now: now,
      }),
      w = this.detachedToolCalls.owesResult(now) && !uN(this.maxBudgetUsd),
      P = R || w;
    if (this.drain.inputClosed && !y && !e) this.bgWaitFirstIdle ??= now;
    else ((this.bgWaitFirstIdle = null), (this.bgWaitCeilingWarned = !1));
    let L = Usi(),
      q = L > 0 && this.bgWaitFirstIdle !== null && now - this.bgWaitFirstIdle >= L;
    this.bgWaitCeilingExceeded = q;
    let x =
        this.drain.inputClosed &&
        (hasActiveInProcessTeammates(state) || hasNonLeadTeammate(state.teamContext)),
      G =
        this.drain.inputClosed &&
        !uN(this.maxBudgetUsd) &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_giggly_dragonfly", !0),
      Z = this.drain.inputClosed && !uN(this.maxBudgetUsd) && isTidySlothGateOn(),
      re = q && !(Z && hasShellBeforeDeadline(filtered, now)),
      Ae = decideBackgroundWait({
        runningBackgroundTasks: filtered,
        inputClosed: this.drain.inputClosed,
        hasMainThreadQueued: h,
        hasActiveTeammates: x,
        hasPendingNotification: P,
        holdForArmedMonitors: G,
        holdForBackgroundShells: Z,
        ceilingExceeded: re,
        deadline: this.windDownDeadline,
        swept: this.windDownSwept,
        now: now,
      });
    if (
      ((this.windDownDeadline = Ae.deadline),
      (this.windDownSwept = Ae.swept),
      Ae.shouldSweep && !this.drain.abortController?.signal.aborted)
    ) {
      if (re && !this.bgWaitCeilingWarned)
        ((this.bgWaitCeilingWarned = !0),
          process.stderr
            .write(`Background tasks still running ${formatDuration(L, { hideTrailingZeros: !0 })} after the last turn (${describeRunningBackgroundTasks(filtered)}); stopping them. Set CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0 to wait indefinitely.
`));
      (killBackgroundTasksForWindDown(
        filtered,
        createTaskFramework(this.store.getState, this.store.setState),
        this.store.setState,
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_print_ceiling_stop_agents", !0),
      ),
        (n = !0));
    }
    let Ue = this.drain.inputClosed && !x,
      ce = !Ae.swept && filtered.some((He) => Ue || !isParkedMcpTask(He)),
      nt = Ae.swept ? [] : filtered.filter((He) => (Ue ? !isHoldCappedMcpTask(He) : !isHeldMcpTask(He))),
      ie = nt.length > 0,
      Se = !1,
      me = !1,
      hasPendingSessionWakeup = this.hasPendingSessionWakeup({ now: now, parkedSince: this.bgWaitFirstIdle }),
      Ee = h || R || (w && !re) || Se || hasPendingSessionWakeup;
    if (
      (ce || Ee) &&
      !this.drain.abortController?.signal.aborted &&
      !this.drain.endSessionRequested &&
      !this.stopping()
    ) {
      n = !0;
      let turnEndSummaryOutstanding = this.io.sessionState.turnEndSummaryOutstanding();
      if (!y) {
        if (((this.drain.runPhase = "waiting_for_agents"), !turnEndSummaryOutstanding))
          this.startStopRetirementDue();
        if (
          !turnEndSummaryOutstanding &&
          shouldStayRunningForInput({
            inputClosed: this.drain.inputClosed,
            currentState: this.io.sessionState.getState(),
            hasActiveTeammates: hasWorkingInProcessTeammates(state),
            hasRunningBgTasks: filtered.some(isAwaitedBackgroundTask),
            hasPendingNotification: P,
          })
        )
          (this.io.sessionState.notifyStateChanged("idle"),
            maybeStartCcrRecap(this.ccrRecap, this.io.sessionState),
            this.onIdleReported());
        if (
          (this.announceLongWait(now, filtered, hasPendingSessionWakeup),
          this.keepAlive.pass({
            backgroundTasks: nt,
            otherWork: {
              queued_command: h,
              task_notification: R,
              owed_detached_result: w && !re,
              eval_tool: Se,
              schedule_wakeup: hasPendingSessionWakeup,
            },
            ownedWorkPending: {
              schedule_wakeup: hasPendingSessionWakeup || this.hasLiveSessionWakeup(now),
              eval_tool: me,
            },
            now: now,
          }))
        )
          logForDiagnosticsNoPII("debug", "session_keepalive_background_wait", {
            running_background_task: ie,
            queued_command: h,
            pending_task_notification: R,
            owed_detached_result: w,
            outstanding_evals: Se,
            pending_session_wakeup: hasPendingSessionWakeup,
          });
        if (!(
          !this.drain.inputClosed &&
          !this.sessionSignal.aborted &&
          !Ee &&
          !turnEndSummaryOutstanding &&
          this.maxBudgetUsd === void 0 &&
          filtered.every((We) => {
            switch (We.type) {
              case "local_bash":
              case "local_agent":
              case "local_workflow":
                return !0;
              case "remote_agent":
              case "in_process_teammate":
              case "monitor_mcp":
              case "monitor_ws":
              case "mcp_task":
              case "dream":
              case "auto_mode_scan":
              case "local_memory_import":
              case "post_turn_memory":
                return !1;
              default:
                return !1;
            }
          }) &&
          !hasActiveInProcessTeammates(state) &&
          this.store.getState() === state &&
          this.messageQueue.peek(im) === void 0 &&
          !env.CLAUDE_CODE_DISABLE_QUIET_BACKGROUND_WAIT
        ))
          return sleep(BACKGROUND_POLL_MS);
        return (
          this.keepAlive.countLongSleep(),
          waitForQueueOrIdle({
            messageQueue: this.messageQueue,
            store: this.store,
            sessionState: this.io.sessionState,
            spendRecorded: this.spendRecorded,
            turnSignal: this.drain.abortController?.signal,
            sessionSignal: this.sessionSignal,
          })
        );
      }
    }
    return (this.keepAlive.end(), n ? "again" : "done");
  }
  announceLongWait(e, n, r) {
    if (
      this.waitNoticeBroken ||
      this.bgWaitFirstIdle === null ||
      e - this.bgWaitFirstIdle < backgroundWaitClock
    )
      return;
    try {
      let combined = n
        .map((S) => S.id)
        .concat(r ? this.pendingSessionWakeupIds().map((S) => `wakeup:${S}`) : []);
      if (combined.every((S) => this.announcedWork.has(S))) return;
      for (let S of combined) this.announcedWork.add(S);
      let joined = [describeRunningBackgroundTasks(n), r ? "scheduled wakeup" : ""]
          .filter(Boolean)
          .join(", "),
        y = `Waiting for background work to finish${joined ? ` (${joined})` : ""}. Press Ctrl+C to exit now.`;
      if (this.waitNoticeOnStderr)
        process.stderr.write(`
${y}
`);
      else logForDebugging(y);
      logFeatureOk("print_wait_notice", { on_stderr: this.waitNoticeOnStderr });
    } catch (error) {
      ((this.waitNoticeBroken = !0), logError(error), logFeatureBad("print_wait_notice", "build_failed"));
    }
  }
  holdsEvalSettles() {
    return !1;
  }
}
//@ chunk-tyg7f3ek.js:114105-114268 placement
function isPeerHandbackPrompt(e) {
  return (
    im(e) &&
    e.mode === "prompt" &&
    e.shouldQuery !== !1 &&
    e.isMeta === !0 &&
    e.origin?.kind === "peer" &&
    e.origin.senderTaskId !== void 0 &&
    e.origin.handback === !0
  );
}
//@ chunk-tyg7f3ek.js:114268-114724 placement
function countQueuedPromptKinds(e) {
  let n = {
    handbacks: 0,
    other_subagent_prompts: 0,
    outside_peers: 0,
    person_prompts: 0,
    projects_relays: 0,
  };
  for (let r of e) {
    if (isPeerHandbackPrompt(r)) {
      n.handbacks++;
      continue;
    }
    if (!im(r) || r.mode !== "prompt" || r.shouldQuery === !1) continue;
    if (isProjectsRelay(r.origin)) {
      n.projects_relays++;
      continue;
    }
    if (r.isMeta !== !0) {
      if (isHumanOrAutoContinuation(r.origin)) n.person_prompts++;
    } else if (r.origin?.kind !== "peer") continue;
    else if (r.origin.senderTaskId === void 0) n.outside_peers++;
    else n.other_subagent_prompts++;
  }
  return n;
}
//@ chunk-tyg7f3ek.js:114724-115000 placement
function logQueuedInterruptDecision(
  {
    queued: queued,
    turnUnderWay: turnUnderWay,
    lateBind: lateBind,
    cancelQueued: cancelQueued,
    sendNow: sendNow,
  },
  y,
) {
  try {
    let S = {
      ...countQueuedPromptKinds(queued),
      turn_under_way: turnUnderWay,
      late_bind_interrupt: lateBind,
      cancel_queued: cancelQueued,
      send_now: sendNow,
      ...chatOriginField(),
    };
    (logForDiagnosticsNoPII("info", "cli_queued_at_interrupt", S), y?.(S));
  } catch (error) {
    (logError(error), logForDiagnosticsNoPII("error", "cli_queued_at_interrupt_failed"));
  }
}
//@ chunk-tyg7f3ek.js:115000-115061 placement
var RESUME_RESCUE_YIELD_FLAG = "tengu_cosmic_crayon",
  TENGU_COZY_PINWHEEL = "tengu_cozy_pinwheel",
  sH = 250;
//@ chunk-tyg7f3ek.js:115061-115396 placement
class FetchingUserFilesCounter {
  count = 0;
  none;
  begin(e) {
    if (
      e.fileCount === 0 ||
      e.peerFrom !== void 0 ||
      !isHumanOrigin(e.origin) ||
      e.shouldQuery === !1 ||
      e.reRun
    )
      return;
    return (
      this.count++,
      {
        [Symbol.dispose]: () => {
          if ((this.count--, this.count === 0)) (this.none?.resolve(), (this.none = void 0));
        },
      }
    );
  }
  untilNone() {
    if (this.count === 0) return;
    return ((this.none ??= Promise.withResolvers()), this.none.promise);
  }
}

export {
  BackgroundTaskWaiter,
  shouldShowBackgroundWaitStatus,
  logQueuedInterruptDecision,
  sH,
  RESUME_RESCUE_YIELD_FLAG,
  TENGU_COZY_PINWHEEL,
  isPeerHandbackPrompt,
  FetchingUserFilesCounter,
};
